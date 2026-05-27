// Simulator clock — virtual time controlled by a tick loop.
// Decouples real wall-clock from "simulated" time so the BFF can
// run at 1× live, fast-forward at 100× for demos, pause, or jump.
//
// Invariants:
// - Tick number is monotonic while running.
// - Pausing freezes virtual time; resume continues from where we paused.
// - Jumping is explicit (`seek`) and emits a `jumped` event.

import { EventEmitter } from 'node:events';

export interface ClockOptions {
  /** Initial virtual time (ms since unix epoch). Defaults to Date.now(). */
  readonly startAtMs?: number;
  /** Virtual ms advanced per tick. Default 1000 ms (1 Hz). */
  readonly tickMs?: number;
  /** Speed multiplier; 1 = real-time, 100 = fast demo, 0.1 = slow. */
  readonly speed?: number;
}

export type ClockStatus = 'stopped' | 'running' | 'paused';

export interface TickEvent {
  readonly tick: number;
  /** Simulated time at the end of this tick (ms since epoch). */
  readonly simTimeMs: number;
  /** Real-world time at which this tick fired (ms since epoch). */
  readonly wallTimeMs: number;
}

/**
 * SimClock — the driver heart of the simulator BFF.
 *
 * Emits:
 * - `tick`    : TickEvent (every tick, both live and during fast-forward)
 * - `status`  : ClockStatus (transitions)
 * - `jumped`  : { fromMs, toMs }
 * - `speed`   : number (new multiplier)
 */
export class SimClock extends EventEmitter {
  private status: ClockStatus = 'stopped';
  private tickNo = 0;
  private simTimeMs: number;
  private readonly tickMs: number;
  private speed: number;
  private timer: NodeJS.Timeout | null = null;

  constructor(opts: ClockOptions = {}) {
    super();
    this.simTimeMs = opts.startAtMs ?? Date.now();
    this.tickMs = opts.tickMs ?? 1000;
    this.speed = clampSpeed(opts.speed ?? 1);
  }

  start(): void {
    if (this.status === 'running') return;
    this.status = 'running';
    this.scheduleNext();
    this.emit('status', this.status);
  }

  pause(): void {
    if (this.status !== 'running') return;
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    this.status = 'paused';
    this.emit('status', this.status);
  }

  stop(): void {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    this.status = 'stopped';
    this.emit('status', this.status);
  }

  setSpeed(multiplier: number): void {
    const next = clampSpeed(multiplier);
    if (next === this.speed) return;
    this.speed = next;
    this.emit('speed', this.speed);
    // Re-schedule with new cadence if we are currently running.
    if (this.status === 'running' && this.timer) {
      clearTimeout(this.timer);
      this.scheduleNext();
    }
  }

  /** Jump virtual time to a new instant. Does not advance the tick counter. */
  seek(targetMs: number): void {
    const fromMs = this.simTimeMs;
    this.simTimeMs = targetMs;
    this.emit('jumped', { fromMs, toMs: targetMs });
  }

  /** Run N ticks synchronously regardless of wall clock (used in tests). */
  tickN(n: number): void {
    for (let i = 0; i < n; i++) {
      this.doTick(Date.now());
    }
  }

  getStatus(): ClockStatus {
    return this.status;
  }

  getTick(): number {
    return this.tickNo;
  }

  getSimTimeMs(): number {
    return this.simTimeMs;
  }

  getSpeed(): number {
    return this.speed;
  }

  // ─────────────────────────────────────────────────────────────────────

  private scheduleNext(): void {
    // Wall-clock delay between ticks = tickMs / speed.
    // For very high speeds we still floor at 1 ms to avoid hot-spinning.
    const delayMs = Math.max(1, Math.floor(this.tickMs / this.speed));
    this.timer = setTimeout(() => {
      if (this.status !== 'running') return;
      this.doTick(Date.now());
      this.scheduleNext();
    }, delayMs);
  }

  private doTick(wallTimeMs: number): void {
    this.tickNo += 1;
    this.simTimeMs += this.tickMs;
    const evt: TickEvent = {
      tick: this.tickNo,
      simTimeMs: this.simTimeMs,
      wallTimeMs,
    };
    this.emit('tick', evt);
  }
}

function clampSpeed(s: number): number {
  if (!Number.isFinite(s) || s <= 0) {
    throw new RangeError('SimClock: speed must be a positive finite number');
  }
  return Math.min(Math.max(s, 0.1), 100);
}
