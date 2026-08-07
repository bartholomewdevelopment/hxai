import { eq, sql } from 'drizzle-orm';
import { closeDatabase, db } from '../db/client';
import { historicalPerson, source } from '../db/schema/index';
import { getServices } from '../services/registry';
import { PgVectorRetrievalService } from '../services/retrieval/pgvector';

/**
 * Retrieval sanity check.
 *
 *   npx tsx src/eval/retrieval-check.ts
 *
 * Runs a handful of natural questions and prints which documents come back, so
 * a human can see whether "what keeps a republic together" actually reaches the
 * Lyceum Address rather than something merely nearby. Deliberately a readable
 * report rather than a pass/fail — the eval harness is the pass/fail, this is
 * the thing you read when the harness says something surprising.
 *
 * Also breaks out the vector and keyword arms separately, which is the only way
 * to tell whether hybrid search is actually contributing or whether one signal
 * is carrying the whole result.
 */

interface Probe {
  question: string;
  expect: string[];
  notAfterDate?: string;
  note?: string;
}

const PROBES: Probe[] = [
  {
    question: 'what keeps a republic together',
    expect: ['lyceum-address-1838', 'first-inaugural-1861', 'gettysburg-address-1863'],
  },
  {
    question: 'your views on the Union and whether states may leave it',
    expect: ['first-inaugural-1861'],
  },
  {
    question: 'slavery in the territories in 1858',
    expect: ['house-divided-1858', 'papers-and-writings-volume-2'],
    notAfterDate: '1858-12-31',
    note: 'date-bounded: the 1864 Hodges letter must not appear',
  },
  {
    question: 'government of the people, by the people, for the people',
    expect: ['gettysburg-address-1863'],
  },
  {
    question: 'habeas corpus suspension',
    expect: ['habeas-corpus-suspension-1861-04', 'habeas-corpus-suspension-1861-07'],
    note: 'rare legal term — the keyword arm should carry this one',
  },
  {
    question: 'with malice toward none',
    expect: ['second-inaugural-1865'],
  },
  {
    question: 'am I naturally opposed to slavery',
    expect: ['letter-to-hodges-1864'],
  },
  {
    question: 'the relationship between labor and capital',
    expect: ['wisconsin-agricultural-society-1859', 'first-annual-message-1861'],
  },
];

async function main(): Promise<void> {
  const services = getServices();
  if (!(services.retrieval instanceof PgVectorRetrievalService)) {
    throw new Error('Retrieval is stubbed. Set EMBEDDING_PROVIDER and run `npm run embed` first.');
  }
  const retrieval = services.retrieval;

  const [person] = await db
    .select({ id: historicalPerson.id })
    .from(historicalPerson)
    .where(eq(historicalPerson.slug, 'abraham-lincoln'))
    .limit(1);
  if (!person) throw new Error('Abraham Lincoln is not seeded.');

  const slugRows = await db
    .select({ id: source.id, slug: sql<string | null>`${source.metadata}->>'corpusSlug'` })
    .from(source);
  const slugById = new Map(slugRows.map((row) => [row.id, row.slug ?? '(unknown)']));

  let hit = 0;

  for (const probe of PROBES) {
    console.log(`\n> "${probe.question}"`);
    if (probe.note) console.log(`  (${probe.note})`);

    const results = await retrieval.retrieve({
      historicalPersonId: person.id,
      query: probe.question,
      limit: 5,
      notAfterDate: probe.notAfterDate ?? null,
    });

    const slugs = results.map((r) => slugById.get(r.sourceId) ?? '(unknown)');
    const matched = probe.expect.some((slug) => slugs.includes(slug));
    if (matched) hit += 1;

    console.log(`  ${matched ? 'HIT ' : 'MISS'}  expected one of: ${probe.expect.join(', ')}`);
    for (const [index, result] of results.entries()) {
      const slug = slugById.get(result.sourceId) ?? '(unknown)';
      const marker = probe.expect.includes(slug) ? '*' : ' ';
      const snippet = result.text.replace(/\s+/g, ' ').slice(0, 88);
      console.log(
        `   ${marker} ${index + 1}. [${result.dateContext ?? 'undated'}] ${slug}\n        "${snippet}…"`,
      );
    }

    const explained = await retrieval.explain({
      historicalPersonId: person.id,
      query: probe.question,
      notAfterDate: probe.notAfterDate ?? null,
    });
    const vectorOnly = explained.vectorSlugs.filter((s) => !explained.keywordSlugs.includes(s));
    const keywordOnly = explained.keywordSlugs.filter((s) => !explained.vectorSlugs.includes(s));
    console.log(
      `     signals — vector: ${explained.vectorSlugs.length} docs, keyword: ${explained.keywordSlugs.length} docs` +
        `, unique to vector: ${vectorOnly.length}, unique to keyword: ${keywordOnly.length}`,
    );
  }

  console.log(`\n=== ${hit}/${PROBES.length} probes retrieved an expected document ===`);
}

main()
  .then(() => closeDatabase())
  .then(() => process.exit(0))
  .catch(async (error: unknown) => {
    console.error('Retrieval check failed:', error);
    await closeDatabase().catch(() => undefined);
    process.exit(1);
  });
