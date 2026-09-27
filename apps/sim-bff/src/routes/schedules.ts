// Scheduling surface — create/list/toggle/delete sim-time jobs that apply a
// setting or issue a dose. Jobs are advanced by the clock tick (sim/scheduler).
import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';

import { getSimClock } from '../sim/clock-singleton';
import { runScheduleAction } from '../sim/scheduler';
import { getScheduleStore, type ScheduleAction, type ScheduleInput } from '../storage/scheduleStore';
import { broadcastSchedules } from './sim';

const ActionSchema = z.object({
  kind: z.enum(['apply-setting', 'dose']),
  rigId: z.string().min(1),
  config: z.record(z.number()).optional(),
  target: z.object({ EC: z.number().positive(), pH: z.number().min(0).max(14), abRatio: z.number().positive() }).optional(),
});

const CreateSchema = z
  .object({
    name: z.string().min(1),
    everySimMs: z.number().int().positive().optional(),
    atSimMs: z.number().int().nonnegative().optional(),
    action: ActionSchema,
  })
  .refine((d) => (d.everySimMs !== undefined) !== (d.atSimMs !== undefined), {
    message: 'provide exactly one of everySimMs or atSimMs',
  });

const problem = (status: number, detail: string) => ({
  type: `https://errors.viafarm.com.au/${status === 404 ? 'not-found' : 'bad-request'}`,
  title: status === 404 ? 'Not Found' : 'Bad Request',
  status,
  detail,
});

export const scheduleRoutes: FastifyPluginAsync = (app) => {
  const now = (): number => getSimClock().getSimTimeMs();
  const store = getScheduleStore();

  app.get('/schedules', () => store.list());

  app.post('/schedules', (req, reply) => {
    const parsed = CreateSchema.safeParse(req.body);
    if (!parsed.success) {
      void reply.status(400).send(problem(400, parsed.error.message));
      return;
    }
    const d = parsed.data;
    const action: ScheduleAction = {
      kind: d.action.kind,
      rigId: d.action.rigId,
      ...(d.action.config ? { config: d.action.config } : {}),
      ...(d.action.target ? { target: d.action.target } : {}),
    };
    const input: ScheduleInput = {
      name: d.name,
      action,
      ...(d.everySimMs !== undefined ? { everySimMs: d.everySimMs } : {}),
      ...(d.atSimMs !== undefined ? { atSimMs: d.atSimMs } : {}),
    };
    const job = store.create(input, now());
    broadcastSchedules();
    return job;
  });

  app.put('/schedules/:id', (req, reply) => {
    const { id } = req.params as { id: string };
    const parsed = z.object({ enabled: z.boolean() }).safeParse(req.body);
    if (!parsed.success) {
      void reply.status(400).send(problem(400, parsed.error.message));
      return;
    }
    const job = store.update(id, { enabled: parsed.data.enabled });
    if (!job) {
      void reply.status(404).send(problem(404, `job ${id} not found`));
      return;
    }
    broadcastSchedules();
    return job;
  });

  app.delete('/schedules/:id', (req, reply) => {
    const { id } = req.params as { id: string };
    if (!store.delete(id)) {
      void reply.status(404).send(problem(404, `job ${id} not found`));
      return;
    }
    broadcastSchedules();
    return { deleted: true, id };
  });

  app.post('/schedules/:id/run', (req, reply) => {
    const { id } = req.params as { id: string };
    const job = store.get(id);
    if (!job) {
      void reply.status(404).send(problem(404, `job ${id} not found`));
      return;
    }
    runScheduleAction(job.action, now());
    const updated = store.update(id, { lastRunMs: now() });
    broadcastSchedules();
    return updated;
  });

  return Promise.resolve();
};
