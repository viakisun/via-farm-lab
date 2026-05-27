// Liveness + readiness endpoints. Liveness is always cheap; readiness will
// be extended (PR 18) to verify Postgres connectivity.
import type { FastifyInstance, FastifyPluginAsync } from 'fastify';

const STARTED_AT = new Date();

export const healthRoutes: FastifyPluginAsync = (app: FastifyInstance) => {
  app.get('/health', () => ({
    status: 'ok',
    service: 'via-farm-lab/sim-bff',
    uptimeSeconds: Math.round((Date.now() - STARTED_AT.getTime()) / 1000),
    startedAt: STARTED_AT.toISOString(),
  }));

  // Readiness — distinct from liveness. Returns 503 when not ready.
  // Today: always ready. PR 18 will add Postgres ping.
  app.get('/ready', (_req, reply) => {
    const ready = true;
    if (!ready) {
      void reply.status(503).send({ status: 'not-ready' });
      return;
    }
    return { status: 'ready' };
  });

  return Promise.resolve();
};
