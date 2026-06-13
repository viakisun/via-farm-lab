// In-memory experiment store with JSON-file persistence.
//
// Phase 1: single JSON file at `<repo>/apps/sim-bff/.data/experiments.json`.
// Writes are throttled (saved on dirty flag every 2 s via a timer plus on
// process exit). Phase G migrates to Supabase Postgres.
//
// Concurrency invariant: a plot can belong to at most ONE running
// experiment at a time. Enforced by `validateStart()`.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

import type { Experiment, PlotAssignment } from '../domain/experiment';

const DEFAULT_PATH = 'apps/sim-bff/.data/experiments.json';

interface Snapshot {
  readonly version: 1;
  readonly experiments: Experiment[];
}

export class ExperimentStore {
  private readonly experiments = new Map<string, Experiment>();
  private dirty = false;
  private saveTimer: NodeJS.Timeout | null = null;

  constructor(private readonly path: string = DEFAULT_PATH) {
    this.load();
    this.saveTimer = setInterval(() => this.flush(), 2000);
    this.saveTimer.unref?.();
  }

  list(): readonly Experiment[] {
    return [...this.experiments.values()];
  }

  get(id: string): Experiment | undefined {
    return this.experiments.get(id);
  }

  upsert(experiment: Experiment): void {
    this.experiments.set(experiment.id, experiment);
    this.dirty = true;
  }

  delete(id: string): boolean {
    const existed = this.experiments.delete(id);
    if (existed) this.dirty = true;
    return existed;
  }

  /**
   * Check that none of the supplied assignments conflict with plots already
   * claimed by other running experiments. Returns the list of offending plot
   * ids (empty = OK to start).
   */
  validateStart(experimentId: string, assignments: readonly PlotAssignment[]): readonly string[] {
    const claimed = new Set<string>();
    for (const exp of this.experiments.values()) {
      if (exp.id === experimentId) continue;
      if (exp.status !== 'running') continue;
      for (const a of exp.assignments) claimed.add(a.plotId);
    }
    const conflicts: string[] = [];
    for (const a of assignments) {
      if (claimed.has(a.plotId)) conflicts.push(a.plotId);
    }
    return conflicts;
  }

  /**
   * All assignments across every running experiment. Used by the simulator
   * to know which plots to advance + which env to apply.
   */
  activeAssignments(): readonly PlotAssignment[] {
    const out: PlotAssignment[] = [];
    for (const exp of this.experiments.values()) {
      if (exp.status !== 'running') continue;
      for (const a of exp.assignments) out.push(a);
    }
    return out;
  }

  flush(): void {
    if (!this.dirty) return;
    const snap: Snapshot = { version: 1, experiments: [...this.experiments.values()] };
    mkdirSync(dirname(this.path), { recursive: true });
    writeFileSync(this.path, JSON.stringify(snap, null, 2), 'utf8');
    this.dirty = false;
  }

  private load(): void {
    if (!existsSync(this.path)) return;
    try {
      const raw = readFileSync(this.path, 'utf8');
      const snap = JSON.parse(raw) as Snapshot;
      if (snap.version !== 1) return;
      for (const exp of snap.experiments) this.experiments.set(exp.id, exp);
    } catch {
      // Corrupted / unreadable file: start fresh. (Could log here.)
    }
  }

  /** Test helper. */
  reset(): void {
    this.experiments.clear();
    this.dirty = false;
  }

  dispose(): void {
    if (this.saveTimer) {
      clearInterval(this.saveTimer);
      this.saveTimer = null;
    }
    this.flush();
  }
}

let instance: ExperimentStore | null = null;

export function getExperimentStore(): ExperimentStore {
  instance ??= new ExperimentStore();
  return instance;
}

export function resetExperimentStoreForTests(): void {
  instance?.reset();
  instance = null;
}
