// Procedural piping for the Reinfa pilot rig.
//
// Routing follows the 2D B안 layout + the pass-through panel on the A/B
// dividing wall (added in this PR). Four pipe classes by size and colour:
//   - Raw water (cyan, DN32)      pump → raw tank → fert (annex internal)
//   - Nutrient supply (green)     fert → pass-through → rack riser → tier branches
//                                 DN32 main → DN25 riser → DN20 branch
//   - Drain return (magenta, DN32) bed → floor → nearest nutrient tank (main room)
//   - Dosing (yellow, DN16)       A/B/pH/EC tanks → fert input (annex internal cluster)
//
// Tubes are Babylon `MeshBuilder.CreateTube` with disable-lighting emissive
// PBR materials so the lines read clearly from the orbit camera without
// fussing about per-bend shadowing. Flow-mode pulses emissive intensity
// per-colour via `scene.onBeforeRenderObservable`.
import {
  Color3,
  type Mesh,
  MeshBuilder,
  PBRMaterial,
  type Scene,
  TransformNode,
  Vector3,
} from '@babylonjs/core';

import { sceneControls } from '../scene-controls';

/** Standard PVC outside diameters (metres). Tube `radius` = OD / 2. */
const PIPE_OD = {
  /** DN32 — annex→pass-through, return main. */
  MAIN: 0.032,
  /** DN25 — rack vertical riser. */
  RISER: 0.025,
  /** DN20 — riser→bed inlet, return branch. */
  BRANCH: 0.02,
  /** DN16 — dosing tank → fert input. */
  DOSING: 0.016,
} as const;

const od = (k: keyof typeof PIPE_OD): number => PIPE_OD[k] / 2;

/** Floor height for ground-running pipes. */
const FLOOR_RUN_Y = 0.08;

export interface RackRiser {
  /** Riser column X position (typically just outside the rack west frame). */
  readonly x: number;
  /** Riser column Z position (= rack centre Z). */
  readonly z: number;
  /** Riser bottom Y (floor entry). */
  readonly yBottom: number;
  /** Riser top Y (above top tier). */
  readonly yTop: number;
  /** Bed surface Y per tier — branches leave the riser at these heights. */
  readonly tierYs: readonly number[];
  /** Bed X centre — branches enter the bed at this X. */
  readonly bedX: number;
}

export interface PipingEndpoints {
  /** Raw water source (e.g. submersible pump inside the raw tank). */
  readonly rawSource: Vector3;
  /** Raw water sink (raw tank inlet). */
  readonly rawTank: Vector3;
  /** RO filter — raw water input port (side fitting at floor level). */
  readonly roRawIn: Vector3;
  /** RO filter — polished water output port. */
  readonly roPolishedOut: Vector3;
  /** RO buffer tank — input port (side fitting). */
  readonly roBufferIn: Vector3;
  /** RO buffer tank — output to mixing tank. */
  readonly roBufferOut: Vector3;
  /** Mixing tank inlets — RO + Solution A/B + pH acid. */
  readonly mixingInlets: {
    readonly ro: Vector3;
    readonly stockA: Vector3;
    readonly stockB: Vector3;
    readonly pHAcid: Vector3;
  };
  /** Mixing tank outlet — feeds the supply line. */
  readonly mixingOutlet: Vector3;
  /** Inline EC/pH sensor housing — inline on the supply line. */
  readonly sensorIn: Vector3;
  readonly sensorOut: Vector3;
  /** PeriPod dosing pump outlets — small tubes that exit the pump body
   *  and feed the corresponding mixing-tank inlet on the floor. */
  readonly peripodOutlets: {
    readonly stockA: Vector3;
    readonly stockB: Vector3;
    readonly pHAcid: Vector3;
  };
  /** PeriPod intakes — pull from the stock tanks on the back face. */
  readonly peripodIntakes: {
    readonly stockA: Vector3;
    readonly stockB: Vector3;
    readonly pHAcid: Vector3;
  };
  /** Bed surface centres (top, world coords) for drain return endpoints. */
  readonly beds: readonly Vector3[];
  /** Nutrient tanks inside racks — drain return endpoint. */
  readonly nutrientTanks: readonly Vector3[];
  /** Annex-side face of the pass-through panel (X just west of dividing wall). */
  readonly passThroughIn: Vector3;
  /** Main-room face of the pass-through panel (X just east of dividing wall). */
  readonly passThroughOut: Vector3;
  /** Rack risers — one entry per rack. */
  readonly rackRisers: readonly RackRiser[];
  /** Dosing stock tank tops (A/B/pH) — each feeds the PeriPod intake. */
  readonly dosingTanks: readonly Vector3[];
}

export interface BuiltPiping {
  readonly root: TransformNode;
  readonly meshes: Mesh[];
  /** Update supply pipe colour to reflect the current target EC (fresh nutrients). */
  setSupplyEC: (ec: number) => void;
  /** Update return pipe colour to reflect the average pool EC (depleted). */
  setReturnEC: (ec: number) => void;
  /** Scenario focus multiplier — multiplies the *base* tint colour each
   *  frame inside the existing emissive-pulse loop. Default 1. ec-ph
   *  scenario sets this to 10 to make pipes the brightest things in the
   *  room; led-ppfd sets it to 0.1 to fade pipes out. */
  setFocusMul: (mul: number) => void;
}

const NUTRIENT_LOW_COL = new Color3(0.55, 0.85, 0.78);
const NUTRIENT_HIGH_COL = new Color3(0.18, 0.42, 0.55);

function colourForEC(ec: number): Color3 {
  const clamped = Math.max(0.5, Math.min(3.0, ec));
  const t = (clamped - 0.5) / (3.0 - 0.5);
  return Color3.Lerp(NUTRIENT_LOW_COL, NUTRIENT_HIGH_COL, t);
}

function makeLineMat(scene: Scene, name: string, colour: Color3): PBRMaterial {
  const mat = new PBRMaterial(name, scene);
  mat.albedoColor = colour;
  mat.emissiveColor = colour.scale(0.5);
  mat.emissiveIntensity = 0.8;
  mat.metallic = 0.1;
  mat.roughness = 0.45;
  mat.disableLighting = true;
  mat.maxSimultaneousLights = 8;
  return mat;
}

function tube(scene: Scene, name: string, path: Vector3[], mat: PBRMaterial, radius: number): Mesh {
  const t = MeshBuilder.CreateTube(name, { path, radius, tessellation: 10 }, scene);
  t.material = mat;
  t.isPickable = false;
  return t;
}

/** Right-angle path between two points at a fixed Y. Used only for
 *  pipes that legitimately stay at the same Y — most cases should use
 *  `floorRoute` so the run is anchored to FLOOR_RUN_Y. */
function rightAngle(from: Vector3, to: Vector3, y: number): Vector3[] {
  return [new Vector3(from.x, y, from.z), new Vector3(to.x, y, from.z), new Vector3(to.x, y, to.z)];
}

/**
 * Connect two surface points via a clean floor-only horizontal run:
 *   from → wallDrop down to floor → right-angle along floor → wallDrop
 *   up to the target.
 *
 * This is the single canonical helper for any piping that crosses the
 * room — there must NOT be any free-floating horizontal runs above the
 * floor. Vertical drops only happen at the equipment surfaces that
 * `from` and `to` point at.
 */
function floorRoute(from: Vector3, to: Vector3, floorY = FLOOR_RUN_Y): Vector3[] {
  return [
    from.clone(),
    new Vector3(from.x, floorY, from.z),
    new Vector3(to.x, floorY, from.z),
    new Vector3(to.x, floorY, to.z),
    to.clone(),
  ];
}

// Note: a standalone `wallDrop(surfacePoint, floorY)` helper was
// considered but every current caller goes through `floorRoute`, which
// already emits the wall-drop legs at both endpoints. Re-introduce it
// if a single-leg drop becomes needed (e.g. a tap on a vertical wall
// with no horizontal segment).

export function buildPiping(scene: Scene, ep: PipingEndpoints): BuiltPiping {
  const root = new TransformNode('piping', scene);
  const meshes: Mesh[] = [];

  // "Original" colours track the EC ramp (setSupplyEC/setReturnEC update
  // them). The per-frame onBeforeRender loop derives the emissive from
  // these *plus* the scenario focus multiplier — focus never writes
  // directly to baseSupply/baseReturn so there's no race with the pulse.
  const originalSupplyColor = colourForEC(2.0);
  const originalReturnColor = colourForEC(1.6);
  const baseRaw = new Color3(0.3, 0.68, 0.88);
  const baseSupply = originalSupplyColor.clone();
  const baseReturn = originalReturnColor.clone();
  const baseDosing = new Color3(0.95, 0.78, 0.2);
  const rawMat = makeLineMat(scene, 'mat-pipe-raw', baseRaw);
  const supplyMat = makeLineMat(scene, 'mat-pipe-supply', baseSupply);
  const returnMat = makeLineMat(scene, 'mat-pipe-return', baseReturn);
  const dosingMat = makeLineMat(scene, 'mat-pipe-dosing', baseDosing);

  // Single source of truth for the scenario focus multiplier. Default 1.
  let focusMul = 1;

  // Flow-mode pulse — phase-shifted sin per colour so the lines chase each
  // other when flowMode is on. Off-state keeps a low-amp shimmer so lines
  // stay legible. focusMul scales the *base* tint, propagating through
  // both albedo (next pulse-tick) and emissive (this tick).
  scene.onBeforeRenderObservable.add(() => {
    const ctrl = sceneControls.current;
    const t = performance.now() * 0.001;
    const amp = ctrl.flowMode ? 0.7 : 0.15;
    const base = ctrl.flowMode ? 0.4 : 0.3;
    // Refresh the tint colours from their source × focusMul each frame —
    // setSupplyEC may have rewritten the source on a previous tick.
    baseSupply.copyFrom(originalSupplyColor).scaleInPlace(focusMul);
    baseReturn.copyFrom(originalReturnColor).scaleInPlace(focusMul);
    const k = (phase: number): number =>
      (base + amp * (0.5 + 0.5 * Math.sin(t * 4 + phase))) * focusMul;
    rawMat.emissiveColor = baseRaw.scale(k(0));
    supplyMat.emissiveColor = originalSupplyColor.scale(k(2));
    returnMat.emissiveColor = originalReturnColor.scale(k(4));
    dosingMat.emissiveColor = baseDosing.scale(k(3));
  });

  // ── Raw water (cyan, DN32) — pump → raw tank → RO filter raw input.
  // Pump source is below water level; both ends already at floor or below.
  const rawA = tube(
    scene,
    'pipe-raw-pump-tank',
    rightAngle(ep.rawSource, ep.rawTank, FLOOR_RUN_Y),
    rawMat,
    od('MAIN'),
  );
  rawA.parent = root;
  meshes.push(rawA);

  // Raw tank side → RO filter raw input (both side fittings). Uses
  // floorRoute so any X/Z offset is handled by a single floor segment.
  const rawB = tube(
    scene,
    'pipe-raw-tank-ro',
    floorRoute(ep.rawTank, ep.roRawIn),
    rawMat,
    od('MAIN'),
  );
  rawB.parent = root;
  meshes.push(rawB);

  // ── RO polished water (cyan, DN25) — RO filter output → buffer in.
  const roA = tube(
    scene,
    'pipe-ro-out-buffer',
    floorRoute(ep.roPolishedOut, ep.roBufferIn),
    rawMat,
    od('RISER'),
  );
  roA.parent = root;
  meshes.push(roA);

  // RO buffer output → mixing tank's RO inlet.
  const roB = tube(
    scene,
    'pipe-ro-buffer-mixing',
    floorRoute(ep.roBufferOut, ep.mixingInlets.ro),
    rawMat,
    od('RISER'),
  );
  roB.parent = root;
  meshes.push(roB);

  // ── Dosing (yellow, DN16) — three concentrate paths.
  //   Stock tank top → wallDrop down to floor → floor segment → wallDrop
  //   up to PeriPod back-face intake → (inside PeriPod) → floor wallDrop
  //   from PeriPod outlet → floor segment → wallDrop up to mixing tank
  //   inlet on the rim.
  // This is the routing rule the user demanded: pipes hug the floor and
  // only rise at the equipment surface they enter.
  const dosingPaths: { name: string; from: Vector3; to: Vector3 }[] = [
    // Stock tanks → PeriPod intakes (3).
    {
      name: 'pipe-dosing-stockA-in',
      from: ep.dosingTanks[0] ?? ep.rawTank,
      to: ep.peripodIntakes.stockA,
    },
    {
      name: 'pipe-dosing-stockB-in',
      from: ep.dosingTanks[1] ?? ep.rawTank,
      to: ep.peripodIntakes.stockB,
    },
    {
      name: 'pipe-dosing-pH-in',
      from: ep.dosingTanks[2] ?? ep.rawTank,
      to: ep.peripodIntakes.pHAcid,
    },
    // PeriPod outlets → mixing tank rim inlets (3).
    { name: 'pipe-dosing-stockA-out', from: ep.peripodOutlets.stockA, to: ep.mixingInlets.stockA },
    { name: 'pipe-dosing-stockB-out', from: ep.peripodOutlets.stockB, to: ep.mixingInlets.stockB },
    { name: 'pipe-dosing-pH-out', from: ep.peripodOutlets.pHAcid, to: ep.mixingInlets.pHAcid },
  ];
  for (const d of dosingPaths) {
    const t = tube(scene, d.name, floorRoute(d.from, d.to), dosingMat, od('DOSING'));
    t.parent = root;
    meshes.push(t);
  }

  // ── Supply (green) — mixing tank outlet → inline sensor → pass-through → racks.
  const supplyY = ep.passThroughIn.y;

  // Segment 1: mixing-tank outlet → inline sensor (annex side, floor).
  const mixingToSensor = tube(
    scene,
    'pipe-supply-mixing-sensor',
    floorRoute(ep.mixingOutlet, ep.sensorIn),
    supplyMat,
    od('MAIN'),
  );
  mixingToSensor.parent = root;
  meshes.push(mixingToSensor);

  // Segment 2: sensor out → pass-through inlet (still annex side).
  const sensorToPassThrough = tube(
    scene,
    'pipe-supply-sensor-passthrough',
    floorRoute(ep.sensorOut, new Vector3(ep.passThroughIn.x, supplyY, ep.passThroughIn.z)),
    supplyMat,
    od('MAIN'),
  );
  sensorToPassThrough.parent = root;
  meshes.push(sensorToPassThrough);

  // Segment 2 (DN32 MAIN): pass-through bridge — straight across the panel.
  const bridgeTube = tube(
    scene,
    'pipe-supply-bridge',
    [ep.passThroughIn.clone(), ep.passThroughOut.clone()],
    supplyMat,
    od('MAIN'),
  );
  bridgeTube.parent = root;
  meshes.push(bridgeTube);

  // Segment 3 (DN32 MAIN): main-room entry → horizontal to riser column,
  // then split N/S to each rack riser top.
  if (ep.rackRisers.length > 0) {
    // First leg: pass-through out → riser column X at headerZ = passThroughOut.z.
    const headerEntry = new Vector3(
      ep.rackRisers[0]?.x ?? ep.passThroughOut.x,
      supplyY,
      ep.passThroughOut.z,
    );
    const entryTube = tube(
      scene,
      'pipe-supply-entry',
      [ep.passThroughOut.clone(), headerEntry.clone()],
      supplyMat,
      od('MAIN'),
    );
    entryTube.parent = root;
    meshes.push(entryTube);

    // Per-rack branch: header entry → riser top Z → vertical riser → tier branches.
    for (let r = 0; r < ep.rackRisers.length; r++) {
      const riser = ep.rackRisers[r];
      if (!riser) continue;

      // T-junction trunk: along Z from headerEntry.z to riser.z at riser.x.
      const trunkPath = [
        new Vector3(riser.x, supplyY, headerEntry.z),
        new Vector3(riser.x, supplyY, riser.z),
      ];
      const trunk = tube(scene, `pipe-supply-trunk-${r}`, trunkPath, supplyMat, od('MAIN'));
      trunk.parent = root;
      meshes.push(trunk);

      // Vertical riser (DN25): from supplyY down to yBottom, up to yTop.
      const riserPath = [
        new Vector3(riser.x, riser.yBottom, riser.z),
        new Vector3(riser.x, riser.yTop, riser.z),
      ];
      const riserTube = tube(scene, `pipe-supply-riser-${r}`, riserPath, supplyMat, od('RISER'));
      riserTube.parent = root;
      meshes.push(riserTube);

      // Tier branches (DN20): for each tier, from riser to bed inlet at bed surface Y.
      for (let t = 0; t < riser.tierYs.length; t++) {
        const tierY = riser.tierYs[t];
        if (tierY === undefined) continue;
        const branchPath = [
          new Vector3(riser.x, tierY, riser.z),
          new Vector3(riser.bedX, tierY, riser.z),
        ];
        const branch = tube(
          scene,
          `pipe-supply-branch-r${r}-t${t}`,
          branchPath,
          supplyMat,
          od('BRANCH'),
        );
        branch.parent = root;
        meshes.push(branch);
      }
    }
  }

  // ── Return (magenta, DN32 main + DN20 branch) — each bed → nearest tank.
  for (let i = 0; i < ep.beds.length; i++) {
    const bed = ep.beds[i];
    if (!bed) continue;
    let best = ep.nutrientTanks[0];
    let bestDist = Infinity;
    for (const tank of ep.nutrientTanks) {
      const dx = tank.x - bed.x;
      const dz = tank.z - bed.z;
      const d = dx * dx + dz * dz;
      if (d < bestDist) {
        bestDist = d;
        best = tank;
      }
    }
    if (!best) continue;
    const path = [
      new Vector3(bed.x, bed.y - 0.05, bed.z),
      new Vector3(bed.x, FLOOR_RUN_Y, bed.z),
      new Vector3(bed.x, FLOOR_RUN_Y, best.z),
      new Vector3(best.x, FLOOR_RUN_Y, best.z),
    ];
    const ret = tube(scene, `pipe-return-bed-${i}`, path, returnMat, od('MAIN'));
    ret.parent = root;
    meshes.push(ret);
  }

  // Flow-mode also bumps tube scale so the lines visually pop.
  scene.onBeforeRenderObservable.add(() => {
    const fm = sceneControls.current.flowMode;
    const target = fm ? 1.25 : 1.0;
    for (const m of meshes) {
      if (Math.abs(m.scaling.x - target) > 0.01) {
        m.scaling.set(target, target, target);
      }
    }
  });

  const setSupplyEC = (ec: number): void => {
    const c = colourForEC(ec);
    originalSupplyColor.copyFrom(c);
    supplyMat.albedoColor.copyFrom(c).scaleInPlace(focusMul);
  };
  const setReturnEC = (ec: number): void => {
    const c = colourForEC(ec);
    originalReturnColor.copyFrom(c);
    returnMat.albedoColor.copyFrom(c).scaleInPlace(focusMul);
  };
  const setFocusMul = (mul: number): void => {
    focusMul = Math.max(0, mul);
    // Refresh albedo immediately — the onBeforeRender loop only updates
    // emissive each tick. Albedo would otherwise lag by one EC update.
    supplyMat.albedoColor.copyFrom(originalSupplyColor).scaleInPlace(focusMul);
    returnMat.albedoColor.copyFrom(originalReturnColor).scaleInPlace(focusMul);
    rawMat.albedoColor.copyFrom(baseRaw).scaleInPlace(focusMul);
    dosingMat.albedoColor.copyFrom(baseDosing).scaleInPlace(focusMul);
  };

  return { root, meshes, setSupplyEC, setReturnEC, setFocusMul };
}
