// Singleton SimClock instance owned by the BFF process.
// Multiple HTTP/WS callers share the same simulated time.
//
// Lifecycle:
//  - Lazily created on first import; starts immediately so a freshly
//    booted BFF emits ticks even with no clients connected (matches the
//    "real" backend behaviour where the PLC doesn't wait for an observer).
//  - Survives plugin reloads in dev (tsx watch re-imports modules but the
//    singleton is reset to a new instance — that's fine for dev hot-reload).
import { SimClock } from '@via-farm-lab/sim-core';

let instance: SimClock | null = null;

export function getSimClock(): SimClock {
  if (!instance) {
    instance = new SimClock({
      // tickMs 1000 = 1 Hz simulated. Wall-clock cadence = tickMs / speed.
      tickMs: 1000,
      speed: 1,
    });
    instance.start();
  }
  return instance;
}

/** Test helper: reset the singleton between specs. */
export function resetSimClockForTests(): void {
  if (instance) {
    instance.stop();
    instance.removeAllListeners();
  }
  instance = null;
}
