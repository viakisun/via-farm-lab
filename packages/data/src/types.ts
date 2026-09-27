// Shared payload types mirrored from the BFF (kept hand-written + minimal so
// the data package has no build-time dependency on sim-bff internals).

export type Signal = 'Pending' | 'Estimated' | 'Measured';

export interface Verdict {
  readonly metric: 'EC' | 'pH' | 'flow' | 'power';
  readonly target: number;
  readonly actual: number;
  readonly variance: number;
  readonly tolerance: number;
  readonly withinTol: boolean;
  readonly settled: boolean;
  readonly signal: Signal;
}

export interface RigConfig {
  readonly flowRateLmin: number;
  readonly pumpPowerW: number;
  readonly baselinePowerW: number;
  readonly ecK: number;
  readonly baseVolumeL: number;
  readonly tauSec: number;
  readonly settleHoldSec: number;
  readonly ecTol: number;
  readonly phTol: number;
  readonly defaultAbRatio: number;
}

export interface Rig {
  readonly id: string;
  readonly label: string;
  readonly volumeL: number;
  readonly EC: number;
  readonly pH: number;
  readonly target: { readonly EC: number; readonly pH: number; readonly abRatio: number } | null;
  readonly flowLmin: number;
  readonly powerW: number;
  readonly lastCommandMs: number | null;
  readonly inFlight: boolean;
  readonly settled: boolean;
  readonly verdicts: Verdict[];
  readonly config: RigConfig;
}

export interface CommandInput {
  readonly targetEC: number;
  readonly targetPH: number;
  readonly abRatio: number;
  readonly volumeL?: number;
}

export interface SettingsEntry {
  readonly scope: string;
  readonly config: RigConfig;
}

export interface SensorReading {
  readonly sensorId: string;
  readonly t: string;
  readonly value: number;
  readonly quality: 'good' | 'suspect' | 'bad';
}

export interface ScheduleAction {
  readonly kind: 'apply-setting' | 'dose';
  readonly rigId: string;
  readonly config?: Record<string, number>;
  readonly target?: { readonly EC: number; readonly pH: number; readonly abRatio: number };
}

export interface ScheduleJob {
  readonly id: string;
  readonly name: string;
  readonly enabled: boolean;
  readonly everySimMs?: number;
  readonly atSimMs?: number;
  readonly action: ScheduleAction;
  readonly lastRunMs: number | null;
  readonly nextRunMs: number;
}

export interface ScheduleInput {
  readonly name: string;
  readonly everySimMs?: number;
  readonly atSimMs?: number;
  readonly action: ScheduleAction;
}
