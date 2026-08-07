import { Link, useParams } from 'react-router-dom';
import { api } from '../api/client';
import { useAsync } from '../hooks/useAsync';
import { Disclaimer } from '../components/Disclaimer';
import { ErrorState, LoadingText } from '../components/states';
import { formatHistoricalDate, initials } from '../lib/format';

/**
 * Chat skeleton.
 *
 * Everything here is inert: the composer and the suggested openings are
 * disabled, and no request is made. Conversations arrive in Phase 3, once
 * retrieval exists — a chat that answered without sources would violate the
 * one guarantee the product makes.
 */
export function ChatPage() {
  const { slug = '' } = useParams();
  const { data: person, error, loading } = useAsync(() => api.getPerson(slug), [slug]);

  if (loading) return <LoadingText label="Opening the conversation…" />;
  if (error) return <ErrorState error={error} />;
  if (!person) return null;

  const cutoff = formatHistoricalDate(person.knowledgeCutoffDate);

  return (
    <div className="chat">
      <header className="chat__header">
        {person.portraitUrl ? (
          <img className="chat__avatar" src={person.portraitUrl} alt="" width={44} height={44} />
        ) : (
          <div className="chat__avatar" aria-hidden="true">
            {initials(person.displayName)}
          </div>
        )}
        <div style={{ flex: 1 }}>
          <div className="chat__name">{person.displayName}</div>
          {cutoff && <div className="chat__cutoff">Knows nothing after {cutoff}</div>}
        </div>
        <Link className="button button--quiet" to={`/people/${person.slug}`}>
          Profile
        </Link>
      </header>

      <div className="chat__transcript">
        <div className="chat__empty">
          <h2>Conversations begin in Phase&nbsp;3</h2>
          <p>
            The interface is in place, but {person.displayName} has no catalogued sources yet — and
            this library will not answer a question it cannot cite. Source ingestion is
            Phase&nbsp;2; retrieval and generation follow.
          </p>

          <div className="suggestions" aria-label="Example questions">
            <button className="suggestion" type="button" disabled>
              What did you consider the hardest decision of your life?
            </button>
            <button className="suggestion" type="button" disabled>
              How did your view of the world change as you grew older?
            </button>
            <button className="suggestion" type="button" disabled>
              What do you wish people had understood about your work?
            </button>
          </div>
        </div>
      </div>

      <form className="chat__composer" onSubmit={(event) => event.preventDefault()}>
        <input
          type="text"
          placeholder={`Ask ${person.displayName} a question…`}
          aria-label={`Message ${person.displayName}`}
          disabled
        />
        <button className="button" type="submit" disabled>
          Send
        </button>
      </form>

      <div style={{ marginTop: 16 }}>
        <Disclaimer compact />
      </div>
    </div>
  );
}
