// Bounded in-memory historian for telemetry. Deliberately NOT persisted to
// disk — high-rate sensor data would otherwise recreate the `.data/` blow-up,
// and the durable historian is the Backend's job (backend.yaml /sensors/history).
// Keeps the latest value per sensor + a downsampled ring (≤1/min, hard-capped).
import type { SensorReading } from '../devices/source';

const DOWNSAMPLE_MS = 60_000; // at most one history point per sensor per sim-minute
const HISTORY_CAP = 240; // ≈ 4 h of 1/min points per sensor

export class SensorStore {
  private readonly latest = new Map<string, SensorReading>();
  private readonly history = new Map<string, SensorReading[]>();
  private readonly lastHistMs = new Map<string, number>();

  /** Update latest for every reading; append to history when the downsample
   *  gate opens. `nowMs` is sim-time (parsed from the reading timestamps). */
  record(readings: readonly SensorReading[], nowMs: number): void {
    for (const r of readings) {
      this.latest.set(r.sensorId, r);
      const last = this.lastHistMs.get(r.sensorId);
      if (last !== undefined && nowMs - last < DOWNSAMPLE_MS) continue;
      this.lastHistMs.set(r.sensorId, nowMs);
      const buf = this.history.get(r.sensorId) ?? [];
      buf.push(r);
      if (buf.length > HISTORY_CAP) buf.splice(0, buf.length - HISTORY_CAP);
      this.history.set(r.sensorId, buf);
    }
  }

  getLatest(): SensorReading[] {
    return [...this.latest.values()];
  }

  getHistory(sensorId: string, limit = HISTORY_CAP): SensorReading[] {
    const buf = this.history.get(sensorId) ?? [];
    return buf.slice(-limit);
  }

  reset(): void {
    this.latest.clear();
    this.history.clear();
    this.lastHistMs.clear();
  }
}

let instance: SensorStore | null = null;

export function getSensorStore(): SensorStore {
  instance ??= new SensorStore();
  return instance;
}

export function resetSensorStoreForTests(): void {
  instance?.reset();
  instance = null;
}
