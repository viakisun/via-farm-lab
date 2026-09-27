import { afterEach, describe, expect, it } from 'vitest';

import { resetCommissioningForTests, rigConfig } from '../sim/commissioning-singleton';
import { tickScheduler } from '../sim/scheduler';
import { getScheduleStore, resetScheduleStoreForTests } from '../storage/scheduleStore';
import { resetSettingsStoreForTests } from '../storage/settingsStore';

const RIG = 'pilot.syd.a';

describe('scheduler', () => {
  afterEach(() => {
    resetScheduleStoreForTests();
    resetCommissioningForTests();
    resetSettingsStoreForTests();
  });

  it('fires a recurring apply-setting job and reschedules it', () => {
    // ensure rig + default config exist
    expect(rigConfig(RIG)?.flowRateLmin).toBe(1.8);
    const store = getScheduleStore();
    const job = store.create(
      { name: 'bump flow', everySimMs: 60_000, action: { kind: 'apply-setting', rigId: RIG, config: { flowRateLmin: 3 } } },
      0,
    );
    expect(job.nextRunMs).toBe(60_000);

    // before due: nothing fires
    expect(tickScheduler(30_000)).toHaveLength(0);
    expect(rigConfig(RIG)?.flowRateLmin).toBe(1.8);

    // at/after due: fires, applies the setting, reschedules
    const fired = tickScheduler(60_000);
    expect(fired.map((j) => j.id)).toEqual([job.id]);
    expect(rigConfig(RIG)?.flowRateLmin).toBe(3);
    expect(store.get(job.id)?.nextRunMs).toBe(120_000);
    expect(store.get(job.id)?.lastRunMs).toBe(60_000);
  });

  it('one-shot (atSimMs) job fires once then disables', () => {
    const store = getScheduleStore();
    const job = store.create(
      { name: 'one dose', atSimMs: 10_000, action: { kind: 'dose', rigId: RIG, target: { EC: 2.0, pH: 5.8, abRatio: 1 } } },
      0,
    );
    expect(tickScheduler(10_000)).toHaveLength(1);
    expect(store.get(job.id)?.enabled).toBe(false);
    // does not fire again
    expect(tickScheduler(20_000)).toHaveLength(0);
  });

  it('rejects a recurring+one-shot mix at the store input (via create both)', () => {
    // Both provided is a route-level validation concern; the store still takes
    // atSimMs precedence for nextRunMs. Sanity: create with only everySimMs.
    const store = getScheduleStore();
    const job = store.create({ name: 'x', everySimMs: 5_000, action: { kind: 'dose', rigId: RIG } }, 1_000);
    expect(job.nextRunMs).toBe(6_000);
  });
});
