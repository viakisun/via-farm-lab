// Cinematic lighting + post-processing rig.
//
// Goal: match the reference renderings — bright daylight from outside,
// 3 ceiling fluorescent strips, magenta LED grow lights above each bed,
// soft tone mapping + bloom so the LEDs glow.
//
// All sizes in metres. Bed centres come from plants.ts so the grow-light
// strips align over them.
import {
  Color3,
  Color4,
  DefaultRenderingPipeline,
  DirectionalLight,
  type Engine,
  HemisphericLight,
  MeshBuilder,
  PointLight,
  type Scene,
  StandardMaterial,
  Vector3,
} from '@babylonjs/core';

import { ROOM_DIMS } from './room';

export interface BuildLightingOptions {
  /** Centre Z of each bed row — used to align overhead LED bars. */
  readonly bedRowsZ: readonly number[];
  /** X-extent the bed occupies, used to size overhead LED strips. */
  readonly bedSpanX: number;
}

const FLUORESCENT_COUNT = 3;
const LED_BAR_HEIGHT_ABOVE_BED_M = 0.45;

export function buildLighting(scene: Scene, engine: Engine, opts: BuildLightingOptions): void {
  // Soft daylight background — pale sky blue. The dollhouse cutaway means
  // the camera sees through the open south wall + north window onto this.
  scene.clearColor = new Color4(0.78, 0.84, 0.9, 1.0);
  scene.ambientColor = new Color3(0.5, 0.52, 0.55);

  // Hemispheric fill — soft. Ground colour slightly warm so upward
  // reflections off the floor feel like real sunlight.
  const hemi = new HemisphericLight('hemi', new Vector3(0, 1, 0), scene);
  hemi.intensity = 0.55;
  hemi.diffuse = new Color3(0.95, 0.96, 1.0);
  hemi.groundColor = new Color3(0.32, 0.32, 0.34);

  // Soft directional sun, angled so it pours in through the back window.
  const sun = new DirectionalLight('sun', new Vector3(0.3, -0.8, 0.5), scene);
  sun.intensity = 0.55;
  sun.diffuse = new Color3(1.0, 0.97, 0.9);
  sun.specular = new Color3(0.4, 0.38, 0.32);

  // 3 ceiling fluorescent strips, evenly spaced along X just below the ceiling.
  const stripMat = new StandardMaterial('mat-fluoro', scene);
  stripMat.emissiveColor = new Color3(0.95, 0.97, 1.0);
  stripMat.diffuseColor = new Color3(0.95, 0.95, 0.96);
  stripMat.specularColor = new Color3(0, 0, 0);
  for (let i = 0; i < FLUORESCENT_COUNT; i++) {
    const x = ((i - (FLUORESCENT_COUNT - 1) / 2) * ROOM_DIMS.widthM) / (FLUORESCENT_COUNT + 0.5);
    const strip = MeshBuilder.CreateBox(
      `fluoro-${i}`,
      { width: 0.18, depth: ROOM_DIMS.depthM * 0.55, height: 0.04 },
      scene,
    );
    strip.position = new Vector3(x, ROOM_DIMS.heightM - 0.05, 0);
    strip.material = stripMat;
    // A weak point light per strip so the floor reads softly lit, even at
    // areas the LEDs don't cover.
    const pl = new PointLight(`fluoro-pl-${i}`, strip.position.clone(), scene);
    pl.intensity = 12;
    pl.diffuse = new Color3(0.98, 1.0, 1.0);
    pl.range = 5;
  }

  // LED grow lights — magenta panels above each bed row.
  const ledMat = new StandardMaterial('mat-led-grow', scene);
  ledMat.emissiveColor = new Color3(1.0, 0.45, 0.95);
  ledMat.diffuseColor = new Color3(0.95, 0.3, 0.9);
  ledMat.specularColor = new Color3(0, 0, 0);
  ledMat.disableLighting = true;

  for (let row = 0; row < opts.bedRowsZ.length; row++) {
    const z = opts.bedRowsZ[row];
    if (z === undefined) continue;
    // Two narrow magenta strips per bed row (matches reference twin-bar fixtures).
    for (const offset of [-0.16, 0.16]) {
      const bar = MeshBuilder.CreateBox(
        `led-${row}-${offset > 0 ? 'b' : 'a'}`,
        { width: opts.bedSpanX, depth: 0.08, height: 0.04 },
        scene,
      );
      bar.position = new Vector3(
        0,
        ROOM_DIMS.heightM - LED_BAR_HEIGHT_ABOVE_BED_M - 0.05,
        z + offset,
      );
      bar.material = ledMat;
    }
    // Distributed point lights along the bar so plants on the whole bed
    // get the magenta wash, not just the centre.
    const N_LIGHTS = 3;
    for (let i = 0; i < N_LIGHTS; i++) {
      const x = ((i - (N_LIGHTS - 1) / 2) * opts.bedSpanX) / N_LIGHTS;
      const pl = new PointLight(
        `led-pl-${row}-${i}`,
        new Vector3(x, ROOM_DIMS.heightM - LED_BAR_HEIGHT_ABOVE_BED_M - 0.05, z),
        scene,
      );
      pl.intensity = 8;
      pl.diffuse = new Color3(1.0, 0.55, 0.95);
      pl.specular = new Color3(1.0, 0.55, 0.95);
      pl.range = 1.4;
    }
  }

  // Post-processing pipeline — gives the LEDs their glow + tames highlights.
  const cameras = scene.activeCamera ? [scene.activeCamera] : [];
  const pipeline = new DefaultRenderingPipeline('pipeline', true, scene, cameras);
  pipeline.imageProcessingEnabled = true;
  pipeline.imageProcessing.toneMappingEnabled = true;
  pipeline.imageProcessing.exposure = 0.8;
  pipeline.imageProcessing.contrast = 1.15;
  // ACES gives a more filmic falloff than the default Reinhard.
  pipeline.imageProcessing.toneMappingType = 1;

  pipeline.bloomEnabled = true;
  pipeline.bloomThreshold = 1.1; // only true emissives (LEDs, fluoros) bloom
  pipeline.bloomWeight = 0.22;
  pipeline.bloomScale = 0.4;
  pipeline.bloomKernel = 48;

  pipeline.fxaaEnabled = true;
  pipeline.samples = engine.getCaps().maxSamples ?? 4;
}
