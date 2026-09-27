// Scheduled jobs, persisted to JSON (package-anchored path, never cwd). A job
// fires on sim-time: recurring (everySimMs) or one-shot (atSimMs). Actions apply
// a nutrient setting or issue a dose. The scheduler (sim/scheduler.ts) advances
// these each tick.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

export interface ScheduleAction {
  readonly kind: 'apply-setting' | 'dose';
  readonly rigId: string;
  /** apply-setting: partial RigConfig overrides. */
  readonly config?: Record<string, number>;
  /** dose: nutrient target. */
  readonly target?: { readonly EC: number; readonly pH: number; readonly abRatio: number };
}

export interface ScheduleJob {
  readonly id: string;
  readonly name: string;
  enabled: boolean;
  /** Recurring interval in sim-ms (mutually exclusive with atSimMs). */
  readonly everySimMs?: number;
  /** One-shot sim-time (mutually exclusive with everySimMs). */
  readonly atSimMs?: number;
  readonly action: ScheduleAction;
  lastRunMs: number | null;
  nextRunMs: number;
}

export interface ScheduleInput {
  readonly name: string;
  readonly everySimMs?: number;
  readonly atSimMs?: number;
  readonly action: ScheduleAction;
}

const DEFAULT_PATH = fileURLToPath(new URL('../../.data/schedules.json', import.meta.url));

interface Snapshot {
  readonly version: 1;
  readonly jobs: ScheduleJob[];
}

export class ScheduleStore {
  private readonly jobs = new Map<string, ScheduleJob>();
  private dirty = false;
  private saveTimer: NodeJS.Timeout | null = null;

  constructor(private readonly path: string = DEFAULT_PATH) {
    this.load();
    this.saveTimer = setInterval(() => this.flush(), 2000);
    this.saveTimer.unref?.();
  }

  list(): ScheduleJob[] {
    return [...this.jobs.values()];
  }

  get(id: string): ScheduleJob | undefined {
    return this.jobs.get(id);
  }

  create(input: ScheduleInput, nowMs: number): ScheduleJob {
    const id = randomUUID();
    const nextRunMs = input.atSimMs ?? nowMs + (input.everySimMs ?? 0);
    const job: ScheduleJob = {
      id,
      name: input.name,
      enabled: true,
      ...(input.everySimMs !== undefined ? { everySimMs: input.everySimMs } : {}),
      ...(input.atSimMs !== undefined ? { atSimMs: input.atSimMs } : {}),
      action: input.action,
      lastRunMs: null,
      nextRunMs,
    };
    this.jobs.set(id, job);
    this.dirty = true;
    return job;
  }

  update(id: string, patch: Partial<Pick<ScheduleJob, 'enabled' | 'lastRunMs' | 'nextRunMs'>>): ScheduleJob | undefined {
    const job = this.jobs.get(id);
    if (!job) return undefined;
    Object.assign(job, patch);
    this.dirty = true;
    return job;
  }

  delete(id: string): boolean {
    const existed = this.jobs.delete(id);
    if (existed) this.dirty = true;
    return existed;
  }

  flush(): void {
    if (!this.dirty) return;
    const snap: Snapshot = { version: 1, jobs: [...this.jobs.values()] };
    mkdirSync(dirname(this.path), { recursive: true });
    writeFileSync(this.path, JSON.stringify(snap, null, 2), 'utf8');
    this.dirty = false;
  }

  private load(): void {
    if (!existsSync(this.path)) return;
    try {
      const snap = JSON.parse(readFileSync(this.path, 'utf8')) as Snapshot;
      if (snap.version !== 1) return;
      for (const job of snap.jobs) this.jobs.set(job.id, job);
    } catch {
      // Corrupted / unreadable: start fresh.
    }
  }

  reset(): void {
    this.jobs.clear();
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

let instance: ScheduleStore | null = null;

export function getScheduleStore(): ScheduleStore {
  instance ??= new ScheduleStore();
  return instance;
}

export function resetScheduleStoreForTests(): void {
  instance?.reset();
  instance = null;
}
