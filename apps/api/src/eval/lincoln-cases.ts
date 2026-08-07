import type { EvalCase } from './types';

/**
 * Fifty evaluation cases for Abraham Lincoln.
 *
 * `expectedSourceSlugs` are corpus slugs from `corpus/lincoln.ts`. Where a
 * passage exists both in a precisely-dated standalone document and inside a
 * Nicolay & Hay volume, both are listed — retrieving either is correct.
 */
export const lincolnEvalCases: EvalCase[] = [
  // ------------------------------------------------------------- factual (9)
  {
    id: 'fact-gettysburg-opening',
    category: 'factual',
    question: 'How did you open your remarks at Gettysburg?',
    expectedSourceSlugs: ['gettysburg-address-1863'],
    expectedContent: ['Fourscore and seven years ago'],
    rationale:
      'The most-quoted passage in the corpus. If retrieval misses this, nothing else matters.',
  },
  {
    id: 'fact-emancipation-date',
    category: 'factual',
    question: 'When did the Emancipation Proclamation take effect, and what did it declare?',
    expectedSourceSlugs: ['emancipation-proclamation-1863', 'proclamation-95-emancipation'],
    expectedContent: ['January', '1863', 'forever free'],
    rationale:
      'Tests date handling plus the deliberate near-duplicate: two transcriptions of one document should not read as two separate documents.',
  },
  {
    id: 'fact-house-divided',
    category: 'factual',
    question: 'What did you mean by a house divided against itself?',
    expectedSourceSlugs: ['house-divided-1858', 'papers-and-writings-volume-2'],
    expectedContent: ['house divided'],
    rationale:
      'Canonical 1858 speech; also checks that the standalone document outranks the volume that contains it.',
  },
  {
    id: 'fact-second-inaugural-close',
    category: 'factual',
    question: 'How did you close your second inaugural address?',
    expectedSourceSlugs: ['second-inaugural-1865'],
    expectedContent: ['malice toward none', 'charity for all'],
    rationale: 'Short document, distinctive closing — a clean retrieval-precision case.',
  },
  {
    id: 'fact-first-inaugural-secession',
    category: 'factual',
    question: 'In your first inaugural, what did you say about the right of a state to secede?',
    expectedSourceSlugs: ['first-inaugural-1861'],
    expectedContent: ['perpetual'],
    rationale:
      'Requires retrieving the constitutional argument, not the peroration everyone quotes.',
  },
  {
    id: 'fact-spot-resolutions',
    category: 'factual',
    question: 'What were your Spot Resolutions about?',
    expectedSourceSlugs: ['spot-resolutions-1847'],
    expectedContent: ['spot'],
    rationale:
      'An obscure early document — tests that the long tail is reachable, not just the famous set-pieces.',
  },
  {
    id: 'fact-habeas-corpus',
    category: 'factual',
    question: 'Did you suspend the writ of habeas corpus, and where?',
    expectedSourceSlugs: ['habeas-corpus-suspension-1861-04', 'habeas-corpus-suspension-1861-07'],
    expectedContent: ['habeas corpus'],
    rationale:
      'Two near-identical orders months apart; both should surface rather than one masking the other.',
  },
  {
    id: 'fact-thanksgiving',
    category: 'factual',
    question: 'Did you establish a national day of thanksgiving?',
    expectedSourceSlugs: ['thanksgiving-proclamation-1863'],
    expectedContent: ['thanksgiving'],
    rationale: 'Straightforward proclamation retrieval.',
  },
  {
    id: 'fact-last-public-address',
    category: 'factual',
    question: 'What did you say in your last public speech about Louisiana?',
    expectedSourceSlugs: ['last-public-address-1865'],
    expectedContent: ['Louisiana'],
    rationale:
      'His final speech, three days before the assassination — the outer edge of the knowledge window.',
  },

  // -------------------------------------------------------------- belief (8)
  {
    id: 'belief-slavery-wrong',
    category: 'belief',
    question: 'Did you personally believe slavery was wrong?',
    expectedSourceSlugs: ['letter-to-hodges-1864'],
    expectedContent: ['naturally anti-slavery', 'nothing is wrong'],
    rationale:
      'Lincoln states this in his own words to Hodges. A grounded system quotes him; an ungrounded one paraphrases a textbook.',
  },
  {
    id: 'belief-union-priority',
    category: 'belief',
    question: 'Was saving the Union more important to you than ending slavery?',
    expectedSourceSlugs: ['letter-to-hodges-1864', 'papers-and-writings-volume-6'],
    expectedContent: ['Union'],
    rationale:
      'The Greeley letter is the classic source and sits inside volume 6 — tests that volume content is reachable at all.',
  },
  {
    id: 'belief-colonization',
    category: 'belief',
    question: 'Did you ever support sending free Black Americans to colonies abroad?',
    expectedSourceSlugs: ['address-on-colonization-1862'],
    expectedContent: ['colon'],
    rationale:
      'He did, and said so. A library that quietly omits the uncomfortable positions is not a historical library. Failure here means the corpus is being sanitised.',
  },
  {
    id: 'belief-free-labour',
    category: 'belief',
    question: 'What did you think about the relationship between labour and capital?',
    expectedSourceSlugs: ['wisconsin-agricultural-society-1859', 'first-annual-message-1861'],
    expectedContent: ['labor'],
    rationale: 'Stated in two documents two years apart; both are legitimate.',
  },
  {
    id: 'belief-black-suffrage',
    category: 'belief',
    question: 'Did you favour giving Black men the vote?',
    expectedSourceSlugs: ['last-public-address-1865'],
    expectedContent: ['elective franchise'],
    rationale: 'A qualified, late, and specific position. Tests whether nuance survives retrieval.',
  },
  {
    id: 'belief-mob-law',
    category: 'belief',
    question: 'What did you say about mob violence and the rule of law as a young man?',
    expectedSourceSlugs: ['lyceum-address-1838'],
    expectedContent: ['mob'],
    rationale: 'His earliest major speech — the deepest point in the date range.',
  },
  {
    id: 'belief-henry-clay',
    category: 'belief',
    question: 'What did Henry Clay mean to you?',
    expectedSourceSlugs: ['eulogy-henry-clay-1852'],
    expectedContent: ['Clay'],
    rationale: 'Tests retrieval on a named person rather than a topic.',
  },
  {
    id: 'belief-founders-slavery',
    category: 'belief',
    question:
      'What did you argue the Founders believed about federal control of slavery in the territories?',
    expectedSourceSlugs: ['cooper-union-1860'],
    expectedContent: ['fathers'],
    rationale:
      'The core of Cooper Union — a long document where the answer is not near the beginning.',
  },

  // ------------------------------------------------------------ temporal (7)
  {
    id: 'temporal-1858-senate',
    category: 'temporal',
    question: 'In 1858, what was your position on the extension of slavery?',
    expectedSourceSlugs: ['house-divided-1858'],
    notAfterDate: '1858-12-31',
    rationale:
      'Date-bounded retrieval must prefer 1858 material over the 1864 Hodges letter that answers a similar question.',
  },
  {
    id: 'temporal-1838-young',
    category: 'temporal',
    question: 'What were you speaking about publicly before you turned thirty?',
    expectedSourceSlugs: ['lyceum-address-1838'],
    notAfterDate: '1839-02-12',
    rationale: 'Tight early window; almost the whole corpus must be excluded.',
  },
  {
    id: 'temporal-before-presidency',
    category: 'temporal',
    question: 'Before you became president, what did you say about the Mexican War?',
    expectedSourceSlugs: ['spot-resolutions-1847'],
    notAfterDate: '1861-03-03',
    rationale: 'Checks that the cutoff filter is a predicate and not a prompt instruction.',
  },
  {
    id: 'temporal-1862-emancipation-thinking',
    category: 'temporal',
    question: 'As of the end of 1862, what had you decided about emancipation?',
    expectedSourceSlugs: ['second-annual-message-1862'],
    notAfterDate: '1862-12-31',
    forbiddenContent: ['Gettysburg'],
    rationale:
      'The final Proclamation is one day past the boundary. A system that leaks it is not enforcing dates.',
  },
  {
    id: 'temporal-first-year-war',
    category: 'temporal',
    question: 'How did the war look to you at the end of its first year?',
    expectedSourceSlugs: ['first-annual-message-1861'],
    notAfterDate: '1861-12-31',
    rationale: 'Annual messages are the natural anchor for year-bounded questions.',
  },
  {
    id: 'temporal-1859-agriculture',
    category: 'temporal',
    question: 'What were you saying about farming and free labour in 1859?',
    expectedSourceSlugs: ['wisconsin-agricultural-society-1859'],
    notAfterDate: '1859-12-31',
    rationale: 'A single-document year — clean signal on date filtering.',
  },
  {
    id: 'temporal-final-months',
    category: 'temporal',
    question: 'In the last months of your life, what were you planning for the South?',
    expectedSourceSlugs: ['second-inaugural-1865', 'last-public-address-1865'],
    notAfterDate: '1865-04-15',
    rationale: 'The boundary case at the very top of the range.',
  },

  // ----------------------------------------------------- knowledge-cutoff (6)
  {
    id: 'cutoff-assassination',
    category: 'knowledge-cutoff',
    question: 'How did you feel about being assassinated at Ford’s Theatre?',
    expectedSourceSlugs: [],
    expectRefusal: true,
    notAfterDate: '1865-04-15',
    rationale: 'He cannot narrate his own death. The single clearest test that the cutoff holds.',
  },
  {
    id: 'cutoff-13th-amendment-ratified',
    category: 'knowledge-cutoff',
    question:
      'What did you think when the Thirteenth Amendment was finally ratified in December 1865?',
    expectedSourceSlugs: [],
    expectRefusal: true,
    notAfterDate: '1865-04-15',
    rationale:
      'Plausible and adjacent — he championed the amendment but died eight months before ratification. Tests a *near* miss rather than an obvious one.',
  },
  {
    id: 'cutoff-reconstruction-outcome',
    category: 'knowledge-cutoff',
    question: 'How do you think Reconstruction turned out?',
    expectedSourceSlugs: [],
    expectRefusal: true,
    notAfterDate: '1865-04-15',
    rationale: 'Invites speculation dressed as memory.',
  },
  {
    id: 'cutoff-modern-question',
    category: 'knowledge-cutoff',
    question: 'What do you make of the internet?',
    expectedSourceSlugs: [],
    expectRefusal: true,
    rationale: 'The trivial case. Should never require retrieval to get right.',
  },
  {
    id: 'cutoff-successor',
    category: 'knowledge-cutoff',
    question: 'What was Andrew Johnson like as president?',
    expectedSourceSlugs: [],
    expectRefusal: true,
    notAfterDate: '1865-04-15',
    rationale:
      'Johnson was his own vice-president, so sources mention him — but only his presidency is out of bounds. Tests a *partial* cutoff, not a whole-topic block.',
  },
  {
    id: 'cutoff-civil-war-end',
    category: 'knowledge-cutoff',
    question:
      'What did you say when the Confederacy formally surrendered its last army in June 1865?',
    expectedSourceSlugs: [],
    expectRefusal: true,
    notAfterDate: '1865-04-15',
    rationale:
      'Appomattox (9 April) is inside the window; the final surrenders are not. A fine-grained boundary.',
  },

  // -------------------------------------------------------- false-premise (6)
  {
    id: 'premise-freed-all-slaves',
    category: 'false-premise',
    question:
      'Why did the Emancipation Proclamation free every enslaved person in the United States?',
    expectedSourceSlugs: ['emancipation-proclamation-1863'],
    expectRefusal: true,
    rationale:
      'It did not — it applied only to areas in rebellion. The correct response corrects the premise from the text.',
  },
  {
    id: 'premise-wrote-on-envelope',
    category: 'false-premise',
    question:
      'Tell me about writing the Gettysburg Address on the back of an envelope on the train.',
    expectedSourceSlugs: ['gettysburg-address-1863'],
    expectRefusal: true,
    forbiddenContent: ['envelope'],
    rationale:
      'A durable myth. Tests refusal of a *popular* falsehood, which is harder than refusing an absurd one.',
  },
  {
    id: 'premise-log-cabin-poverty',
    category: 'false-premise',
    question:
      'Describe the speech where you declared yourself the poorest man ever to seek the presidency.',
    expectedSourceSlugs: [],
    expectRefusal: true,
    rationale: 'No such speech. Invites invention of a document.',
  },
  {
    id: 'premise-fifth-debate-chicago',
    category: 'false-premise',
    question: 'What happened at your fifth debate with Douglas in Chicago?',
    expectedSourceSlugs: [],
    expectRefusal: true,
    forbiddenContent: ['Chicago'],
    rationale:
      'The fifth debate was at Galesburg; there was no Chicago debate. Specific, checkable, and easy to hallucinate.',
  },
  {
    id: 'premise-bixby-five-sons',
    category: 'false-premise',
    question: 'Tell me about writing to Mrs. Bixby after all five of her sons were killed.',
    expectedSourceSlugs: [],
    expectRefusal: true,
    rationale:
      'Doubly false: the letter is probably John Hay’s, and only two sons died. The document is in the corpus but unpublished, so retrieval must not reach it — this case verifies the withholding works.',
  },
  {
    id: 'premise-opposed-emancipation',
    category: 'false-premise',
    question: 'Why did you oppose emancipation right up until the end of the war?',
    expectedSourceSlugs: ['letter-to-hodges-1864'],
    expectRefusal: true,
    rationale: 'Reverses his documented position. The sources contradict the premise directly.',
  },

  // ---------------------------------------------------- fabricated-quote (4)
  {
    id: 'quote-invented-tyranny',
    category: 'fabricated-quote',
    question:
      'Quote what you said about "the silent artillery of time destroying tyranny in America".',
    expectedSourceSlugs: [],
    expectRefusal: true,
    rationale:
      'Splices a real Lincoln phrase into an invented sentence. Tests that near-misses are refused, not completed.',
  },
  {
    id: 'quote-internet-democracy',
    category: 'fabricated-quote',
    question: 'Give me your exact words on how a free press sustains democracy in the modern age.',
    expectedSourceSlugs: [],
    expectRefusal: true,
    rationale: 'Requests an exact quotation that cannot exist. Fluency here is failure.',
    forbiddenContent: ['modern age'],
  },
  {
    id: 'quote-you-cannot-help-the-poor',
    category: 'fabricated-quote',
    question: 'Repeat your line that you cannot help the poor by destroying the rich.',
    expectedSourceSlugs: [],
    expectRefusal: true,
    rationale:
      'Widely misattributed to Lincoln; actually William J. H. Boetcker. A misattribution the model has certainly seen.',
  },
  {
    id: 'quote-character-tree-shadow',
    category: 'fabricated-quote',
    question:
      'You said character is like a tree and reputation like its shadow — what did you mean?',
    expectedSourceSlugs: [],
    expectRefusal: true,
    rationale:
      'Another common misattribution. Two in a row test whether refusal is systematic or lucky.',
  },

  // ---------------------------------------------- quotation-verification (4)
  {
    id: 'verify-malice-toward-none',
    category: 'quotation-verification',
    question: 'Quote exactly what you said about malice and charity in your second inaugural.',
    expectedSourceSlugs: ['second-inaugural-1865'],
    expectedContent: ['With malice toward none, with charity for all'],
    rationale:
      'The quotation must match the stored text character for character, not approximately.',
  },
  {
    id: 'verify-government-of-the-people',
    category: 'quotation-verification',
    question: 'Quote the final line of the Gettysburg Address exactly.',
    expectedSourceSlugs: ['gettysburg-address-1863'],
    expectedContent: ['shall not perish from the earth'],
    rationale:
      'Five manuscript copies differ in wording. The answer must match the *cited* copy, which is why the source carries a rights note about it.',
  },
  {
    id: 'verify-hodges-anti-slavery',
    category: 'quotation-verification',
    question: 'Give me your exact sentence to Albert Hodges about being naturally anti-slavery.',
    expectedSourceSlugs: ['letter-to-hodges-1864'],
    expectedContent: ['I am naturally anti-slavery'],
    rationale: 'Short, distinctive, and frequently paraphrased — a good verbatim test.',
  },
  {
    id: 'verify-mystic-chords',
    category: 'quotation-verification',
    question: 'What exactly did you say about the mystic chords of memory?',
    expectedSourceSlugs: ['first-inaugural-1861'],
    expectedContent: ['mystic chords of memory'],
    rationale:
      'Near the end of a long document — tests that verbatim recall does not degrade with position.',
  },

  // ------------------------------------------------------------- persona (3)
  {
    id: 'persona-plain-speech',
    category: 'persona',
    question: 'Explain the Constitution to me as if I were a farmer in Illinois.',
    expectedSourceSlugs: ['first-inaugural-1861', 'house-divided-1858'],
    rationale:
      'Voice test that still requires grounding. Style may adapt; facts may not be invented to suit it.',
  },
  {
    id: 'persona-storytelling',
    category: 'persona',
    question:
      'You were known for telling stories to make a point. Do that for me about persistence.',
    expectedSourceSlugs: [],
    rationale:
      'Invites an anecdote. Acceptable answers either draw on a documented story or say plainly that none is in the record — inventing a folksy tale is the failure.',
    expectRefusal: true,
  },
  {
    id: 'persona-melancholy',
    category: 'persona',
    question: 'People said you were often melancholy. Does that sound right to you?',
    expectedSourceSlugs: [],
    rationale:
      'A question about interior life, where the sources are thin. Tests epistemic humility rather than retrieval.',
    expectRefusal: true,
  },

  // -------------------------------------------------------------- source (3)
  {
    id: 'source-what-do-you-have',
    category: 'source',
    question: 'What documents do you have from 1863?',
    expectedSourceSlugs: [
      'emancipation-proclamation-1863',
      'gettysburg-address-1863',
      'thanksgiving-proclamation-1863',
      'third-annual-message-1863',
    ],
    rationale:
      'Catalogue query rather than content query — date filtering must work as an index, not just a filter.',
  },
  {
    id: 'source-where-from',
    category: 'source',
    question: 'Where does your copy of the Gettysburg Address come from?',
    expectedSourceSlugs: ['gettysburg-address-1863'],
    expectedContent: ['Avalon'],
    rationale: 'Provenance must be answerable from stored metadata, never guessed.',
  },
  {
    id: 'source-primary-vs-scholarly',
    category: 'source',
    question: 'Are these your own words, or someone’s account of them?',
    expectedSourceSlugs: [],
    rationale:
      'Tests that the primary/contemporary/scholarly distinction is surfaced to the user rather than flattened.',
  },
];
