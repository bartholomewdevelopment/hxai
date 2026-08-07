import { ApiError } from '../api/client';

export function LoadingGrid({ count = 6 }: { count?: number }) {
  return (
    <div className="skeleton-grid" aria-busy="true" aria-label="Loading">
      {Array.from({ length: count }, (_, index) => (
        <div key={index} className="skeleton" />
      ))}
    </div>
  );
}

export function LoadingText({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="state" aria-busy="true">
      <p>{label}</p>
    </div>
  );
}

/**
 * A failed fetch is nearly always "the API isn't running" during Phase 1
 * development, so that case gets a specific, actionable message rather than a
 * generic apology.
 */
export function ErrorState({ error }: { error: Error }) {
  const unreachable = error instanceof ApiError && error.status === 0;

  return (
    <div className="state" role="alert">
      <h2>{unreachable ? 'Cannot reach the library' : 'Something went wrong'}</h2>
      <p>{error.message}</p>
      {unreachable && (
        <p>
          Start the API with <code>npm run dev</code> from the repo root, and check that Postgres is
          up with <code>npm run db:up</code>.
        </p>
      )}
      {error instanceof ApiError && error.requestId && (
        <p>
          Request ID: <code>{error.requestId}</code>
        </p>
      )}
    </div>
  );
}

export function EmptyState({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="state">
      <h2>{title}</h2>
      {children}
    </div>
  );
}
