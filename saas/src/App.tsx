import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router';
import DashboardLayout from './layouts/DashboardLayout';
import Dashboard from './pages/Dashboard';
import ModulePage from './pages/ModulePage';
import HubPage from './pages/HubPage';
import ForumCategoryPage from './pages/ForumCategoryPage';
import SubscriptionPage from './pages/SubscriptionPage';
import NotesPage from './pages/NotesPage';
import ResourcesPage from './pages/ResourcesPage';
import ProfilePage from './pages/ProfilePage';
import SettingsPage from './pages/SettingsPage';

function App() {
  return (
    <Router>
      <Routes>
        <Route element={<DashboardLayout />}>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/module/:id" element={<ModulePage />} />
          <Route path="/hub" element={<HubPage />} />
          <Route path="/forum/:id" element={<ForumCategoryPage />} />
          <Route path="/subscription" element={<SubscriptionPage />} />
          <Route path="/notes" element={<NotesPage />} />
          <Route path="/resources" element={<ResourcesPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
