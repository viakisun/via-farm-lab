// Pool model — orchestrates per-plot PoolState advance, uptake, and
// dosing decisions. Held singleton-style by the BFF (one per simulator).

import { checkAndDose } from './dosing';
import { makePool, type DosingEvent, type PoolState, type PoolTarget } from './state';
import { uptakeRates } from './uptake';

export class PoolModel {
  private readonly pools = new Map<string, PoolState>();
  private readonly targets = new Map<string, PoolTarget>();

  /** Register or re-assign a plot's pool target. Initialises the pool to
   *  the setpoint EC/pH if it doesn't exist yet. */
  setTarget(plotId: string, target: PoolTarget): void {
    this.targets.set(plotId, target);
    if (!this.pools.has(plotId)) {
      this.pools.set(plotId, makePool(target));
    }
  }

  remove(plotId: string): void {
    this.pools.delete(plotId);
    this.targets.delete(plotId);
  }

  get(plotId: string): PoolState | undefined {
    return this.pools.get(plotId);
  }

  has(plotId: string): boolean {
    return this.pools.has(plotId);
  }

  /**
   * Euler-step one plot's pool by `dtMs` of simulated time.
   *
   * Returns a DosingEvent if uptake drove the pool past a threshold and
   * a dose fired this step. Caller is responsible for debiting the
   * dosing-tank totals from the returned event.
   */
  advance(
    plotId: string,
    dtMs: number,
    biomass_g: number,
    lightFactor: number,
    nowMs: number,
  ): DosingEvent | null {
    const pool = this.pools.get(plotId);
    const target = this.targets.get(plotId);
    if (!pool || !target) return null;
    const dtSec = dtMs / 1000;
    if (dtSec <= 0) return null;

    const rates = uptakeRates(biomass_g, lightFactor, pool.EC, target.EC);
    pool.EC = Math.max(0, pool.EC - rates.ec_drop_per_s * dtSec);
    pool.pH = pool.pH + rates.ph_drift_per_s * dtSec;

    const { event } = checkAndDose(plotId, pool, target, nowMs);
    return event;
  }

  /** Iterate over every registered pool for snapshotting. */
  entries(): IterableIterator<[string, PoolState]> {
    return this.pools.entries();
  }
}
