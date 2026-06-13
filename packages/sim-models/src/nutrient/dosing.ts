// Dosing pump logic — when the pool drifts past the threshold, snap it
// back to setpoint and emit a DosingEvent so the BFF can record + the UI
// can pulse the tank icons.

import {
  DEFAULT_NUTRIENT_PARAMS,
  type DosingEvent,
  type PoolState,
  type PoolTarget,
} from './state';

export interface DosingResult {
  /** Mutated in-place; returned only for chaining. */
  readonly state: PoolState;
  /** `null` if no dose fired this tick. */
  readonly event: DosingEvent | null;
}

/**
 * Check thresholds and dose if needed. Mutates `state` in place.
 *
 * Two independent triggers, evaluated in order:
 *   1. EC below `target.EC − ecBoostBelowTarget` → ec-boost (Stock A + B)
 *   2. pH above `target.pH + phAcidAboveTarget`  → ph-acid (pH-down acid)
 *
 * Only one event fires per call (whichever triggers first); a second
 * trigger waits for the next tick. Both kinds restore the pool to its
 * setpoint for the affected variable.
 */
export function checkAndDose(
  plotId: string,
  state: PoolState,
  target: PoolTarget,
  nowMs: number,
): DosingResult {
  const beforeEC = state.EC;
  const beforePH = state.pH;

  if (state.EC < target.EC - DEFAULT_NUTRIENT_PARAMS.ecBoostBelowTarget) {
    state.EC = target.EC;
    state.lastDosedAtMs = nowMs;
    return {
      state,
      event: {
        plotId,
        timestampMs: nowMs,
        kind: 'ec-boost',
        stockA_mL: target.recipe.stockA_mL,
        stockB_mL: target.recipe.stockB_mL,
        pHAcid_mL: 0,
        beforeEC,
        afterEC: state.EC,
        beforePH,
        afterPH: state.pH,
      },
    };
  }

  if (state.pH > target.pH + DEFAULT_NUTRIENT_PARAMS.phAcidAboveTarget) {
    state.pH = target.pH;
    state.lastDosedAtMs = nowMs;
    return {
      state,
      event: {
        plotId,
        timestampMs: nowMs,
        kind: 'ph-acid',
        stockA_mL: 0,
        stockB_mL: 0,
        pHAcid_mL: target.recipe.pHAcid_mL,
        beforeEC,
        afterEC: state.EC,
        beforePH,
        afterPH: state.pH,
      },
    };
  }

  return { state, event: null };
}
