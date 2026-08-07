import { eq, sql } from 'drizzle-orm';
import { closeDatabase, db } from '../db/client';
import { historicalPerson, source } from '../db/schema/index';
import { lincolnCorpus } from './lincoln';
import type { CorpusDocument } from './types';
import { processSource, refreshPersonCounts } from '../services/ingestion/pipeline';
import { verifyDocument } from './verify';

/**
 * Corpus ingestion.
 *
 *   npm run corpus:ingest            fetch, extract, chunk, store
 *   npm run corpus:ingest -- --force re-fetch and re-chunk even if unchanged
 *   npm run corpus:ingest -- --only=gettysburg-address-1863
 *
 * Idempotent by design: documents are upserted on `slug`, and a document whose
 * extracted text hashes the same as last time keeps its existing chunks. Re-run
 * it as often as you like.
 *
 * **Verification gates publication.** Each document is verified before its text
 * is stored, and anything that fails is written to the database as
 * `verificationStatus: 'unverified'` with `published: false` — recorded, so the
 * gap is visible in the admin dashboard, but unreachable by retrieval.
 *
 * Embedding is a separate step (`npm run embed`) so the whole corpus can be
 * ingested without any API key.
 */

const DELAY_MS = 1200;
const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

interface Flags {
  force: boolean;
  only: string | null;
  skipVerify: boolean;
}

function parseFlags(argv: string[]): Flags {
  return {
    force: argv.includes('--force'),
    skipVerify: argv.includes('--skip-verify'),
    only: argv.find((arg) => arg.startsWith('--only='))?.split('=')[1] ?? null,
  };
}

/** Upsert the catalogue record. Text and chunks are handled by the pipeline. */
async function upsertSourceRecord(
  document: CorpusDocument,
  personId: string,
  verified: boolean,
  verificationProblems: string[],
): Promise<string> {
  // Publication requires BOTH a clean verification run and an editorial
  // verificationStatus of 'verified'. The Bixby letter is 'disputed' and so
  // stays unpublished even though its URL resolves perfectly.
  const editoriallyVerified = document.verificationStatus === 'verified';
  const published = verified && editoriallyVerified && document.publishByDefault !== false;

  const values = {
    historicalPersonId: personId,
    title: document.title,
    author: 'Abraham Lincoln',
    documentType: document.documentType,
    dateCreated: document.dateCreated,
    approximateDate: document.approximateDate ?? null,
    historicalPeriod: document.historicalPeriod ?? null,
    description: document.description,
    archiveName: document.archiveName,
    collectionName: document.collectionName ?? null,
    canonicalUrl: document.canonicalUrl,
    transcriptionUrl: document.transcriptionUrl ?? document.canonicalUrl,
    originalDocumentUrl: document.originalDocumentUrl ?? null,
    sourceType: document.sourceType,
    rightsStatus: document.rightsStatus,
    rightsNotes: document.rightsNotes ?? null,
    copyrightJurisdiction: document.copyrightJurisdiction ?? null,
    verificationStatus: verified ? document.verificationStatus : ('unverified' as const),
    published,
    metadata: {
      corpusSlug: document.slug,
      perChunkDatesUnknown: document.perChunkDatesUnknown ?? false,
      notes: document.notes ?? null,
      verificationProblems: verificationProblems.length > 0 ? verificationProblems : undefined,
    },
    updatedAt: new Date(),
  };

  const [row] = await db
    .insert(source)
    .values(values)
    .onConflictDoUpdate({
      target: [source.historicalPersonId, source.title],
      set: values,
    })
    .returning({ id: source.id });

  if (!row) throw new Error(`Failed to upsert source '${document.slug}'`);
  return row.id;
}

async function main(): Promise<void> {
  const flags = parseFlags(process.argv.slice(2));

  const [person] = await db
    .select({ id: historicalPerson.id, name: historicalPerson.displayName })
    .from(historicalPerson)
    .where(eq(historicalPerson.slug, lincolnCorpus.personSlug))
    .limit(1);

  if (!person) {
    throw new Error(
      `Person '${lincolnCorpus.personSlug}' is not in the database. Run \`npm run db:seed\` first.`,
    );
  }

  const documents = flags.only
    ? lincolnCorpus.documents.filter((d) => d.slug === flags.only)
    : lincolnCorpus.documents;

  if (documents.length === 0) throw new Error(`No corpus document matches --only=${flags.only}`);

  console.log(`Ingesting ${documents.length} documents for ${person.name}.\n`);

  let ingested = 0;
  let skipped = 0;
  let withheld = 0;
  const failures: { slug: string; reason: string }[] = [];
  let totalChunks = 0;

  for (const [index, document] of documents.entries()) {
    const position = `${String(index + 1).padStart(2)}/${documents.length}`;

    try {
      let verified = true;
      let problems: string[] = [];

      if (!flags.skipVerify) {
        const report = await verifyDocument(document);
        verified = report.ok;
        problems = report.problems;
      }

      const sourceId = await upsertSourceRecord(document, person.id, verified, problems);

      if (!verified) {
        withheld += 1;
        console.log(`${position}  WITHHELD  ${document.slug}`);
        for (const problem of problems) console.log(`            ! ${problem}`);
        continue;
      }

      const result = await processSource(sourceId, { force: flags.force });
      totalChunks += result.chunksCreated;
      if (result.skipped) skipped += 1;
      else ingested += 1;

      const note = result.skipped ? 'unchanged' : `${result.chunksCreated} chunks`;
      const publishNote =
        document.publishByDefault === false ? '  [held: ' + document.verificationStatus + ']' : '';
      console.log(
        `${position}  OK        ${document.slug}  (${note}, ${result.charactersStored} chars)${publishNote}`,
      );
      for (const warning of result.warnings) console.log(`            ~ ${warning}`);
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      failures.push({ slug: document.slug, reason });
      console.log(`${position}  FAILED    ${document.slug}: ${reason}`);
    }

    if (index < documents.length - 1) await sleep(DELAY_MS);
  }

  await refreshPersonCounts(person.id);

  const [totals] = await db
    .select({
      sources: sql<number>`count(*)::int`,
      published: sql<number>`count(*) FILTER (WHERE ${source.published})::int`,
      chunks: sql<number>`coalesce(sum(${source.chunkCount}), 0)::int`,
    })
    .from(source)
    .where(eq(source.historicalPersonId, person.id));

  console.log('\n--- Ingestion summary ---');
  console.log(`  processed:      ${ingested}`);
  console.log(`  unchanged:      ${skipped}`);
  console.log(`  withheld:       ${withheld}  (verification failed — stored, not published)`);
  console.log(`  failed:         ${failures.length}`);
  console.log(`  chunks this run:${totalChunks}`);
  console.log(
    `\n  in database:    ${totals?.sources ?? 0} sources, ${totals?.published ?? 0} published, ${totals?.chunks ?? 0} chunks`,
  );
  console.log('\nNo embeddings generated — run `npm run embed` once an API key is configured.');

  if (failures.length > 0) {
    console.log('\nFailures:');
    for (const failure of failures) console.log(`  - ${failure.slug}: ${failure.reason}`);
    process.exitCode = 1;
  }
}

main()
  .then(() => closeDatabase())
  .then(() => process.exit(process.exitCode ?? 0))
  .catch(async (error: unknown) => {
    console.error('Ingestion failed:', error);
    await closeDatabase().catch(() => undefined);
    process.exit(1);
  });
