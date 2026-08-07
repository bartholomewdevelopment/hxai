import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../api/client';
import { useAsync } from '../hooks/useAsync';
import { PersonCard } from '../components/PersonCard';
import { EmptyState, ErrorState, LoadingGrid } from '../components/states';

export function PeoplePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const search = searchParams.get('search') ?? '';
  const [draft, setDraft] = useState(search);

  const { data, error, loading } = useAsync(
    () => api.listPeople(search ? { search } : {}),
    [search],
  );

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    setSearchParams(draft ? { search: draft } : {});
  };

  return (
    <>
      <div className="page-header">
        <p className="eyebrow">The Library</p>
        <h1>People</h1>
        <p>
          Every figure here is backed by a catalogued collection of primary and scholarly sources.
          Choose someone to read about them, or to begin a conversation.
        </p>
      </div>

      <form onSubmit={submit} className="chat__composer" style={{ border: 0, padding: '0 0 32px' }}>
        <input
          type="search"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="Search by name or biography…"
          aria-label="Search people"
        />
        <button className="button button--quiet" type="submit">
          Search
        </button>
      </form>

      {loading && <LoadingGrid />}
      {error && <ErrorState error={error} />}

      {data &&
        (data.items.length === 0 ? (
          <EmptyState title="No one matches that search">
            <p>Try a different name, or clear the search to see the whole library.</p>
          </EmptyState>
        ) : (
          <>
            <p className="eyebrow">
              {data.total} {data.total === 1 ? 'person' : 'people'}
            </p>
            <ul className="people-grid">
              {data.items.map((person) => (
                <PersonCard key={person.id} person={person} />
              ))}
            </ul>
          </>
        ))}
    </>
  );
}
