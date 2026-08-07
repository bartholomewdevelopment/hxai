import { and, eq, isNotNull, sql } from 'drizzle-orm';
import { closeDatabase, db } from '../db/client';
import { historicalPerson, source, sourceChunk } from '../db/schema/index';
import { lincolnEvalCases } from './lincoln-cases';
import { EVAL_CATEGORIES, type CaseResult, type EvalCase } from './types';
import { getServices } from '../services/registry';
import { env } from '../config/env';

/**
 * Evaluation harness.
 *
 *   npm run eval               run what can be run
 *   npm run eval -- --category=knowledge-cutoff
 *
 * Runs in two modes depending on what exists:
 *
 * - **Corpus mode** (now). Retrieval is unimplemented, so the harness validates
 *   the *set itself* against the database: does every expected source exist, is
 *   it published, and is it chunked? A case pointing at a document that is not
 *   in the corpus is a broken case, and finding that out now is the point —
 *   an evaluation set nobody has validated is worse than none, because it
 *   reports failures that are its own fault.
 *
 * - **Retrieval mode** (Phase 3, once embeddings exist). Each question is
 *   embedded and searched, and recall@k is scored against
 *   `expectedSourceSlugs`. The scoring function is already here so the switch
 *   is a single branch, not a rewrite.
 */

const TOP_K = 8;

interface Flags {
  category: string | null;
  verbose: boolean;
}

function parseFlags(argv: string[]): Flags {
  return {
    category: argv.find((arg) => arg.startsWith('--category='))?.split('=')[1] ?? null,
    verbose: argv.includes('--verbose'),
  };
}

/** Map corpus slugs to source ids, so cases can be written against slugs. */
async function loadCorpusIndex(): Promise<
  Map<string, { id: string; published: boolean; chunks: number }>
> {
  const rows = await db
    .select({
      id: source.id,
      published: source.published,
      chunks: source.chunkCount,
      corpusSlug: sql<string>`${source.metadata}->>'corpusSlug'`,
    })
    .from(source);

  const index = new Map<string, { id: string; published: boolean; chunks: number }>();
  for (const row of rows) {
    if (row.corpusSlug) {
      index.set(row.corpusSlug, { id: row.id, published: row.published, chunks: row.chunks });
    }
  }
  return index;
}

/** Whether the corpus can actually support this case. */
function validateCase(
  evalCase: EvalCase,
  index: Map<string, { id: string; published: boolean; chunks: number }>,
): CaseResult {
  const notes: string[] = [];
  const missing: string[] = [];

  for (const slug of evalCase.expectedSourceSlugs) {
    const entry = index.get(slug);
    if (!entry) {
      missing.push(slug);
      notes.push(`expected source '${slug}' is not in the corpus`);
    } else if (!entry.published) {
      notes.push(`expected source '${slug}' exists but is unpublished — retrieval will not see it`);
    } else if (entry.chunks === 0) {
      missing.push(slug);
      notes.push(`expected source '${slug}' has no chunks`);
    }
  }

  if (evalCase.expectRefusal && evalCase.expectedSourceSlugs.length > 0) {
    notes.push(
      'refusal case that also names expected sources — the sources should support the correction',
    );
  }

  return {
    caseId: evalCase.id,
    category: evalCase.category,
    question: evalCase.question,
    retrievalRecall: null,
    retrievedSlugs: [],
    missingSlugs: missing,
    status: missing.length === 0 ? 'passed' : 'failed',
    notes,
  };
}

/** Phase 3 path: embed the question, search, score recall@k. */
async function runRetrievalCase(
  evalCase: EvalCase,
  index: Map<string, { id: string; published: boolean; chunks: number }>,
): Promise<CaseResult> {
  const services = getServices();
  const base = validateCase(evalCase, index);

  const vector = await services.embedding.embed(evalCase.question);
  const literal = `[${vector.join(',')}]`;

  const filters = [eq(source.published, true), isNotNull(sourceChunk.embedding)];
  if (evalCase.notAfterDate) {
    filters.push(sql`${sourceChunk.dateContext} <= ${evalCase.notAfterDate}::date`);
  }

  const hits = await db
    .select({
      corpusSlug: sql<string>`${source.metadata}->>'corpusSlug'`,
      distance: sql<number>`${sourceChunk.embedding} <=> ${literal}::vector`,
    })
    .from(sourceChunk)
    .innerJoin(source, eq(sourceChunk.sourceId, source.id))
    .where(and(...filters))
    .orderBy(sql`${sourceChunk.embedding} <=> ${literal}::vector`)
    .limit(TOP_K);

  const retrieved = [...new Set(hits.map((hit) => hit.corpusSlug).filter(Boolean))];

  if (evalCase.expectedSourceSlugs.length === 0) {
    // Refusal and open-ended cases have no retrieval target; they are scored
    // on generation behaviour, which needs an LLM (Phase 3).
    return { ...base, retrievedSlugs: retrieved, retrievalRecall: null, status: 'not-runnable' };
  }

  const found = evalCase.expectedSourceSlugs.filter((slug) => retrieved.includes(slug));
  const recall = found.length / evalCase.expectedSourceSlugs.length;

  return {
    ...base,
    retrievedSlugs: retrieved,
    retrievalRecall: recall,
    missingSlugs: evalCase.expectedSourceSlugs.filter((slug) => !retrieved.includes(slug)),
    status: recall > 0 ? 'passed' : 'failed',
  };
}

async function main(): Promise<void> {
  const flags = parseFlags(process.argv.slice(2));

  const [person] = await db
    .select({ id: historicalPerson.id })
    .from(historicalPerson)
    .where(eq(historicalPerson.slug, 'abraham-lincoln'))
    .limit(1);
  if (!person) throw new Error('Abraham Lincoln is not seeded. Run `npm run db:seed`.');

  const [embeddedCount] = await db
    .select({ value: sql<number>`count(${sourceChunk.embedding})::int` })
    .from(sourceChunk);

  const retrievalReady = (embeddedCount?.value ?? 0) > 0 && env.EMBEDDING_PROVIDER !== 'stub';
  const index = await loadCorpusIndex();

  const cases = flags.category
    ? lincolnEvalCases.filter((c) => c.category === flags.category)
    : lincolnEvalCases;

  console.log(`HistoryAI evaluation — ${cases.length} cases`);
  console.log(
    `Mode: ${retrievalReady ? 'RETRIEVAL (scoring recall@' + TOP_K + ')' : 'CORPUS VALIDATION (retrieval not available yet)'}`,
  );
  if (!retrievalReady) {
    console.log(
      `       ${embeddedCount?.value ?? 0} chunks embedded, EMBEDDING_PROVIDER=${env.EMBEDDING_PROVIDER}.\n` +
        '       Set a provider + key and run `npm run embed` to score retrieval.',
    );
  }
  console.log('');

  const results: CaseResult[] = [];
  for (const evalCase of cases) {
    const result = retrievalReady
      ? await runRetrievalCase(evalCase, index)
      : validateCase(evalCase, index);
    results.push(result);

    const mark = result.status === 'passed' ? 'ok  ' : result.status === 'failed' ? 'FAIL' : '--  ';
    const score =
      result.retrievalRecall === null
        ? ''
        : `  recall ${(result.retrievalRecall * 100).toFixed(0)}%`;
    console.log(`  ${mark} [${result.category}] ${result.caseId}${score}`);
    if (flags.verbose || result.status === 'failed') {
      for (const note of result.notes) console.log(`         ~ ${note}`);
    }
  }

  console.log('\n--- Summary by category ---');
  for (const category of EVAL_CATEGORIES) {
    const subset = results.filter((r) => r.category === category);
    if (subset.length === 0) continue;
    const passed = subset.filter((r) => r.status === 'passed').length;
    const failed = subset.filter((r) => r.status === 'failed').length;
    const skipped = subset.filter((r) => r.status === 'not-runnable').length;
    console.log(
      `  ${category.padEnd(24)} ${String(passed).padStart(2)} ok  ${String(failed).padStart(2)} fail  ${String(skipped).padStart(2)} n/a  (${subset.length})`,
    );
  }

  const failed = results.filter((r) => r.status === 'failed');
  console.log(`\n${results.length - failed.length}/${results.length} cases in a runnable state.`);

  if (!retrievalReady) {
    const refusalCases = cases.filter((c) => c.expectRefusal).length;
    console.log(
      `\n${refusalCases} of ${cases.length} cases assert that the correct answer is a refusal or a\n` +
        'corrected premise. Those are scored once generation exists in Phase 3.',
    );
  }

  if (failed.length > 0) process.exitCode = 1;
}

main()
  .then(() => closeDatabase())
  .then(() => process.exit(process.exitCode ?? 0))
  .catch(async (error: unknown) => {
    console.error('Evaluation failed:', error);
    await closeDatabase().catch(() => undefined);
    process.exit(1);
  });
