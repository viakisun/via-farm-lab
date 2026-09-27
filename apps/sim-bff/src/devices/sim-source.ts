// SimDeviceSource — exposes the in-process simulator through the DeviceSource
// port. Reads the commissioning rigs and republishes EC/pH/flow/power as
// SensorReadings; routes `set` commands back into the rig target. This is the
// only place that knows the telemetry comes from the sim.
import { getCommissioningModel } from '../sim/commissioning-singleton';
import {
  type CommandAck,
  type DeviceSource,
  type EquipmentCommand,
  sensorId,
  type SensorMeta,
  type SensorReading,
} from './source';

const METRICS: { metric: string; unit: string }[] = [
  { metric: 'EC', unit: 'mS/cm' },
  { metric: 'pH', unit: '' },
  { metric: 'flow', unit: 'L/min' },
  { metric: 'power', unit: 'W' },
];

export class SimDeviceSource implements DeviceSource {
  readonly kind = 'sim' as const;

  listSensors(): SensorMeta[] {
    const m = getCommissioningModel();
    return m.ids().flatMap((id) =>
      METRICS.map((mt) => ({ sensorId: sensorId(id, mt.metric), metric: mt.metric, unit: mt.unit, equipmentId: id })),
    );
  }

  readLatest(nowMs: number): SensorReading[] {
    const m = getCommissioningModel();
    const t = new Date(nowMs).toISOString();
    const out: SensorReading[] = [];
    for (const id of m.ids()) {
      const s = m.snapshot(id, nowMs);
      if (!s) continue;
      const vals: Record<string, number> = { EC: s.EC, pH: s.pH, flow: s.flowLmin, power: s.powerW };
      for (const { metric } of METRICS) {
        out.push({ sensorId: sensorId(id, metric), t, value: vals[metric] ?? 0, quality: 'good' });
      }
    }
    return out;
  }

  command(equipmentId: string, cmd: EquipmentCommand, nowMs: number): CommandAck {
    const at = new Date(nowMs).toISOString();
    const m = getCommissioningModel();
    const rig = m.get(equipmentId);
    if (!rig) return { accepted: false, equipmentId, at, detail: 'unknown equipment' };
    if (cmd.action !== 'set' || cmd.setpoint === undefined || !cmd.metric) {
      return { accepted: false, equipmentId, at, detail: 'only { action:set, metric, setpoint } supported' };
    }
    // Merge the single-metric setpoint into a full nutrient target.
    const base = rig.target ?? { EC: rig.EC, pH: rig.pH, abRatio: 1 };
    const target =
      cmd.metric === 'EC'
        ? { ...base, EC: cmd.setpoint }
        : cmd.metric === 'pH'
          ? { ...base, pH: cmd.setpoint }
          : null;
    if (!target) return { accepted: false, equipmentId, at, detail: `metric ${cmd.metric} not settable` };
    m.command(equipmentId, target, nowMs);
    return { accepted: true, equipmentId, at, detail: `set ${cmd.metric}=${cmd.setpoint}` };
  }
}
