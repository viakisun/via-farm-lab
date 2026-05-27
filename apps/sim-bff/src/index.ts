// Entry point for `pnpm dev` (tsx watch) and `pnpm start` (built).
import { resolveTelemetryConfig } from '@via-farm-lab/telemetry';
import { initNodeTelemetry } from '@via-farm-lab/telemetry/node';

import { loadConfig } from './config';
import { buildServer } from './server';

async function main(): Promise<void> {
  const config = loadConfig();

  initNodeTelemetry(
    resolveTelemetryConfig({
      dsn: config.SENTRY_DSN,
      environment: config.NODE_ENV === 'test' ? 'development' : config.NODE_ENV,
      release: config.RELEASE,
    }),
  );

  const app = await buildServer({ config });

  const shutdown = async (signal: string): Promise<void> => {
    app.log.info({ signal }, 'shutting down');
    await app.close();
    process.exit(0);
  };
  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));

  try {
    await app.listen({ host: config.HOST, port: config.PORT });
    app.log.info({ host: config.HOST, port: config.PORT }, 'sim-bff listening');
  } catch (err) {
    app.log.error(err, 'failed to start sim-bff');
    process.exit(1);
  }
}

void main();
