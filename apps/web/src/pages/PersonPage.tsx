import { Link, useParams } from 'react-router-dom';
import { SOURCE_TYPE_LABELS } from '@historyai/shared';
import { api } from '../api/client';
import { useAsync } from '../hooks/useAsync';
import { Disclaimer } from '../components/Disclaimer';
import { ErrorState, LoadingText } from '../components/states';
import { formatHistoricalDate, formatLifespan, initials } from '../lib/format';

export function PersonPage() {
  const { slug = '' } = useParams();
  const { data: person, error, loading } = useAsync(() => api.getPerson(slug), [slug]);

  const sources = useAsync(
    () => (person ? api.listPersonSources(person.id) : Promise.resolve(null)),
    [person?.id],
  );

  if (loading) return <LoadingText label="Opening the file…" />;
  if (error) return <ErrorState error={error} />;
  if (!person) return null;

  return (
    <>
      <section className="person-hero">
        {person.portraitUrl ? (
          <img
            className="person-hero__portrait"
            src={person.portraitUrl}
            alt={`Portrait of ${person.displayName}`}
            width={128}
            height={128}
          />
        ) : (
          <div className="person-hero__portrait" aria-hidden="true">
            {initials(person.displayName)}
          </div>
        )}

        <div className="person-hero__body">
          <h1>{person.displayName}</h1>
          <p className="person-hero__lifespan">
            {formatLifespan(person.birthDate, person.deathDate)}
            {person.nationality ? ` · ${person.nationality}` : ''}
          </p>
          {person.shortBiography && <p className="prose">{person.shortBiography}</p>}

          <div style={{ display: 'flex', gap: 12, marginTop: 24, flexWrap: 'wrap' }}>
            <Link className="button" to={`/people/${person.slug}/chat`}>
              Begin a conversation
            </Link>
          </div>
        </div>
      </section>

      <div style={{ marginBottom: 32 }}>
        <Disclaimer />
      </div>

      <div className="person-layout">
        <div>
          {person.longBiography && (
            <section className="section">
              <h2>Biography</h2>
              <div className="prose">
                {person.longBiography.split('\n\n').map((paragraph, index) => (
                  <p key={index}>{paragraph}</p>
                ))}
              </div>
            </section>
          )}

          <section className="section">
            <h2>Sources</h2>

            {sources.loading && <LoadingText label="Loading sources…" />}
            {sources.error && <ErrorState error={sources.error} />}

            {sources.data && sources.data.items.length === 0 && (
              <p className="prose">
                No sources have been catalogued for {person.displayName} yet. Source ingestion
                begins in Phase&nbsp;2 — until then, conversations are unavailable, because there is
                nothing to ground them in.
              </p>
            )}

            {sources.data && sources.data.items.length > 0 && (
              <ul className="source-list">
                {sources.data.items.map((source) => (
                  <li key={source.id}>
                    <Link className="source-list__title" to={`/sources/${source.id}`}>
                      {source.title}
                    </Link>
                    <div className="source-list__meta">
                      {source.author && <span>{source.author}</span>}
                      <span>{SOURCE_TYPE_LABELS[source.sourceType]}</span>
                      {(formatHistoricalDate(source.dateCreated) ?? source.approximateDate) && (
                        <span>
                          {formatHistoricalDate(source.dateCreated) ?? source.approximateDate}
                        </span>
                      )}
                      {source.archiveName && <span>{source.archiveName}</span>}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <aside className="sidebar">
          <dl className="fact-list">
            <dt>Full name</dt>
            <dd>{person.fullName}</dd>

            {person.birthDate && (
              <>
                <dt>Born</dt>
                <dd>
                  {formatHistoricalDate(person.birthDate)}
                  {person.birthplace ? ` · ${person.birthplace}` : ''}
                </dd>
              </>
            )}

            {person.deathDate && (
              <>
                <dt>Died</dt>
                <dd>
                  {formatHistoricalDate(person.deathDate)}
                  {person.deathPlace ? ` · ${person.deathPlace}` : ''}
                </dd>
              </>
            )}

            {person.occupations.length > 0 && (
              <>
                <dt>Known for</dt>
                <dd>{person.occupations.join(', ')}</dd>
              </>
            )}

            {person.historicalEra && (
              <>
                <dt>Era</dt>
                <dd>{person.historicalEra}</dd>
              </>
            )}

            {person.knowledgeCutoffDate && (
              <>
                <dt>Knowledge boundary</dt>
                <dd>
                  {formatHistoricalDate(person.knowledgeCutoffDate)}
                  <div style={{ fontSize: '0.8rem', color: 'var(--ink-faint)', marginTop: 4 }}>
                    Sources dated after this are never used.
                  </div>
                </dd>
              </>
            )}

            <dt>Catalogued</dt>
            <dd>
              {person.sourceCount} written · {person.audioSourceCount} audio ·{' '}
              {person.videoSourceCount} video
            </dd>
          </dl>

          {person.categories.length > 0 && (
            <div className="tag-row" style={{ marginTop: 20 }}>
              {person.categories.map((category) => (
                <span key={category} className="tag">
                  {category}
                </span>
              ))}
            </div>
          )}
        </aside>
      </div>
    </>
  );
}
