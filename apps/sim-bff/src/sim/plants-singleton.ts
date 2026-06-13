// Process-wide plant biomass model.
//
// PR 25 seeds the room with 8 demo plots (2 rows × 4 columns, single bed)
// at staggered transplant dates so we see a growth gradient from
// "just transplanted" to "near harvest" in one shot.
//
// Once Console integration lands (PR 36 area), this seed list moves to
// real `console.plots` data and `console.events { type: 'transplant' }`.
import { BiomassModel, BUTTER_LETTUCE_DEFAULT } from '@via-farm-lab/sim-models';

import { getSimClock } from './clock-singleton';

let instance: BiomassModel | null = null;

/**
 * 24-plot layout (Phase 2 experimental platform): 2 racks × 2 growing tiers
 * × 6 plots along the bed length. bedKey b1 = tier 1 (middle), b2 = tier 2
 * (top). Plot keys p1..p6 walk the bed from low X to high X.
 */
const RACK_IDS = ['r01', 'r02'] as const;
const BED_KEYS = ['b1', 'b2'] as const;
const PLOT_KEYS = ['p1', 'p2', 'p3', 'p4', 'p5', 'p6'] as const;

const DEMO_PLOT_IDS: readonly string[] = (() => {
  const out: string[] = [];
  for (const rack of RACK_IDS) {
    for (const bed of BED_KEYS) {
      for (const plot of PLOT_KEYS) {
        out.push(`pilot.syd.a.${rack}.${bed}.${plot}`);
      }
    }
  }
  return out;
})();

const DAY_MS = 86_400_000;

/** Stagger transplant by ~2 days per plot so we see a smooth growth gradient
 *  across all 24 plots. */
function buildDemoTransplants(nowMs: number): Map<string, number> {
  const out = new Map<string, number>();
  for (let i = 0; i < DEMO_PLOT_IDS.length; i++) {
    const daysAgo = i * 2;
    const plotId = DEMO_PLOT_IDS[i];
    if (!plotId) continue;
    out.set(plotId, nowMs - daysAgo * DAY_MS);
  }
  return out;
}

export function getBiomassModel(): BiomassModel {
  if (!instance) {
    instance = new BiomassModel(BUTTER_LETTUCE_DEFAULT);
    const now = getSimClock().getSimTimeMs();
    for (const [plotId, t0] of buildDemoTransplants(now)) {
      instance.transplant(plotId, t0);
    }
  }
  return instance;
}

export function resetBiomassForTests(): void {
  if (instance) {
    instance.reset();
  }
  instance = null;
}

export const DEMO_PLOT_LIST: readonly string[] = DEMO_PLOT_IDS;
