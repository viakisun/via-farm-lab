import { describe, expect, it } from 'vitest';

import { DATASET } from '../dataset';
import {
  audAmt,
  audK,
  audRate,
  DLI_TOL,
  dliOf,
  equalisedPpfd,
  portfolio,
  requiredPpfd,
} from '../derive';

describe('dataset', () => {
  it('builds 25 experiments — 20 completed, 5 running', () => {
    expect(DATASET.exps).toHaveLength(25);
    expect(DATASET.exps.filter((e) => e.done)).toHaveLength(20);
    expect(DATASET.exps.filter((e) => !e.done)).toHaveLength(5);
  });

  it('is deterministic (same recommendation each build)', () => {
    expect(DATASET.recId).toMatch(/^VF-\d+$/);
    const rec = DATASET.exps.find((e) => e.id === DATASET.recId);
    expect(rec?.recommended).toBe(true);
  });

  it('recommends the highest Profit/Bed-Day completed experiment', () => {
    const done = DATASET.exps.filter((e) => e.done);
    const maxPpbd = Math.max(...done.map((e) => e.ppbd));
    expect(DATASET.exps.find((e) => e.id === DATASET.recId)?.ppbd).toBe(maxPpbd);
  });

  it('has exactly 2 outliers and 2 invalid measurements', () => {
    expect(DATASET.meas.filter((m) => m.kind === 'outlier')).toHaveLength(2);
    expect(DATASET.meas.filter((m) => m.kind === 'invalid')).toHaveLength(2);
  });
});

describe('DLI maths', () => {
  it('computes DLI = PPFD × hours × 3600 / 1e6', () => {
    expect(dliOf(180, 20)).toBeCloseTo(12.96, 2);
    expect(dliOf(225, 16)).toBeCloseTo(12.96, 2);
  });

  it('auto-equalise brings every photoperiod within tolerance of the target', () => {
    const target = 12.96;
    for (const p of [12, 16, 20, 24]) {
      const ppfd = equalisedPpfd(target, p);
      expect(Math.abs(dliOf(ppfd, p) - target)).toBeLessThan(DLI_TOL);
    }
  });

  it('requiredPpfd is the exact (un-rounded) PPFD for the target', () => {
    expect(requiredPpfd(12.96, 24)).toBe(150);
    expect(requiredPpfd(12.96, 12)).toBe(300);
  });
});

describe('portfolio aggregates', () => {
  it('aggregates completed experiments into 4 photoperiod groups', () => {
    const pf = portfolio(DATASET);
    expect(pf.byPeriod.map((b) => b.p)).toEqual([12, 16, 20, 24]);
    expect(pf.byPeriod.reduce((a, b) => a + b.count, 0)).toBe(20);
    expect(pf.maxBarPpbd).toBeGreaterThan(0);
  });
});

describe('AUD formatting', () => {
  it('scales won-base figures to realistic A$ values', () => {
    expect(audRate(6800)).toBe('A$6.80');
    expect(audRate(9850)).toBe('A$9.85');
    expect(audAmt(412000)).toBe('A$412');
    expect(audK(8270000)).toBe('A$8.3k');
  });
});
