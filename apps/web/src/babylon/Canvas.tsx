// Babylon canvas — WebGPU preferred, WebGL2 fallback.
//
// Scene composition (Phase 3 — aligned to 2D B안 [_reference/2d_layout.pdf]):
//   1. buildRoom         — main grow room shell (4.95 × 3.55 × 3.0 m)
//   2. buildAnnex        — auxiliary room east of main (2.9 × 3.55 × 3.0 m)
//   3. buildRack ×2      — two growing racks in main room centre
//   4. equipment.*       — fertigation, raw water, A/B/pH, bench/sink, humidifier
//                          (CO₂/NDIR/HVAC removed — 2D plan doesn't include them)
//   5. buildPlants       — procedural butter lettuce thinInstances on each bed
//   6. buildLighting     — sun + hemi + 4 ceiling fluorescent spots
//                          (LED point lights are owned by racks.ts)
//
// Camera defaults are tuned so the dollhouse cutaway frames the whole footprint
// (main + annex) in the first paint.
import {
  type AbstractMesh,
  ArcRotateCamera,
  Camera,
  Color3,
  Engine,
  type Mesh,
  type PBRMaterial,
  Scene,
  SpotLight,
  Vector3,
  WebGPUEngine,
} from '@babylonjs/core';
import { type JSX, useEffect, useRef, useState } from 'react';

// Inline diurnal helper to avoid importing sim-models on the web (not in
// the package dep list). Mirrors `lightIntensityFactor` in
// packages/sim-models/src/diurnal.ts.
const HOUR_MS = 3_600_000;
const DAY_MS = 86_400_000;
function lightFactorFromSimMs(simTimeMs: number, lightOnHour = 6, photoperiodH = 16): number {
  const h = (((simTimeMs % DAY_MS) + DAY_MS) % DAY_MS) / HOUR_MS;
  if (h < lightOnHour || h >= lightOnHour + photoperiodH) return 0;
  const t = (h - lightOnHour) / photoperiodH;
  return Math.sin(Math.PI * t) ** 2;
}

import { sceneControls } from '../scene-controls';
import {
  buildBenchAndSink,
  buildBoosterPump,
  buildController,
  buildDoorFrame,
  buildDosingTanks,
  buildEnvProbe,
  buildHumidifier,
  buildHVACCeiling,
  buildInlineSensor,
  buildMixingTank,
  buildMullion,
  buildNutrientTank,
  buildOfficeDesk,
  buildPassThroughPanel,
  buildPeriPod,
  buildPowerOutlets,
  buildRawWaterTank,
  buildROBuffer,
  buildROFilter,
  buildSubmersiblePump,
  buildWorkbench,
  dosingTankTopPositions,
  setDosingLiquidLevel,
} from './equipment';
import { buildFloorGrid } from './floor-grid';
import { applyDiurnalLighting, buildLighting, type BuiltLighting } from './lighting';
import { getLedMaterialForPPFD, getNutrientMaterialForEC } from './materials';
import { buildPiping } from './piping';
import { buildPlants, type PlantsAccessor } from './plants';
import { buildRack } from './racks';
import { ANNEX_DIMS, buildAnnex, buildRoom, ROOM_DIMS } from './room';
import { SCENARIO_FOCUS, type ScenarioId } from './scenario-visuals';

// Shape that Canvas's focus-animation effect reads from scene.metadata.
// Built at scene-build time in the main useEffect; consumed by the
// focus useEffect each animation tick.
interface CanvasFocusGroups {
  readonly ledBarMeshes: readonly Mesh[];
  readonly ledPointLights: readonly {
    intensity: number;
    metadata?: { basePeak?: number; focusMul?: number };
  }[];
  readonly basinLiquidMeshes: readonly Mesh[];
  readonly hvacIndicators: readonly Mesh[];
  readonly dosingLiquidMeshes: readonly Mesh[];
  readonly annexEmissiveMeshes: readonly Mesh[];
  readonly focusSpot: SpotLight;
  readonly pipeline: { imageProcessing: { exposure: number } };
}

// Used as the typeof source for the focus effect's metadata cast.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
let focusGroupsBlock: CanvasFocusGroups;

interface FocusZoneSpec {
  readonly position: Vector3;
  readonly cameraRadius: number;
}

const FOCUS_ZONES: Readonly<Record<ScenarioId, FocusZoneSpec>> = {
  'ec-ph': { position: new Vector3(-1.4, 0.8, 0), cameraRadius: 6 },
  'led-ppfd': { position: new Vector3(0.25, 1.0, 0), cameraRadius: 5.5 },
  'cool-warm-co2': { position: new Vector3(0.25, 1.5, 0), cameraRadius: 6 },
  'crop-compare': { position: new Vector3(0.25, 0.8, 0), cameraRadius: 5 },
};

const DEFAULT_CAMERA_TARGET = {
  alpha: Math.PI / 2 - 0.45,
  beta: Math.PI / 2 - 0.5,
  radius: 9.0,
  targetPos: new Vector3(-1.5, 0.85, -0.2),
} as const;

/** Lerp the scenario focus state into every visual category. Called by
 *  the Canvas animation effect each RAF tick. */
function applyScenarioFocusToGroups(
  groups: CanvasFocusGroups,
  scenarioId: ScenarioId | null,
  t: number,
): void {
  const target = scenarioId
    ? SCENARIO_FOCUS[scenarioId]
    : { pipes: 1, basin: 1, led: 1, plant: 1, hvac: 1, dosingLevels: 1, annexEmissive: 1 };
  const clampedT = Math.max(0, Math.min(1, t));
  const lerp = (to: number): number => 1 + (to - 1) * clampedT;
  const mulPipes = lerp(target.pipes);
  const mulBasin = lerp(target.basin);
  const mulLed = lerp(target.led);
  const mulPlant = lerp(target.plant);
  const mulHvac = lerp(target.hvac);
  const mulDosing = lerp(target.dosingLevels);
  const mulAnnex = lerp(target.annexEmissive);

  // Hand off to the modules that own their per-frame loops.
  const sceneMeta = groups.focusSpot.getScene().metadata as
    | {
        piping?: { setFocusMul?: (mul: number) => void };
        plants?: { setFocusPivot?: (mul: number) => void };
      }
    | undefined;
  sceneMeta?.piping?.setFocusMul?.(mulPipes);
  sceneMeta?.plants?.setFocusPivot?.(mulPlant);

  // LED PointLight intensity = basePeak × current diurnal × focusMul.
  // The diurnal loop owns intensity, so we just stash a multiplier in
  // metadata that applyDiurnalLighting will read on its next tick.
  for (const pl of groups.ledPointLights) {
    pl.metadata = { ...(pl.metadata ?? {}), focusMul: mulLed };
  }

  const scaleEmissive = (meshes: readonly Mesh[], mul: number): void => {
    for (const mesh of meshes) {
      const mat = mesh.material as PBRMaterial | null;
      if (!mat) continue;
      const md = mat.metadata as { baseEmissiveIntensity?: number } | undefined;
      const base = md?.baseEmissiveIntensity ?? mat.emissiveIntensity;
      mat.emissiveIntensity = base * mul;
    }
  };
  scaleEmissive(groups.ledBarMeshes, mulLed);
  scaleEmissive(groups.basinLiquidMeshes, mulBasin);
  scaleEmissive(groups.hvacIndicators, mulHvac);
  scaleEmissive(groups.dosingLiquidMeshes, mulDosing);
  scaleEmissive(groups.annexEmissiveMeshes, mulAnnex);

  // Pipeline exposure: 0.55 baseline → 0.45 at full focus (sceneControls
  // top-view override is applied separately and stacks).
  groups.pipeline.imageProcessing.exposure = 0.55 - 0.1 * clampedT;

  // SpotLight intensity.
  groups.focusSpot.intensity = 1.5 * clampedT;
}

/** Which meshes the focus SpotLight should illuminate for a given
 *  scenario. Keeps the 8-simultaneous-lights cap honoured by scoping. */
function computeEmphasisMeshes(
  groups: CanvasFocusGroups,
  scenarioId: ScenarioId | null,
): AbstractMesh[] {
  if (!scenarioId) return [];
  const target = SCENARIO_FOCUS[scenarioId];
  const out: AbstractMesh[] = [];
  if (target.led > 1) out.push(...groups.ledBarMeshes);
  if (target.basin > 1) out.push(...groups.basinLiquidMeshes);
  if (target.hvac > 1) out.push(...groups.hvacIndicators);
  if (target.dosingLevels > 1) out.push(...groups.dosingLiquidMeshes);
  if (target.annexEmissive > 1) out.push(...groups.annexEmissiveMeshes);
  return out;
}

export interface DemoVisualState {
  /** plotId → colorHealth (0..1) for plant tint. */
  readonly colorHealthByPlot: ReadonlyMap<string, number>;
  /** plotId → PPFD (µmol/m²/s) for treatment-aware LED emissive. */
  readonly ppfdByPlot: ReadonlyMap<string, number>;
  /** rackId.bedKey → T setpoint (°C). Drives HVAC ceiling indicator colour. */
  readonly tByBasin: ReadonlyMap<string, number>;
  /** rackId.bedKey → current pool EC (mS/cm). Drives basin liquid colour. */
  readonly ecByBasin: ReadonlyMap<string, number>;
  /** Treatment-average target EC (mS/cm) — drives supply pipe colour. */
  readonly supplyEC: number;
  /** Treatment-average pool EC (mS/cm) — drives return pipe colour. */
  readonly returnEC: number;
}

export interface NutrientTankLevels {
  /** Remaining fraction (0..1) of each dosing reservoir. */
  readonly stockA: number;
  readonly stockB: number;
  readonly pHAcid: number;
}

export interface CanvasProps {
  /** Optional callback so the parent can react when the engine reports ready. */
  readonly onReady?: (info: { backend: 'webgpu' | 'webgl2'; engine: Engine }) => void;
  /** Latest biomass snapshots (plotId → fraction). The parent owns the WS. */
  readonly plantFractions?: ReadonlyMap<string, number>;
  /** Demo visual state from the scenario runner (Phase E). */
  readonly demoVisuals?: DemoVisualState;
  /** Current simulated time (ms). Drives diurnal lighting. */
  readonly simTimeMs?: number;
  /** Remaining-volume fractions for the three dosing tanks (0..1 each). */
  readonly nutrientTanks?: NutrientTankLevels;
  /** Active scenario id (`'ec-ph'` | …) — drives the focus animation.
   *  `null` when no scenario is playing. */
  readonly scenarioId?: 'ec-ph' | 'led-ppfd' | 'cool-warm-co2' | 'crop-compare' | null;
  /** Whether the scenario is in a focus-active phase ('playing' or
   *  'completing'). When false, focus animates back to t=0. */
  readonly focusActive?: boolean;
}

async function createEngine(canvas: HTMLCanvasElement): Promise<{
  engine: Engine;
  backend: 'webgpu' | 'webgl2';
}> {
  if (typeof navigator !== 'undefined' && 'gpu' in navigator) {
    try {
      const webgpu = new WebGPUEngine(canvas, {
        antialias: true,
        stencil: true,
        adaptToDeviceRatio: true,
      });
      await webgpu.initAsync();
      return { engine: webgpu as unknown as Engine, backend: 'webgpu' };
    } catch {
      // fall through
    }
  }
  const engine = new Engine(canvas, true, {
    preserveDrawingBuffer: true,
    stencil: true,
    adaptToDeviceRatio: true,
  });
  return { engine, backend: 'webgl2' };
}

function buildScene(engine: Engine): Scene {
  const scene = new Scene(engine);

  // Camera — isometric dollhouse framing the whole two-room footprint.
  // The annex sits to the west of the main room (per 2D B안 mapping: office
  // viewer at +Z sees +X on screen-left, so we put 재배실 at +X side and
  // 양액실 at -X side). Combined X extent = annex(2.9) + wall(0.08) +
  // main(4.95) ≈ 7.93 m; combined centre ≈ -1.49.
  const camera = new ArcRotateCamera(
    'camera',
    Math.PI / 2 - 0.45,
    Math.PI / 2 - 0.5,
    9.0,
    new Vector3(-1.5, 0.85, -0.2),
    scene,
  );
  camera.attachControl(true);
  camera.fov = 0.78;
  camera.minZ = 0.05;
  camera.maxZ = 200;
  camera.lowerRadiusLimit = 3;
  camera.upperRadiusLimit = 25;
  camera.wheelDeltaPercentage = 0.015;
  camera.pinchDeltaPercentage = 0.015;
  camera.lowerBetaLimit = 0.15;
  camera.upperBetaLimit = Math.PI / 2 - 0.05;

  // 1. Main grow room shell. Ceiling hidden (always-transparent "lid") and
  // south wall is glass with an external door cut at the dividing-wall (-X)
  // end. West wall is glass (boundary to the annex). No west door — both
  // rooms have separate external entrances on the south side.
  const room = buildRoom(scene, {
    cutawayWall: 'south',
    southGlass: true,
    westGlass: true,
    southDoor: true,
  });

  // 1b. Annex room (2.9 × 3.55 × 3.0) — attached WEST of main room so the
  // office viewer at +Z sees 재배실(+X) on screen-left and 양액실(-X) on
  // screen-right (2D B안). Ceiling hidden + south wall glass to match.
  const annex = buildAnnex(scene, {
    side: 'west',
    cutawayWall: 'south',
    southGlass: true,
  });

  // 1c. Floor tile grid — 50 cm squares drawn as LineSystem on top of the
  // floor. Origin anchored to the main room NW corner (sink side) so cells
  // start clean there; partial cells appear at the opposite edges. Grid
  // spans both rooms; the dividing wall covers the lines crossing it.
  buildFloorGrid(scene, {
    cellSizeM: 0.5,
    origin: { x: +ROOM_DIMS.widthM / 2, z: -ROOM_DIMS.depthM / 2 },
    extent: {
      xMin: -(ROOM_DIMS.widthM / 2 + ROOM_DIMS.wallThicknessM + ANNEX_DIMS.widthM),
      xMax: +ROOM_DIMS.widthM / 2,
      zMin: -ROOM_DIMS.depthM / 2,
      zMax: +ROOM_DIMS.depthM / 2,
    },
  });

  // 2. Racks — Reinfa R02-KR02 spec (3.35 × 1.04 m, single bed per tier).
  // Two separate racks with a 1 m working aisle between them along Z.
  // Each rack is 1.04 m deep → centres at ±1.02 puts a 1 m gap between
  // their near walls. X offset clears the NW-corner sink.
  const RACK_X = 0.25;
  const RACK_N_Z = -1.02;
  const RACK_S_Z = 1.02;
  const rack01 = buildRack(scene, {
    id: 'r01',
    position: new Vector3(RACK_X, 0, RACK_N_Z),
  });
  const rack02 = buildRack(scene, {
    id: 'r02',
    position: new Vector3(RACK_X, 0, RACK_S_Z),
  });

  // 3. Equipment positions — per 2D B안 [_reference/2d_layout.pdf].
  //
  // Mapping (office viewer at +Z, looking -Z):
  //   - Plan LEFT (재배실)  → world +X  (screen left)
  //   - Plan RIGHT (양액실) → world -X  (screen right)
  //   - Plan TOP             → world -Z  (back wall, away from office)
  //   - Plan BOTTOM          → world +Z  (south, office side, camera side)
  //
  // Main room (W=4.95, D=3.55, centre at origin).
  //   North wall strip (left → right in plan = +X → -X in world):
  //     콘센트 → 싱크대 → 수중펌프 → 가습기 → (가벽 → annex)
  //   The fertigation cluster lives in the ANNEX, not the main room.
  //
  // Annex (W=2.9, D=3.55, centred at -4.005 X).
  //   North wall strip: fertigation cabinet (가벽 옆) → 원수탱크 → A/B/pH 탱크.
  //   Outer (west) wall: full-length office desk.
  const W = ROOM_DIMS.widthM;
  const D = ROOM_DIMS.depthM;

  // ── Main room equipment ──────────────────────────────────────────────────
  // Power outlet: 도면 LEFT-TOP corner = world (+W/2, -D/2) corner.
  buildPowerOutlets(scene, [new Vector3(+W / 2 - 0.05, 1.2, -D / 2 + 0.02)]);

  // External doors (per 2D B안 + 3D concept) — both on the south glass wall,
  // sitting flush either side of the dividing wall. Glass+frame visualised
  // via the doorFrame mesh; the wall CSG cut at the same X.
  // The south walls inherit a meeting-room glazing system, so we also add
  // mullions to divide the long glass into individual panes:
  //   • 재배실A 전면 = 유리 3칸 + 유리문 1칸  → 3 mullions
  //   • 재배실B 전면 = 유리문 1칸 + 유리 1칸  → 1 mullion
  //   • 가벽 (A↔B 경계) = 유리 3장             → 2 mullions on Z
  const MULLION_PROFILE = 0.06;
  const ROOM_H = ROOM_DIMS.heightM;
  const mainDoorX = -W / 2 + 0.45; // door width/2 — flush at dividing wall
  const mainSouthZ = +D / 2 + ROOM_DIMS.wallThicknessM / 2 + 0.005;
  buildDoorFrame(scene, new Vector3(mainDoorX, 0, mainSouthZ));
  // Main south wall mullions: door is at X ∈ [-2.475, -1.575], glass spans
  // X ∈ [-1.575, +2.475] (3 panes × 1.35 m wide).
  for (const mx of [-1.575, -0.225, +1.125]) {
    buildMullion(scene, new Vector3(mx, 0, mainSouthZ), { heightM: ROOM_H });
  }

  // 싱크대 — Plan LEFT-TOP corner (=user's top-left). World (+X edge, -Z edge).
  // Bench mesh has sink inset at +X end of its local frame; with our position
  // anchored toward the corner the inset naturally ends up flush with the
  // east wall (now the "screen-left wall" in the viewer's frame).
  const sink = buildBenchAndSink(scene, new Vector3(+W / 2 - 1.0, 0, -D / 2 + 0.4));
  sink.root.scaling = new Vector3(0.5, 1, 1);
  // No rotation needed now — inset's +X end coincides with the corner.

  // 가습기 — further toward annex (-X) but still within main-room north strip.
  const humid = buildHumidifier(scene, new Vector3(+W / 2 - 2.6, 0, -D / 2 + 0.3));

  // ── Annex equipment ──────────────────────────────────────────────────────
  const aW = ANNEX_DIMS.widthM;
  const aD = ANNEX_DIMS.depthM;
  // side='west' → annex centre on -X side.
  const aSign = -1;
  // Direction inside annex from dividing wall toward annex centre.
  const intoAnnex = aSign;
  // "annex local distance from wall" → world Vector3.
  const annexPos = (distFromWall: number, z: number): Vector3 => {
    const wallInnerFace = aSign * (W / 2 + ROOM_DIMS.wallThicknessM);
    return new Vector3(wallInnerFace + intoAnnex * distFromWall, 0, z);
  };

  // ── Annex nutrient room — reference-accurate equipment layout. The
  // legacy buildFertigationCabinet is split into 5 separate units that
  // match commercial products (Bluelab IntelliDose + PeriPod M3,
  // GrowoniX EX-series RO, generic mixing tank, inline EC/pH sensor).
  // Pipe routing rule is enforced in piping.ts: all horizontal runs sit
  // on the floor, vertical drops only happen at equipment surfaces.

  // Row 1 (가벽 쪽, Z ≈ -aD/2 + 1.0): water-prep line.
  //   Raw water tank → submersible pump → RO filter → RO buffer
  const rawWaterPos = annexPos(0.45, -aD / 2 + 1.0);
  const rawWater = buildRawWaterTank(scene, rawWaterPos);
  const pump = buildSubmersiblePump(
    scene,
    new Vector3(rawWaterPos.x + intoAnnex * 0.45, 0, rawWaterPos.z + 0.45),
  );
  const roFilterPos = new Vector3(rawWaterPos.x + intoAnnex * 0.85, 0, rawWaterPos.z);
  const roFilter = buildROFilter(scene, roFilterPos);
  const roBuffer = buildROBuffer(
    scene,
    new Vector3(rawWaterPos.x + intoAnnex * 1.55, 0, rawWaterPos.z),
  );

  // Row 2 (가벽 가까이, Z ≈ -aD/2 + 0.35): dosing + mixing line.
  //   Solution A/B/pH stock tanks → PeriPod M3 → Mixing tank → supply
  const dosingClusterPos = annexPos(0.55, -aD / 2 + 0.3);
  const dosing = buildDosingTanks(scene, dosingClusterPos);
  const peripodPos = new Vector3(dosingClusterPos.x + intoAnnex * 0.55, 0, dosingClusterPos.z);
  const peripod = buildPeriPod(scene, peripodPos);
  const mixingPos = new Vector3(peripodPos.x + intoAnnex * 0.45, 0, peripodPos.z);
  const mixing = buildMixingTank(scene, mixingPos);
  // Booster pump that pushes supply line — kept to drive the inline
  // sensor + pass-through delivery.
  const fertBooster = buildBoosterPump(
    scene,
    new Vector3(mixingPos.x + intoAnnex * 0.35, 0, mixingPos.z),
  );

  // Wall-mounted IntelliDose controller — head-height (Y 1.5m) on the
  // annex side of the dividing wall, just above the mixing tank line.
  const controllerPos = new Vector3(annexPos(0.05, mixingPos.z).x, 1.5, mixingPos.z);
  const controller = buildController(scene, controllerPos);
  // Rotate the controller to face into the annex (-X face shows LCD).
  controller.root.rotation.y = aSign > 0 ? Math.PI : 0;

  // Inline EC/pH sensor housing — sits on the floor pipe between the
  // mixing tank and the pass-through panel.
  const sensorPos = new Vector3(mixingPos.x + intoAnnex * 0.95, 0, mixingPos.z);
  const inlineSensor = buildInlineSensor(scene, sensorPos);
  // 책상 — annex's outer wall (away from main room), full depth.
  const desk = buildOfficeDesk(scene, annexPos(aW - 0.35, 0), {
    lengthM: aD - 0.5,
    depthM: 0.6,
  });
  // 작업대 — annex's main-room boundary (가벽 옆 inside annex).
  const workbench = buildWorkbench(scene, annexPos(0.3, +0.4), { lengthM: 1.0 });

  // Annex external door — south wall, flush at the dividing-wall side.
  // The annex south wall CSG cut sits at annexPos(0.45) X, so frame matches.
  const annexDoorX = annexPos(0.45, 0).x;
  const annexSouthZ = +aD / 2 + ANNEX_DIMS.wallThicknessM / 2 + 0.005;
  buildDoorFrame(scene, new Vector3(annexDoorX, 0, annexSouthZ));
  // Annex south wall mullion — divides the door (가벽 side) from the single
  // glass pane on the outer side. Door X range [-3.455, -2.555], glass
  // spans X ∈ [-5.455, -3.455].
  buildMullion(scene, new Vector3(-3.455, 0, annexSouthZ), { heightM: ANNEX_DIMS.heightM });

  // Dividing wall (가벽) mullions — 3 glass panes along Z so two vertical
  // bars sit at Z = ±(D / 6). Wider X profile so the bar protrudes both
  // sides of the partition.
  const dividingX = -W / 2 - ROOM_DIMS.wallThicknessM / 2;
  for (const mz of [-D / 6, +D / 6]) {
    buildMullion(scene, new Vector3(dividingX, 0, mz), {
      heightM: ROOM_H,
      profileX: ROOM_DIMS.wallThicknessM + 2 * MULLION_PROFILE,
      profileZ: MULLION_PROFILE,
    });
  }

  // Pass-through panel on the dividing wall — alu plate that replaces a
  // section of glass so the supply + return mains have a clean crossing
  // point. Lowered to skirting height so the mains run along the FLOOR on
  // both sides of the wall (consistent "floor-fixed plumbing" look).
  const passThrough = buildPassThroughPanel(scene, dividingX, {
    zCentre: -1.0,
    yCentre: 0.3,
    widthZ: 0.7,
    heightY: 0.4,
    holes: [
      { z: -0.15, y: -0.15, radius: 0.04 }, // supply (DN32) — world Y ≈ 0.15
      { z: 0.15, y: -0.15, radius: 0.04 }, // return (DN32) — world Y ≈ 0.15
    ],
  });

  // Nutrient solution tank inside each rack (per 2D 배양액탱크 callout).
  // Anchored to the same RACK_X/RACK_*_Z constants so they follow the racks.
  const nutTank01 = buildNutrientTank(scene, new Vector3(RACK_X, 0, RACK_N_Z));
  const nutTank02 = buildNutrientTank(scene, new Vector3(RACK_X, 0, RACK_S_Z));
  // EC + pH probes — one pair per growing basin (12 basins total = 2 racks ×
  // 2 growing tiers × 6 plots is per-plot; we use per-basin = 4 basins).
  const probesByBasin = new Map<
    string,
    { ec: ReturnType<typeof buildEnvProbe>; ph: ReturnType<typeof buildEnvProbe> }
  >();
  for (const rack of [rack01, rack02]) {
    const rackId = rack === rack01 ? 'r01' : 'r02';
    const rackZ = rack === rack01 ? RACK_N_Z : RACK_S_Z;
    // Tier 1 (middle) + tier 2 (top) basin surface anchors give us Y; basin
    // walls at Z = ±0.475. Place probes inside the basin's north edge.
    for (let t = 1; t <= 2; t++) {
      const tierAnchors = rack.bedAnchors[t];
      const anchor = tierAnchors?.[0];
      if (!anchor) continue;
      anchor.computeWorldMatrix(true);
      const surfaceY = anchor.getAbsolutePosition().y;
      const basinNorthZ = rackZ - 0.4;
      const probeBaseY = surfaceY - 0.08;
      const ec = buildEnvProbe(scene, new Vector3(RACK_X - 1.0, probeBaseY, basinNorthZ), 'EC');
      const ph = buildEnvProbe(
        scene,
        new Vector3(RACK_X - 1.0, probeBaseY, basinNorthZ + 0.04),
        'pH',
      );
      probesByBasin.set(`${rackId}.b${t}`, { ec, ph });
    }
  }

  // Ceiling HVAC units — 4 zones above the racks (2 racks × 2 tiers).
  // Hung at ceiling (~Y 2.8). Indicator is neutral grey until a scenario
  // pushes a treatment-specific T setpoint.
  const hvacCeilingUnits = [
    { x: RACK_X - 1.0, z: RACK_N_Z, label: 'r01-b1' },
    { x: RACK_X + 1.0, z: RACK_N_Z, label: 'r01-b2' },
    { x: RACK_X - 1.0, z: RACK_S_Z, label: 'r02-b1' },
    { x: RACK_X + 1.0, z: RACK_S_Z, label: 'r02-b2' },
  ].map((cfg) => buildHVACCeiling(scene, new Vector3(cfg.x, 2.6, cfg.z)));

  // Recirculation pump beside each nutrient tank (main room).
  const recircPump01 = buildBoosterPump(scene, new Vector3(RACK_X + 0.45, 0, RACK_N_Z));
  const recircPump02 = buildBoosterPump(scene, new Vector3(RACK_X + 0.45, 0, RACK_S_Z));

  // 4. Plants — anchored to each rack's bedAnchors.
  const plants = buildPlants(scene, {
    anchorsByRack: new Map([
      ['r01', rack01.bedAnchors],
      ['r02', rack02.bedAnchors],
    ]),
  });

  // Once plants exist, extend each rack's LED point lights to also illuminate
  // their plant base mesh (otherwise the plants ignore the LED wash).
  for (const rack of [rack01, rack02]) {
    const isR02 = rack === rack02;
    const targetPlantMesh = plants.plantMeshes[isR02 ? 1 : 0];
    if (!targetPlantMesh) continue;
    for (const light of scene.lights) {
      if (light.name.startsWith(`rack-${rack === rack01 ? 'r01' : 'r02'}-led-pl`)) {
        const current: AbstractMesh[] = light.includedOnlyMeshes ?? [];
        light.includedOnlyMeshes = [...current, targetPlantMesh];
      }
    }
  }

  // Collect LED bars from all racks for demo controller lookup.
  const allLedBars: Mesh[] = [...rack01.ledBars, ...rack02.ledBars];
  const hvacIndicators = hvacCeilingUnits.map((h, i) => {
    const cfgs = ['r01.b1', 'r01.b2', 'r02.b1', 'r02.b2'];
    return { basinKey: cfgs[i] ?? 'unknown', indicator: h.indicator };
  });
  // Collect grow-LED PointLights for diurnal lighting hook.
  const ledPointLights = scene.lights.filter((l) => {
    const md = (l as { metadata?: { isGrowLed?: boolean } }).metadata;
    return md?.isGrowLed === true;
  }) as unknown as { intensity: number; metadata?: { basePeak?: number } }[];

  scene.metadata = {
    plants,
    ledBars: allLedBars,
    hvacIndicators,
    ledPointLights,
  };

  // 4b. Piping — 4-colour tube system with DN-standard radii. Routing:
  //   supply: fert → pass-through panel → rack risers → tier branches
  //   return: each bed → floor → nearest nutrient tank (main room internal)
  //   raw:    pump → raw tank → fert (annex internal)
  //   dosing: A/B/pH/EC → fert input (annex internal cluster)
  const bedSurfacePositions: Vector3[] = [];
  const r01TierYs: number[] = [];
  const r02TierYs: number[] = [];
  for (const rack of [rack01, rack02]) {
    const tierBucket = rack === rack01 ? r01TierYs : r02TierYs;
    for (const tierAnchors of rack.bedAnchors) {
      const first = tierAnchors[0];
      if (first) {
        first.computeWorldMatrix(true);
        tierBucket.push(first.getAbsolutePosition().y);
      }
      for (const anchor of tierAnchors) {
        anchor.computeWorldMatrix(true);
        bedSurfacePositions.push(anchor.getAbsolutePosition().clone());
      }
    }
  }

  const dosingTops = dosingTankTopPositions(dosingClusterPos);

  const piping = buildPiping(scene, {
    rawSource: new Vector3(pump.root.position.x, 0.2, pump.root.position.z),
    rawTank: rawWaterPos.add(new Vector3(0, 0.3, 0.3)), // tank side fitting
    roRawIn: roFilter.rawIn,
    roPolishedOut: roFilter.polishedOut,
    roBufferIn: roBuffer.root.position.add(new Vector3(0, 0.2, 0.22)),
    roBufferOut: roBuffer.root.position.add(new Vector3(0, 0.15, -0.22)),
    mixingInlets: mixing.inlets,
    mixingOutlet: mixing.outlet,
    sensorIn: inlineSensor.inPort,
    sensorOut: inlineSensor.outPort,
    peripodIntakes: peripod.intakes,
    peripodOutlets: peripod.outlets,
    beds: bedSurfacePositions,
    nutrientTanks: [new Vector3(RACK_X, 0.2, RACK_N_Z), new Vector3(RACK_X, 0.2, RACK_S_Z)],
    passThroughIn: new Vector3(dividingX - 0.05, 0.15, -1.0),
    passThroughOut: new Vector3(dividingX + 0.05, 0.15, -1.0),
    rackRisers: [
      {
        x: -1.45,
        z: RACK_N_Z,
        yBottom: 0.15,
        yTop: 1.7,
        tierYs: r01TierYs,
        bedX: RACK_X,
      },
      {
        x: -1.45,
        z: RACK_S_Z,
        yBottom: 0.15,
        yTop: 1.7,
        tierYs: r02TierYs,
        bedX: RACK_X,
      },
    ],
    dosingTanks: dosingTops,
  });

  // 5. Lighting.
  const equipmentShellMeshes: Mesh[] = [
    ...controller.meshes,
    ...peripod.meshes,
    ...mixing.meshes,
    ...inlineSensor.meshes,
    ...roFilter.meshes,
    ...rawWater.meshes,
    ...dosing.meshes,
    ...sink.meshes,
    ...humid.meshes,
    ...pump.meshes,
    ...desk.meshes,
    ...workbench.meshes,
    ...nutTank01.meshes,
    ...nutTank02.meshes,
    ...passThrough.meshes,
    ...fertBooster.meshes,
    ...recircPump01.meshes,
    ...recircPump02.meshes,
    ...roBuffer.meshes,
    ...[...probesByBasin.values()].flatMap((p) => [...p.ec.meshes, ...p.ph.meshes]),
    ...hvacCeilingUnits.flatMap((h) => h.meshes),
  ];
  const lighting = buildLighting(scene, engine, {
    roomShellMeshes: [...room.shellMeshes, ...annex.shellMeshes, ...equipmentShellMeshes],
  });
  // Attach lighting to the existing scene metadata so the diurnal hook can
  // mutate intensities each frame without re-querying lights.
  const meta = scene.metadata as Record<string, unknown>;
  meta['lighting'] = lighting;
  // Nutrient subsystem refs — used by the demoVisuals effect to recolour
  // pipes / basins and to drive dosing-tank levels.
  meta['piping'] = piping;
  meta['dosingLevels'] = dosing.levels;
  const basinLiquids = new Map<string, Mesh>();
  for (const [k, v] of rack01.basinLiquids) basinLiquids.set(k, v);
  for (const [k, v] of rack02.basinLiquids) basinLiquids.set(k, v);
  meta['basinLiquids'] = basinLiquids;

  // ── Scenario focus mode plumbing ─────────────────────────────────────
  // A SpotLight pre-built here (intensity 0) is aimed at the active
  // scenario's "focus zone" during playback. scopeFocusSpot restricts
  // it to emphasis-category meshes so we don't blow the 8-light cap.
  const focusSpot = new SpotLight(
    'scenario-focus-spot',
    new Vector3(0, 3.5, 0),
    new Vector3(0, -1, 0),
    Math.PI / 3,
    1.5,
    scene,
  );
  focusSpot.intensity = 0;
  focusSpot.diffuse = new Color3(1, 1, 1);
  focusSpot.range = 4;
  // FocusGroups handles + module hooks — read by scenario-visuals each
  // animation tick. The handles use the LED bar / basin metadata that
  // the demoVisuals effect maintains lazily; the focus loop reads
  // `material.metadata.baseEmissiveIntensity` at apply time.
  const focusGroupsRef = {
    ledBarMeshes: [...((meta['ledBars'] as Mesh[] | undefined) ?? [])],
    ledPointLights: scene.lights.filter((l) => l.name.includes('-led-pl-')) as unknown as {
      intensity: number;
      metadata?: { basePeak?: number; focusMul?: number };
    }[],
    basinLiquidMeshes: [...basinLiquids.values()],
    hvacIndicators: ((meta['hvacIndicators'] as { indicator: Mesh }[] | undefined) ?? []).map(
      (h) => h.indicator,
    ),
    dosingLiquidMeshes: [dosing.levels.stockA, dosing.levels.stockB, dosing.levels.pHAcid],
    annexEmissiveMeshes: [
      ...controller.emissiveMeshes,
      ...peripod.emissiveMeshes,
      ...inlineSensor.emissiveMeshes,
      ...roFilter.emissiveMeshes,
    ],
    focusSpot,
    pipeline: lighting.pipeline,
  };
  meta['focusSpot'] = focusSpot;
  meta['focusGroups'] = focusGroupsRef;

  // ── Scene controls wiring ────────────────────────────────────────────────
  // Base values captured from current scene state — sliders are multipliers
  // around these so default state matches what buildLighting/racks produced.
  const BASE = {
    sun: lighting.sun.intensity,
    hemi: lighting.hemi.intensity,
    bloom: lighting.pipeline.bloomWeight,
    spot: 1.3, // matches lighting.ts SpotLight intensity
    led: 4.5, // matches racks.ts PointLight intensity
  };
  const ledLights = scene.lights.filter((l) => l.name.includes('-led-pl-'));
  const isForeground = (name: string): boolean =>
    name.startsWith('pipe-') ||
    name.startsWith('plant-') ||
    name.startsWith('rack-') ||
    name.startsWith('nutrient-tank') ||
    name.startsWith('deco-hose');

  // ── View mode presets ────────────────────────────────────────────────────
  const VIEW_ISO = {
    alpha: Math.PI / 2 - 0.45,
    beta: Math.PI / 2 - 0.5,
    radius: 9.0,
    target: new Vector3(-1.5, 0.85, -0.2),
  };
  // Top-down orthographic — looking straight down at the room floorplan.
  // beta near 0 = camera above; tiny epsilon avoids the singularity at exact 0
  // (Babylon's lookAt matrix goes NaN when forward ∥ up).
  // alpha matches the iso preset's sign so screen left/right stays consistent
  // with the +X = screen-left (재배실), -X = screen-right (양액실) mapping.
  const VIEW_TOP = {
    alpha: Math.PI / 2,
    beta: 1e-5,
    radius: 10.0,
    target: new Vector3(-1.5, 0, 0),
    // Frustum dimensions tuned so the whole 2-room footprint
    // (X ≈ -5.5 ~ +2.5, Z ≈ -1.8 ~ +1.8) fits with margin.
    halfH: 3.2,
  };

  const applyOrthoFrustum = (): void => {
    const aspect = engine.getRenderWidth() / Math.max(1, engine.getRenderHeight());
    const halfH = VIEW_TOP.halfH;
    const halfW = halfH * aspect;
    camera.orthoLeft = -halfW;
    camera.orthoRight = halfW;
    camera.orthoTop = halfH;
    camera.orthoBottom = -halfH;
  };

  const applyControls = (): void => {
    const c = sceneControls.current;
    // Ambient — slider 0..1, default 0.7 → multiplier 0..2.0 around base.
    const ambientMul = c.ambient * 2;
    lighting.sun.intensity = BASE.sun * ambientMul;
    lighting.hemi.intensity = BASE.hemi * ambientMul;
    // LED — slider 0..1.5, scale base intensity.
    for (const pl of ledLights) pl.intensity = BASE.led * c.led;
    // Bloom — slider 0..1, default 0.5 → 1.0× base. Flow mode boost ×1.5.
    const bloomMul = c.bloom * 2 * (c.flowMode ? 1.5 : 1);
    lighting.pipeline.bloomWeight = BASE.bloom * bloomMul;
    // Flow mode dims ceiling and backgrounds, keeps piping/plants/racks crisp.
    const spotMul = c.flowMode ? 0.4 : 1;
    for (const spot of lighting.ceilingFluorescents) spot.intensity = BASE.spot * spotMul;
    const bgVisibility = c.flowMode ? 0.45 : 1;
    for (const mesh of scene.meshes) {
      if (!isForeground(mesh.name)) mesh.visibility = bgVisibility;
    }
    // ── View mode ──────────────────────────────────────────────────────────
    const isTop = c.viewMode === 'top';
    if (isTop) {
      camera.mode = Camera.ORTHOGRAPHIC_CAMERA;
      camera.alpha = VIEW_TOP.alpha;
      camera.beta = VIEW_TOP.beta;
      camera.target.copyFrom(VIEW_TOP.target);
      camera.radius = VIEW_TOP.radius;
      applyOrthoFrustum();
    } else {
      camera.mode = Camera.PERSPECTIVE_CAMERA;
      camera.alpha = VIEW_ISO.alpha;
      camera.beta = VIEW_ISO.beta;
      camera.target.copyFrom(VIEW_ISO.target);
      camera.radius = VIEW_ISO.radius;
    }
    // Ceiling + south wall are now always-transparent per spec — handled in
    // buildRoom/buildAnnex (ceiling hidden by default; south walls = glass).
    // Top view only tweaks the post-processing for plan-style readability.
    lighting.pipeline.bloomEnabled = !isTop;
    lighting.pipeline.imageProcessing.exposure = isTop ? 0.75 : 0.9;
    lighting.pipeline.imageProcessing.contrast = isTop ? 1.0 : 1.15;
  };

  applyControls();
  const unsub = sceneControls.subscribe(applyControls);
  // Keep ortho frustum tracking the viewport when the canvas resizes.
  const resizeObs = engine.onResizeObservable.add(() => {
    if (sceneControls.current.viewMode === 'top') applyOrthoFrustum();
  });
  scene.onDisposeObservable.add(() => {
    unsub();
    engine.onResizeObservable.remove(resizeObs);
  });

  return scene;
}

export function BabylonCanvas({
  onReady,
  plantFractions,
  demoVisuals,
  simTimeMs,
  nutrientTanks,
  scenarioId,
  focusActive,
}: CanvasProps): JSX.Element {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const sceneRef = useRef<Scene | null>(null);
  const focusStateRef = useRef<{
    t: number;
    lastScenarioId: ScenarioId | null;
  }>({ t: 0, lastScenarioId: null });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let engineRef: Engine | null = null;
    let cancelled = false;
    let resize: (() => void) | null = null;
    let inspectorToggle: ((e: KeyboardEvent) => void) | null = null;

    void (async () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      try {
        const { engine, backend } = await createEngine(canvas);
        if (cancelled) {
          engine.dispose();
          return;
        }
        engineRef = engine;
        const scene = buildScene(engine);
        sceneRef.current = scene;
        if (import.meta.env.DEV) {
          (window as unknown as { __twinScene__?: Scene }).__twinScene__ = scene;
        }
        engine.runRenderLoop(() => scene.render());
        resize = () => engine.resize();
        window.addEventListener('resize', resize);

        // Dev-only: Shift+I toggles the Babylon Inspector. Lazy-import so
        // the 4 MB inspector isn't shipped to production users.
        if (import.meta.env.DEV) {
          inspectorToggle = (event: KeyboardEvent): void => {
            if (event.shiftKey && (event.key === 'I' || event.key === 'i')) {
              event.preventDefault();
              void (async () => {
                await import('@babylonjs/inspector');
                if (scene.debugLayer.isVisible()) {
                  scene.debugLayer.hide();
                } else {
                  void scene.debugLayer.show({ embedMode: true, overlay: true });
                }
              })();
            }
          };
          window.addEventListener('keydown', inspectorToggle);
        }

        onReady?.({ backend, engine });
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      }
    })();

    return () => {
      cancelled = true;
      if (resize) window.removeEventListener('resize', resize);
      if (inspectorToggle) window.removeEventListener('keydown', inspectorToggle);
      sceneRef.current?.dispose();
      engineRef?.dispose();
    };
  }, [onReady]);

  useEffect(() => {
    if (!plantFractions) return;
    const scene = sceneRef.current;
    if (!scene) return;
    const meta = scene.metadata as { plants?: PlantsAccessor } | undefined;
    if (!meta?.plants) return;
    for (const [plotId, fraction] of plantFractions) {
      meta.plants.setFraction(plotId, fraction);
    }
  }, [plantFractions]);

  // Diurnal lighting — drive sun/hemi/ceiling spots/LED PointLights/night
  // ambient by lightFactor (sinusoidal 0..1) from sim time.
  useEffect(() => {
    if (simTimeMs === undefined) return;
    const scene = sceneRef.current;
    if (!scene) return;
    const meta = scene.metadata as
      | {
          lighting?: BuiltLighting;
          ledPointLights?: {
            intensity: number;
            metadata?: { basePeak?: number; focusMul?: number };
          }[];
        }
      | undefined;
    if (!meta?.lighting) return;
    const lf = lightFactorFromSimMs(simTimeMs);
    const proxies = (meta.ledPointLights ?? []).map((l) => ({
      get intensity() {
        return l.intensity;
      },
      set intensity(v: number) {
        l.intensity = v;
      },
      basePeak: l.metadata?.basePeak ?? 8.5,
      focusMul: l.metadata?.focusMul ?? 1,
    }));
    applyDiurnalLighting(meta.lighting, proxies, lf);
  }, [simTimeMs]);

  // Demo visual wiring — colorHealth → plant tint, PPFD → LED material,
  // T setpoint → HVAC indicator. Runs whenever demoVisuals changes.
  useEffect(() => {
    if (!demoVisuals) return;
    const scene = sceneRef.current;
    if (!scene) return;
    const meta = scene.metadata as
      | {
          plants?: PlantsAccessor;
          ledBars?: Mesh[];
          hvacIndicators?: { basinKey: string; indicator: Mesh }[];
          piping?: { setSupplyEC: (ec: number) => void; setReturnEC: (ec: number) => void };
          basinLiquids?: ReadonlyMap<string, Mesh>;
        }
      | undefined;

    if (meta?.plants) {
      for (const [plotId, health] of demoVisuals.colorHealthByPlot) {
        meta.plants.setColorHealth(plotId, health);
      }
    }
    if (meta?.ledBars) {
      // Each LED bar owns a private clone of the PPFD-tinted material so
      // the scenario-focus module can scale its emissive independently
      // without contaminating bars that share the same PPFD bucket.
      // First touch lazily clones from the shared cache; subsequent
      // touches only copy albedo/emissiveColor (intensity is owned by
      // focus).
      for (const bar of meta.ledBars) {
        const md = bar.metadata as { plotId?: string | null } | undefined;
        if (!md?.plotId) continue;
        const ppfd = demoVisuals.ppfdByPlot.get(md.plotId);
        if (ppfd === undefined) continue;
        const sharedMat = getLedMaterialForPPFD(scene, ppfd);
        const current = bar.material as PBRMaterial | null;
        const isClone =
          (current?.metadata as { isLedBarClone?: boolean } | undefined)?.isLedBarClone === true;
        if (!isClone) {
          const cloneName = `${sharedMat.name}-${bar.name}`;
          const fresh = sharedMat.clone(cloneName);
          if (fresh) {
            fresh.metadata = {
              isLedBarClone: true,
              baseEmissiveIntensity: fresh.emissiveIntensity,
            };
            bar.material = fresh;
          }
        } else if (current) {
          current.albedoColor.copyFrom(sharedMat.albedoColor);
          current.emissiveColor.copyFrom(sharedMat.emissiveColor);
          // Refresh base intensity so focus multiplier scales the
          // *current* PPFD's brightness, not a stale snapshot.
          current.metadata = {
            ...(current.metadata as object),
            baseEmissiveIntensity: sharedMat.emissiveIntensity,
          };
          // Keep emissiveIntensity in sync with base × current focus mul.
          // The scenario-focus loop owns the real value; on the next
          // tick it will overwrite to base * mul. Here we just ensure
          // the base reflects the new PPFD.
        }
      }
    }
    if (meta?.hvacIndicators) {
      for (const { basinKey, indicator } of meta.hvacIndicators) {
        const t = demoVisuals.tByBasin.get(basinKey);
        const mat = indicator.material as PBRMaterial | null;
        if (!mat) continue;
        // Phase E-I: emissive strengths boosted ×2 so day mode reads clearly.
        if (t === undefined) {
          mat.emissiveColor = new Color3(0.5, 0.5, 0.5);
          mat.emissiveIntensity = 0.5;
        } else if (t <= 18) {
          mat.emissiveColor = new Color3(0.25, 0.55, 1.0);
          mat.emissiveIntensity = 2.2;
        } else if (t >= 22) {
          mat.emissiveColor = new Color3(1.0, 0.35, 0.25);
          mat.emissiveIntensity = 2.2;
        } else {
          mat.emissiveColor = new Color3(0.7, 0.7, 0.7);
          mat.emissiveIntensity = 0.8;
        }
      }
    }
    // Pipe colour = EC. Supply uses treatment target, return uses live pool avg.
    meta?.piping?.setSupplyEC(demoVisuals.supplyEC);
    meta?.piping?.setReturnEC(demoVisuals.returnEC);
    // Basin liquid material per pool EC. Same lazy-clone pattern as the
    // LED bars — each basin keeps its own material so focus emissive
    // scaling never bleeds across basins that happen to share an EC.
    if (meta?.basinLiquids) {
      for (const [basinKey, mesh] of meta.basinLiquids) {
        const ec = demoVisuals.ecByBasin.get(basinKey);
        if (ec === undefined) continue;
        const sharedMat = getNutrientMaterialForEC(scene, ec);
        const current = mesh.material as PBRMaterial | null;
        const isClone =
          (current?.metadata as { isBasinClone?: boolean } | undefined)?.isBasinClone === true;
        if (!isClone) {
          const cloneName = `mat-basin-${basinKey}`;
          const fresh = sharedMat.clone(cloneName);
          if (fresh) {
            fresh.metadata = {
              isBasinClone: true,
              baseEmissiveIntensity: fresh.emissiveIntensity,
            };
            mesh.material = fresh;
          }
        } else if (current) {
          current.albedoColor.copyFrom(sharedMat.albedoColor);
          current.emissiveColor.copyFrom(sharedMat.emissiveColor);
          current.metadata = {
            ...(current.metadata as object),
            baseEmissiveIntensity: sharedMat.emissiveIntensity,
          };
        }
      }
    }
  }, [demoVisuals]);

  // Dosing tank levels — driven by /nutrient/tanks polling in the parent.
  useEffect(() => {
    if (!nutrientTanks) return;
    const scene = sceneRef.current;
    if (!scene) return;
    const meta = scene.metadata as
      | { dosingLevels?: { stockA: Mesh; stockB: Mesh; pHAcid: Mesh } }
      | undefined;
    if (!meta?.dosingLevels) return;
    setDosingLiquidLevel(meta.dosingLevels.stockA, nutrientTanks.stockA);
    setDosingLiquidLevel(meta.dosingLevels.stockB, nutrientTanks.stockB);
    setDosingLiquidLevel(meta.dosingLevels.pHAcid, nutrientTanks.pHAcid);
  }, [nutrientTanks]);

  // ── Scenario focus animation ────────────────────────────────────────
  // When focusActive flips, animate t over 1 s (smoothstep) between the
  // current focus level and the target. Each tick:
  //   1. read focusGroups + handle metadata
  //   2. call applyScenarioFocus (carries through to piping / plants /
  //      LED / basin / hvac / dosing / annex modules)
  //   3. lerp camera alpha/beta/radius toward the scenario's focus zone
  // visibility guard prevents RAF stalls when tab is backgrounded.
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;
    const groups = (scene.metadata as { focusGroups?: typeof focusGroupsBlock })?.focusGroups;
    if (!groups) return;

    const targetId = focusActive ? (scenarioId ?? null) : null;
    const endT = targetId ? 1 : 0;
    const startT = focusStateRef.current.t;
    const duration = 1000;
    const startMs = performance.now();

    // Scenario-specific focus zone for the SpotLight + camera target.
    const focusZone = targetId ? FOCUS_ZONES[targetId] : null;
    if (focusZone) {
      groups.focusSpot.position.copyFrom(focusZone.position);
      groups.focusSpot.position.y = 3.2;
      // Scope the spot to emphasis meshes so it never busts the 8-light
      // cap on other geometry. Rebuilt here per scenario.
      const emphasisMeshes = computeEmphasisMeshes(groups, targetId);
      groups.focusSpot.includedOnlyMeshes = emphasisMeshes;
    } else {
      groups.focusSpot.includedOnlyMeshes = [];
    }

    // Camera target lerp setup.
    const camera = scene.activeCamera as ArcRotateCamera | null;
    const cameraTarget = focusZone
      ? {
          alpha: Math.PI / 2 - 0.35,
          beta: Math.PI / 2 - 0.6,
          radius: focusZone.cameraRadius,
          targetPos: focusZone.position.clone(),
        }
      : DEFAULT_CAMERA_TARGET;
    const cameraStart = camera
      ? {
          alpha: camera.alpha,
          beta: camera.beta,
          radius: camera.radius,
          targetPos: camera.target.clone(),
        }
      : null;

    let rafId = 0;
    const tick = (): void => {
      if (typeof document !== 'undefined' && document.visibilityState !== 'visible') {
        rafId = requestAnimationFrame(tick);
        return;
      }
      const elapsed = performance.now() - startMs;
      const k = Math.min(1, elapsed / duration);
      const eased = 0.5 * (1 - Math.cos(Math.PI * k));
      const t = startT + (endT - startT) * eased;
      focusStateRef.current.t = t;
      focusStateRef.current.lastScenarioId = targetId;
      try {
        applyScenarioFocusToGroups(groups, targetId, t);
        if (camera && cameraStart) {
          camera.alpha = cameraStart.alpha + (cameraTarget.alpha - cameraStart.alpha) * eased;
          camera.beta = cameraStart.beta + (cameraTarget.beta - cameraStart.beta) * eased;
          camera.radius = cameraStart.radius + (cameraTarget.radius - cameraStart.radius) * eased;
          camera.target.set(
            cameraStart.targetPos.x + (cameraTarget.targetPos.x - cameraStart.targetPos.x) * eased,
            cameraStart.targetPos.y + (cameraTarget.targetPos.y - cameraStart.targetPos.y) * eased,
            cameraStart.targetPos.z + (cameraTarget.targetPos.z - cameraStart.targetPos.z) * eased,
          );
        }
      } catch {
        // HMR or scene rebuild may leave stale mesh refs — skip frame.
      }
      if (k < 1) rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [focusActive, scenarioId]);

  if (error) {
    return (
      <div
        role="alert"
        className="absolute inset-0 grid place-items-center bg-[var(--color-bg)] text-[var(--color-danger-500)]"
      >
        <p>Failed to initialise renderer: {error}</p>
      </div>
    );
  }

  return <canvas ref={canvasRef} className="block size-full outline-none" />;
}
