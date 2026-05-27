// Boot-time configuration for the simulator BFF.
// Validated with zod so a missing/invalid env var fails fast.
import { z } from 'zod';

const ConfigSchema = z.object({
  NODE_ENV: z.enum(['development', 'staging', 'production', 'test']).default('development'),
  HOST: z.string().default('0.0.0.0'),
  PORT: z.coerce.number().int().min(0).max(65535).default(4000),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),

  /** Sentry DSN — optional in development, populated in prod. */
  SENTRY_DSN: z.string().default(''),
  RELEASE: z.string().default('dev'),

  /** Postgres connection (added in PR 18). Optional today. */
  DATABASE_URL: z.string().default(''),

  /** CORS allow-list. Comma-separated origins. `*` allows all in dev. */
  CORS_ORIGINS: z.string().default('*'),
});

export type AppConfig = z.infer<typeof ConfigSchema>;

export function loadConfig(): AppConfig {
  const parsed = ConfigSchema.safeParse(process.env);
  if (!parsed.success) {
    console.error('Invalid configuration:', parsed.error.flatten().fieldErrors);
    process.exit(1);
  }
  return parsed.data;
}
