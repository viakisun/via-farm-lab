// Structured logger built on Pino. Pretty-prints in development, JSON in prod.
import pino, { type Logger, type LoggerOptions } from 'pino';

interface CreateLoggerOptions {
  /** Logical name appearing in every log line (e.g. `sim-bff`, `web`). */
  readonly name: string;
  /** Override log level. Defaults to env `LOG_LEVEL` then `info`. */
  readonly level?: LoggerOptions['level'];
  /** Force pretty transport even in production (for debugging). */
  readonly pretty?: boolean;
}

const DEFAULT_LEVEL: NonNullable<LoggerOptions['level']> = process.env['LOG_LEVEL'] ?? 'info';

const IS_PROD = process.env['NODE_ENV'] === 'production';

/**
 * Create a Pino logger with sensible defaults. Use one root logger per app
 * and create child loggers (`logger.child({ ... })`) for sub-modules.
 */
export function createLogger(opts: CreateLoggerOptions): Logger {
  const usePretty = opts.pretty ?? !IS_PROD;

  const transport = usePretty
    ? {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'SYS:HH:MM:ss.l',
          ignore: 'pid,hostname',
        },
      }
    : undefined;

  return pino({
    name: opts.name,
    level: opts.level ?? DEFAULT_LEVEL,
    timestamp: pino.stdTimeFunctions.isoTime,
    formatters: {
      level: (label) => ({ level: label }),
    },
    ...(transport ? { transport } : {}),
  });
}

export type { Logger } from 'pino';
