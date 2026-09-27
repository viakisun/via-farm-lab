// CommissioningModel — orchestrates per-rig command → mix → deliver → verify.
// Held singleton-style by the BFF, advanced once per clock tick. Each rig has a
// runtime-overridable RigConfig (the "양액 설정") so settings flow into the physics.

import { expectedEC, expectedPH, recipeForTarget } from './mixing';
import {
  type CommissionTarget,
  DEFAULT_RIG_CONFIG,
  makeRig,
  type RigConfig,
  type RigState,
  type Signal,
  type Verdict,
} from './state';

export interface RigSnapshot extends RigState {
  readonly inFlight: boolean;
  readonly settled: boolean;
  readonly verdicts: Verdict[];
  readonly config: RigConfig;
}

/** Externally-sourced actuals (from the DeviceSource port). When supplied,
 *  verdicts + the published snapshot use these instead of the model's internal
 *  state — so the same numbers flow whether the source is sim or real hardware. */
export interface RigActuals {
  readonly EC: number;
  readonly pH: number;
  readonly flow: number;
  readonly power: number;
}

export class CommissioningModel {
  private readonly rigs = new Map<string, RigState>();
  private readonly configs = new Map<string, RigConfig>();

  /** Register a rig (idempotent — keeps existing state if present). */
  register(id: string, label: string, EC: number, pH: number, volumeL: number): void {
    if (!this.rigs.has(id)) {
      this.rigs.set(id, makeRig(id, label, EC, pH, volumeL));
      this.configs.set(id, { ...DEFAULT_RIG_CONFIG });
    }
  }

  has(id: string): boolean {
    return this.rigs.has(id);
  }

  get(id: string): RigState | undefined {
    return this.rigs.get(id);
  }

  ids(): string[] {
    return [...this.rigs.keys()];
  }

  /** The rig's current tunable config (the 양액 설정). */
  config(id: string): RigConfig {
    return this.configs.get(id) ?? DEFAULT_RIG_CONFIG;
  }

  /** Override part of a rig's config at runtime (from the settings store). */
  configure(id: string, patch: Partial<RigConfig>): RigConfig | undefined {
    if (!this.rigs.has(id)) return undefined;
    const next = { ...this.config(id), ...patch };
    this.configs.set(id, next);
    return next;
  }

  /** Command a recipe: mix the stock volumes (per config) and begin delivery. */
  command(id: string, target: CommissionTarget, nowMs: number): RigState | undefined {
    const rig = this.rigs.get(id);
    if (!rig) return undefined;
    const cfg = this.config(id);
    const recipe = recipeForTarget(target, rig.volumeL, cfg);
    rig.target = target;
    rig.recipe = recipe;
    rig.expectedEC = expectedEC(recipe, rig.volumeL, cfg);
    rig.expectedPH = expectedPH(recipe, rig.volumeL, cfg);
    rig.lastCommandMs = nowMs;
    rig.settledSinceMs = null;
    return rig;
  }

  /** Reset a rig to baseline (clears the command; keeps config). */
  reset(id: string, EC: number, pH: number): RigState | undefined {
    const rig = this.rigs.get(id);
    if (!rig) return undefined;
    rig.EC = EC;
    rig.pH = pH;
    rig.target = null;
    rig.recipe = null;
    rig.expectedEC = null;
    rig.expectedPH = null;
    rig.flowLmin = 0;
    rig.powerW = 0;
    rig.lastCommandMs = null;
    rig.settledSinceMs = null;
    return rig;
  }

  /** Euler-step one rig by `dtMs` of sim time: ramp actual toward the
   *  commanded value (config time constant), run the delivery pump until settled. */
  advance(id: string, dtMs: number, nowMs: number): void {
    const rig = this.rigs.get(id);
    if (!rig) return;
    const dtSec = dtMs / 1000;
    if (dtSec <= 0) return;
    const cfg = this.config(id);

    if (rig.target === null || rig.expectedEC === null || rig.expectedPH === null) {
      rig.flowLmin = 0;
      rig.powerW = 0;
      return;
    }

    const alpha = 1 - Math.exp(-dtSec / cfg.tauSec);
    rig.EC += (rig.expectedEC - rig.EC) * alpha;
    rig.pH += (rig.expectedPH - rig.pH) * alpha;

    const within =
      Math.abs(rig.EC - rig.target.EC) <= cfg.ecTol && Math.abs(rig.pH - rig.target.pH) <= cfg.phTol;
    if (within) {
      rig.settledSinceMs ??= nowMs;
    } else {
      rig.settledSinceMs = null;
    }

    const settled = this.isSettled(rig, cfg, nowMs);
    rig.flowLmin = settled ? 0 : cfg.flowRateLmin;
    rig.powerW = settled ? cfg.baselinePowerW : cfg.pumpPowerW;
  }

  private isSettled(rig: RigState, cfg: RigConfig, nowMs: number): boolean {
    return rig.settledSinceMs !== null && nowMs - rig.settledSinceMs >= cfg.settleHoldSec * 1000;
  }

  /** Commanded-vs-actual verdict per metric, with the honesty signal.
   *  `actuals` (from the DeviceSource port) override the model's internal state. */
  verdicts(id: string, nowMs: number, actuals?: RigActuals): Verdict[] {
    const rig = this.rigs.get(id);
    if (!rig) return [];
    const cfg = this.config(id);
    const ecA = actuals?.EC ?? rig.EC;
    const phA = actuals?.pH ?? rig.pH;
    const flowA = actuals?.flow ?? rig.flowLmin;
    const powerA = actuals?.power ?? rig.powerW;
    const commanded = rig.target !== null;
    const settled = this.isSettled(rig, cfg, nowMs);
    const grow: Signal = !commanded ? 'Pending' : settled ? 'Measured' : 'Estimated';
    const sense: Signal = !commanded ? 'Pending' : 'Measured';

    const v = (
      metric: Verdict['metric'],
      target: number,
      actual: number,
      tolerance: number,
      signal: Signal,
    ): Verdict => {
      const variance = actual - target;
      return {
        metric,
        target,
        actual,
        variance,
        tolerance,
        withinTol: Math.abs(variance) <= tolerance,
        settled,
        signal,
      };
    };

    return [
      v('EC', rig.target?.EC ?? ecA, ecA, cfg.ecTol, grow),
      v('pH', rig.target?.pH ?? phA, phA, cfg.phTol, grow),
      v('flow', cfg.flowRateLmin, flowA, cfg.flowRateLmin, sense),
      v('power', cfg.pumpPowerW, powerA, cfg.pumpPowerW, sense),
    ];
  }

  /** Full snapshot for streaming / REST. `actuals` (from the port) override the
   *  internal EC/pH/flow/power so published values match the telemetry source. */
  snapshot(id: string, nowMs: number, actuals?: RigActuals): RigSnapshot | undefined {
    const rig = this.rigs.get(id);
    if (!rig) return undefined;
    const cfg = this.config(id);
    const settled = this.isSettled(rig, cfg, nowMs);
    return {
      ...rig,
      EC: actuals?.EC ?? rig.EC,
      pH: actuals?.pH ?? rig.pH,
      flowLmin: actuals?.flow ?? rig.flowLmin,
      powerW: actuals?.power ?? rig.powerW,
      inFlight: rig.target !== null && !settled,
      settled,
      verdicts: this.verdicts(id, nowMs, actuals),
      config: cfg,
    };
  }

  snapshotAll(nowMs: number, actualsByRig?: Map<string, RigActuals>): RigSnapshot[] {
    return this.ids()
      .map((id) => this.snapshot(id, nowMs, actualsByRig?.get(id)))
      .filter((s): s is RigSnapshot => s !== undefined);
  }
}
