// Shared telemetry config — pulled from env vars. Validated at boot.
// Stub mode (no DSN) routes everything to console; production wires Sentry.

export interface TelemetryConfig {
  /** Sentry DSN. Empty string = stub mode (console only). */
  readonly dsn: string;
  /** App environment: `production` | `staging` | `development`. */
  readonly environment: 'production' | 'staging' | 'development';
  /** Release identifier (commit SHA or semver). */
  readonly release: string;
  /** Sampling rate for performance traces, 0–1. */
  readonly tracesSampleRate: number;
  /** Sampling rate for session replays, 0–1. */
  readonly replaysSampleRate: number;
}

const VALID_ENVS = new Set(['production', 'staging', 'development'] as const);

function readEnv(key: string, fallback = ''): string {
  if (typeof process !== 'undefined' && process.env) {
    return process.env[key] ?? fallback;
  }
  // Browser: relies on Vite-style `import.meta.env.VITE_*` — read at the
  // application boundary, not here. Use `resolveTelemetryConfig({ ... })`.
  return fallback;
}

/**
 * Build a `TelemetryConfig`. Accepts explicit overrides — useful in browser
 * code where `process.env` is not available. Validates the result.
 */
export function resolveTelemetryConfig(overrides: Partial<TelemetryConfig> = {}): TelemetryConfig {
  const envValue = overrides.environment ?? readEnv('NODE_ENV', 'development');
  const environment = (
    VALID_ENVS.has(envValue as 'production' | 'staging' | 'development') ? envValue : 'development'
  ) as TelemetryConfig['environment'];

  const dsn = overrides.dsn ?? readEnv('SENTRY_DSN', '');
  const release = overrides.release ?? readEnv('RELEASE', 'dev');

  const tracesSampleRate = overrides.tracesSampleRate ?? (environment === 'production' ? 0.1 : 1.0);

  const replaysSampleRate =
    overrides.replaysSampleRate ?? (environment === 'production' ? 0.01 : 0);

  return {
    dsn,
    environment,
    release,
    tracesSampleRate,
    replaysSampleRate,
  };
}

/** True when Sentry is configured; false in stub mode. */
export function isTelemetryEnabled(config: TelemetryConfig): boolean {
  return config.dsn.length > 0;
}
