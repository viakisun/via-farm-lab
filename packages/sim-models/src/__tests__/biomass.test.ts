import { describe, expect, it } from 'vitest';
import { biomassAt, BiomassModel, BUTTER_LETTUCE_DEFAULT, type BiomassParams } from '../biomass';

const DAY_MS = 86_400_000;

describe('biomassAt (closed form)', () => {
  it('returns B0 at t = 0', () => {
    expect(biomassAt(BUTTER_LETTUCE_DEFAULT, 0)).toBeCloseTo(BUTTER_LETTUCE_DEFAULT.B0, 6);
  });

  it('is monotonic increasing under defaults', () => {
    const samples = [0, 1, 5, 10, 20, 30, 42].map((d) => biomassAt(BUTTER_LETTUCE_DEFAULT, d));
    for (let i = 1; i < samples.length; i++) {
      expect(samples[i]!).toBeGreaterThan(samples[i - 1]!);
    }
  });

  it('approaches K but never exceeds it', () => {
    const at100 = biomassAt(BUTTER_LETTUCE_DEFAULT, 100);
    expect(at100).toBeLessThan(BUTTER_LETTUCE_DEFAULT.K);
    expect(at100).toBeGreaterThan(0.99 * BUTTER_LETTUCE_DEFAULT.K);
  });

  it('reaches ~50% K at the inflection point', () => {
    // Inflection at t = ln((K-B0)/B0) / r
    const { K, B0, r } = BUTTER_LETTUCE_DEFAULT;
    const tInflection = Math.log((K - B0) / B0) / r;
    expect(biomassAt(BUTTER_LETTUCE_DEFAULT, tInflection)).toBeCloseTo(K / 2, 4);
  });

  it('handles non-default params symmetrically', () => {
    const custom: BiomassParams = { K: 200, r: 0.5, B0: 4 };
    expect(biomassAt(custom, 0)).toBeCloseTo(4, 6);
    expect(biomassAt(custom, 100)).toBeGreaterThan(199);
  });

  it('returns 0 if B0 = 0', () => {
    expect(biomassAt({ K: 100, r: 0.2, B0: 0 }, 10)).toBe(0);
  });

  it('returns B0 for negative ages (defensive)', () => {
    expect(biomassAt(BUTTER_LETTUCE_DEFAULT, -5)).toBe(BUTTER_LETTUCE_DEFAULT.B0);
  });
});

describe('BiomassModel (per-plot tracker)', () => {
  it('reports no state before transplant', () => {
    const m = new BiomassModel();
    expect(m.snapshot('pilot.syd.a.r01.t02.p03', 0)).toBeNull();
    expect(m.plots()).toEqual([]);
    expect(m.hasPlot('pilot.syd.a.r01.t02.p03')).toBe(false);
  });

  it('tracks biomass after transplant', () => {
    const m = new BiomassModel();
    const t0 = 1_700_000_000_000;
    m.transplant('plot-1', t0);
    const s = m.snapshot('plot-1', t0 + 21 * DAY_MS);
    expect(s).not.toBeNull();
    expect(s!.ageDays).toBeCloseTo(21, 6);
    expect(s!.biomass).toBeGreaterThan(BUTTER_LETTUCE_DEFAULT.B0);
    expect(s!.biomass).toBeLessThan(BUTTER_LETTUCE_DEFAULT.K);
  });

  it('per-plot params override the default', () => {
    const m = new BiomassModel();
    const t0 = 0;
    m.transplant('fast', t0, { K: 100, r: 1.0, B0: 1 });
    m.transplant('slow', t0); // default
    const fast = m.snapshot('fast', 10 * DAY_MS)!;
    const slow = m.snapshot('slow', 10 * DAY_MS)!;
    expect(fast.biomass).toBeGreaterThan(slow.biomass);
  });

  it('snapshotAll returns every transplanted plot', () => {
    const m = new BiomassModel();
    const t0 = 0;
    m.transplant('a', t0);
    m.transplant('b', t0);
    m.transplant('c', t0);
    const all = m.snapshotAll(7 * DAY_MS);
    expect(all.size).toBe(3);
    expect([...all.keys()].sort()).toEqual(['a', 'b', 'c']);
  });

  it('harvest removes the plot from snapshots', () => {
    const m = new BiomassModel();
    m.transplant('p', 0);
    expect(m.hasPlot('p')).toBe(true);
    m.harvest('p');
    expect(m.hasPlot('p')).toBe(false);
    expect(m.snapshot('p', 100)).toBeNull();
  });

  it('reset clears every plot', () => {
    const m = new BiomassModel();
    m.transplant('a', 0);
    m.transplant('b', 0);
    m.reset();
    expect(m.plots()).toEqual([]);
  });

  it('seek-style jumps are deterministic (closed form)', () => {
    const m = new BiomassModel();
    const t0 = 1_900_000_000_000;
    m.transplant('p', t0);
    const direct = m.snapshot('p', t0 + 30 * DAY_MS)!;

    // Two snapshots back to back at the same time should be identical
    // (no integration drift; closed-form by construction).
    const again = m.snapshot('p', t0 + 30 * DAY_MS)!;
    expect(again.biomass).toBe(direct.biomass);
    expect(again.ageDays).toBe(direct.ageDays);
  });
});
