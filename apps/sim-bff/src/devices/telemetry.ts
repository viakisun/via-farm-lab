// Composition layer: builds the commissioning view from the DeviceSource port,
// so the published actuals + verdicts always reflect the active telemetry source
// (sim today, real middleware later). Kept separate from commissioning-singleton
// to avoid an import cycle (devices → commissioning-singleton).
import type { RigSnapshot } from '@via-farm-lab/sim-models';

import { getCommissioningModel } from '../sim/commissioning-singleton';
import { getDeviceSource } from './index';
import { rigActualsFromReadings } from './source';

/** Every rig, with actuals sourced through the DeviceSource port. */
export function commissioningView(nowMs: number): RigSnapshot[] {
  const actuals = rigActualsFromReadings(getDeviceSource().readLatest(nowMs));
  return getCommissioningModel().snapshotAll(nowMs, actuals);
}

/** A single rig, actuals via the port. */
export function rigView(rigId: string, nowMs: number): RigSnapshot | undefined {
  const actuals = rigActualsFromReadings(getDeviceSource().readLatest(nowMs)).get(rigId);
  return getCommissioningModel().snapshot(rigId, nowMs, actuals);
}
