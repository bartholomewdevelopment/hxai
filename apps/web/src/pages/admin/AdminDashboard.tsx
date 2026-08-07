import { useCallback, useState } from 'react';
import { Link } from 'react-router-dom';
import { adminApi, type AdminSourceSummary } from '../../api/client';
import { useAsync } from '../../hooks/useAsync';
import { ErrorState, LoadingText } from '../../components/states';
import { useAdminSession } from './AdminAuth';
import { formatHistoricalDate } from '../../lib/format';

/** Colour-codes the pipeline states so a stalled corpus is visible at a glance. */
function StatusPill({ status }: { status: string }) {
  const tone =
    status === 'ready'
      ? 'ok'
      : status === 'failed'
        ? 'bad'
        : status === 'chunked'
          ? 'partial'
          : 'pending';
  return <span className={`pill pill--${tone}`}>{status}</span>;
}

export function AdminDashboard() {
  const { email, role, signOut } = useAdminSession();
  const [refreshKey, setRefreshKey] = useState(0);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const dashboard = useAsync(() => adminApi.dashboard(), [refreshKey]);
  const sources = useAsync(() => adminApi.listSources(), [refreshKey]);

  const refresh = useCallback(() => setRefreshKey((key) => key + 1), []);

  const run = useCallback(
    async (id: string, action: () => Promise<unknown>, label: string) => {
      setBusyId(id);
      setMessage(null);
      try {
        await action();
        setMessage(`${label} succeeded.`);
        refresh();
      } catch (error) {
        setMessage(
          error instanceof Error ? `${label} failed: ${error.message}` : `${label} failed.`,
        );
      } finally {
        setBusyId(null);
      }
    },
    [refresh],
  );

  if (dashboard.loading) return <LoadingText label="Loading the console…" />;
  if (dashboard.error) return <ErrorState error={dashboard.error} />;

  const stats = dashboard.data;
  const embedded = stats?.chunks.embedded ?? 0;
  const totalChunks = stats?.chunks.chunks ?? 0;

  return (
    <div className="admin">
      <header className="admin__header">
        <div>
          <p className="eyebrow">Console</p>
          <h1>Source library</h1>
        </div>
        <div className="admin__session">
          <span>
            {email} · {role}
          </span>
          <button className="button button--quiet" type="button" onClick={signOut}>
            Sign out
          </button>
        </div>
      </header>

      <section className="admin__stats">
        <div className="stat">
          <div className="stat__value">{stats?.people.length ?? 0}</div>
          <div className="stat__label">People</div>
        </div>
        <div className="stat">
          <div className="stat__value">{sources.data?.total ?? 0}</div>
          <div className="stat__label">Sources</div>
        </div>
        <div className="stat">
          <div className="stat__value">{totalChunks.toLocaleString()}</div>
          <div className="stat__label">Chunks</div>
        </div>
        <div className="stat">
          <div className="stat__value">
            {embedded.toLocaleString()}
            <span className="stat__suffix">
              {totalChunks > 0 ? ` / ${Math.round((embedded / totalChunks) * 100)}%` : ''}
            </span>
          </div>
          <div className="stat__label">Embedded</div>
        </div>
      </section>

      {embedded === 0 && totalChunks > 0 && (
        <aside className="disclaimer disclaimer--compact" role="note">
          <span className="disclaimer__icon" aria-hidden="true">
            ⚠
          </span>
          <span>
            No chunks are embedded yet, so retrieval is unavailable. Set{' '}
            <code>EMBEDDING_PROVIDER</code> and the matching API key in <code>.env</code>, then run{' '}
            <code>npm run embed</code>. Chunks are already stored and waiting.
          </span>
        </aside>
      )}

      {message && <p className="admin-message">{message}</p>}

      <section className="section">
        <h2>Pipeline</h2>
        <div className="tag-row">
          {stats?.sourcesByProcessingStatus.map((entry) => (
            <span key={entry.status} className="tag">
              {entry.status}: {entry.total}
            </span>
          ))}
        </div>
        <div className="tag-row" style={{ marginTop: 8 }}>
          {stats?.sourcesByRightsStatus.map((entry) => (
            <span key={entry.rights} className="tag">
              {entry.rights.replace(/_/g, ' ')}: {entry.total}
            </span>
          ))}
        </div>
      </section>

      <section className="section">
        <h2>Sources</h2>
        {sources.loading && <LoadingText label="Loading sources…" />}
        {sources.error && <ErrorState error={sources.error} />}
        {sources.data && (
          <table className="admin-table">
            <thead>
              <tr>
                <th>Title</th>
                <th>Date</th>
                <th>Status</th>
                <th>Chunks</th>
                <th>Published</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {sources.data.items.map((row: AdminSourceSummary) => (
                <tr key={row.id}>
                  <td>
                    <Link to={`/admin/sources/${row.id}`}>{row.title}</Link>
                    {row.verificationStatus !== 'verified' && (
                      <span className="pill pill--bad" style={{ marginLeft: 8 }}>
                        {row.verificationStatus}
                      </span>
                    )}
                    {row.processingError && (
                      <div className="admin-error-inline">{row.processingError}</div>
                    )}
                  </td>
                  <td className="tabular">
                    {formatHistoricalDate(row.dateCreated) ?? row.approximateDate ?? '—'}
                  </td>
                  <td>
                    <StatusPill status={row.processingStatus} />
                  </td>
                  <td className="tabular">{row.chunkCount}</td>
                  <td>{row.published ? 'Yes' : 'No'}</td>
                  <td className="admin-actions">
                    <button
                      type="button"
                      disabled={busyId === row.id}
                      onClick={() => run(row.id, () => adminApi.processSource(row.id), 'Process')}
                    >
                      Process
                    </button>
                    <button
                      type="button"
                      disabled={busyId === row.id || row.chunkCount === 0}
                      onClick={() => run(row.id, () => adminApi.embedSource(row.id), 'Embed')}
                    >
                      Embed
                    </button>
                    <button
                      type="button"
                      disabled={busyId === row.id}
                      onClick={() =>
                        run(
                          row.id,
                          () => adminApi.setPublished(row.id, !row.published),
                          row.published ? 'Unpublish' : 'Publish',
                        )
                      }
                    >
                      {row.published ? 'Unpublish' : 'Publish'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
