import { describe, expect, it } from 'vitest';

import { expectedEC, expectedPH, recipeForTarget } from '../commissioning/mixing';
import { CommissioningModel } from '../commissioning/model';
import { COMMISSION_PARAMS, type CommissionTarget } from '../commissioning/state';

const RIG = 'pilot.syd.a';
const make = (): CommissioningModel => {
  const m = new CommissioningModel();
  m.register(RIG, 'Glasshouse A reservoir', 1.5, 6.0, 2.5);
  return m;
};

describe('mixing', () => {
  it('recipeForTarget ∘ expected round-trips to the commanded target', () => {
    const target: CommissionTarget = { EC: 1.8, pH: 5.8, abRatio: 1 };
    const recipe = recipeForTarget(target, 2.5);
    expect(expectedEC(recipe, 2.5)).toBeCloseTo(1.8, 6);
    expect(expectedPH(recipe, 2.5)).toBeCloseTo(5.8, 6);
  });

  it('respects the A:B blend ratio', () => {
    const recipe = recipeForTarget({ EC: 2.0, pH: 6.0, abRatio: 3 }, 2.5);
    expect(recipe.stockA_mL / recipe.stockB_mL).toBeCloseTo(3, 6);
    expect(expectedEC(recipe, 2.5)).toBeCloseTo(2.0, 6);
  });
});

describe('CommissioningModel', () => {
  it('starts uncommanded → every verdict is Pending', () => {
    const m = make();
    const verdicts = m.verdicts(RIG, 0);
    expect(verdicts.map((v) => v.signal)).toEqual(['Pending', 'Pending', 'Pending', 'Pending']);
    const snap = m.snapshot(RIG, 0);
    expect(snap?.inFlight).toBe(false);
    expect(snap?.flowLmin).toBe(0);
  });

  it('a command ramps actual toward target and flips Pending→Estimated→Measured', () => {
    const m = make();
    let now = 1_000;
    m.command(RIG, { EC: 1.8, pH: 5.8, abRatio: 1 }, now);

    // Immediately after command: ramping, pump running, signal Estimated.
    m.advance(RIG, 1_000, (now += 1_000));
    let snap = m.snapshot(RIG, now);
    expect(snap?.flowLmin).toBeGreaterThan(0);
    expect(snap?.powerW).toBeGreaterThan(COMMISSION_PARAMS.baselinePowerW);
    expect(snap?.verdicts.find((v) => v.metric === 'EC')?.signal).toBe('Estimated');
    expect(snap?.EC).toBeGreaterThan(1.5);
    expect(snap?.EC).toBeLessThan(1.8);

    // Run plenty of sim-time (well past tau + settle hold).
    for (let i = 0; i < 400; i++) m.advance(RIG, 1_000, (now += 1_000));
    snap = m.snapshot(RIG, now);
    expect(snap?.EC).toBeCloseTo(1.8, 1);
    expect(snap?.pH).toBeCloseTo(5.8, 1);
    expect(snap?.settled).toBe(true);
    expect(snap?.inFlight).toBe(false);
    expect(snap?.flowLmin).toBe(0); // pump off once settled
    const ec = snap?.verdicts.find((v) => v.metric === 'EC');
    expect(ec?.withinTol).toBe(true);
    expect(ec?.signal).toBe('Measured');
    // The two previously-Pending sensors are now live.
    expect(snap?.verdicts.find((v) => v.metric === 'flow')?.signal).toBe('Measured');
    expect(snap?.verdicts.find((v) => v.metric === 'power')?.signal).toBe('Measured');
  });

  it('reset clears the command back to Pending', () => {
    const m = make();
    let now = 0;
    m.command(RIG, { EC: 2.2, pH: 5.5, abRatio: 1 }, now);
    for (let i = 0; i < 50; i++) m.advance(RIG, 1_000, (now += 1_000));
    m.reset(RIG, 1.5, 6.0);
    const snap = m.snapshot(RIG, now);
    expect(snap?.EC).toBeCloseTo(1.5, 6);
    expect(snap?.target).toBeNull();
    expect(snap?.verdicts.every((v) => v.signal === 'Pending')).toBe(true);
  });

  it('ignores unknown rigs', () => {
    const m = make();
    expect(m.command('nope', { EC: 1, pH: 6, abRatio: 1 }, 0)).toBeUndefined();
    expect(m.snapshot('nope', 0)).toBeUndefined();
    expect(m.verdicts('nope', 0)).toEqual([]);
  });
});
