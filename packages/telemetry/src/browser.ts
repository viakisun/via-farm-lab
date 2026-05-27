// Browser entry — wires Sentry browser SDK. Stub-safe when DSN is missing.
import * as Sentry from '@sentry/browser';
import { isTelemetryEnabled, type TelemetryConfig } from './config';

let initialised = false;

/**
 * Initialise Sentry for browser apps. Idempotent.
 * When `config.dsn` is empty, this is a no-op (errors still bubble to the
 * browser console / DevTools).
 */
export function initBrowserTelemetry(config: TelemetryConfig): void {
  if (initialised) {
    return;
  }
  initialised = true;

  if (!isTelemetryEnabled(config)) {
    // Stub mode — surface the decision once so it's not silently absent.

    console.info('[telemetry] Sentry DSN absent — browser telemetry is in stub mode.');
    return;
  }

  Sentry.init({
    dsn: config.dsn,
    environment: config.environment,
    release: config.release,
    tracesSampleRate: config.tracesSampleRate,
    replaysSessionSampleRate: config.replaysSampleRate,
    integrations: [Sentry.browserTracingIntegration()],
  });
}

/**
 * Capture an exception. Falls back to `console.error` in stub mode.
 */
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
