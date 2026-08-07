import { Link } from 'react-router-dom';
import { api } from '../api/client';
import { useAsync } from '../hooks/useAsync';
import { PersonCard } from '../components/PersonCard';
import { ErrorState, LoadingGrid } from '../components/states';

export function HomePage() {
  const { data, error, loading } = useAsync(() => api.listPeople({ limit: 3 }), []);

  return (
    <>
      <section className="hero">
        <h1>Have a conversation with history.</h1>
        <p>
          Ask Abraham Lincoln a question — and read the answer alongside the letters, speeches, and
          papers it was drawn from. Every response is grounded in catalogued primary sources, and
          every claim is cited.
        </p>
        <Link className="button" to="/people">
          Browse the library
        </Link>
      </section>

      <section className="principles">
        <div className="principle">
          <h3>Sources first</h3>
          <p>
            Responses are built from retrieved documents, never from a model&rsquo;s recollection.
            Nothing is written before the sources are found.
          </p>
        </div>
        <div className="principle">
          <h3>Citations you can check</h3>
          <p>
            Every citation points at a catalogued record with its archive and, where available, a
            link to the original. Quotations are reproduced verbatim.
          </p>
        </div>
        <div className="principle">
          <h3>Bounded in time</h3>
          <p>
            Each figure knows only what the record shows they could have known. Sources dated after
            their lifetime are never retrieved.
          </p>
        </div>
      </section>

      <section className="section">
        <p className="eyebrow">Featured</p>
        <h2 style={{ fontSize: '1.6rem', marginBottom: '20px' }}>In the library</h2>

        {loading && <LoadingGrid count={1} />}
        {error && <ErrorState error={error} />}
        {data && (
          <ul className="people-grid">
            {data.items.map((person) => (
              <PersonCard key={person.id} person={person} />
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
