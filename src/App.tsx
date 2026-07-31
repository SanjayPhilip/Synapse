import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { AppShell } from '@/components/AppShell';
import { LandingPage } from '@/pages/LandingPage';
import { LoginPage } from '@/pages/LoginPage';
import { RegisterPage } from '@/pages/RegisterPage';
import { SeekerDashboard } from '@/pages/seeker/SeekerDashboard';
import { ResumePage } from '@/pages/seeker/ResumePage';
import { MatchScorePage } from '@/pages/seeker/MatchScorePage';
import { JobFeedPage } from '@/pages/seeker/JobFeedPage';
import { ApplicationsPage } from '@/pages/seeker/ApplicationsPage';
import { EmployerDashboard } from '@/pages/employer/EmployerDashboard';
import { PostingsPage } from '@/pages/employer/PostingsPage';
import { ApplicantsPage } from '@/pages/employer/ApplicantsPage';
import { AnalyticsPage } from '@/pages/employer/AnalyticsPage';
import { AdminDashboard } from '@/pages/admin/AdminDashboard';
import { SettingsPage } from '@/pages/SettingsPage';
import { Spinner } from '@/components/ui';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { session, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner size={32} />
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}

function AppRoutes() {
  const { profile, loading } = useAuth();
  const location = useLocation();
  const activeRole = profile?.role || 'seeker';
  const isAdmin = profile?.role === 'admin';
  const isEmployer = activeRole === 'employer';

  // Determine active module from path
  const path = location.pathname;
  const moduleMap: Record<string, string> = {
    '/app/dashboard': 'dashboard',
    '/app/resume': 'resume',
    '/app/match': 'match',
    '/app/jobs': 'jobs',
    '/app/applications': 'applications',
    '/app/postings': 'postings',
    '/app/applicants': 'applicants',
    '/app/analytics': 'analytics',
    '/app/settings': 'settings',
    '/app/admin': 'admin',
  };
  const activeModule = moduleMap[path] || 'dashboard';

  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register/seeker" element={<RegisterPage role="seeker" />} />
      <Route path="/register/employer" element={<RegisterPage role="employer" />} />

      <Route path="/app" element={
        <ProtectedRoute>
          <AppShell activeModule={activeModule}>
            <Navigate to={isAdmin ? '/app/admin' : '/app/dashboard'} replace />
          </AppShell>
        </ProtectedRoute>
      } />

      {/* Admin routes */}
      <Route path="/app/admin" element={
        <ProtectedRoute>
          <AppShell activeModule="admin">
            <AdminDashboard />
          </AppShell>
        </ProtectedRoute>
      } />

      {/* Seeker routes */}
      <Route path="/app/dashboard" element={
        <ProtectedRoute>
          <AppShell activeModule="dashboard">
            {isEmployer ? <EmployerDashboard /> : <SeekerDashboard />}
          </AppShell>
        </ProtectedRoute>
      } />
      <Route path="/app/resume" element={
        <ProtectedRoute>
          <AppShell activeModule="resume">
            <ResumePage />
          </AppShell>
        </ProtectedRoute>
      } />
      <Route path="/app/match" element={
        <ProtectedRoute>
          <AppShell activeModule="match">
            <MatchScorePage />
          </AppShell>
        </ProtectedRoute>
      } />
      <Route path="/app/jobs" element={
        <ProtectedRoute>
          <AppShell activeModule="jobs">
            <JobFeedPage />
          </AppShell>
        </ProtectedRoute>
      } />
      <Route path="/app/applications" element={
        <ProtectedRoute>
          <AppShell activeModule="applications">
            <ApplicationsPage />
          </AppShell>
        </ProtectedRoute>
      } />

      {/* Employer routes */}
      <Route path="/app/postings" element={
        <ProtectedRoute>
          <AppShell activeModule="postings">
            <PostingsPage />
          </AppShell>
        </ProtectedRoute>
      } />
      <Route path="/app/applicants" element={
        <ProtectedRoute>
          <AppShell activeModule="applicants">
            <ApplicantsPage />
          </AppShell>
        </ProtectedRoute>
      } />
      <Route path="/app/analytics" element={
        <ProtectedRoute>
          <AppShell activeModule="analytics">
            <AnalyticsPage />
          </AppShell>
        </ProtectedRoute>
      } />

      {/* Shared */}
      <Route path="/app/settings" element={
        <ProtectedRoute>
          <AppShell activeModule="settings">
            <SettingsPage />
          </AppShell>
        </ProtectedRoute>
      } />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
