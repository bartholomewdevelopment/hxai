import { sql } from 'drizzle-orm';
import { closeDatabase, db } from './client';
import { historicalPerson } from './schema/index';
import type { NewHistoricalPersonRow } from './schema/people';

/**
 * Phase 1 seed: the five test figures, with no sources.
 *
 * `knowledgeCutoffDate` is the person's date of death — the temporal boundary
 * the persona cannot see past. Phase 3 applies it as a retrieval filter.
 *
 * The list is a plain array so the remaining 25 figures are an append, and
 * seeding upserts on `slug` so re-running is safe and non-destructive.
 */
const people: NewHistoricalPersonRow[] = [
  {
    slug: 'abraham-lincoln',
    fullName: 'Abraham Lincoln',
    displayName: 'Abraham Lincoln',
    birthDate: '1809-02-12',
    deathDate: '1865-04-15',
    birthplace: 'Hodgenville, Kentucky, United States',
    deathPlace: 'Washington, D.C., United States',
    nationality: 'American',
    occupations: ['Lawyer', 'Politician', 'President of the United States'],
    historicalEra: '19th Century',
    categories: ['Politics & Statecraft', 'American History', 'Civil War'],
    shortBiography:
      'Sixteenth President of the United States, who led the country through the Civil War and issued the Emancipation Proclamation.',
    longBiography:
      'Abraham Lincoln rose from a frontier childhood in Kentucky and Indiana to become a self-taught lawyer in Illinois, a one-term congressman, and in 1860 the first Republican president. His election precipitated the secession of the southern states and a war he prosecuted with the stated aim of preserving the Union. The Emancipation Proclamation of 1863 redefined that war as one against slavery, and the Thirteenth Amendment, passed shortly before his death, abolished it. He was assassinated at Ford’s Theatre in April 1865, days after the surrender at Appomattox. His writing — the Gettysburg Address, the second inaugural, and a vast correspondence — is among the most closely studied in American letters.',
    knowledgeCutoffDate: '1865-04-15',
    published: true,
    featured: true,
  },
  {
    slug: 'benjamin-franklin',
    fullName: 'Benjamin Franklin',
    displayName: 'Benjamin Franklin',
    birthDate: '1706-01-17',
    deathDate: '1790-04-17',
    birthplace: 'Boston, Massachusetts Bay Colony',
    deathPlace: 'Philadelphia, Pennsylvania, United States',
    nationality: 'American',
    occupations: ['Printer', 'Scientist', 'Diplomat', 'Statesman', 'Inventor'],
    historicalEra: '18th Century',
    categories: ['Science & Invention', 'Politics & Statecraft', 'American History'],
    shortBiography:
      'Printer, scientist, diplomat, and founding father, whose experiments with electricity and diplomacy in France both shaped the American republic.',
    longBiography:
      'Benjamin Franklin left a Boston apprenticeship for Philadelphia at seventeen and built a printing business that made him wealthy enough to retire at forty-two and devote himself to science and public life. His experiments established the electrical nature of lightning and gave the language terms still in use — battery, conductor, positive and negative charge. He founded a library, a fire company, a hospital, and a university. As envoy to France he secured the alliance that made American independence militarily possible, and he was the only person to sign the Declaration of Independence, the Treaty of Paris, and the Constitution. His Autobiography and Poor Richard’s Almanack remain widely read.',
    knowledgeCutoffDate: '1790-04-17',
    published: true,
    featured: true,
  },
  {
    slug: 'frederick-douglass',
    fullName: 'Frederick Augustus Washington Bailey Douglass',
    displayName: 'Frederick Douglass',
    birthDate: '1818-02-01',
    deathDate: '1895-02-20',
    birthplace: 'Talbot County, Maryland, United States',
    deathPlace: 'Washington, D.C., United States',
    nationality: 'American',
    occupations: ['Abolitionist', 'Orator', 'Writer', 'Statesman', 'Publisher'],
    historicalEra: '19th Century',
    categories: ['Civil Rights', 'Literature & Letters', 'American History', 'Abolition'],
    shortBiography:
      'Abolitionist, orator, and writer who escaped slavery in Maryland and became the most influential Black American voice of the nineteenth century.',
    longBiography:
      'Frederick Douglass was born into slavery on Maryland’s Eastern Shore and taught himself to read in defiance of the law. He escaped north in 1838 and within a few years was the most sought-after speaker on the abolitionist circuit, so eloquent that audiences doubted he had ever been enslaved — a doubt he answered with the 1845 Narrative, naming names and places at direct risk to his freedom. He founded and edited the North Star, advised Lincoln on emancipation and Black enlistment, and campaigned for women’s suffrage alongside abolition. His birth date was never recorded; February 1818 is his own best reckoning. He left three autobiographies and decades of speeches and journalism.',
    knowledgeCutoffDate: '1895-02-20',
    published: true,
    featured: true,
  },
  {
    slug: 'theodore-roosevelt',
    fullName: 'Theodore Roosevelt Jr.',
    displayName: 'Theodore Roosevelt',
    birthDate: '1858-10-27',
    deathDate: '1919-01-06',
    birthplace: 'New York City, New York, United States',
    deathPlace: 'Oyster Bay, New York, United States',
    nationality: 'American',
    occupations: [
      'Politician',
      'President of the United States',
      'Naturalist',
      'Historian',
      'Soldier',
    ],
    historicalEra: '19th–20th Century',
    categories: ['Politics & Statecraft', 'Conservation', 'American History'],
    shortBiography:
      'Twenty-sixth President of the United States, conservationist, and author, who set aside some 230 million acres of public land.',
    longBiography:
      'Theodore Roosevelt was a sickly asthmatic child who built himself into a rancher, soldier, and police commissioner before becoming, at forty-two, the youngest president in American history. He broke industrial trusts, established the Food and Drug Administration, and used the Antiquities Act to protect national monuments, forests, and bird reserves on a scale no president had attempted. He mediated the end of the Russo-Japanese War, winning the Nobel Peace Prize, and oversaw construction of the Panama Canal. After leaving office he mounted a third-party run in 1912 and led a near-fatal expedition down an uncharted Amazon tributary. He wrote some thirty-five books on history, natural science, and exploration.',
    knowledgeCutoffDate: '1919-01-06',
    published: true,
    featured: false,
  },
  {
    slug: 'charles-darwin',
    fullName: 'Charles Robert Darwin',
    displayName: 'Charles Darwin',
    birthDate: '1809-02-12',
    deathDate: '1882-04-19',
    birthplace: 'Shrewsbury, Shropshire, England',
    deathPlace: 'Downe, Kent, England',
    nationality: 'British',
    occupations: ['Naturalist', 'Geologist', 'Biologist', 'Author'],
    historicalEra: '19th Century',
    categories: ['Science & Invention', 'Natural History', 'British History'],
    shortBiography:
      'English naturalist whose theory of evolution by natural selection became the organising principle of the biological sciences.',
    longBiography:
      'Charles Darwin abandoned medicine at Edinburgh and divinity at Cambridge before sailing as naturalist aboard HMS Beagle in 1831, a five-year voyage whose collections and observations occupied him for the rest of his life. He worked out the mechanism of natural selection within a few years of returning, then spent two decades accumulating evidence and publishing on barnacles, coral reefs, and orchids — until Alfred Russel Wallace independently arrived at the same idea and forced his hand. On the Origin of Species appeared in 1859 and sold out immediately. He published fourteen further books, including The Descent of Man, and corresponded with thousands of naturalists, breeders, and gardeners; some fifteen thousand of his letters survive.',
    knowledgeCutoffDate: '1882-04-19',
    published: true,
    featured: false,
  },
];

async function main(): Promise<void> {
  const rows = await db
    .insert(historicalPerson)
    .values(people)
    .onConflictDoUpdate({
      target: historicalPerson.slug,
      set: {
        fullName: sql`excluded.full_name`,
        displayName: sql`excluded.display_name`,
        birthDate: sql`excluded.birth_date`,
        deathDate: sql`excluded.death_date`,
        birthplace: sql`excluded.birthplace`,
        deathPlace: sql`excluded.death_place`,
        nationality: sql`excluded.nationality`,
        occupations: sql`excluded.occupations`,
        historicalEra: sql`excluded.historical_era`,
        categories: sql`excluded.categories`,
        shortBiography: sql`excluded.short_biography`,
        longBiography: sql`excluded.long_biography`,
        knowledgeCutoffDate: sql`excluded.knowledge_cutoff_date`,
        published: sql`excluded.published`,
        featured: sql`excluded.featured`,
        updatedAt: sql`now()`,
      },
    })
    .returning({ slug: historicalPerson.slug });

  console.log(`Seeded ${rows.length} historical people:`);
  for (const row of rows) console.log(`  - ${row.slug}`);
  console.log('\nNo sources seeded — source ingestion is Phase 2.');
}

main()
  .then(() => closeDatabase())
  .then(() => process.exit(0))
  .catch(async (error: unknown) => {
    console.error('Seed failed:', error);
    await closeDatabase().catch(() => undefined);
    process.exit(1);
  });
