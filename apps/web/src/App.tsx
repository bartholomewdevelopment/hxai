import { Navigate, Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';
import { HomePage } from './pages/HomePage';
import { PeoplePage } from './pages/PeoplePage';
import { PersonPage } from './pages/PersonPage';
import { ChatPage } from './pages/ChatPage';
import { SourcePage } from './pages/SourcePage';
import { AboutPage } from './pages/AboutPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { AdminAuthProvider, AdminLogin, useAdminSession } from './pages/admin/AdminAuth';
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { AdminSourcePage } from './pages/admin/AdminSourcePage';

/**
 * Client-side gate only — a convenience so an unauthenticated curator sees a
 * login form instead of a wall of failed requests. Every admin route is
 * enforced server-side; nothing here grants access.
 */
function RequireCurator({ children }: { children: React.ReactNode }) {
  const { token } = useAdminSession();
  return token ? <>{children}</> : <AdminLogin />;
}

export function App() {
  return (
    <AdminAuthProvider>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<HomePage />} />
          <Route path="people" element={<PeoplePage />} />
          <Route path="people/:slug" element={<PersonPage />} />
          <Route path="people/:slug/chat" element={<ChatPage />} />
          <Route path="sources/:id" element={<SourcePage />} />
          <Route path="about" element={<AboutPage />} />

          <Route
            path="admin"
            element={
              <RequireCurator>
                <AdminDashboard />
              </RequireCurator>
            }
          />
          <Route
            path="admin/sources/:id"
            element={
              <RequireCurator>
                <AdminSourcePage />
              </RequireCurator>
            }
          />

          {/* Conversation URLs get their real shape in Phase 3. */}
          <Route path="chat" element={<Navigate to="/people" replace />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </AdminAuthProvider>
  );
}
