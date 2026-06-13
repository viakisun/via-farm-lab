// Read-only endpoint for the recent anomaly ring buffer.
import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';

import { recentAnomalyEvents } from '../sim/experiment-runner';

const Query = z.object({
  sinceMs: z.coerce.number().int().nonnegative().optional(),
  severity: z.enum(['info', 'warning', 'critical']).optional(),
  plotId: z.string().optional(),
  limit: z.coerce.number().int().positive().max(500).optional(),
});

export const anomalyRoutes: FastifyPluginAsync = (app) => {
  app.get('/anomalies', (req, reply) => {
    const parsed = Query.safeParse(req.query);
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
    const all = recentAnomalyEvents();
    const filtered = all.filter((a) => {
      if (q.sinceMs !== undefined && a.timestampMs < q.sinceMs) return false;
      if (q.severity !== undefined && a.severity !== q.severity) return false;
      if (q.plotId !== undefined && a.plotId !== q.plotId) return false;
      return true;
    });
    const limit = q.limit ?? 200;
    return filtered.slice(-limit);
  });

  return Promise.resolve();
};
