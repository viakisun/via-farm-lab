// Procedural growing racks (2 tiers × 2 beds per tier).
//
// One rack = aluminium-profile cage + 2 horizontal tiers. Each tier carries
// 2 polypropylene beds (front and back rows along the depth axis), with a
// magenta LED bar suspended above each tier. The LED point lights are
// scoped via includedOnlyMeshes so they only illuminate THIS rack's beds
// and plants — that keeps any single mesh under Babylon's per-mesh light
// cap (4 by default, raised to 8 in materials.ts).
//
// The rack returns bedAnchors[tier][bedIndex] — TransformNodes positioned
// at each bed's growing surface. plants.ts plants its thinInstance clouds
// using these anchors so the layout stays driven by the rack geometry,
// not magic numbers.
import {
  type AbstractMesh,
  Color3,
  Matrix,
  Mesh,
  MeshBuilder,
  type PBRMaterial,
  PointLight,
  Quaternion,
  type Scene,
  TransformNode,
  Vector3,
} from '@babylonjs/core';

import { sceneControls } from '../scene-controls';

import { getMaterials } from './materials';

export interface BuildRackOptions {
  /** Stable id used to name meshes and lights; appears in the scene tree. */
  readonly id: string;
  /** World-space position of the rack centre (X, ground Y = 0, Z). */
  readonly position: Vector3;
  /** Number of bed tiers. Default 2. */
  readonly tiers?: number;
  /** Beds per tier (front and back rows). Default 2. */
  readonly bedsPerTier?: number;
  /** Optional yaw rotation (radians) — defaults to 0. */
  readonly yaw?: number;
}

export interface BuiltRack {
  /** Group all meshes under this node — easy to inspect in the Babylon Inspector. */
  readonly root: TransformNode;
  /**
   * bedAnchors[tier][bedIndex] is a TransformNode at the centre of that bed's
   * growing surface, in world space. plants.ts uses these to position its
   * thinInstance clusters.
   */
  readonly bedAnchors: TransformNode[][];
  /** The bed meshes themselves — for plant lighting includedOnlyMeshes. */
  readonly bedMeshes: Mesh[];
  /** The LED bar emissive meshes — exposed so light registration can refer to them. */
  readonly ledBars: Mesh[];
  /**
   * The nutrient solution surface mesh per basin, keyed by `{rackId}.b{tier}`.
   * Demo controller swaps the material to reflect pool EC.
   */
  readonly basinLiquids: ReadonlyMap<string, Mesh>;
}

// Reinfa R02-KR02 spec (per _reference/A3-R02-KR03-reinfa.pdf):
//   length 3,350 mm × depth 1,040 mm. Three tiers of single long bed trays
//   stacked vertically; the bottom tier is reserved for storage / empty
//   tray space per the user's order configuration.
export const RACK_DIMS = {
  /** Outer footprint along X (rack length) — A3-R02-KR03 drawing. */
  widthM: 3.35,
  /** Outer footprint along Z (rack depth) — A3-R02-KR03 drawing. */
  depthM: 1.04,
  /** Total rack height (top of frame) — 1800 mm per A3-R02-KR03 drawing. */
  heightM: 1.8,
  /** Aluminium profile cross-section. */
  profileM: 0.04,
} as const;

/**
 * Bed (= basin) dimensions. The basin is the white PVC tray that holds the
 * nutrient solution; raft segments float on top. Height bumped to 10 cm so
 * there's room for both the water column and the partially-submerged raft.
 */
export const BED_DIMS = {
  /** Slightly shorter than the rack along X. */
  widthM: 3.2,
  /** Per-bed depth — one bed per tier in the R02 spec. */
  depthM: 0.95,
  /** Basin depth — deep enough to hold the nutrient solution AND have the
   *  raft float partially submerged on top. */
  heightM: 0.1,
} as const;

// A3-R02-KR03 drawing — vertical stack from floor up (mm):
//   foot 176 + frame skirt 41 + bottom tier 670 + middle tier 390 + top tier 390
const FOOT_HEIGHT_M = 0.176;
const SKIRT_GAP_M = 0.041;
const BOTTOM_TIER_HEIGHT_M = 0.67; // bottom tier reserved as storage (no plants)
const GROW_TIER_HEIGHT_M = 0.39;

/** Cross-beam Y per tier — beam sits at the floor of each tier shelf. */
const TIER_BEAM_YS: readonly number[] = [
  FOOT_HEIGHT_M + SKIRT_GAP_M, // 0.217 — bottom
  FOOT_HEIGHT_M + SKIRT_GAP_M + BOTTOM_TIER_HEIGHT_M, // 0.887 — middle
  FOOT_HEIGHT_M + SKIRT_GAP_M + BOTTOM_TIER_HEIGHT_M + GROW_TIER_HEIGHT_M, // 1.277 — top
];

/** Distance the LED bar sits below the upper tier's cross-beam — A3-R02
 *  drawing shows the LED bar fixed to the underside of the frame above
 *  via a short mounting bracket. 40 mm matches the drawing's bracket
 *  length and keeps the bar reading as "attached to the frame above",
 *  not free-floating in space. */
const LED_BAR_DROP_BELOW_UPPER_BEAM_M = 0.04;

/**
 * Side fan — box housing + alu bezel + 5-blade axial prop that rotates.
 * Spin rate scales with the scene-controls flowMode flag (1 rad/s idle,
 * 6 rad/s when flow mode is on). A single shared observer drives every
 * fan in the scene.
 */
const fanBladeGroups: TransformNode[] = [];
let fanObserverInstalled = false;

function buildSideFan(scene: Scene, parent: TransformNode, id: string, pos: Vector3): void {
  const mats = getMaterials(scene);
  const body = MeshBuilder.CreateBox(id, { width: 0.14, depth: 0.14, height: 0.05 }, scene);
  body.position = pos.clone();
  body.material = mats.fanGrille;
  body.parent = parent;
  // Slim front bezel — a slightly brighter alu ring around the grille face.
  const bezelZOffset = 0.025 * (pos.z < 0 ? -1 : 1);
  const bezel = MeshBuilder.CreateBox(
    `${id}-bezel`,
    { width: 0.15, depth: 0.15, height: 0.012 },
    scene,
  );
  bezel.position = new Vector3(pos.x, pos.y, pos.z + bezelZOffset);
  bezel.material = mats.alumProfile;
  bezel.parent = parent;

  // 5-blade axial prop on a TransformNode pivot. Rotates around its local Z
  // (= axial direction toward the bed).
  const bladeGroup = new TransformNode(`${id}-blades`, scene);
  bladeGroup.parent = parent;
  bladeGroup.position = new Vector3(
    pos.x,
    pos.y,
    pos.z + bezelZOffset + 0.004 * (pos.z < 0 ? -1 : 1),
  );

  const hub = MeshBuilder.CreateCylinder(
    `${id}-hub`,
    { diameter: 0.018, height: 0.008, tessellation: 12 },
    scene,
  );
  hub.rotation.x = Math.PI / 2;
  hub.material = mats.alumProfile;
  hub.parent = bladeGroup;

  for (let i = 0; i < 5; i++) {
    const angle = (i / 5) * Math.PI * 2;
    const blade = MeshBuilder.CreateBox(
      `${id}-blade-${i}`,
      { width: 0.05, height: 0.005, depth: 0.012 },
      scene,
    );
    blade.material = mats.alumProfile;
    blade.position = new Vector3(Math.cos(angle) * 0.035, Math.sin(angle) * 0.035, 0);
    blade.rotation = new Vector3(0, 0, angle);
    blade.parent = bladeGroup;
  }

  fanBladeGroups.push(bladeGroup);

  if (!fanObserverInstalled) {
    fanObserverInstalled = true;
    scene.onBeforeRenderObservable.add(() => {
      const omega = sceneControls.current.flowMode ? 6.0 : 1.0;
      const dt = scene.getEngine().getDeltaTime() / 1000;
      for (const g of fanBladeGroups) {
        g.rotation.z += omega * dt;
      }
    });
  }
}

/** Reinfa green leaf cap — quarter sphere on top of a vertical post. */
/**
 * Net-pot hole positions in raft-local (X, Z) coordinates. 3×3 grid, spacing
 * derived from the bedPanel texture (cell ≈ 0.243 m for a 0.75 m raft).
 */
const NET_POT_HOLES_LOCAL: readonly (readonly [number, number])[] = (() => {
  const s = 0.243;
  const out: [number, number][] = [];
  for (let r = -1; r <= 1; r++) {
    for (let c = -1; c <= 1; c++) {
      out.push([c * s, r * s]);
    }
  }
  return out;
})();

/**
 * Build a single net-pot base mesh — a small black cylinder cup with a
 * slightly wider rim ring on top. Merged into one mesh so it can be
 * thinInstance-rendered at every raft hole on every bed.
 */
function buildNetPotBaseMesh(scene: Scene, mat: PBRMaterial): Mesh {
  const cup = MeshBuilder.CreateCylinder(
    'net-pot-cup',
    { diameter: 0.05, height: 0.045, tessellation: 14 },
    scene,
  );
  const rim = MeshBuilder.CreateCylinder(
    'net-pot-rim',
    { diameter: 0.055, height: 0.005, tessellation: 14 },
    scene,
  );
  rim.position.y = 0.022; // sits at the cup's top edge
  const merged = Mesh.MergeMeshes([cup, rim], true, true, undefined, false, true);
  if (!merged) throw new Error('net-pot merge failed');
  merged.name = 'net-pot-base';
  merged.material = mat;
  merged.isVisible = true;
  merged.receiveShadows = true;
  return merged;
}

export function buildRack(scene: Scene, opts: BuildRackOptions): BuiltRack {
  const tiers = opts.tiers ?? 3;
  const bedsPerTier = opts.bedsPerTier ?? 1;
  const mats = getMaterials(scene);

  const root = new TransformNode(`rack-${opts.id}`, scene);
  root.position = opts.position.clone();
  root.rotation.y = opts.yaw ?? 0;

  // Aluminium profile uprights — 4 corner columns + 2 mid-span columns
  // (A3-R02-KR03 top view shows a 1950 mm + 1350 mm split = mid support at
  // X = -halfW + 1.95).
  const halfW = RACK_DIMS.widthM / 2;
  const halfD = RACK_DIMS.depthM / 2;
  const midX = -halfW + 1.95; // = +0.275 with width 3.35
  const uprightPositions: readonly [number, number][] = [
    [-halfW, -halfD],
    [halfW, -halfD],
    [-halfW, halfD],
    [halfW, halfD],
    [midX, -halfD],
    [midX, halfD],
  ];
  for (const [cx, cz] of uprightPositions) {
    const tag =
      cx === midX ? `m-${cz > 0 ? 'b' : 'f'}` : `${cx > 0 ? 'r' : 'l'}-${cz > 0 ? 'b' : 'f'}`;
    const col = MeshBuilder.CreateBox(
      `rack-${opts.id}-col-${tag}`,
      { width: RACK_DIMS.profileM, depth: RACK_DIMS.profileM, height: RACK_DIMS.heightM },
      scene,
    );
    col.position = new Vector3(cx, RACK_DIMS.heightM / 2, cz);
    col.material = mats.alumProfile;
    col.parent = root;
    col.receiveShadows = true;
  }

  // Transport rail — two long alu rails along X under the rack, with rubber
  // wheels at each end (Reinfa MFH-series mobile rack base). Y = 0 sits on
  // the floor; rails are 4 cm tall and slightly wider than the rack so the
  // wheels stick out a bit at the ends.
  const railProfile = 0.04;
  const railLength = RACK_DIMS.widthM + 0.4;
  for (const railZ of [-halfD - 0.02, +halfD + 0.02]) {
    const rail = MeshBuilder.CreateBox(
      `rack-${opts.id}-rail-${railZ > 0 ? 'b' : 'f'}`,
      { width: railLength, depth: railProfile, height: railProfile },
      scene,
    );
    rail.position = new Vector3(0, railProfile / 2, railZ);
    rail.material = mats.alumProfile;
    rail.parent = root;
    // Wheel pair at each end of this rail.
    for (const wheelX of [-railLength / 2 + 0.06, +railLength / 2 - 0.06]) {
      const wheel = MeshBuilder.CreateCylinder(
        `rack-${opts.id}-wheel-${wheelX > 0 ? 'r' : 'l'}-${railZ > 0 ? 'b' : 'f'}`,
        { diameter: 0.07, height: 0.025, tessellation: 18 },
        scene,
      );
      wheel.position = new Vector3(wheelX, 0.035, railZ);
      wheel.rotation.x = Math.PI / 2; // lay cylinder on its side
      wheel.material = mats.rubberWheel;
      wheel.parent = root;
    }
  }

  // Horizontal cross-beams along the rack length, one per tier + a top frame.
  // Tier Y positions come from the A3-R02-KR03 drawing (non-uniform: bottom
  // tier is taller for storage, top two are 390 mm each).
  const tierYs: number[] = TIER_BEAM_YS.slice(0, tiers);
  const beamYs = [...tierYs, RACK_DIMS.heightM];
  for (const y of beamYs) {
    for (const zSign of [-1, 1]) {
      const beam = MeshBuilder.CreateBox(
        `rack-${opts.id}-beam-${y.toFixed(2)}-${zSign > 0 ? 'b' : 'f'}`,
        { width: RACK_DIMS.widthM, depth: RACK_DIMS.profileM, height: RACK_DIMS.profileM },
        scene,
      );
      beam.position = new Vector3(0, y, zSign * halfD);
      beam.material = mats.alumProfile;
      beam.parent = root;
    }
    // Short cross-bars front-to-back at each end (so the rack feels boxy).
    for (const xSign of [-1, 1]) {
      const xBeam = MeshBuilder.CreateBox(
        `rack-${opts.id}-xbeam-${y.toFixed(2)}-${xSign > 0 ? 'r' : 'l'}`,
        { width: RACK_DIMS.profileM, depth: RACK_DIMS.depthM, height: RACK_DIMS.profileM },
        scene,
      );
      xBeam.position = new Vector3(xSign * halfW, y, 0);
      xBeam.material = mats.alumProfile;
      xBeam.parent = root;
    }
  }

  // Beds + LED bars + per-tier point lights.
  const bedAnchors: TransformNode[][] = [];
  const bedMeshes: Mesh[] = [];
  const ledBars: Mesh[] = [];
  const basinLiquids = new Map<string, Mesh>();
  // Collect every net-pot world position across all rafts in this rack;
  // after the per-tier loop we'll thinInstance the single cup base mesh
  // at every collected matrix.
  const netPotMatrices: Matrix[] = [];

  for (let t = 0; t < tiers; t++) {
    const tierY = tierYs[t];
    if (tierY === undefined) continue;
    // tierY is the cross-beam centre. The basin sits DIRECTLY on top of the
    // beam (no clearance) so it reads as a tank placed on the shelf.
    const beamTopY = tierY + RACK_DIMS.profileM / 2;
    const bedSurfaceY = beamTopY + BED_DIMS.heightM / 2;
    const anchorRow: TransformNode[] = [];

    for (let b = 0; b < bedsPerTier; b++) {
      // Front bed at -depthM/4, back bed at +depthM/4 (when bedsPerTier = 2).
      const bedZ = (b - (bedsPerTier - 1) / 2) * (RACK_DIMS.depthM / bedsPerTier);

      // Basin = OPEN-TOP tank: bottom slab + 4 walls. We don't use a single
      // closed box because that would hide the nutrient solution and rafts
      // sitting inside it from above. 5 thin meshes give us a proper tank.
      const basinBottomY = bedSurfaceY - BED_DIMS.heightM / 2;
      const basinTopY = bedSurfaceY + BED_DIMS.heightM / 2;
      const wallThickness = 0.015;
      const slabThickness = 0.01;

      const basinBottom = MeshBuilder.CreateBox(
        `rack-${opts.id}-basin-bottom-t${t}-b${b}`,
        { width: BED_DIMS.widthM, depth: BED_DIMS.depthM, height: slabThickness },
        scene,
      );
      basinBottom.position = new Vector3(0, basinBottomY + slabThickness / 2, bedZ);
      basinBottom.material = mats.basinPVC;
      basinBottom.parent = root;
      basinBottom.receiveShadows = true;
      bedMeshes.push(basinBottom);

      const wallInnerHeight = BED_DIMS.heightM - slabThickness;
      const wallCentreY = basinBottomY + slabThickness + wallInnerHeight / 2;

      // Front + back walls (full bed length). South face (+Z) wears the
      // Reinfa branded variant; back face stays plain PVC.
      for (const wallZ of [
        -BED_DIMS.depthM / 2 + wallThickness / 2,
        +BED_DIMS.depthM / 2 - wallThickness / 2,
      ]) {
        const isSouth = wallZ > 0;
        const wall = MeshBuilder.CreateBox(
          `rack-${opts.id}-basin-wallZ-t${t}-b${b}-${isSouth ? 'b' : 'f'}`,
          { width: BED_DIMS.widthM, depth: wallThickness, height: wallInnerHeight },
          scene,
        );
        wall.position = new Vector3(0, wallCentreY, bedZ + wallZ);
        wall.material = isSouth ? mats.basinPVCBranded : mats.basinPVC;
        wall.parent = root;
        wall.receiveShadows = true;
        bedMeshes.push(wall);
      }
      // Left + right walls (inset by the front/back wall thickness).
      for (const wallX of [
        -BED_DIMS.widthM / 2 + wallThickness / 2,
        +BED_DIMS.widthM / 2 - wallThickness / 2,
      ]) {
        const wall = MeshBuilder.CreateBox(
          `rack-${opts.id}-basin-wallX-t${t}-b${b}-${wallX > 0 ? 'r' : 'l'}`,
          {
            width: wallThickness,
            depth: BED_DIMS.depthM - wallThickness * 2,
            height: wallInnerHeight,
          },
          scene,
        );
        wall.position = new Vector3(wallX, wallCentreY, bedZ);
        wall.material = mats.basinPVC;
        wall.parent = root;
        wall.receiveShadows = true;
        bedMeshes.push(wall);
      }

      // Water surface — sits well inside the basin, halfway up the walls so
      // there's clearly water in the tank.
      const waterY = basinTopY - 0.035;
      const water = MeshBuilder.CreateBox(
        `rack-${opts.id}-water-t${t}-b${b}`,
        {
          width: BED_DIMS.widthM - wallThickness * 2 - 0.005,
          depth: BED_DIMS.depthM - wallThickness * 2 - 0.005,
          height: 0.004,
        },
        scene,
      );
      water.position = new Vector3(0, waterY, bedZ);
      water.material = mats.nutrientWater;
      water.parent = root;
      // Demo controller swaps this mesh's material to reflect live pool EC.
      // Key shape matches the BFF plot suffix convention: `rXX.bN` where N
      // is the 1-based tier index (b1 = lower growing tier, b2 = upper).
      basinLiquids.set(`${opts.id}.b${t}`, water);

      // Floating rafts — SQUARE EPS-foam panels 0.75 m × 0.75 m, FOUR per
      // bed, sitting inside the basin on the nutrient solution (DWC style).
      // Math: bed length 3.20 m, 4 × 0.75 = 3.00 m, leftover 0.20 m
      // distributed across 5 gaps (both ends + 3 between rafts) → 4 cm each.
      // Z-direction: 0.75 m raft in 0.95 m basin → 10 cm inset each side.
      const RAFT_SEGMENTS = 4;
      const raftWidth = 0.75;
      const raftDepth = 0.75;
      const raftThickness = 0.025;
      const spacingTotal = BED_DIMS.widthM - raftWidth * RAFT_SEGMENTS;
      const gap = spacingTotal / (RAFT_SEGMENTS + 1);
      // Raft floats at the water line — half above, half submerged.
      const raftY = waterY + raftThickness * 0.3;
      const startX = -BED_DIMS.widthM / 2 + gap + raftWidth / 2;
      // Net-pot world Y: cup centred so its top sits ~1.5 cm above the raft
      // surface (cup body extends down into the raft + water below).
      const raftTopY = raftY + raftThickness / 2;
      const netPotCentreY = raftTopY - 0.0075; // cup is 4.5 cm tall, ~1.5 cm above
      for (let s = 0; s < RAFT_SEGMENTS; s++) {
        const segX = startX + s * (raftWidth + gap);
        const raft = MeshBuilder.CreateBox(
          `rack-${opts.id}-raft-t${t}-b${b}-s${s}`,
          { width: raftWidth, depth: raftDepth, height: raftThickness },
          scene,
        );
        raft.position = new Vector3(segX, raftY, bedZ);
        raft.material = mats.bedPanel;
        raft.parent = root;
        raft.receiveShadows = true;
        bedMeshes.push(raft);

        // Collect net-pot matrices (RACK-LOCAL coords; thinInstance is
        // parented to root, which already carries the rack's world transform).
        for (const [dx, dz] of NET_POT_HOLES_LOCAL) {
          const pos = new Vector3(segX + dx, netPotCentreY, bedZ + dz);
          netPotMatrices.push(Matrix.Compose(new Vector3(1, 1, 1), Quaternion.Identity(), pos));
        }
      }

      const anchor = new TransformNode(`rack-${opts.id}-anchor-t${t}-b${b}`, scene);
      anchor.parent = root;
      // Plants sit on top of the rafts.
      anchor.position = new Vector3(0, raftY + raftThickness / 2, bedZ);
      anchorRow.push(anchor);
    }
    bedAnchors.push(anchorRow);

    // LED bars — A3-R02-KR03 drawing strip view: 18 × (950 mm × 18 × 18 mm)
    // bars crossing the bed's short (Z) axis, suspended from the
    // underside of the upper tier's cross-beam (or the rack's top frame
    // for the topmost tier) via short alu mounting brackets at each end.
    // This anchors the bars to the frame instead of letting them float
    // in mid-air.
    const upperBeamY = beamYs[t + 1] ?? RACK_DIMS.heightM;
    const ledY = upperBeamY - LED_BAR_DROP_BELOW_UPPER_BEAM_M;
    const bracketTopY = upperBeamY - RACK_DIMS.profileM / 2;
    const LED_COUNT = 18;
    const LED_LENGTH_M = 0.95;
    const LED_PROFILE_M = 0.018;
    const ledSpan = BED_DIMS.widthM * 0.94;
    const bracketHeight = bracketTopY - ledY;
    // bedKey ('b1' / 'b2') derives from tier 1/2 (tier 0 is empty storage,
    // not visible to plot labels but still gets LED bars).
    const bedKey = t === 0 ? null : `b${t}`;
    for (let lr = 0; lr < LED_COUNT; lr++) {
      const ledX = (lr - (LED_COUNT - 1) / 2) * (ledSpan / (LED_COUNT - 1));
      // Plot slot index (0..5) the LED bar sits over. Plot slot spans X
      // of BED_DIMS.widthM/6 centred at slotCentreX.
      const plotSlotX = Math.max(
        0,
        Math.min(5, Math.floor((ledX + BED_DIMS.widthM / 2) / (BED_DIMS.widthM / 6))),
      );
      const ledBar = MeshBuilder.CreateBox(
        `rack-${opts.id}-led-t${t}-r${lr}`,
        { width: LED_PROFILE_M, depth: LED_LENGTH_M, height: LED_PROFILE_M },
        scene,
      );
      ledBar.position = new Vector3(ledX, ledY, 0);
      ledBar.material = mats.ledPink;
      ledBar.parent = root;
      // Metadata: which plot does this LED bar belong to? Demo controller
      // looks this up to swap material for treatment-aware emissive.
      ledBar.metadata = {
        rackId: opts.id,
        tier: t,
        plotSlotX,
        bedKey,
        plotId: bedKey ? `pilot.syd.a.${opts.id}.${bedKey}.p${plotSlotX + 1}` : null,
      };
      ledBars.push(ledBar);

      // Mounting brackets — short alu profile risers at each end of the
      // bar, anchoring it to the underside of the upper cross-beam.
      if (bracketHeight > 0.005) {
        for (const zSign of [-1, 1]) {
          const bracket = MeshBuilder.CreateBox(
            `rack-${opts.id}-led-bracket-t${t}-r${lr}-${zSign > 0 ? 'b' : 'f'}`,
            {
              width: LED_PROFILE_M,
              depth: LED_PROFILE_M,
              height: bracketHeight,
            },
            scene,
          );
          bracket.position = new Vector3(
            ledX,
            ledY + bracketHeight / 2,
            zSign * (LED_LENGTH_M / 2 - LED_PROFILE_M / 2),
          );
          bracket.material = mats.alumProfile;
          bracket.parent = root;
        }
      }
    }

    // Side fans — small fan housing at each end of the bed (front + back),
    // suggesting airflow control along the long bed axis.
    const fanY = bedSurfaceY + 0.05;
    for (const fanX of [-BED_DIMS.widthM / 2 - 0.04, +BED_DIMS.widthM / 2 + 0.04]) {
      for (const fanZ of [-RACK_DIMS.depthM / 2 + 0.08, +RACK_DIMS.depthM / 2 - 0.08]) {
        buildSideFan(
          scene,
          root,
          `rack-${opts.id}-fan-t${t}-${fanX > 0 ? 'r' : 'l'}-${fanZ > 0 ? 'b' : 'f'}`,
          new Vector3(fanX, fanY, fanZ),
        );
      }
    }

    // Two point lights per tier — placed under the bar, scoped to this
    // tier's bed and plant meshes only so we don't blow the 8-light cap on
    // any single fragment. Plants register themselves later via
    // light.includedOnlyMeshes.push(plantMesh).
    for (const xOff of [-BED_DIMS.widthM / 4, BED_DIMS.widthM / 4]) {
      const pl = new PointLight(
        `rack-${opts.id}-led-pl-t${t}-${xOff > 0 ? 'r' : 'l'}`,
        new Vector3(xOff, ledY - 0.05, 0),
        scene,
      );
      pl.intensity = 18;
      pl.range = 1.4;
      pl.diffuse = new Color3(1.0, 0.55, 0.95);
      pl.specular = new Color3(1.0, 0.55, 0.95);
      pl.parent = root;
      // Tag this light so Canvas can drive its intensity from lightFactor.
      // basePeak is the daytime max; nightly it dims to 0.
      pl.metadata = { isGrowLed: true, basePeak: 18 };
      // Scope the LED light to the beds we just created on this tier — plants
      // tack themselves on after they exist.
      const includes: AbstractMesh[] = bedAnchors[t]
        ? // bedAnchors[t] are TransformNodes; the bed meshes are the ones we
          // just pushed into bedMeshes during this same tier iteration.
          bedMeshes.slice(-bedsPerTier)
        : [];
      pl.includedOnlyMeshes = includes;
    }
  }

  // Net-pot thinInstance — one base cup mesh, hundreds of instances across
  // every raft hole in this rack (36 per bed × 6 bed = 216 per rack).
  if (netPotMatrices.length > 0) {
    const netPotBase = buildNetPotBaseMesh(scene, mats.netPotBlack);
    netPotBase.parent = root;
    const buffer = new Float32Array(netPotMatrices.length * 16);
    for (let i = 0; i < netPotMatrices.length; i++) {
      netPotMatrices[i]?.copyToArray(buffer, i * 16);
    }
    netPotBase.thinInstanceSetBuffer('matrix', buffer, 16, true);
    netPotBase.thinInstanceEnablePicking = false;
    bedMeshes.push(netPotBase);
  }

  return {
    root,
    bedAnchors,
    bedMeshes,
    ledBars,
    basinLiquids,
  };
}
