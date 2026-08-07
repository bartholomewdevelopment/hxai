import type { Corpus, CorpusDocument } from './types';

/**
 * The Abraham Lincoln core corpus.
 *
 * Everything Lincoln wrote is public domain — he died in 1865, and the
 * documents here are US federal or 19th-century publications besides. Rights
 * are still recorded explicitly rather than assumed, because the rights column
 * has to be right for figures where it is *not* obvious, and a corpus where
 * every row says `public_domain` by accident teaches the pipeline nothing.
 *
 * Two archives supply the text:
 *
 * - **The Avalon Project** (Yale Law School) — an authoritative academic
 *   archive of primary documents, stable URLs, one document per page.
 * - **Wikisource** — used where Avalon has no entry. Its transcriptions carry
 *   provenance back to printed editions, and its per-document pages are
 *   machine-readable.
 *
 * `canonicalUrl` is always a URL that has been fetched and returned 200. Where
 * a more definitive archival record exists but is not machine-readable (the
 * Library of Congress's page images, say), it goes in `originalDocumentUrl`
 * and the transcription source stays honest about where the text came from.
 *
 * Dates are the delivery/signing dates as established in the standard
 * scholarship. They are load-bearing: temporal retrieval and Lincoln's
 * 1865-04-15 knowledge cutoff both filter on them.
 *
 * To extend toward the few-hundred-document target, append entries. Nothing
 * else changes — ingestion is keyed on `slug` and is idempotent.
 */

const AVALON = 'The Avalon Project, Yale Law School';
const WIKISOURCE = 'Wikisource';

/** Wikisource article URL. The extraction profile isolates `.mw-parser-output`. */
const ws = (title: string): string =>
  `https://en.wikisource.org/wiki/${encodeURIComponent(title.replace(/ /g, '_')).replace(/%2F/g, '/')}`;

const documents: CorpusDocument[] = [
  // ---------------------------------------------------------------- pre-1860
  {
    slug: 'lyceum-address-1838',
    title: 'The Perpetuation of Our Political Institutions (Lyceum Address)',
    documentType: 'speech',
    dateCreated: '1838-01-27',
    historicalPeriod: 'Antebellum',
    description:
      'Address to the Young Men’s Lyceum of Springfield, Illinois, on mob law and the survival of republican institutions. Lincoln’s earliest major surviving speech.',
    archiveName: WIKISOURCE,
    collectionName: 'Life and Works of Abraham Lincoln',
    canonicalUrl: ws(
      'Life and Works of Abraham Lincoln/Volume 3/The Perpetuation of Our Political Institutions',
    ),
    sourceType: 'primary',
    rightsStatus: 'public_domain',
    verificationStatus: 'verified',
  },
  {
    slug: 'spot-resolutions-1847',
    title: 'Spot Resolutions on the Mexican War',
    documentType: 'resolution',
    dateCreated: '1847-12-22',
    historicalPeriod: 'Antebellum',
    description:
      'Resolutions introduced in the House of Representatives demanding President Polk identify the precise spot where American blood was shed to begin the Mexican War.',
    archiveName: WIKISOURCE,
    canonicalUrl: ws('Life and Works of Abraham Lincoln/Volume 3/Spot Resolutions on Mexican War'),
    sourceType: 'primary',
    rightsStatus: 'public_domain',
    verificationStatus: 'verified',
  },
  {
    slug: 'eulogy-henry-clay-1852',
    title: 'Eulogy on Henry Clay',
    documentType: 'eulogy',
    dateCreated: '1852-07-06',
    historicalPeriod: 'Antebellum',
    description:
      'Eulogy delivered at Springfield, Illinois, on the death of Henry Clay — Lincoln’s clearest statement of his debt to Clay’s politics.',
    archiveName: WIKISOURCE,
    canonicalUrl: ws('Life and Works of Abraham Lincoln/Volume 3/Eulogy of Henry Clay'),
    sourceType: 'primary',
    rightsStatus: 'public_domain',
    verificationStatus: 'verified',
  },
  {
    slug: 'house-divided-1858',
    title: 'A House Divided Against Itself Cannot Stand',
    documentType: 'speech',
    dateCreated: '1858-06-16',
    historicalPeriod: 'Antebellum',
    description:
      'Speech accepting the Illinois Republican nomination for the United States Senate, opening the campaign against Stephen A. Douglas.',
    archiveName: WIKISOURCE,
    canonicalUrl: ws(
      'Life and Works of Abraham Lincoln/Volume 4/A House Divided Against Itself Cannot Stand',
    ),
    sourceType: 'primary',
    rightsStatus: 'public_domain',
    verificationStatus: 'verified',
  },
  {
    slug: 'letter-lamon-1858',
    title: 'Letter to Ward Hill Lamon',
    documentType: 'letter',
    dateCreated: '1858-06-11',
    historicalPeriod: 'Antebellum',
    description: 'Private letter to his friend and future bodyguard on Illinois campaign matters.',
    archiveName: WIKISOURCE,
    canonicalUrl: ws('Letter from Abraham Lincoln to W. H. Lamon, June 11, 1858'),
    sourceType: 'primary',
    rightsStatus: 'public_domain',
    verificationStatus: 'verified',
  },
  {
    slug: 'wisconsin-agricultural-society-1859',
    title: 'Address before the Wisconsin State Agricultural Society',
    documentType: 'speech',
    dateCreated: '1859-09-30',
    historicalPeriod: 'Antebellum',
    description:
      'Address at Milwaukee on agriculture, free labour, and the dignity of work — the fullest statement of Lincoln’s free-labour philosophy.',
    archiveName: WIKISOURCE,
    canonicalUrl: ws('Address before the Wisconsin State Agricultural Society'),
    sourceType: 'primary',
    rightsStatus: 'public_domain',
    verificationStatus: 'verified',
  },
  {
    slug: 'cooper-union-1860',
    title: 'Cooper Union Address',
    documentType: 'speech',
    dateCreated: '1860-02-27',
    historicalPeriod: 'Antebellum',
    description:
      'Address at Cooper Institute, New York, arguing from the Founders’ record that the federal government may restrict slavery in the territories. The speech that made Lincoln a national candidate.',
    archiveName: WIKISOURCE,
    canonicalUrl: ws('Cooper Union Speech'),
    sourceType: 'primary',
    rightsStatus: 'public_domain',
    verificationStatus: 'verified',
  },

  // ------------------------------------------------------ presidency 1861-65
  {
    slug: 'farewell-address-springfield-1861',
    title: 'Farewell Address at Springfield',
    documentType: 'speech',
    dateCreated: '1861-02-11',
    historicalPeriod: 'Civil War',
    description:
      'Brief remarks from the rear platform of his train on leaving Springfield, Illinois, for Washington.',
    archiveName: WIKISOURCE,
    canonicalUrl: ws("Abraham Lincoln's Farewell Address"),
    sourceType: 'primary',
    rightsStatus: 'public_domain',
    verificationStatus: 'verified',
  },
  {
    slug: 'first-inaugural-1861',
    title: 'First Inaugural Address',
    documentType: 'inaugural address',
    dateCreated: '1861-03-04',
    historicalPeriod: 'Civil War',
    description:
      'First inaugural, delivered with seven states already seceded — denying the right of secession while disclaiming any purpose to interfere with slavery where it existed.',
    archiveName: AVALON,
    collectionName: 'Inaugural Addresses of the Presidents of the United States',
    canonicalUrl: 'https://avalon.law.yale.edu/19th_century/lincoln1.asp',
    sourceType: 'primary',
    rightsStatus: 'public_domain',
    verificationStatus: 'verified',
  },
  {
    slug: 'first-annual-message-1861',
    title: 'First Annual Message to Congress',
    documentType: 'message to congress',
    dateCreated: '1861-12-03',
    historicalPeriod: 'Civil War',
    description:
      'First annual message (State of the Union), covering the conduct of the war, foreign relations, and the free-labour argument against the "mud-sill" theory.',
    archiveName: WIKISOURCE,
    canonicalUrl: ws("Abraham Lincoln's First State of the Union Address"),
    sourceType: 'primary',
    rightsStatus: 'public_domain',
    verificationStatus: 'verified',
  },
  {
    slug: 'address-on-colonization-1862',
    title: 'Address on Colonization to a Deputation of Negroes',
    documentType: 'address',
    dateCreated: '1862-08-14',
    historicalPeriod: 'Civil War',
    description:
      'Remarks to a delegation of free Black men at the White House urging support for colonisation abroad. Included because the record must represent Lincoln’s positions as they were, including those later abandoned and those his contemporaries condemned.',
    archiveName: WIKISOURCE,
    canonicalUrl: ws('Address on Colonization to a Deputation of Negroes'),
    sourceType: 'primary',
    rightsStatus: 'public_domain',
    verificationStatus: 'verified',
  },
  {
    slug: 'second-annual-message-1862',
    title: 'Second Annual Message to Congress',
    documentType: 'message to congress',
    dateCreated: '1862-12-01',
    historicalPeriod: 'Civil War',
    description:
      'Second annual message, closing with "We cannot escape history… We shall nobly save, or meanly lose, the last best hope of earth."',
    archiveName: WIKISOURCE,
    canonicalUrl: ws("Abraham Lincoln's Second State of the Union Address"),
    sourceType: 'primary',
    rightsStatus: 'public_domain',
    verificationStatus: 'verified',
  },
  {
    slug: 'emancipation-proclamation-1863',
    title: 'Emancipation Proclamation',
    documentType: 'proclamation',
    dateCreated: '1863-01-01',
    historicalPeriod: 'Civil War',
    description:
      'Final Emancipation Proclamation, declaring free all persons held as slaves within the states then in rebellion.',
    archiveName: AVALON,
    canonicalUrl: 'https://avalon.law.yale.edu/19th_century/emancipa.asp',
    originalDocumentUrl:
      'https://www.archives.gov/exhibits/featured-documents/emancipation-proclamation',
    sourceType: 'primary',
    rightsStatus: 'public_domain',
    copyrightJurisdiction: 'United States',
    rightsNotes: 'US federal government document; public domain by statute.',
    verificationStatus: 'verified',
  },
  {
    slug: 'thanksgiving-proclamation-1863',
    title: 'Thanksgiving Proclamation',
    documentType: 'proclamation',
    dateCreated: '1863-10-03',
    historicalPeriod: 'Civil War',
    description:
      'Proclamation setting apart the last Thursday of November as a day of thanksgiving, establishing the modern national holiday.',
    archiveName: WIKISOURCE,
    canonicalUrl: ws('Thanksgiving Proclamation (1863)'),
    sourceType: 'primary',
    rightsStatus: 'public_domain',
    verificationStatus: 'verified',
  },
  {
    slug: 'gettysburg-address-1863',
    title: 'Gettysburg Address',
    documentType: 'speech',
    dateCreated: '1863-11-19',
    historicalPeriod: 'Civil War',
    description:
      'Remarks at the dedication of the Soldiers’ National Cemetery at Gettysburg, Pennsylvania.',
    archiveName: AVALON,
    canonicalUrl: 'https://avalon.law.yale.edu/19th_century/gettyb.asp',
    originalDocumentUrl: 'https://www.loc.gov/collections/abraham-lincoln-papers/',
    sourceType: 'primary',
    rightsStatus: 'public_domain',
    rightsNotes:
      'Five manuscript copies in Lincoln’s hand survive and differ in wording; the Bliss copy is the usual standard text. Quotations should be checked against the specific copy cited.',
    verificationStatus: 'verified',
  },
  {
    slug: 'third-annual-message-1863',
    title: 'Third Annual Message to Congress',
    documentType: 'message to congress',
    dateCreated: '1863-12-08',
    historicalPeriod: 'Civil War',
    description:
      'Third annual message, accompanied by the Proclamation of Amnesty and Reconstruction.',
    archiveName: WIKISOURCE,
    canonicalUrl: ws("Abraham Lincoln's Third State of the Union Address"),
    sourceType: 'primary',
    rightsStatus: 'public_domain',
    verificationStatus: 'verified',
  },
  {
    slug: 'letter-to-hodges-1864',
    title: 'Letter to Albert G. Hodges',
    documentType: 'letter',
    dateCreated: '1864-04-04',
    historicalPeriod: 'Civil War',
    description:
      'Letter to the editor of the Frankfort Commonwealth: "I am naturally anti-slavery. If slavery is not wrong, nothing is wrong." Lincoln’s own account of how his constitutional oath shaped his emancipation policy.',
    archiveName: WIKISOURCE,
    canonicalUrl: ws('Letter to A. G. Hodges'),
    sourceType: 'primary',
    rightsStatus: 'public_domain',
    verificationStatus: 'verified',
  },
  {
    slug: 'bixby-letter-1864',
    title: 'Letter to Mrs. Lydia Bixby',
    documentType: 'letter',
    dateCreated: '1864-11-21',
    historicalPeriod: 'Civil War',
    description:
      'Letter of condolence to a Boston widow believed to have lost five sons in battle.',
    archiveName: WIKISOURCE,
    canonicalUrl: ws('Letter to Mrs. Bixby'),
    sourceType: 'primary',
    rightsStatus: 'public_domain',
    rightsNotes:
      'AUTHORSHIP DISPUTED. Many scholars attribute the letter to Lincoln’s secretary John Hay rather than to Lincoln; no manuscript in Lincoln’s hand survives. The underlying premise is also wrong — two of Mrs. Bixby’s sons died, not five. Withheld from publication so it cannot be retrieved and quoted as Lincoln’s own words.',
    verificationStatus: 'disputed',
    publishByDefault: false,
    notes:
      'Kept in the corpus deliberately: a library that handles provenance correctly must be able to hold a document it will not speak in the figure’s voice.',
  },
  {
    slug: 'fourth-annual-message-1864',
    title: 'Fourth Annual Message to Congress',
    documentType: 'message to congress',
    dateCreated: '1864-12-06',
    historicalPeriod: 'Civil War',
    description:
      'Fourth and final annual message, urging passage of the Thirteenth Amendment by the outgoing House.',
    archiveName: WIKISOURCE,
    canonicalUrl: ws("Abraham Lincoln's Fourth State of the Union Address"),
    sourceType: 'primary',
    rightsStatus: 'public_domain',
    verificationStatus: 'verified',
  },
  {
    slug: 'second-inaugural-1865',
    title: 'Second Inaugural Address',
    documentType: 'inaugural address',
    dateCreated: '1865-03-04',
    historicalPeriod: 'Civil War',
    description:
      'Second inaugural, delivered weeks before the war’s end: "With malice toward none, with charity for all."',
    archiveName: AVALON,
    collectionName: 'Inaugural Addresses of the Presidents of the United States',
    canonicalUrl: 'https://avalon.law.yale.edu/19th_century/lincoln2.asp',
    sourceType: 'primary',
    rightsStatus: 'public_domain',
    verificationStatus: 'verified',
  },
  {
    slug: 'last-public-address-1865',
    title: 'Last Public Address',
    documentType: 'speech',
    dateCreated: '1865-04-11',
    historicalPeriod: 'Civil War',
    description:
      'Address from a White House window on Reconstruction and Black suffrage in Louisiana, three days before his assassination. His final public speech.',
    archiveName: WIKISOURCE,
    canonicalUrl: ws("Abraham Lincoln's final public address"),
    sourceType: 'primary',
    rightsStatus: 'public_domain',
    verificationStatus: 'verified',
  },

  // ---------------------------------------------- proclamations & war orders
  {
    slug: 'proclamation-95-emancipation',
    title: 'Proclamation 95 — Emancipation Proclamation (as issued)',
    documentType: 'proclamation',
    dateCreated: '1863-01-01',
    historicalPeriod: 'Civil War',
    description:
      'The Emancipation Proclamation as numbered in the series of presidential proclamations.',
    archiveName: WIKISOURCE,
    canonicalUrl: ws('Proclamation 95'),
    sourceType: 'primary',
    rightsStatus: 'public_domain',
    verificationStatus: 'verified',
    notes:
      'Deliberate near-duplicate of the Avalon text. Two independent transcriptions of the same document are a useful test that retrieval deduplicates by document rather than by passage.',
  },
  {
    slug: 'habeas-corpus-suspension-1861-04',
    title: 'Order to Suspend the Writ of Habeas Corpus (April 1861)',
    documentType: 'executive order',
    dateCreated: '1861-04-27',
    historicalPeriod: 'Civil War',
    description:
      'Authorisation to the Commanding General to suspend the writ of habeas corpus along the military line between Philadelphia and Washington.',
    archiveName: WIKISOURCE,
    canonicalUrl: ws('Order to Suspend Habeas Corpus, April 27, 1861'),
    sourceType: 'primary',
    rightsStatus: 'public_domain',
    verificationStatus: 'verified',
  },
  {
    slug: 'habeas-corpus-suspension-1861-07',
    title: 'Order to Suspend the Writ of Habeas Corpus (July 1861)',
    documentType: 'executive order',
    dateCreated: '1861-07-02',
    historicalPeriod: 'Civil War',
    description:
      'Extension of the habeas corpus suspension along the military line between New York and Washington.',
    archiveName: WIKISOURCE,
    canonicalUrl: ws('Order to Suspend Habeas Corpus, July 2, 1861'),
    sourceType: 'primary',
    rightsStatus: 'public_domain',
    verificationStatus: 'verified',
  },
];

/**
 * The Nicolay & Hay edition, *The Papers and Writings of Abraham Lincoln*
 * (1905), complete in seven volumes on Project Gutenberg.
 *
 * These give the corpus its depth: the individually-catalogued documents above
 * are the famous set-pieces, while these volumes carry the ordinary
 * correspondence, orders, and minor speeches that most questions actually turn
 * on. All public domain.
 *
 * **A known limitation, deliberately accepted for now.** Each volume is stored
 * as one source spanning a date range, so `dateCreated` is set to the *end* of
 * that range. For the knowledge-cutoff filter (`dateContext <= cutoff`) this is
 * conservative-correct: a volume can never surface material postdating its own
 * end date. But it costs recall on narrow temporal queries — asking "what did
 * you think in 1858?" will not reach into the 1858-1862 volume, because the
 * volume dates to 1862.
 *
 * Splitting these into individually-dated documents is the single highest-value
 * Phase 2b improvement, and the reason the precise-dated documents above are
 * catalogued separately rather than left to the volumes.
 */
interface GutenbergVolume {
  id: number;
  volume: number;
  subtitle: string;
  /** Latest date of material in the volume — see the note above. */
  endDate: string;
  range: string;
  period: string;
}

const GUTENBERG_VOLUMES: GutenbergVolume[] = [
  {
    id: 2653,
    volume: 1,
    subtitle: '1832–1843',
    endDate: '1843-12-31',
    range: '1832–1843',
    period: 'Antebellum',
  },
  {
    id: 2654,
    volume: 2,
    subtitle: '1843–1858',
    endDate: '1858-06-30',
    range: '1843–1858',
    period: 'Antebellum',
  },
  {
    id: 2655,
    volume: 3,
    subtitle: 'The Lincoln–Douglas Debates I',
    endDate: '1858-09-15',
    range: 'August–September 1858',
    period: 'Antebellum',
  },
  {
    id: 2656,
    volume: 4,
    subtitle: 'The Lincoln–Douglas Debates II',
    endDate: '1858-10-15',
    range: 'September–October 1858',
    period: 'Antebellum',
  },
  {
    id: 2657,
    volume: 5,
    subtitle: '1858–1862',
    endDate: '1862-12-31',
    range: '1858–1862',
    period: 'Civil War',
  },
  {
    id: 2658,
    volume: 6,
    subtitle: '1862–1863',
    endDate: '1863-12-31',
    range: '1862–1863',
    period: 'Civil War',
  },
  {
    id: 2659,
    volume: 7,
    subtitle: '1863–1865',
    endDate: '1865-04-15',
    range: '1863–1865',
    period: 'Civil War',
  },
];

for (const volume of GUTENBERG_VOLUMES) {
  const isDebates = volume.subtitle.includes('Debates');
  documents.push({
    slug: `papers-and-writings-volume-${volume.volume}`,
    title: `The Papers and Writings of Abraham Lincoln, Volume ${volume.volume}: ${volume.subtitle}`,
    documentType: isDebates ? 'debate' : 'collected papers',
    dateCreated: volume.endDate,
    approximateDate: volume.range,
    historicalPeriod: volume.period,
    description: isDebates
      ? `Stenographic reports of the 1858 Lincoln–Douglas debates (${volume.range}), from the Nicolay and Hay edition of Lincoln's papers.`
      : `Collected letters, speeches, and papers of Abraham Lincoln, ${volume.range}, from the Nicolay and Hay edition.`,
    archiveName: 'Project Gutenberg',
    collectionName: 'The Papers and Writings of Abraham Lincoln (Nicolay & Hay, 1905)',
    canonicalUrl: `https://www.gutenberg.org/ebooks/${volume.id}`,
    transcriptionUrl: `https://www.gutenberg.org/ebooks/${volume.id}.txt.utf-8`,
    sourceType: 'primary',
    rightsStatus: 'public_domain',
    rightsNotes: isDebates
      ? 'Stenographic report as published in the contemporary press; each side’s papers reported their own candidate more favourably. Contains Stephen A. Douglas’s words as well as Lincoln’s — speaker attribution matters when quoting.'
      : 'Nicolay and Hay edition (1905), public domain in the United States.',
    verificationStatus: 'verified',
    notes: `Volume spans ${volume.range}; dateCreated is the end of that range. See the note on GUTENBERG_VOLUMES.`,
  });
}

export const lincolnCorpus: Corpus = {
  personSlug: 'abraham-lincoln',
  documents,
};
