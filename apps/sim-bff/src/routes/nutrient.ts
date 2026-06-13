// Read-only endpoints for the nutrient subsystem — dosing-tank levels +
// recent dosing events. The pool state itself is broadcast via the
// /sim/multi-metric stream (poolEC / poolPH per plot).
import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';

import { dosingTankState, recentDosingEventsList } from '../sim/experiment-runner';

const EventsQuery = z.object({
  sinceMs: z.coerce.number().int().nonnegative().optional(),
  plotId: z.string().optional(),
  kind: z.enum(['ec-boost', 'ph-acid']).optional(),
  limit: z.coerce.number().int().positive().max(500).optional(),
});

export const nutrientRoutes: FastifyPluginAsync = (app) => {
  app.get('/nutrient/tanks', () => dosingTankState());

  app.get('/nutrient/events', (req, reply) => {
    const parsed = EventsQuery.safeParse(req.query);
    if (!parsed.success) {
      void reply.status(400).send({
        type: 'https://errors.viafarm.com.au/bad-request',
        title: 'Bad Request',
        status: 400,
        detail: parsed.error.message,
      });
      return;
    }
    const q = parsed.data;
    const all = recentDosingEventsList();
    const filtered = all.filter((e) => {
      if (q.sinceMs !== undefined && e.timestampMs < q.sinceMs) return false;
      if (q.plotId !== undefined && e.plotId !== q.plotId) return false;
      if (q.kind !== undefined && e.kind !== q.kind) return false;
      return true;
    });
    const limit = q.limit ?? 200;
    return filtered.slice(-limit);
  });

  return Promise.resolve();
};
