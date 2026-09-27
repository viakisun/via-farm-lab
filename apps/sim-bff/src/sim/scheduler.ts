// Sim-time scheduler: each tick, fire any due jobs and reschedule them. Actions
// flow through the same paths as manual ops — apply-setting → configureRig,
// dose → commandRig — so a scheduled change is indistinguishable from a manual
// one downstream.
import { getScheduleStore, type ScheduleAction, type ScheduleJob } from '../storage/scheduleStore';
import { commandRig, configureRig } from './commissioning-singleton';

export function runScheduleAction(action: ScheduleAction, nowMs: number): void {
  if (action.kind === 'apply-setting') {
    configureRig(action.rigId, action.config ?? {});
  } else {
    commandRig(action.rigId, action.target ?? { EC: 1.5, pH: 6.0, abRatio: 1 }, nowMs);
  }
}

/** Advance the scheduler by sim time. Returns the jobs that fired. */
export function tickScheduler(nowMs: number): ScheduleJob[] {
  const store = getScheduleStore();
  const fired: ScheduleJob[] = [];
  for (const job of store.list()) {
    if (!job.enabled || nowMs < job.nextRunMs) continue;
    runScheduleAction(job.action, nowMs);
    if (job.everySimMs !== undefined) {
      store.update(job.id, { lastRunMs: nowMs, nextRunMs: nowMs + job.everySimMs });
    } else {
      // One-shot: mark done.
      store.update(job.id, { lastRunMs: nowMs, enabled: false });
    }
    fired.push(job);
  }
  return fired;
}
