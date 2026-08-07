import { Link } from 'react-router-dom';

export function NotFoundPage() {
  return (
    <div className="state">
      <h2>Nothing catalogued here</h2>
      <p>That page does not exist.</p>
      <p style={{ marginTop: 24 }}>
        <Link className="button button--quiet" to="/people">
          Browse the library
        </Link>
      </p>
    </div>
  );
}
