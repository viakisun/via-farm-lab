// Telemetry ingest pipeline: pull readings through the DeviceSource port and
// record them into the (bounded) historian. One path whether the source is the
// sim or the real middleware. Driven from the clock tick; returns the readings
// so the caller can also broadcast them.
import { getSensorStore } from '../storage/sensorStore';
import { getDeviceSource } from './index';
import type { SensorReading } from './source';

export function tickIngest(nowMs: number): SensorReading[] {
  const readings = getDeviceSource().readLatest(nowMs);
  getSensorStore().record(readings, nowMs);
  return readings;
}
