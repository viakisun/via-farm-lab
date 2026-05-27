import { describe, expect, it } from 'vitest';
import { SeededRng } from '../rng';

describe('SeededRng', () => {
  it('produces the same sequence for the same seed', () => {
    const a = new SeededRng(42);
    const b = new SeededRng(42);
    const seqA = Array.from({ length: 100 }, () => a.nextFloat());
    const seqB = Array.from({ length: 100 }, () => b.nextFloat());
    expect(seqA).toEqual(seqB);
  });

  it('produces different sequences for different seeds', () => {
    const a = new SeededRng(1);
    const b = new SeededRng(2);
    expect(a.nextFloat()).not.toBe(b.nextFloat());
  });

  it('floats fall in [0, 1)', () => {
    const r = new SeededRng('via-farm-lab');
    for (let i = 0; i < 10000; i++) {
      const v = r.nextFloat();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it('nextInt is uniform across a small span', () => {
    const r = new SeededRng(123);
    const counts = Array.from({ length: 6 }, () => 0);
    const N = 6000;
    for (let i = 0; i < N; i++) {
      counts[r.nextInt(0, 5)]!++;
    }
    // Each bucket should be within 15% of N/6 = 1000.
    for (const c of counts) {
      expect(c).toBeGreaterThan(850);
      expect(c).toBeLessThan(1150);
    }
  });

  it('nextNormal has approximately the right mean and variance', () => {
    const r = new SeededRng('normal-test');
    const N = 10000;
    let sum = 0;
    let sumSq = 0;
    for (let i = 0; i < N; i++) {
      const v = r.nextNormal(5, 2);
      sum += v;
      sumSq += v * v;
    }
    const mean = sum / N;
    const variance = sumSq / N - mean * mean;
    expect(mean).toBeGreaterThan(4.9);
    expect(mean).toBeLessThan(5.1);
    expect(variance).toBeGreaterThan(3.7);
    expect(variance).toBeLessThan(4.3);
  });

  it('string seeds are stable (FNV-1a)', () => {
    const r = new SeededRng('plot.pilot.syd.a.r01.t02.p03');
    // First few floats — record these; any drift here is a breaking change.
    const first = [r.nextFloat(), r.nextFloat(), r.nextFloat()];
    const again = new SeededRng('plot.pilot.syd.a.r01.t02.p03');
    expect([again.nextFloat(), again.nextFloat(), again.nextFloat()]).toEqual(first);
  });

  it('fork() yields a deterministic but independent child', () => {
    const parent = new SeededRng(99);
    const childA = parent.fork();
    const parentSeq = [parent.nextFloat(), parent.nextFloat()];
    const childASeq = [childA.nextFloat(), childA.nextFloat()];
    // Re-create the same parent and fork → identical child sequence.
    const parent2 = new SeededRng(99);
    parent2.fork(); // discard but advance state same way
    // ^ wrong — fork advances on its own; the parent state above moved
    // because parent.fork() called nextUint64. Rebuild the same scenario:
    const parent3 = new SeededRng(99);
    const childB = parent3.fork();
    expect([childB.nextFloat(), childB.nextFloat()]).toEqual(childASeq);
    // Sanity: parent and child diverged.
    expect(parentSeq).not.toEqual(childASeq);
  });
});
