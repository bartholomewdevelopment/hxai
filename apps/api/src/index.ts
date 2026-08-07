import { createApp } from './app';
import { env } from './config/env';
import { checkDatabaseConnection, closeDatabase } from './db/client';
import { logger } from './lib/logger';
import { assertEmbeddingDimensionsMatch, getServices } from './services/registry';

async function main(): Promise<void> {
  getServices();
  assertEmbeddingDimensionsMatch();

  // A warning, not a fatal error: the server should still boot so /api/health
  // can report the database as unreachable rather than dying silently.
  if (!(await checkDatabaseConnection())) {
    logger.warn('Database is unreachable. Is `npm run db:up` running?', {
      databaseUrl: env.DATABASE_URL.replace(/:\/\/[^@]*@/, '://***@'),
    });
  }

  const server = createApp().listen(env.PORT, () => {
    logger.info(`HistoryAI API listening on http://localhost:${env.PORT}`, {
      environment: env.NODE_ENV,
    });
  });

  const shutdown = (signal: string): void => {
    logger.info(`Received ${signal}, shutting down`);
    server.close(() => {
      void closeDatabase().finally(() => process.exit(0));
    });
    // Don't let an in-flight request hold the process open indefinitely.
    setTimeout(() => process.exit(1), 10_000).unref();
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

main().catch((error: unknown) => {
  logger.error('Failed to start API', {
    error: error instanceof Error ? error.message : String(error),
  });
  process.exit(1);
});
