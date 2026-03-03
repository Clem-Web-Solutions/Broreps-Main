import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from 'react-router';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ToastProvider } from './contexts/ToastContext';
import DashboardLayout from './layouts/DashboardLayout';
import Dashboard from './pages/Dashboard';
import ModulePage from './pages/ModulePage';
import HubPage from './pages/HubPage';
import ForumCategoryPage from './pages/ForumCategoryPage';
import SubscriptionPage from './pages/SubscriptionPage';
import NotesPage from './pages/NotesPage';
import LoginPage from './pages/LoginPage';
import SetupPasswordPage from './pages/SetupPasswordPage';
import ResourcesPage from './pages/ResourcesPage';
import ProfilePage from './pages/ProfilePage';
import SettingsPage from './pages/SettingsPage';
import { Crown } from 'lucide-react';

// Guard – redirects to /login when unauthenticated
function RequireAuth() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Crown className="w-8 h-8 text-[#00A336] animate-pulse" />
          <span className="text-[#52525b] text-sm font-medium">Chargement…</span>
        </div>
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  // Block access if subscription is cancelled or expired
  if (['cancelled', 'expired'].includes(user.subscription_status)) {
    return <SubscriptionExpiredPage />;
  }

  return <Outlet />;
}

// Shown when subscription is inactive
function SubscriptionExpiredPage() {
  const { logout } = useAuth();
  return (
    <div className="min-h-screen bg-black flex items-center justify-center px-6">
      <div className="max-w-[400px] text-center flex flex-col items-center gap-6">
        <span className="text-[56px]">⏸️</span>
        <h1 className="text-white text-[24px] font-black">Abonnement inactif</h1>
        <p className="text-[#71717a] text-[14px] leading-relaxed">
          Ton accès au SaaS BroReps est suspendu. Pour reprendre l'accès, renouvelle ton abonnement.
        </p>
        <a
          href="https://broreps.fr"
          className="px-6 py-3 bg-[#00A336] text-white font-bold rounded-xl hover:bg-[#00BF3F] transition-colors"
        >
          Reprendre mon abonnement
        </a>
        <button onClick={logout} className="text-[#52525b] text-[13px] hover:text-[#a1a1aa] transition-colors cursor-pointer">
          Se déconnecter
        </button>
      </div>
    </div>
  );
}

function AppRoutes() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/setup-password" element={<SetupPasswordPage />} />

      {/* Protected */}
      <Route element={<RequireAuth />}>
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
      </Route>

      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <Router>
          <AppRoutes />
        </Router>
      </AuthProvider>
    </ToastProvider>
  );
}