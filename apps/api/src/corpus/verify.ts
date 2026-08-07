import { lincolnCorpus } from './lincoln';
import type { CorpusDocument } from './types';
import { fetchDocument } from '../services/ingestion/pipeline';
import { extractText } from '../services/extraction/profiles';

/**
 * Corpus verification.
 *
 * Proves, for every document in a manifest, that its URL resolves and that
 * extraction yields plausible document text. Nothing publishes without passing
 * this — the guarantee "citations resolve to real documents" is only worth
 * something if it is mechanically checked.
 *
 *   npm run corpus:verify
 *
 * Deliberately hits the network, and deliberately runs slowly (see DELAY_MS):
 * these are free public archives and hammering them would be rude.
 */

const DELAY_MS = 1200;
const MIN_PLAUSIBLE_CHARS = 400;

export interface VerificationReport {
  slug: string;
  title: string;
  url: string;
  ok: boolean;
  httpOk: boolean;
  characters: number;
  profile: string | null;
  warnings: string[];
  problems: string[];
}

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

/** ISO date sanity: parses, round-trips, and is not in the future. */
function checkDate(document: CorpusDocument, problems: string[]): void {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(document.dateCreated)) {
    problems.push(`dateCreated '${document.dateCreated}' is not an ISO date`);
    return;
  }
  const parsed = new Date(`${document.dateCreated}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) {
    problems.push(`dateCreated '${document.dateCreated}' is not a real date`);
  }
}

export async function verifyDocument(document: CorpusDocument): Promise<VerificationReport> {
  const url = document.transcriptionUrl ?? document.canonicalUrl;
  const problems: string[] = [];
  const warnings: string[] = [];

  checkDate(document, problems);

  let httpOk = false;
  let characters = 0;
  let profile: string | null = null;

  try {
    const fetched = await fetchDocument(url);
    httpOk = true;

    const extracted = extractText(
      { body: fetched.body, url: fetched.finalUrl },
      fetched.contentType,
    );
    characters = extracted.text.length;
    profile = extracted.profile;
    warnings.push(...extracted.warnings);

    if (characters < MIN_PLAUSIBLE_CHARS) {
      problems.push(
        `extracted only ${characters} characters — the page probably is not the document ` +
          '(redirect, disambiguation page, or a transclusion the profile cannot follow)',
      );
    }
    if (extracted.profile === 'generic') {
      problems.push(`no extraction profile for ${new URL(url).hostname}`);
    }
  } catch (error) {
    problems.push(`fetch failed: ${error instanceof Error ? error.message : String(error)}`);
  }

  return {
    slug: document.slug,
    title: document.title,
    url,
    ok: problems.length === 0,
    httpOk,
    characters,
    profile,
    warnings,
    problems,
  };
}

export async function verifyCorpus(): Promise<VerificationReport[]> {
  const reports: VerificationReport[] = [];

  for (const [index, document] of lincolnCorpus.documents.entries()) {
    const report = await verifyDocument(document);
    reports.push(report);

    const mark = report.ok ? 'OK  ' : 'FAIL';
    console.log(
      `${mark} ${String(index + 1).padStart(2)}/${lincolnCorpus.documents.length}  ` +
        `${String(report.characters).padStart(7)} chars  ${report.slug}`,
    );
    for (const problem of report.problems) console.log(`       ! ${problem}`);
    for (const warning of report.warnings) console.log(`       ~ ${warning}`);

    if (index < lincolnCorpus.documents.length - 1) await sleep(DELAY_MS);
  }

  return reports;
}

async function main(): Promise<void> {
  console.log(`Verifying ${lincolnCorpus.documents.length} documents in the Lincoln corpus.\n`);
  const reports = await verifyCorpus();

  const failed = reports.filter((report) => !report.ok);
  console.log(`\n${reports.length - failed.length}/${reports.length} verified.`);

  if (failed.length > 0) {
    console.log('\nFailed — these will not be published:');
    for (const report of failed) console.log(`  - ${report.slug}: ${report.problems.join('; ')}`);
    process.exitCode = 1;
  }
}

if (process.argv[1]?.includes('verify')) {
  main().catch((error: unknown) => {
    console.error('Verification failed:', error);
    process.exit(1);
  });
}
