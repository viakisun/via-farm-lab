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

const DEMO_PLOT_IDS = [
  // farm  site  room  rack  bed   index
  'pilot.syd.a.r01.b1.p1',
  'pilot.syd.a.r01.b1.p2',
  'pilot.syd.a.r01.b1.p3',
  'pilot.syd.a.r01.b1.p4',
  'pilot.syd.a.r02.b1.p1',
  'pilot.syd.a.r02.b1.p2',
  'pilot.syd.a.r02.b1.p3',
  'pilot.syd.a.r02.b1.p4',
] as const;

const DAY_MS = 86_400_000;

/** Stagger transplant by ~5 days per plot so we see varied growth stages. */
function buildDemoTransplants(nowMs: number): Map<string, number> {
  const staggerDays = [0, 5, 10, 15, 20, 25, 30, 35];
  const out = new Map<string, number>();
  for (let i = 0; i < DEMO_PLOT_IDS.length; i++) {
    const daysAgo = staggerDays[i] ?? 0;
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
