import { env, isProduction } from '../config/env';

type Level = 'debug' | 'info' | 'warn' | 'error';

const LEVEL_RANK: Record<Level, number> = { debug: 0, info: 1, warn: 2, error: 3 };

/**
 * Minimal structured logger: JSON in production so lines are ingestible,
 * readable text in development. Deliberately dependency-free — swap for pino
 * if log volume ever justifies it.
 */
function emit(level: Level, message: string, context?: Record<string, unknown>): void {
  if (LEVEL_RANK[level] < LEVEL_RANK[env.LOG_LEVEL]) return;

  const timestamp = new Date().toISOString();

  if (isProduction) {
    console[level === 'debug' ? 'log' : level](
      JSON.stringify({ timestamp, level, message, ...context }),
    );
    return;
  }

  const suffix = context && Object.keys(context).length > 0 ? ` ${JSON.stringify(context)}` : '';
  console[level === 'debug' ? 'log' : level](
    `${timestamp} ${level.toUpperCase().padEnd(5)} ${message}${suffix}`,
  );
}

export const logger = {
  debug: (message: string, context?: Record<string, unknown>) => emit('debug', message, context),
  info: (message: string, context?: Record<string, unknown>) => emit('info', message, context),
  warn: (message: string, context?: Record<string, unknown>) => emit('warn', message, context),
  error: (message: string, context?: Record<string, unknown>) => emit('error', message, context),
};
