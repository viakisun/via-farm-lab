// Cinematic lighting + post-processing rig.
//
// Light budget (room-wide):
//   - 1 HemisphericLight (soft sky/ground fill)
//   - 1 DirectionalLight  (sun, through the north window)
//   - 4 ceiling fluorescent SpotLights (3 in the growing zone, 1 in service)
//   - LED PointLights are built by racks.ts (8 total, scoped to their tier)
//
// Each fluorescent SpotLight is given includedOnlyMeshes so it only illuminates
// the immediate floor/wall area beneath it — combined with sun + hemi, no
// individual mesh should see more than ~4-5 simultaneous lights, comfortably
// under the maxSimultaneousLights = 8 cap set in materials.ts.
import {
  Color3,
  Color4,
  DefaultRenderingPipeline,
  DirectionalLight,
  type Engine,
  HemisphericLight,
  type Mesh,
  MeshBuilder,
  type Scene,
  ShadowGenerator,
  SpotLight,
  Vector3,
} from '@babylonjs/core';

import { getMaterials } from './materials';
import { ROOM_DIMS } from './room';

export interface BuildLightingOptions {
  /**
   * Meshes the fluorescent ceiling spots should illuminate (room shell —
   * floor + walls). Equipment that lives in the service zone is added by
   * Canvas.tsx after the scene is built.
   */
  readonly roomShellMeshes: readonly Mesh[];
}

export interface BuiltLighting {
  readonly sun: DirectionalLight;
  readonly hemi: HemisphericLight;
  readonly ceilingFluorescents: readonly SpotLight[];
  /** Night-mode emergency ambient: HemisphericLight with cool blue diffuse.
   *  Driven by (1 − lightFactor) so the room is dimly visible even when LEDs off. */
  readonly nightAmbient: HemisphericLight;
  /** 4 corner cool-white emissive boxes that stay on even at night. */
  readonly emergencyCornerLights: readonly Mesh[];
  readonly pipeline: DefaultRenderingPipeline;
  readonly shadowGenerator: ShadowGenerator;
}

/** Hemi day diffuse → blue tint at night for the nightAmbient light. */
const DAY_DIFFUSE = new Color3(0.92, 0.94, 1.0);
const NIGHT_DIFFUSE = new Color3(0.18, 0.28, 0.48);

const SHADOW_MAP_SIZE = 1024;

export function buildLighting(
  scene: Scene,
  engine: Engine,
  opts: BuildLightingOptions,
): BuiltLighting {
  // Dark interior — viewer should perceive a dim room dominated by the
  // grow LEDs, not a brightly-lit office. Sky behind the window stays a
  // muted dark blue so the silhouette of the skyline reads, but it
  // shouldn't wash the room.
  scene.clearColor = new Color4(0.05, 0.07, 0.11, 1.0);
  scene.ambientColor = new Color3(0.01, 0.01, 0.02);

  // Ambient fill is ~1/10 of the previous tuning so the LED pinks read
  // as the dominant light. lightFactor still ramps day/night in
  // applyDiurnalLighting below.
  const hemi = new HemisphericLight('hemi', new Vector3(0, 1, 0), scene);
  hemi.intensity = 0.008;
  hemi.diffuse = DAY_DIFFUSE.clone();
  hemi.groundColor = new Color3(0.02, 0.02, 0.03);

  const sun = new DirectionalLight('sun', new Vector3(0.3, -0.85, 0.55), scene);
  sun.intensity = 0.005;
  sun.diffuse = new Color3(1.0, 0.96, 0.88);
  sun.specular = new Color3(0.05, 0.05, 0.05);
  sun.position = new Vector3(-1.5, 5.5, -3.5);

  // Night-mode HemisphericLight — cool blue, off during the day, fades in
  // when lightFactor drops. Keeps the room visible after LED off.
  const nightAmbient = new HemisphericLight('nightAmbient', new Vector3(0, 1, 0), scene);
  nightAmbient.intensity = 0;
  nightAmbient.diffuse = NIGHT_DIFFUSE.clone();
  nightAmbient.groundColor = new Color3(0.05, 0.08, 0.15);

  const shadowGenerator = new ShadowGenerator(SHADOW_MAP_SIZE, sun);
  shadowGenerator.usePercentageCloserFiltering = true;
  shadowGenerator.bias = 0.005;
  shadowGenerator.normalBias = 0.02;

  // Ceiling fluorescent fixtures intentionally removed — the LED grow
  // bars (and the night-mode emergency LEDs) are the only lights in
  // this room. Adding white fluorescent panels overhead drew the eye
  // away from the LED pink and broke the CEA-lab feel. The array stays
  // here so future fixtures can be added without re-wiring the lighting
  // return shape.
  const fluoroMat = getMaterials(scene).fluorescent;
  const ceilingY = ROOM_DIMS.heightM - 0.06;
  const fixtures: readonly { x: number; z: number; widthM: number; depthM: number }[] = [];
  const ceilingFluorescents: SpotLight[] = [];
  for (let i = 0; i < fixtures.length; i++) {
    const f = fixtures[i];
    if (!f) continue;
    const panel = MeshBuilder.CreateBox(
      `fluoro-panel-${i}`,
      { width: f.widthM, depth: f.depthM, height: 0.04 },
      scene,
    );
    panel.position = new Vector3(f.x, ceilingY, f.z);
    panel.material = fluoroMat;
    panel.isPickable = false;

    const spot = new SpotLight(
      `fluoro-spot-${i}`,
      new Vector3(f.x, ceilingY - 0.04, f.z),
      new Vector3(0, -1, 0),
      Math.PI / 2.2,
      2,
      scene,
    );
    spot.intensity = 0.035; // 1/10 of previous baseline — driven by lightFactor
    spot.diffuse = new Color3(0.98, 1.0, 1.0);
    spot.range = 4.5;
    spot.includedOnlyMeshes = [...opts.roomShellMeshes];
    ceilingFluorescents.push(spot);
  }

  // 4 corner emergency LED boxes — small cool-white emissive cubes at the
  // ceiling corners. Visible at all times so the room outline + walls stay
  // discernible even when LED grow lights and ceiling spots are off.
  const emergencyCornerLights: Mesh[] = [];
  const W = ROOM_DIMS.widthM;
  const D = ROOM_DIMS.depthM;
  const cornerInset = 0.4;
  const cornerY = ROOM_DIMS.heightM - 0.06;
  for (const cx of [-W / 2 + cornerInset, +W / 2 - cornerInset]) {
    for (const cz of [-D / 2 + cornerInset, +D / 2 - cornerInset]) {
      const led = MeshBuilder.CreateBox(
        `emergency-corner-${cx > 0 ? 'r' : 'l'}-${cz > 0 ? 'b' : 'f'}`,
        { width: 0.08, depth: 0.08, height: 0.03 },
        scene,
      );
      led.position = new Vector3(cx, cornerY, cz);
      led.material = fluoroMat; // shares the fluorescent material for now
      led.isPickable = false;
      emergencyCornerLights.push(led);
    }
  }

  // Post-processing — same recipe as before, threshold a touch lower so the
  // fluorescents and LEDs both glow (not just the LEDs).
  const cameras = scene.activeCamera ? [scene.activeCamera] : [];
  const pipeline = new DefaultRenderingPipeline('pipeline', true, scene, cameras);
  pipeline.imageProcessingEnabled = true;
  pipeline.imageProcessing.toneMappingEnabled = true;
  pipeline.imageProcessing.exposure = 0.55; // dark baseline
  pipeline.imageProcessing.contrast = 1.6; // crunch the room into shadow
  pipeline.imageProcessing.toneMappingType = 1; // ACES

  pipeline.bloomEnabled = true;
  pipeline.bloomThreshold = 0.55; // LED emissives clear this comfortably
  pipeline.bloomWeight = 0.55; // strong pink halo around LED bars
  pipeline.bloomScale = 0.65;
  pipeline.bloomKernel = 72;

  pipeline.fxaaEnabled = true;
  pipeline.samples = engine.getCaps().maxSamples ?? 4;

  return {
    sun,
    hemi,
    ceilingFluorescents,
    nightAmbient,
    emergencyCornerLights,
    pipeline,
    shadowGenerator,
  };
}

/**
 * Apply a diurnal lightFactor (0..1) to every light driven by the cycle.
 * Called once per frame from Canvas's onBeforeRenderObservable.
 */
export function applyDiurnalLighting(
  lights: BuiltLighting,
  ledPointLights: readonly { intensity: number; basePeak?: number; focusMul?: number }[],
  lightFactor: number,
): void {
  const lf = Math.max(0, Math.min(1, lightFactor));
  // Office/ambient lights are 1/10 of the previous tuning so the LED
  // pinks dominate. Sun is barely there even at noon — this is a CEA
  // grow chamber, not a greenhouse.
  lights.sun.intensity = 0.005 * lf;
  lights.hemi.intensity = 0.003 + 0.007 * lf;
  Color3.LerpToRef(NIGHT_DIFFUSE, DAY_DIFFUSE, lf, lights.hemi.diffuse);
  for (const spot of lights.ceilingFluorescents) {
    spot.intensity = 0.008 + 0.027 * lf;
  }
  // Night ambient stays a touch brighter so the room outline is still
  // legible when the LEDs are off.
  lights.nightAmbient.intensity = 0.12 * (1 - lf);
  // LED peak × diurnal × scenario focus multiplier. The focus mul comes
  // from scenario-visuals each animation tick; defaults to 1.
  for (const led of ledPointLights) {
    led.intensity = (led.basePeak ?? 18) * lf * (led.focusMul ?? 1);
  }
}
