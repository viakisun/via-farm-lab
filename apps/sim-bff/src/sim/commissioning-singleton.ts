// Process-wide CommissioningModel — drives the System Integration Test (SIT)
// closed loop: a commanded recipe is mixed, delivered, and the actual EC/pH
// ramps toward target so the UI can verify commanded-vs-actual. Separate from
// the experiment pool (which snaps to setpoint).
import {
  type CommissionTarget,
  CommissioningModel,
  type RigSnapshot,
  type Verdict,
} from '@via-farm-lab/sim-models';

/** The one pilot reservoir we ship commissioning for. */
const DEFAULT_RIG = {
  id: 'pilot.syd.a',
  label: 'Glasshouse A reservoir',
  EC: 1.5,
  pH: 6.0,
  volumeL: 2.5,
} as const;

let instance: CommissioningModel | null = null;
let lastTickMs: number | null = null;

function model(): CommissioningModel {
  if (instance === null) {
    instance = new CommissioningModel();
    instance.register(
      DEFAULT_RIG.id,
      DEFAULT_RIG.label,
      DEFAULT_RIG.EC,
      DEFAULT_RIG.pH,
      DEFAULT_RIG.volumeL,
    );
  }
  return instance;
}

export function getCommissioningModel(): CommissioningModel {
  return model();
}

/** Advance every rig by the elapsed sim-time. Called once per clock tick. */
export function tickCommissioning(nowMs: number): void {
  const m = model();
  const dtMs = lastTickMs !== null ? Math.max(0, nowMs - lastTickMs) : 0;
  lastTickMs = nowMs;
  if (dtMs <= 0) return;
  for (const id of m.ids()) m.advance(id, dtMs, nowMs);
}

export function commissioningSnapshot(nowMs: number): RigSnapshot[] {
  return model().snapshotAll(nowMs);
}

export function commandRig(
  rigId: string,
  target: CommissionTarget,
  nowMs: number,
  volumeL?: number,
): RigSnapshot | undefined {
  const m = model();
  if (volumeL !== undefined) {
    const rig = m.get(rigId);
    if (rig) rig.volumeL = volumeL;
  }
  if (!m.command(rigId, target, nowMs)) return undefined;
  return m.snapshot(rigId, nowMs);
}

export function resetRig(rigId: string, nowMs: number): RigSnapshot | undefined {
  const m = model();
  if (!m.reset(rigId, DEFAULT_RIG.EC, DEFAULT_RIG.pH)) return undefined;
  return m.snapshot(rigId, nowMs);
}

export function rigVerdicts(rigId: string, nowMs: number): Verdict[] {
  return model().verdicts(rigId, nowMs);
}

export function resetCommissioningForTests(): void {
  instance = null;
  lastTickMs = null;
}
