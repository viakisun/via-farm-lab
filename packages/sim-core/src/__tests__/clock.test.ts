import { describe, expect, it, vi } from 'vitest';
import { SimClock, type TickEvent } from '../clock';

describe('SimClock', () => {
  it('starts in stopped state and reports tick 0', () => {
    const c = new SimClock();
    expect(c.getStatus()).toBe('stopped');
    expect(c.getTick()).toBe(0);
  });

  it('tickN advances the tick counter and simulated time', () => {
    const c = new SimClock({ startAtMs: 1_700_000_000_000, tickMs: 1000 });
    c.tickN(5);
    expect(c.getTick()).toBe(5);
    expect(c.getSimTimeMs()).toBe(1_700_000_005_000);
  });

  it('emits tick events with monotonic tick numbers', () => {
    const c = new SimClock({ startAtMs: 1_700_000_000_000 });
    const ticks: TickEvent[] = [];
    c.on('tick', (e: TickEvent) => ticks.push(e));
    c.tickN(3);
    expect(ticks.map((t) => t.tick)).toEqual([1, 2, 3]);
    expect(ticks.map((t) => t.simTimeMs)).toEqual([
      1_700_000_001_000, 1_700_000_002_000, 1_700_000_003_000,
    ]);
  });

  it('seek emits jumped without advancing the tick counter', () => {
    const c = new SimClock({ startAtMs: 1_000_000 });
    const jumps: { fromMs: number; toMs: number }[] = [];
    c.on('jumped', (j: { fromMs: number; toMs: number }) => jumps.push(j));
    c.seek(5_000_000);
    expect(c.getSimTimeMs()).toBe(5_000_000);
    expect(c.getTick()).toBe(0);
    expect(jumps).toEqual([{ fromMs: 1_000_000, toMs: 5_000_000 }]);
  });

  it('rejects non-positive or non-finite speed', () => {
    const c = new SimClock();
    expect(() => c.setSpeed(0)).toThrow(RangeError);
    expect(() => c.setSpeed(-1)).toThrow(RangeError);
    expect(() => c.setSpeed(Number.POSITIVE_INFINITY)).toThrow(RangeError);
  });

  it('clamps speed to [0.1, 100]', () => {
    const c = new SimClock();
    c.setSpeed(0.05);
    expect(c.getSpeed()).toBe(0.1);
    c.setSpeed(1000);
    expect(c.getSpeed()).toBe(100);
  });

  it('start/pause toggles status correctly', () => {
    vi.useFakeTimers();
    try {
      const c = new SimClock({ tickMs: 100 });
      const states: string[] = [];
      c.on('status', (s: string) => states.push(s));
      c.start();
      expect(c.getStatus()).toBe('running');
      c.pause();
      expect(c.getStatus()).toBe('paused');
      c.start();
      expect(c.getStatus()).toBe('running');
      c.stop();
      expect(c.getStatus()).toBe('stopped');
      expect(states).toEqual(['running', 'paused', 'running', 'stopped']);
    } finally {
      vi.useRealTimers();
    }
  });

  it('start fires ticks on a wall-clock schedule', () => {
    vi.useFakeTimers();
    try {
      const c = new SimClock({ startAtMs: 0, tickMs: 1000, speed: 10 }); // 100ms wall per tick
      const ticks: number[] = [];
      c.on('tick', (e: TickEvent) => ticks.push(e.tick));
      c.start();
      vi.advanceTimersByTime(500); // expect ~5 ticks at 100ms cadence
      c.stop();
      expect(ticks.length).toBeGreaterThanOrEqual(4);
      expect(ticks.length).toBeLessThanOrEqual(6);
    } finally {
      vi.useRealTimers();
    }
  });
});
