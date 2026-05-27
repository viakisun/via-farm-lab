// Node entry — wires Sentry node SDK for sim-bff and tooling.
import * as Sentry from '@sentry/node';
import { isTelemetryEnabled, type TelemetryConfig } from './config';

let initialised = false;

/**
 * Initialise Sentry for Node services. Idempotent.
 * Should be called before any other imports that may throw on boot.
 */
export function initNodeTelemetry(config: TelemetryConfig): void {
  if (initialised) {
    return;
  }
  initialised = true;

  if (!isTelemetryEnabled(config)) {
    console.info('[telemetry] Sentry DSN absent — node telemetry is in stub mode.');
    return;
  }

  Sentry.init({
    dsn: config.dsn,
    environment: config.environment,
    release: config.release,
    tracesSampleRate: config.tracesSampleRate,
  });
}

export function captureError(error: unknown, context?: Record<string, unknown>): void {
  if (initialised && Sentry.getClient()) {
    if (context !== undefined) {
      Sentry.captureException(error, { extra: context });
    } else {
      Sentry.captureException(error);
    }
    return;
  }

  console.error('[telemetry]', error, context ?? {});
}
