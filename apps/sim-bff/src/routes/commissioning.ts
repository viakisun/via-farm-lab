// Commissioning (System Integration Test) surface — command a nutrient recipe
// and read back commanded-vs-actual verification. Separate from experiments:
// a single rig can be commissioned without any experiment. Rig dynamics are
// advanced by the clock tick (see routes/sim.ts) and streamed on /sim/stream.
import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';

import { getSimClock } from '../sim/clock-singleton';
import {
  commandRig,
  commissioningSnapshot,
  getCommissioningModel,
  resetRig,
} from '../sim/commissioning-singleton';

const CommandBody = z.object({
  targetEC: z.number().positive().finite(),
  targetPH: z.number().min(0).max(14),
  abRatio: z.number().positive().finite().optional(),
  volumeL: z.number().positive().finite().optional(),
});

const badRequest = (detail: string) => ({
  type: 'https://errors.viafarm.com.au/bad-request',
  title: 'Bad Request',
  status: 400,
  detail,
});

const notFound = (detail: string) => ({
  type: 'https://errors.viafarm.com.au/not-found',
  title: 'Not Found',
  status: 404,
  detail,
});

export const commissioningRoutes: FastifyPluginAsync = (app) => {
  const now = (): number => getSimClock().getSimTimeMs();

  app.get('/commissioning', () => commissioningSnapshot(now()));

  app.get('/commissioning/:rigId', (req, reply) => {
    const { rigId } = req.params as { rigId: string };
    const snap = getCommissioningModel().snapshot(rigId, now());
    if (!snap) {
      void reply.status(404).send(notFound(`rig ${rigId} not found`));
      return;
    }
    return snap;
  });

  app.post('/commissioning/:rigId/command', (req, reply) => {
    const { rigId } = req.params as { rigId: string };
    const parsed = CommandBody.safeParse(req.body);
    if (!parsed.success) {
      void reply.status(400).send(badRequest(parsed.error.message));
      return;
    }
    const b = parsed.data;
    const snap = commandRig(
      rigId,
      { EC: b.targetEC, pH: b.targetPH, abRatio: b.abRatio ?? 1 },
      now(),
      b.volumeL,
    );
    if (!snap) {
      void reply.status(404).send(notFound(`rig ${rigId} not found`));
      return;
    }
    return snap;
  });

  app.post('/commissioning/:rigId/reset', (req, reply) => {
    const { rigId } = req.params as { rigId: string };
    const snap = resetRig(rigId, now());
    if (!snap) {
      void reply.status(404).send(notFound(`rig ${rigId} not found`));
      return;
    }
    return snap;
  });

  return Promise.resolve();
};
