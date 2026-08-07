import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import { env, isProduction } from '../config/env';
import * as schema from './schema/index';

export const pool = new pg.Pool({
  connectionString: env.DATABASE_URL,
  max: 10,
  idleTimeoutMillis: 30_000,
  ...(isProduction ? { ssl: { rejectUnauthorized: false } } : {}),
});

export const db = drizzle(pool, { schema, logger: env.LOG_LEVEL === 'debug' });

export type Database = typeof db;

/** Cheap liveness probe used by GET /api/health. */
export async function checkDatabaseConnection(): Promise<boolean> {
  try {
    await pool.query('SELECT 1');
    return true;
  } catch {
    return false;
  }
}

export async function closeDatabase(): Promise<void> {
  await pool.end();
}
