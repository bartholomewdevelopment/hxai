import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { closeDatabase, db, pool } from './client';

const here = path.dirname(fileURLToPath(import.meta.url));
const migrationsFolder = path.resolve(here, '../../drizzle');

async function main(): Promise<void> {
  // pgvector must exist before any migration that declares a `vector` column.
  // Idempotent, and cheap enough to run on every migrate.
  await pool.query('CREATE EXTENSION IF NOT EXISTS vector');
  console.log('pgvector extension ready');

  await migrate(db, { migrationsFolder });
  console.log('Migrations applied');
}

main()
  .then(() => closeDatabase())
  .then(() => process.exit(0))
  .catch(async (error: unknown) => {
    console.error('Migration failed:', error);
    await closeDatabase().catch(() => undefined);
    process.exit(1);
  });
