// CommissioningModel — orchestrates per-rig command → mix → deliver → verify.
// Held singleton-style by the BFF, advanced once per clock tick.

import { expectedEC, expectedPH, recipeForTarget } from './mixing';
import {
  COMMISSION_PARAMS,
  makeRig,
  type CommissionTarget,
  type RigState,
  type Signal,
  type Verdict,
} from './state';

export interface RigSnapshot extends RigState {
  readonly inFlight: boolean;
  readonly settled: boolean;
  readonly verdicts: Verdict[];
}

const P = COMMISSION_PARAMS;

export class CommissioningModel {
  private readonly rigs = new Map<string, RigState>();

  /** Register a rig (idempotent — keeps existing state if present). */
  register(id: string, label: string, EC: number, pH: number, volumeL: number): void {
    if (!this.rigs.has(id)) this.rigs.set(id, makeRig(id, label, EC, pH, volumeL));
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

  /** Command a recipe: mix the stock volumes and begin delivery. */
  command(id: string, target: CommissionTarget, nowMs: number): RigState | undefined {
    const rig = this.rigs.get(id);
    if (!rig) return undefined;
    const recipe = recipeForTarget(target, rig.volumeL);
    rig.target = target;
    rig.recipe = recipe;
    rig.expectedEC = expectedEC(recipe, rig.volumeL);
    rig.expectedPH = expectedPH(recipe, rig.volumeL);
    rig.lastCommandMs = nowMs;
    rig.settledSinceMs = null;
    return rig;
  }

  /** Reset a rig to baseline (clears the command). */
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
   *  commanded value, run the delivery pump until settled. */
  advance(id: string, dtMs: number, nowMs: number): void {
    const rig = this.rigs.get(id);
    if (!rig) return;
    const dtSec = dtMs / 1000;
    if (dtSec <= 0) return;

    if (rig.target === null || rig.expectedEC === null || rig.expectedPH === null) {
      rig.flowLmin = 0;
      rig.powerW = 0;
      return;
    }

    // First-order approach to the expected (blended) values.
    const alpha = 1 - Math.exp(-dtSec / P.tauSec);
    rig.EC += (rig.expectedEC - rig.EC) * alpha;
    rig.pH += (rig.expectedPH - rig.pH) * alpha;

    const within =
      Math.abs(rig.EC - rig.target.EC) <= P.ecTol && Math.abs(rig.pH - rig.target.pH) <= P.phTol;
    if (within) {
      rig.settledSinceMs ??= nowMs;
    } else {
      rig.settledSinceMs = null;
    }

    const settled = this.isSettled(rig, nowMs);
    rig.flowLmin = settled ? 0 : P.flowRateLmin;
    rig.powerW = settled ? P.baselinePowerW : P.pumpPowerW;
  }

  private isSettled(rig: RigState, nowMs: number): boolean {
    return rig.settledSinceMs !== null && nowMs - rig.settledSinceMs >= P.settleHoldSec * 1000;
  }

  /** Commanded-vs-actual verdict per metric, with the honesty signal. */
  verdicts(id: string, nowMs: number): Verdict[] {
    const rig = this.rigs.get(id);
    if (!rig) return [];
    const commanded = rig.target !== null;
    const settled = this.isSettled(rig, nowMs);
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
      v('EC', rig.target?.EC ?? rig.EC, rig.EC, P.ecTol, grow),
      v('pH', rig.target?.pH ?? rig.pH, rig.pH, P.phTol, grow),
      v('flow', P.flowRateLmin, rig.flowLmin, P.flowRateLmin, sense),
      v('power', P.pumpPowerW, rig.powerW, P.pumpPowerW, sense),
    ];
  }

  /** Full snapshot for streaming / REST. */
  snapshot(id: string, nowMs: number): RigSnapshot | undefined {
    const rig = this.rigs.get(id);
    if (!rig) return undefined;
    const settled = this.isSettled(rig, nowMs);
    return {
      ...rig,
      inFlight: rig.target !== null && !settled,
      settled,
      verdicts: this.verdicts(id, nowMs),
    };
  }

  snapshotAll(nowMs: number): RigSnapshot[] {
    return this.ids()
      .map((id) => this.snapshot(id, nowMs))
      .filter((s): s is RigSnapshot => s !== undefined);
  }
}
