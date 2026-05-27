import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { isTelemetryEnabled, resolveTelemetryConfig } from '../config';

describe('resolveTelemetryConfig', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    delete process.env['SENTRY_DSN'];
    delete process.env['RELEASE'];
    process.env['NODE_ENV'] = 'development';
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('returns stub config when no env or overrides', () => {
    const cfg = resolveTelemetryConfig();
    expect(cfg.dsn).toBe('');
    expect(cfg.environment).toBe('development');
    expect(cfg.release).toBe('dev');
    expect(isTelemetryEnabled(cfg)).toBe(false);
  });

  it('honours explicit overrides', () => {
    const cfg = resolveTelemetryConfig({
      dsn: 'https://example@sentry.io/1',
      environment: 'production',
      release: '1.2.3',
    });
    expect(cfg.dsn).toBe('https://example@sentry.io/1');
    expect(cfg.environment).toBe('production');
    expect(cfg.tracesSampleRate).toBe(0.1);
    expect(isTelemetryEnabled(cfg)).toBe(true);
  });

  it('clamps invalid environment to development', () => {
    const cfg = resolveTelemetryConfig({
      environment: 'bogus' as 'production' | 'staging' | 'development',
    });
    expect(cfg.environment).toBe('development');
  });
});
