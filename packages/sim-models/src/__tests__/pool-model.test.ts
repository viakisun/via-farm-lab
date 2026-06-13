import { describe, expect, it } from 'vitest';

import { PoolModel } from '../nutrient/pool-model';
import { DEFAULT_NUTRIENT_PARAMS, type PoolTarget } from '../nutrient/state';

const TARGET: PoolTarget = {
  EC: 2.0,
  pH: 6.0,
  recipe: { stockA_mL: 8, stockB_mL: 8, pHAcid_mL: 4 },
};

const PLOT = 'pilot.syd.a.r01.b1.p1';

describe('PoolModel', () => {
  it('initialises a pool at the setpoint', () => {
    const m = new PoolModel();
    m.setTarget(PLOT, TARGET);
    const pool = m.get(PLOT);
    expect(pool).toBeDefined();
    expect(pool?.EC).toBeCloseTo(2.0, 6);
    expect(pool?.pH).toBeCloseTo(6.0, 6);
    expect(pool?.lastDosedAtMs).toBeNull();
  });

  it('decreases EC over time with biomass and light', () => {
    const m = new PoolModel();
    m.setTarget(PLOT, TARGET);
    // 50 g biomass, full daylight, 1 s step → small enough not to
    // trigger a dose (threshold 0.15, expected drop ≈ 0.075).
    m.advance(PLOT, 1_000, 50, 1.0, 1_000_000);
    const pool = m.get(PLOT);
    expect(pool?.EC).toBeLessThan(2.0);
    expect(pool?.EC).toBeGreaterThan(TARGET.EC - DEFAULT_NUTRIENT_PARAMS.ecBoostBelowTarget);
    expect(pool?.pH).toBeGreaterThan(6.0);
  });

  it('does not consume nutrients in the dark', () => {
    const m = new PoolModel();
    m.setTarget(PLOT, TARGET);
    m.advance(PLOT, 60_000, 50, 0, 1_000_000);
    const pool = m.get(PLOT);
    expect(pool?.EC).toBeCloseTo(2.0, 6);
    expect(pool?.pH).toBeCloseTo(6.0, 6);
  });

  it('fires an ec-boost dose when EC drops past the threshold', () => {
    const m = new PoolModel();
    m.setTarget(PLOT, TARGET);
    // Step long enough that the threshold is crossed in one go.
    // dEC/s ≈ kUptake × 50 × 1 = 0.075. Threshold 0.15 ⇒ ~2 s.
    // 10 s definitely crosses it.
    const ev = m.advance(PLOT, 10_000, 50, 1.0, 5_000);
    expect(ev).not.toBeNull();
    expect(ev?.kind).toBe('ec-boost');
    expect(ev?.beforeEC).toBeLessThan(TARGET.EC - DEFAULT_NUTRIENT_PARAMS.ecBoostBelowTarget);
    expect(ev?.afterEC).toBeCloseTo(TARGET.EC, 6);
    expect(m.get(PLOT)?.lastDosedAtMs).toBe(5_000);
  });

  it('cycles drop → dose → drop in repeated advances', () => {
    const m = new PoolModel();
    m.setTarget(PLOT, TARGET);
    let doseCount = 0;
    let now = 0;
    for (let i = 0; i < 30; i++) {
      now += 10_000;
      const ev = m.advance(PLOT, 10_000, 50, 1.0, now);
      if (ev) doseCount++;
    }
    expect(doseCount).toBeGreaterThan(2);
    // Pool always stays within the band when sampled.
    const pool = m.get(PLOT);
    expect(pool?.EC).toBeGreaterThan(TARGET.EC - DEFAULT_NUTRIENT_PARAMS.ecBoostBelowTarget - 0.1);
  });

  it('remove() drops the pool + target', () => {
    const m = new PoolModel();
    m.setTarget(PLOT, TARGET);
    m.remove(PLOT);
    expect(m.has(PLOT)).toBe(false);
    expect(m.advance(PLOT, 1_000, 50, 1, 0)).toBeNull();
  });
});
