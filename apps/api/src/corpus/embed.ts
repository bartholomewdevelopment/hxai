import { and, eq, isNotNull, isNull, sql } from 'drizzle-orm';
import { closeDatabase, db } from '../db/client';
import { historicalPerson, source, sourceChunk } from '../db/schema/index';
import { embedSource } from '../services/ingestion/pipeline';
import { getServices } from '../services/registry';
import { env } from '../config/env';

/**
 * Embedding job.
 *
 *   npm run embed                      embed every chunk still missing a vector
 *   npm run embed -- --force           re-embed everything (provider A/B)
 *   npm run embed -- --person=abraham-lincoln
 *   npm run embed -- --dry-run         report cost and scope, call nothing
 *
 * Separate from ingestion on purpose: the corpus can be fully fetched,
 * extracted, and chunked with no API key, and this is the only step that needs
 * one. Provider comes from EMBEDDING_PROVIDER.
 *
 * Re-runnable and resumable. Only chunks whose `embedding` is NULL are sent, so
 * an interrupted run picks up where it stopped and a completed run is a no-op.
 * `--force` clears vectors first, which is the A/B path: swap the provider in
 * `.env`, re-run, and compare against the evaluation set without re-fetching or
 * re-chunking a single document.
 */

interface Flags {
  force: boolean;
  dryRun: boolean;
  person: string | null;
}

function parseFlags(argv: string[]): Flags {
  return {
    force: argv.includes('--force'),
    dryRun: argv.includes('--dry-run'),
    person: argv.find((arg) => arg.startsWith('--person='))?.split('=')[1] ?? null,
  };
}

async function main(): Promise<void> {
  const flags = parseFlags(process.argv.slice(2));
  const services = getServices();

  const [scope] = await db
    .select({
      chunks: sql<number>`count(*)::int`,
      embedded: sql<number>`count(${sourceChunk.embedding})::int`,
      characters: sql<number>`coalesce(sum(length(${sourceChunk.text})), 0)::int`,
    })
    .from(sourceChunk);

  const pendingChunks = flags.force
    ? (scope?.chunks ?? 0)
    : (scope?.chunks ?? 0) - (scope?.embedded ?? 0);
  // ~4 characters per token, the same approximation the chunker uses.
  const estimatedTokens = Math.round(
    ((scope?.characters ?? 0) / 4) *
      (flags.force ? 1 : pendingChunks / Math.max(1, scope?.chunks ?? 1)),
  );

  console.log('Embedding job');
  console.log(`  provider:        ${env.EMBEDDING_PROVIDER}`);
  console.log(`  model:           ${services.embedding.model}`);
  console.log(
    `  dimensions:      ${services.embedding.dimensions} (column: ${env.EMBEDDING_DIMENSIONS})`,
  );
  console.log(`  chunks total:    ${scope?.chunks ?? 0}`);
  console.log(`  already embedded:${scope?.embedded ?? 0}`);
  console.log(`  to embed:        ${pendingChunks}`);
  console.log(`  est. tokens:     ~${estimatedTokens.toLocaleString()}`);

  if (env.EMBEDDING_PROVIDER === 'stub') {
    console.log(
      '\nEMBEDDING_PROVIDER=stub — nothing to do.\n' +
        'Set EMBEDDING_PROVIDER=openai (with OPENAI_API_KEY) or =voyage (with VOYAGE_API_KEY)\n' +
        'in .env, then re-run. Chunks are already stored and waiting.',
    );
    return;
  }

  if (services.embedding.dimensions !== env.EMBEDDING_DIMENSIONS) {
    throw new Error(
      `Provider returns ${services.embedding.dimensions}-dimensional vectors but the ` +
        `source_chunk.embedding column is ${env.EMBEDDING_DIMENSIONS}-wide. ` +
        'Update EMBEDDING_DIMENSIONS, regenerate the migration, and re-run — ' +
        'the column width is fixed at migration time.',
    );
  }

  if (flags.dryRun) {
    console.log('\n--dry-run: no API calls made.');
    return;
  }

  const filters = [isNotNull(source.contentHash)];
  if (flags.person) {
    const [person] = await db
      .select({ id: historicalPerson.id })
      .from(historicalPerson)
      .where(eq(historicalPerson.slug, flags.person))
      .limit(1);
    if (!person) throw new Error(`No person with slug '${flags.person}'`);
    filters.push(eq(source.historicalPersonId, person.id));
  }

  const sources = await db
    .select({ id: source.id, title: source.title, chunkCount: source.chunkCount })
    .from(source)
    .where(and(...filters))
    .orderBy(source.title);

  console.log(`\nEmbedding ${sources.length} sources…\n`);

  let embeddedChunks = 0;
  let failures = 0;

  for (const [index, row] of sources.entries()) {
    const position = `${String(index + 1).padStart(2)}/${sources.length}`;
    try {
      const result = await embedSource(row.id, { force: flags.force });
      embeddedChunks += result.chunksEmbedded;
      const note = result.skipped ? 'already embedded' : `${result.chunksEmbedded} chunks`;
      console.log(`${position}  OK      ${row.title.slice(0, 60)}  (${note})`);
    } catch (error) {
      failures += 1;
      console.log(
        `${position}  FAILED  ${row.title.slice(0, 60)}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  const [remaining] = await db
    .select({ value: sql<number>`count(*)::int` })
    .from(sourceChunk)
    .where(isNull(sourceChunk.embedding));

  console.log(`\n--- Embedding summary ---`);
  console.log(`  chunks embedded: ${embeddedChunks}`);
  console.log(`  failures:        ${failures}`);
  console.log(`  still unembedded:${remaining?.value ?? 0}`);

  if (failures > 0) process.exitCode = 1;
}

main()
  .then(() => closeDatabase())
  .then(() => process.exit(process.exitCode ?? 0))
  .catch(async (error: unknown) => {
    console.error('\nEmbedding failed:', error instanceof Error ? error.message : error);
    await closeDatabase().catch(() => undefined);
    process.exit(1);
  });
