import { describe, expect, it } from 'vitest';

import { resetDeviceSourceForTests } from '../devices';
import { tickIngest } from '../devices/ingest';
import type { SensorReading } from '../devices/source';
import { resetCommissioningForTests } from '../sim/commissioning-singleton';
import { getSensorStore, resetSensorStoreForTests } from '../storage/sensorStore';

describe('ingest + historian', () => {
  const fresh = (): void => {
    resetCommissioningForTests();
    resetDeviceSourceForTests();
    resetSensorStoreForTests();
  };

  it('pulls readings through the DeviceSource port for the seeded rig', () => {
    fresh();
    const readings = tickIngest(1_000);
    const ids = readings.map((r: SensorReading) => r.sensorId).sort();
    expect(ids).toEqual([
      'pilot.syd.a:EC',
      'pilot.syd.a:flow',
      'pilot.syd.a:pH',
      'pilot.syd.a:power',
    ]);
    expect(readings.every((r) => r.quality === 'good')).toBe(true);
  });

  it('keeps latest fresh but downsamples history to ≤1/min and caps it', () => {
    fresh();
    const store = getSensorStore();
    // 200 ticks 1 s apart → latest always updates, history gates at 60 s.
    for (let i = 0; i < 200; i++) tickIngest(i * 1_000);
    expect(store.getLatest()).toHaveLength(4);
    const hist = store.getHistory('pilot.syd.a:EC');
    // 200 s of 1 s ticks → ~4 history points (t=0,60,120,180), never per-tick.
    expect(hist.length).toBeLessThanOrEqual(5);
    expect(hist.length).toBeGreaterThanOrEqual(3);
  });
});
