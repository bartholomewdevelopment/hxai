import { useCallback, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { adminApi } from '../../api/client';
import { useAsync } from '../../hooks/useAsync';
import { ErrorState, LoadingText } from '../../components/states';

/**
 * Source editor.
 *
 * Metadata is editable; the stored text is shown read-only alongside the chunk
 * breakdown. Editing the text is possible through the API but deliberately not
 * offered as a casual inline edit here — silently rewriting a transcription is
 * how a corpus stops matching its archive, and the pipeline treats a text
 * change as invalidating every chunk derived from it.
 */
export function AdminSourcePage() {
  const { id = '' } = useParams();
  const [refreshKey, setRefreshKey] = useState(0);
  const [draft, setDraft] = useState<Record<string, string> | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const { data, error, loading } = useAsync(() => adminApi.getSource(id), [id, refreshKey]);
  const refresh = useCallback(() => setRefreshKey((key) => key + 1), []);

  const save = async () => {
    if (!draft) return;
    setBusy(true);
    setMessage(null);
    try {
      // Only send fields the curator actually touched, so untouched columns
      // are never overwritten with stale form state.
      await adminApi.updateSource(id, draft);
      setMessage('Saved.');
      setDraft(null);
      refresh();
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : 'Save failed');
    } finally {
      setBusy(false);
    }
  };

  const act = async (label: string, action: () => Promise<unknown>) => {
    setBusy(true);
    setMessage(null);
    try {
      await action();
      setMessage(`${label} succeeded.`);
      refresh();
    } catch (caught) {
      setMessage(
        caught instanceof Error ? `${label} failed: ${caught.message}` : `${label} failed`,
      );
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <LoadingText label="Loading source…" />;
  if (error) return <ErrorState error={error} />;
  if (!data) return null;

  const { source, chunks } = data;
  const field = (key: keyof typeof source): string =>
    draft?.[key] ?? (source[key] == null ? '' : String(source[key]));

  const editable: { key: keyof typeof source; label: string }[] = [
    { key: 'title', label: 'Title' },
    { key: 'author', label: 'Author' },
    { key: 'documentType', label: 'Document type' },
    { key: 'dateCreated', label: 'Date created (YYYY-MM-DD)' },
    { key: 'approximateDate', label: 'Approximate date' },
    { key: 'archiveName', label: 'Archive' },
    { key: 'collectionName', label: 'Collection' },
    { key: 'canonicalUrl', label: 'Canonical URL' },
    { key: 'transcriptionUrl', label: 'Transcription URL' },
  ];

  return (
    <div className="admin">
      <p className="eyebrow">
        <Link to="/admin">← Console</Link>
      </p>
      <h1 className="admin__title">{source.title}</h1>

      <div className="tag-row" style={{ marginBottom: 20 }}>
        <span className="tag">{source.processingStatus}</span>
        <span className="tag">{source.chunkCount} chunks</span>
        <span className="tag">{source.textLength.toLocaleString()} chars</span>
        <span className="tag">{source.rightsStatus.replace(/_/g, ' ')}</span>
        <span className={source.published ? 'tag tag--accent' : 'tag'}>
          {source.published ? 'published' : 'withheld'}
        </span>
      </div>

      {source.rightsNotes && (
        <aside className="disclaimer disclaimer--compact" role="note">
          <span className="disclaimer__icon" aria-hidden="true">
            ⚠
          </span>
          <span>{source.rightsNotes}</span>
        </aside>
      )}

      {message && <p className="admin-message">{message}</p>}

      <section className="section">
        <h2>Metadata</h2>
        <div className="admin-form">
          {editable.map((entry) => (
            <label key={String(entry.key)}>
              {entry.label}
              <input
                value={field(entry.key)}
                onChange={(event) =>
                  setDraft((current) => ({ ...current, [entry.key]: event.target.value }))
                }
              />
            </label>
          ))}
        </div>
        <div className="admin-actions" style={{ marginTop: 16 }}>
          <button className="button" type="button" onClick={save} disabled={busy || !draft}>
            Save changes
          </button>
          <button type="button" onClick={() => setDraft(null)} disabled={!draft}>
            Discard
          </button>
        </div>
      </section>

      <section className="section">
        <h2>Pipeline</h2>
        <div className="admin-actions">
          <button
            type="button"
            disabled={busy}
            onClick={() => act('Process', () => adminApi.processSource(id))}
          >
            Process
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => act('Reprocess', () => adminApi.processSource(id, true))}
          >
            Force reprocess
          </button>
          <button
            type="button"
            disabled={busy || source.chunkCount === 0}
            onClick={() => act('Embed', () => adminApi.embedSource(id))}
          >
            Embed
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() =>
              act(source.published ? 'Unpublish' : 'Publish', () =>
                adminApi.setPublished(id, !source.published),
              )
            }
          >
            {source.published ? 'Unpublish' : 'Publish'}
          </button>
        </div>
        {source.retrievedFrom && (
          <p className="prose" style={{ marginTop: 12, fontSize: '0.85rem' }}>
            Text retrieved from <code>{source.retrievedFrom}</code>
            {source.retrievedAt ? ` on ${source.retrievedAt.slice(0, 10)}` : ''}.
          </p>
        )}
      </section>

      <section className="section">
        <h2>Chunks ({chunks.length})</h2>
        <ol className="chunk-list">
          {chunks.slice(0, 40).map((chunk) => (
            <li key={chunk.id}>
              <div className="chunk-list__meta">
                #{chunk.chunkIndex} · {chunk.tokenCount ?? '?'} tokens ·{' '}
                {chunk.embedded ? 'embedded' : 'not embedded'}
              </div>
              <p className="chunk-list__text">{chunk.text.slice(0, 400)}…</p>
            </li>
          ))}
        </ol>
        {chunks.length > 40 && (
          <p className="prose">Showing the first 40 of {chunks.length} chunks.</p>
        )}
      </section>
    </div>
  );
}
