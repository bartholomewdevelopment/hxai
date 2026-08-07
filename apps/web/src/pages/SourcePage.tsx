import { Link, useParams, useSearchParams } from 'react-router-dom';
import { useMemo } from 'react';
import { RIGHTS_STATUS_LABELS, SOURCE_TYPE_LABELS, type SourceDetail } from '@historyai/shared';
import { useAsync } from '../hooks/useAsync';
import { ErrorState, LoadingText } from '../components/states';
import { formatHistoricalDate } from '../lib/format';

interface ViewerSource extends SourceDetail {
  person: { slug: string; displayName: string };
  highlight: { start: number; end: number; text: string } | null;
}

/**
 * The source viewer.
 *
 * This is where a citation lands. Its job is to let a reader check a claim
 * against the document themselves: what the document is, who wrote it, when,
 * which archive holds it, the passage in question, and a link to the original.
 *
 * The passage is addressed by character offset (`?passage=1200-1750`) rather
 * than by chunk id — nothing about the retrieval index is exposed here.
 */
export function SourcePage() {
  const { id = '' } = useParams();
  const [searchParams] = useSearchParams();
  const passage = searchParams.get('passage');

  const { data, error, loading } = useAsync(
    () =>
      fetch(`/api/sources/${encodeURIComponent(id)}${passage ? `?passage=${passage}` : ''}`).then(
        async (response) => {
          if (!response.ok) throw new Error('That source could not be found.');
          return (await response.json()) as ViewerSource;
        },
      ),
    [id, passage],
  );

  // Split the document around the cited passage so it can be marked without
  // dangerouslySetInnerHTML — the text is historical, not trusted markup.
  const segments = useMemo(() => {
    if (!data?.fullText) return null;
    if (!data.highlight) return { before: data.fullText, marked: '', after: '' };
    return {
      before: data.fullText.slice(0, data.highlight.start),
      marked: data.fullText.slice(data.highlight.start, data.highlight.end),
      after: data.fullText.slice(data.highlight.end),
    };
  }, [data]);

  if (loading) return <LoadingText label="Opening the document…" />;
  if (error) return <ErrorState error={error} />;
  if (!data) return null;

  const displayDate = formatHistoricalDate(data.dateCreated) ?? data.approximateDate;

  return (
    <article className="source-view">
      <p className="eyebrow">
        <Link to={`/people/${data.person.slug}`}>{data.person.displayName}</Link>
        {' · '}
        {SOURCE_TYPE_LABELS[data.sourceType]}
      </p>

      <h1 className="source-view__title">{data.title}</h1>

      <dl className="source-view__meta">
        {data.author && (
          <>
            <dt>Author</dt>
            <dd>{data.author}</dd>
          </>
        )}
        {displayDate && (
          <>
            <dt>Date</dt>
            <dd>{displayDate}</dd>
          </>
        )}
        {data.archiveName && (
          <>
            <dt>Archive</dt>
            <dd>
              {data.archiveName}
              {data.collectionName ? ` · ${data.collectionName}` : ''}
            </dd>
          </>
        )}
        <>
          <dt>Rights</dt>
          <dd>{RIGHTS_STATUS_LABELS[data.rightsStatus]}</dd>
        </>
      </dl>

      {data.description && <p className="prose source-view__description">{data.description}</p>}

      {data.rightsNotes && (
        <aside className="disclaimer disclaimer--compact" role="note">
          <span className="disclaimer__icon" aria-hidden="true">
            ⚠
          </span>
          <span>{data.rightsNotes}</span>
        </aside>
      )}

      <div className="source-view__actions">
        {data.canonicalUrl && (
          <a
            className="button"
            href={data.canonicalUrl}
            target="_blank"
            rel="noopener noreferrer nofollow"
          >
            Open original source ↗
          </a>
        )}
        {data.originalDocumentUrl && (
          <a
            className="button button--quiet"
            href={data.originalDocumentUrl}
            target="_blank"
            rel="noopener noreferrer nofollow"
          >
            View the manuscript ↗
          </a>
        )}
      </div>

      {data.highlight && (
        <section className="passage">
          <p className="eyebrow">Cited passage</p>
          <blockquote className="passage__quote">{data.highlight.text}</blockquote>
        </section>
      )}

      <section className="section">
        <h2>Full text</h2>
        {segments ? (
          <div className="document-text">
            {segments.before}
            {segments.marked && <mark id="cited-passage">{segments.marked}</mark>}
            {segments.after}
          </div>
        ) : (
          <p className="prose">
            The full text of this source is not available here. Use the link above to read it at{' '}
            {data.archiveName ?? 'the holding archive'}.
          </p>
        )}
      </section>
    </article>
  );
}
