import { Link } from 'react-router-dom';
import type { HistoricalPersonSummary } from '@historyai/shared';
import { formatLifespan, initials } from '../lib/format';

export function PersonCard({ person }: { person: HistoricalPersonSummary }) {
  return (
    <li>
      <Link className="person-card" to={`/people/${person.slug}`}>
        {person.portraitUrl ? (
          <img
            className="person-card__portrait"
            src={person.portraitUrl}
            alt=""
            loading="lazy"
            width={56}
            height={56}
          />
        ) : (
          <div className="person-card__portrait" aria-hidden="true">
            {initials(person.displayName)}
          </div>
        )}

        <h2 className="person-card__name">{person.displayName}</h2>
        <p className="person-card__dates">{formatLifespan(person.birthDate, person.deathDate)}</p>

        {person.shortBiography && <p className="person-card__bio">{person.shortBiography}</p>}

        <div className="tag-row">
          <span className="tag tag--accent">
            {person.sourceCount === 1 ? '1 source' : `${person.sourceCount} sources`}
          </span>
          {person.categories.slice(0, 2).map((category) => (
            <span key={category} className="tag">
              {category}
            </span>
          ))}
        </div>
      </Link>
    </li>
  );
}
