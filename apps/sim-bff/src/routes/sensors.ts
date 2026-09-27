// Read-only telemetry surface — latest readings + bounded history, sourced
// through the DeviceSource port. Mirrors backend.yaml GET /sensors + history.
import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';

import { getDeviceSource } from '../devices';
import { getSensorStore } from '../storage/sensorStore';

const HistoryQuery = z.object({
  sensorId: z.string(),
  limit: z.coerce.number().int().positive().max(1000).optional(),
});

export const sensorRoutes: FastifyPluginAsync = (app) => {
  app.get('/sensors', () => getDeviceSource().listSensors());

  app.get('/sensors/latest', () => getSensorStore().getLatest());

  app.get('/sensors/history', (req, reply) => {
    const parsed = HistoryQuery.safeParse(req.query);
    if (!parsed.success) {
      void reply.status(400).send({
        type: 'https://errors.viafarm.com.au/bad-request',
        title: 'Bad Request',
        status: 400,
        detail: parsed.error.message,
      });
      return;
    }
    return getSensorStore().getHistory(parsed.data.sensorId, parsed.data.limit);
  });

  return Promise.resolve();
};
