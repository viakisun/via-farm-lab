// DeviceSource — the integration-middleware seam. Everything downstream reads
// "actual" telemetry through this port, never from the sim singletons directly.
// Today a SimDeviceSource taps the in-process simulator; later a
// BackendDeviceSource will tap the real L1–L2 middleware (backend.yaml) and
// nothing downstream changes. Shapes mirror backend.yaml schema names so the
// later swap is mechanical (no OpenAPI edits yet).

export type Quality = 'good' | 'suspect' | 'bad';

/** A single sensor reading. Mirrors backend.yaml `SensorReading`. */
export interface SensorReading {
  /** `<equipmentId>:<metric>`, e.g. `pilot.syd.a:EC`. */
  readonly sensorId: string;
  /** ISO sim-time of the reading. */
  readonly t: string;
  readonly value: number;
  readonly quality: Quality;
}

/** Static descriptor for a sensor. Mirrors backend.yaml `Sensor`. */
export interface SensorMeta {
  readonly sensorId: string;
  readonly metric: string;
  readonly unit: string;
  /** Owning equipment / rig (e.g. a reservoir). */
  readonly equipmentId: string;
}

export type EquipmentAction = 'on' | 'off' | 'set';

/** Actuator command. Mirrors backend.yaml `EquipmentCommand`. */
export interface EquipmentCommand {
  readonly action: EquipmentAction;
  /** Which metric to set (for action `set`), e.g. `EC`. */
  readonly metric?: string;
  readonly setpoint?: number;
  readonly actorId?: string;
  readonly reason?: string;
}

/** Async-style ack. Mirrors backend.yaml `CommandAck`. */
export interface CommandAck {
  readonly accepted: boolean;
  readonly equipmentId: string;
  readonly at: string;
  readonly detail?: string;
}

/**
 * The seam. `sim` and `backend` implementations satisfy this identically; the
 * BFF only ever talks to a DeviceSource.
 */
export interface DeviceSource {
  readonly kind: 'sim' | 'backend';
  listSensors(): SensorMeta[];
  /** Current value of every sensor at `nowMs` (ISO derived from sim time). */
  readLatest(nowMs: number): SensorReading[];
  /** Send an actuator command (used by the scheduler + settings apply). */
  command(equipmentId: string, cmd: EquipmentCommand, nowMs: number): CommandAck;
}

/** Per-rig actuals extracted from a flat reading list (consumer convenience). */
export interface RigActuals {
  readonly EC: number;
  readonly pH: number;
  readonly flow: number;
  readonly power: number;
}

export const sensorId = (equipmentId: string, metric: string): string => `${equipmentId}:${metric}`;

/** Group readings into `{ equipmentId → {EC,pH,flow,power} }`. */
export function rigActualsFromReadings(readings: readonly SensorReading[]): Map<string, RigActuals> {
  const out = new Map<string, Partial<Record<keyof RigActuals, number>>>();
  for (const r of readings) {
    const sep = r.sensorId.lastIndexOf(':');
    if (sep < 0) continue;
    const eq = r.sensorId.slice(0, sep);
    const metric = r.sensorId.slice(sep + 1) as keyof RigActuals;
    const cur = out.get(eq) ?? {};
    cur[metric] = r.value;
    out.set(eq, cur);
  }
  const result = new Map<string, RigActuals>();
  for (const [eq, m] of out) {
    result.set(eq, { EC: m.EC ?? 0, pH: m.pH ?? 0, flow: m.flow ?? 0, power: m.power ?? 0 });
  }
  return result;
}
