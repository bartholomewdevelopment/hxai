import { useEffect, useState } from 'react';

export interface AsyncState<T> {
  data: T | null;
  error: Error | null;
  loading: boolean;
}

/**
 * Minimal data-fetching hook. Deliberately not TanStack Query — Phase 1 has
 * four read endpoints and no cache-invalidation problem to solve. Revisit when
 * conversations arrive and mutations start needing optimistic updates.
 */
export function useAsync<T>(fetcher: () => Promise<T>, deps: unknown[]): AsyncState<T> {
  const [state, setState] = useState<AsyncState<T>>({
    data: null,
    error: null,
    loading: true,
  });

  useEffect(() => {
    let active = true;
    setState({ data: null, error: null, loading: true });

    fetcher()
      .then((data) => {
        if (active) setState({ data, error: null, loading: false });
      })
      .catch((error: unknown) => {
        if (active) {
          setState({
            data: null,
            error: error instanceof Error ? error : new Error(String(error)),
            loading: false,
          });
        }
      });

    return () => {
      active = false;
    };
    // The caller owns the dependency list; `fetcher` is intentionally excluded
    // so an inline closure does not refetch on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return state;
}
