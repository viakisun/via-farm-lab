// Scenario focus mode — when a scenario starts playing, the elements
// related to that scenario's hypothesis brighten (×10 emissive) and
// unrelated elements fade (×0.1). When the scenario stops, everything
// returns to default. Animation is driven by Canvas.tsx with a smooth
// ease-in-out 1 s fade.
//
// The pattern is intentionally pull-based: each visual module owns its
// own per-frame render loop (piping pulse, basin material, LED material,
// etc.) and exposes a `setFocusMul` / equivalent hook. This module's
// `applyScenarioFocus` simply *publishes* the per-category multiplier;
// the consuming modules pick it up on their next render tick. No race
// conditions, no double-write.

import type {
  AbstractMesh,
  DefaultRenderingPipeline,
  Mesh,
  PBRMaterial,
  PointLight,
  SpotLight,
  Vector3,
} from '@babylonjs/core';

export type ScenarioId = 'ec-ph' | 'led-ppfd' | 'cool-warm-co2' | 'crop-compare';

export type FocusCategory =
  | 'pipes'
  | 'basin'
  | 'led'
  | 'plant'
  | 'hvac'
  | 'dosingLevels'
  | 'annexEmissive';

/** Per-scenario multiplier for each focus category, applied at t=1. The
 *  Canvas animation linearly lerps between 1.0 (no focus) and these
 *  values over the 1 s ease-in-out transition. */
export const SCENARIO_FOCUS: Readonly<Record<ScenarioId, Readonly<Record<FocusCategory, number>>>> =
  {
    'ec-ph': {
      pipes: 10,
      basin: 10,
      dosingLevels: 10,
      annexEmissive: 10,
      led: 0.5,
      plant: 1,
      hvac: 0.1,
    },
    'led-ppfd': {
      led: 10,
      pipes: 0.1,
      annexEmissive: 0.1,
      hvac: 0.1,
      basin: 1,
      plant: 1,
      dosingLevels: 1,
    },
    'cool-warm-co2': {
      hvac: 10,
      annexEmissive: 10,
      pipes: 0.3,
      led: 0.3,
      basin: 0.5,
      plant: 1,
      dosingLevels: 1,
    },
    'crop-compare': {
      plant: 1.3,
      pipes: 0.1,
      annexEmissive: 0.1,
      hvac: 0.1,
      led: 0.7,
      basin: 1,
      dosingLevels: 1,
    },
  };

const DEFAULT_FOCUS: Readonly<Record<FocusCategory, number>> = {
  pipes: 1,
  basin: 1,
  led: 1,
  plant: 1,
  hvac: 1,
  dosingLevels: 1,
  annexEmissive: 1,
};

/** Cinematic focus zone where the scenario's "main character" lives —
 *  used to aim the focus SpotLight. World coords. */
export interface FocusZone {
  readonly position: Vector3;
  readonly radius: number;
}

/** Per-LED-bar handle: the material that should be scaled + the
 *  original emissive intensity so we can multiply without losing it. */
export interface LedBarHandle {
  readonly material: PBRMaterial;
  readonly baseEmissiveIntensity: number;
}

/** Per-basin handle. The material is a per-basin clone (Canvas builds
 *  these once); we just track the base emissive intensity. */
export interface BasinHandle {
  readonly material: PBRMaterial;
  readonly baseEmissiveIntensity: number;
}

/** Per-HVAC indicator handle. */
export interface HvacHandle {
  readonly material: PBRMaterial;
  readonly baseEmissiveIntensity: number;
}

/** Per-dosing-tank-liquid handle. */
export interface DosingHandle {
  readonly material: PBRMaterial;
  readonly baseEmissiveIntensity: number;
}

/** Per annex-emissive mesh handle (LCD / channel LED / gauge needle). */
export interface AnnexEmissiveHandle {
  readonly material: PBRMaterial;
  readonly baseEmissiveIntensity: number;
}

/** Scene-built once by Canvas, then handed to applyScenarioFocus on
 *  every animation tick. */
export interface FocusGroups {
  readonly ledBars: readonly LedBarHandle[];
  readonly ledPointLights: readonly { intensity: number; basePeak: number }[];
  readonly basins: readonly BasinHandle[];
  readonly hvac: readonly HvacHandle[];
  readonly dosing: readonly DosingHandle[];
  readonly annexEmissive: readonly AnnexEmissiveHandle[];
  /** All emphasis-candidate meshes — used as `includedOnlyMeshes` for
   *  the focus SpotLight so it doesn't blow the 8-light cap on
   *  everything else. */
  readonly emphasisMeshes: readonly AbstractMesh[];
  /** Pipeline ref for exposure tweaks. */
  readonly pipeline: DefaultRenderingPipeline;
  /** SpotLight pre-built by Canvas (intensity 0 initially). */
  readonly focusSpot: SpotLight;
  /** Module hooks that own their per-frame loops. */
  readonly setPipingFocus: (mul: number) => void;
  readonly setPlantFocusPivot: (mul: number) => void;
  /** PointLight basePeak → multiplied for LED PointLight intensity. */
  readonly setLedPointLightFocus: (mul: number) => void;
  /** Scenario-specific focus zone for the SpotLight aim point. Caller
   *  may move the spot on each scenario change. */
  readonly setFocusZone: (zone: FocusZone | null) => void;
}

/** Pipeline exposure baseline (matches lighting.ts). */
const EXPOSURE_BASE = 0.55;
/** Exposure delta at full focus (t=1) — slightly darker to make the
 *  emphasis pop. */
const EXPOSURE_DELTA_AT_FULL = -0.1;

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/**
 * Apply scenario focus to the scene. `t` ∈ [0, 1]:
 *   t = 0 → everything at defaults
 *   t = 1 → full focus per `SCENARIO_FOCUS[scenarioId]`
 *
 * `scenarioId === null` → focus disabled (caller usually animates t to 0
 * first, then calls with null at the end of the fade).
 */
export function applyScenarioFocus(
  groups: FocusGroups,
  scenarioId: ScenarioId | null,
  t: number,
): void {
  const target = scenarioId ? SCENARIO_FOCUS[scenarioId] : DEFAULT_FOCUS;
  const clampedT = Math.max(0, Math.min(1, t));
  const muls = {
    pipes: lerp(1, target.pipes, clampedT),
    basin: lerp(1, target.basin, clampedT),
    led: lerp(1, target.led, clampedT),
    plant: lerp(1, target.plant, clampedT),
    hvac: lerp(1, target.hvac, clampedT),
    dosingLevels: lerp(1, target.dosingLevels, clampedT),
    annexEmissive: lerp(1, target.annexEmissive, clampedT),
  } as const;

  // Hand off to the modules that own per-frame loops.
  groups.setPipingFocus(muls.pipes);
  groups.setPlantFocusPivot(muls.plant);
  groups.setLedPointLightFocus(muls.led);

  // LED bar materials.
  for (const h of groups.ledBars) {
    h.material.emissiveIntensity = h.baseEmissiveIntensity * muls.led;
  }
  // Basin liquid materials.
  for (const h of groups.basins) {
    h.material.emissiveIntensity = h.baseEmissiveIntensity * muls.basin;
  }
  // HVAC indicators.
  for (const h of groups.hvac) {
    h.material.emissiveIntensity = h.baseEmissiveIntensity * muls.hvac;
  }
  // Dosing tank liquids.
  for (const h of groups.dosing) {
    h.material.emissiveIntensity = h.baseEmissiveIntensity * muls.dosingLevels;
  }
  // Annex emissive details (LCD, channel LEDs, gauge needles).
  for (const h of groups.annexEmissive) {
    h.material.emissiveIntensity = h.baseEmissiveIntensity * muls.annexEmissive;
  }

  // Pipeline exposure ramp.
  groups.pipeline.imageProcessing.exposure = EXPOSURE_BASE + EXPOSURE_DELTA_AT_FULL * clampedT;

  // Focus SpotLight intensity. Position is set externally by setFocusZone.
  groups.focusSpot.intensity = 1.5 * clampedT;
}

/** Convenience: aim the focus SpotLight at a given zone. */
export function aimFocusSpot(spot: SpotLight, zone: FocusZone | null): void {
  if (!zone) {
    spot.intensity = 0;
    return;
  }
  spot.position.copyFrom(zone.position);
  // Slight Y offset above the zone — spot fires downward.
  spot.position.y = Math.max(spot.position.y, 2.8);
  spot.direction.set(0, -1, 0);
  spot.range = Math.max(3, zone.radius * 2.5);
}

/** Apply the includedOnlyMeshes filter so the spot only illuminates
 *  emphasis category meshes (8-light cap safety). */
export function scopeFocusSpot(spot: SpotLight, meshes: readonly AbstractMesh[]): void {
  spot.includedOnlyMeshes = [...meshes];
}

/** Re-export some types for Canvas to spread less. */
export type { Mesh, PBRMaterial, PointLight, SpotLight };
