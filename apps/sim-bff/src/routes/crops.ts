// Crop catalog endpoint. Read-only — catalog is static in the sim-models
// package; the UI uses it for ExperimentDesigner crop pickers.
import { allCrops, getCrop } from '@via-farm-lab/sim-models';
import type { FastifyPluginAsync } from 'fastify';

export const cropRoutes: FastifyPluginAsync = (app) => {
  app.get('/crops', () => allCrops());

  app.get<{ Params: { id: string } }>('/crops/:id', (req, reply) => {
    try {
      // getCrop throws when given an unknown id (CropId is a union).
      const c = getCrop(req.params.id as Parameters<typeof getCrop>[0]);
      if (!c) {
        void reply.status(404).send({
          type: 'https://errors.viafarm.com.au/not-found',
          title: 'Not Found',
          status: 404,
          detail: `Unknown crop id: ${req.params.id}`,
        });
        return;
      }
      return c;
    } catch (err) {
      void reply.status(400).send({
        type: 'https://errors.viafarm.com.au/bad-request',
        title: 'Bad Request',
        status: 400,
        detail: err instanceof Error ? err.message : String(err),
      });
      return;
    }
  });

  return Promise.resolve();
};
