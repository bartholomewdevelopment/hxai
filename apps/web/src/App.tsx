import { Navigate, Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';
import { HomePage } from './pages/HomePage';
import { PeoplePage } from './pages/PeoplePage';
import { PersonPage } from './pages/PersonPage';
import { ChatPage } from './pages/ChatPage';
import { AboutPage } from './pages/AboutPage';
import { NotFoundPage } from './pages/NotFoundPage';

export function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<HomePage />} />
        <Route path="people" element={<PeoplePage />} />
        <Route path="people/:slug" element={<PersonPage />} />
        <Route path="people/:slug/chat" element={<ChatPage />} />
        <Route path="about" element={<AboutPage />} />
        {/* Conversation URLs get their real shape in Phase 3. */}
        <Route path="chat" element={<Navigate to="/people" replace />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
