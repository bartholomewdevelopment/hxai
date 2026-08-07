import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { authApi, setAuthToken } from '../../api/client';

/**
 * Admin session.
 *
 * The token lives in sessionStorage rather than localStorage: it clears when
 * the tab closes, which is the right default for a console that can publish and
 * delete. It is never written to a cookie, so there is nothing for a
 * cross-site request to carry automatically.
 *
 * This is a convenience wrapper only — every route is enforced server-side by
 * `authenticate` + `requireRole`. Nothing here grants access.
 */
interface AdminSession {
  token: string | null;
  role: string | null;
  email: string | null;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => void;
}

const STORAGE_KEY = 'historyai.admin.session';

const AdminAuthContext = createContext<AdminSession | null>(null);

interface StoredSession {
  token: string;
  role: string;
  email: string;
}

function readStored(): StoredSession | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as StoredSession) : null;
  } catch {
    return null;
  }
}

export function AdminAuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<StoredSession | null>(() => readStored());

  useEffect(() => {
    setAuthToken(session?.token ?? null);
  }, [session]);

  const signIn = useCallback(async (email: string, password: string) => {
    const result = await authApi.login(email, password);
    const next = { token: result.token, role: result.user.role, email: result.user.email };
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    setAuthToken(next.token);
    setSession(next);
  }, []);

  const signOut = useCallback(() => {
    sessionStorage.removeItem(STORAGE_KEY);
    setAuthToken(null);
    setSession(null);
  }, []);

  const value = useMemo<AdminSession>(
    () => ({
      token: session?.token ?? null,
      role: session?.role ?? null,
      email: session?.email ?? null,
      signIn,
      signOut,
    }),
    [session, signIn, signOut],
  );

  return <AdminAuthContext.Provider value={value}>{children}</AdminAuthContext.Provider>;
}

export function useAdminSession(): AdminSession {
  const context = useContext(AdminAuthContext);
  if (!context) throw new Error('useAdminSession must be used inside AdminAuthProvider');
  return context;
}

export function AdminLogin() {
  const { signIn } = useAdminSession();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await signIn(email, password);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Sign in failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="admin-login">
      <h1>Curator sign in</h1>
      <p className="prose">The source library console. Requires a curator or admin account.</p>
      <form onSubmit={submit}>
        <label>
          Email
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            autoComplete="username"
            required
          />
        </label>
        <label>
          Password
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="current-password"
            required
          />
        </label>
        {error && <p className="admin-error">{error}</p>}
        <button className="button" type="submit" disabled={busy}>
          {busy ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </div>
  );
}
