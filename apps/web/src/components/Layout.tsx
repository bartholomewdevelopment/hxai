import { NavLink, Outlet } from 'react-router-dom';

export function Layout() {
  return (
    <div className="app-shell">
      <header className="site-header">
        <div className="container site-header__inner">
          <NavLink to="/" className="wordmark">
            History<span>AI</span>
          </NavLink>
          <nav className="site-nav" aria-label="Primary">
            <NavLink to="/people">People</NavLink>
            <NavLink to="/about">About</NavLink>
          </nav>
        </div>
      </header>

      <main className="site-main">
        <div className="container">
          <Outlet />
        </div>
      </main>

      <footer className="site-footer">
        <div className="container site-footer__inner">
          <span>HistoryAI — an AI historical library, grounded in primary sources.</span>
          <span>Phase 1 · Foundation</span>
        </div>
      </footer>
    </div>
  );
}
