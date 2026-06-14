// Build a Fastify instance with shared plugins. Reused by `index.ts` and tests.
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import websocket from '@fastify/websocket';
import Fastify, { type FastifyInstance } from 'fastify';

import type { AppConfig } from './config';
import { anomalyRoutes } from './routes/anomalies';
import { commissioningRoutes } from './routes/commissioning';
import { cropRoutes } from './routes/crops';
import { experimentRoutes } from './routes/experiments';
import { healthRoutes } from './routes/health';
import { metricsRoutes } from './routes/metrics';
import { nutrientRoutes } from './routes/nutrient';
import { observationRoutes } from './routes/observations';
import { scenarioRoutes } from './routes/scenarios';
import { simRoutes } from './routes/sim';

export interface BuildServerOptions {
  readonly config: AppConfig;
}

export async function buildServer(opts: BuildServerOptions): Promise<FastifyInstance> {
  const app = Fastify({
    logger: {
      level: opts.config.LOG_LEVEL,
      ...(opts.config.NODE_ENV !== 'production'
        ? {
            transport: {
              target: 'pino-pretty',
              options: { colorize: true, translateTime: 'SYS:HH:MM:ss.l', ignore: 'pid,hostname' },
            },
          }
        : {}),
    },
    disableRequestLogging: opts.config.NODE_ENV === 'production',
    bodyLimit: 1_000_000, // 1 MB
    trustProxy: true,
  });

  await app.register(helmet, { contentSecurityPolicy: false });
  await app.register(cors, {
    origin: parseOrigins(opts.config.CORS_ORIGINS),
    credentials: true,
  });
  await app.register(rateLimit, {
    max: 600,
    timeWindow: '1 minute',
    cache: 10_000,
  });
  await app.register(websocket);

  await app.register(healthRoutes);
  await app.register(metricsRoutes);
  await app.register(simRoutes);
  await app.register(experimentRoutes);
  await app.register(observationRoutes);
  await app.register(cropRoutes);
  await app.register(scenarioRoutes);
  await app.register(anomalyRoutes);
  await app.register(nutrientRoutes);
  await app.register(commissioningRoutes);

  app.get('/', () => ({ service: 'via-farm-lab/sim-bff', status: 'ok' }));

  return app;
}

function parseOrigins(raw: string): string | string[] | true {
  const trimmed = raw.trim();
  if (trimmed === '*') return true;
  return trimmed
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}
