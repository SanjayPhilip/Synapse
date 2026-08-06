import { type ReactNode, useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Brain, LayoutDashboard, FileText, Target, Briefcase, Bookmark, Settings, LogOut, Users, BarChart3, Menu, X, User2, Repeat, Shield, Bell, BellRing, Sun, Moon } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { ChatAssistant } from '@/components/ChatAssistant';
import { NotificationBell } from '@/components/NotificationBell';
import { OnboardingBanner } from '@/components/OnboardingBanner';
import { api } from '@/lib/api-client';
import { useTheme } from '@/lib/theme';

export function AppShell({ children, activeModule }: { children: ReactNode; activeModule: string }) {
  const { profile, activeRole, setActiveRole, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { theme, toggleTheme } = useTheme();

  const isAdmin = profile?.role === 'admin';
  const isEmployer = activeRole === 'employer';

  const adminNav = [
    { id: 'admin', label: 'Control Panel', icon: Shield, path: '/app/admin' },
  ];

  const seekerNav = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, path: '/app/dashboard' },
    { id: 'resume', label: 'My Resume', icon: FileText, path: '/app/resume' },
    { id: 'match', label: 'Match Score', icon: Target, path: '/app/match' },
    { id: 'jobs', label: 'Job Feed', icon: Briefcase, path: '/app/jobs' },
    { id: 'applications', label: 'Applications', icon: Bookmark, path: '/app/applications' },
    { id: 'alerts', label: 'Job Alerts', icon: BellRing, path: '/app/alerts' },
    { id: 'settings', label: 'Settings', icon: Settings, path: '/app/settings' },
  ];

  const employerNav = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, path: '/app/dashboard' },
    { id: 'postings', label: 'My Postings', icon: Briefcase, path: '/app/postings' },
    { id: 'applicants', label: 'Applicants', icon: Users, path: '/app/applicants' },
    { id: 'analytics', label: 'Analytics', icon: BarChart3, path: '/app/analytics' },
    { id: 'settings', label: 'Settings', icon: Settings, path: '/app/settings' },
  ];

  const navItems = isAdmin ? adminNav : isEmployer ? employerNav : seekerNav;

  async function handleSignOut() {
    await signOut();
    navigate('/');
  }

  async function handleRoleSwitch() {
    if (!profile) return;
    const newRole = isEmployer ? 'seeker' : 'employer';
    if (profile.role !== 'both') {
      await api.put('/api/v1/auth/me', { role: 'both' });
    }
    setActiveRole(newRole);
    setSidebarOpen(false);
    navigate('/app/dashboard');
  }

  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-50">
      {/* Sidebar - Desktop */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-slate-800/50 bg-slate-900/80 backdrop-blur-xl lg:flex">
        <SidebarContent
          profile={profile}
          isAdmin={isAdmin}
          isEmployer={isEmployer}
          navItems={navItems}
          activeModule={activeModule}
          location={location}
          theme={theme}
          onToggleTheme={toggleTheme}
          onSignOut={handleSignOut}
          onRoleSwitch={handleRoleSwitch}
          canSwitchRole={!isAdmin && (profile?.role === 'both' || true)}
        />
      </aside>

      {/* Sidebar - Mobile */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
          <aside className="absolute inset-y-0 left-0 flex w-64 flex-col bg-slate-900 border-r border-slate-800/50 animate-slide-in-right">
            <SidebarContent
              profile={profile}
              isAdmin={isAdmin}
              isEmployer={isEmployer}
              navItems={navItems}
              activeModule={activeModule}
              location={location}
              theme={theme}
              onToggleTheme={toggleTheme}
              onSignOut={handleSignOut}
              onRoleSwitch={handleRoleSwitch}
              canSwitchRole={!isAdmin && (profile?.role === 'both' || true)}
              onClose={() => setSidebarOpen(false)}
            />
          </aside>
        </div>
      )}

      {/* Main */}
      <div className="flex-1 lg:pl-64">
        {/* Desktop header */}
        <header className="sticky top-0 z-20 hidden items-center justify-between gap-2 border-b border-slate-800/50 bg-slate-900/80 px-6 py-3 backdrop-blur-xl lg:flex">
          <div className="flex-1">
            {!isAdmin && (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const q = (e.currentTarget.elements.namedItem('q') as HTMLInputElement)?.value.trim();
                  const target = isEmployer ? '/app/applicants' : '/app/jobs';
                  navigate(q ? `${target}?q=${encodeURIComponent(q)}` : target);
                }}
                className="max-w-md"
              >
                <input
                  name="q"
                  type="text"
                  placeholder={isEmployer ? 'Search applicants...' : 'Search jobs...'}
                  className="w-full rounded-lg border border-slate-700/50 bg-slate-800/50 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                />
              </form>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button onClick={toggleTheme} className="btn-ghost p-2 text-slate-400" aria-label="Toggle theme">
              {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
            <NotificationBell />
          </div>
        </header>

        {/* Mobile header */}
        <header className="sticky top-0 z-20 flex items-center justify-between border-b border-slate-800/50 bg-slate-900/80 backdrop-blur-xl px-4 py-3 lg:hidden">
          <button onClick={() => setSidebarOpen(true)} className="btn-ghost p-2 text-slate-400">
            <Menu className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center">
              <Brain className="w-3 h-3 text-slate-950" />
            </div>
            <span className="font-mono font-bold text-white">SYNAPSE</span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={toggleTheme} className="btn-ghost p-2 text-slate-400">
              {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
            <NotificationBell />
          </div>
        </header>

        <main className="p-4 lg:p-8">
          <OnboardingBanner />
          {children}
        </main>
      </div>

      <ChatAssistant activeModule={activeModule} />
    </div>
  );
}

function SidebarContent({ profile, isAdmin, isEmployer, navItems, activeModule, location, theme, onToggleTheme, onSignOut, onRoleSwitch, canSwitchRole, onClose }: {
  profile: any;
  isAdmin: boolean;
  isEmployer: boolean;
  navItems: any[];
  activeModule: string;
  location: any;
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
  onSignOut: () => void;
  onRoleSwitch: () => void;
  canSwitchRole: boolean;
  onClose?: () => void;
}) {
  const navigate = useNavigate();

  return (
    <>
      <div className={`flex h-16 items-center gap-2 border-b border-slate-800/50 px-5 ${isAdmin ? 'bg-gradient-to-r from-red-600 to-red-700' : ''}`}>
        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${isAdmin ? 'bg-red-800' : 'bg-gradient-to-br from-cyan-400 to-blue-500'}`}>
          {isAdmin ? <Shield className="h-4 w-4 text-white" /> : <Brain className="h-4 w-4 text-slate-950" />}
        </div>
        <span className={`font-mono font-bold ${isAdmin ? 'text-white' : 'text-white'}`}>
          {isAdmin ? 'ADMIN' : 'SYNAPSE'}
        </span>
        {onClose && (
          <button onClick={onClose} className="ml-auto lg:hidden text-slate-400 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* Role switcher */}
      {canSwitchRole && (
        <div className="px-3 pt-4">
          <button
            onClick={onRoleSwitch}
            className="flex w-full items-center justify-between rounded-lg bg-slate-800/50 border border-slate-700/50 px-3 py-2.5 text-xs font-medium text-slate-300 transition-all hover:bg-slate-800 hover:border-slate-600"
          >
            <span className="capitalize">{isEmployer ? 'Employer' : 'Seeker'} Mode</span>
            <span className="flex items-center gap-1 text-cyan-400">
              <Repeat className="h-3 w-3" />
              Switch
            </span>
          </button>
        </div>
      )}

      <nav className="min-h-0 flex-1 space-y-1 overflow-y-auto p-3 mt-2">
        {navItems.map((item) => {
          const active = location.pathname === item.path || activeModule === item.id || location.pathname.startsWith(item.path);
          return (
            <button
              key={item.id}
              onClick={() => { navigate(item.path); onClose?.(); }}
              className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all ${
                active
                  ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'
                  : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200 border border-transparent'
              }`}
            >
              <item.icon className={`h-4 w-4 ${active ? 'text-cyan-400' : 'text-slate-500'}`} />
              {item.label}
            </button>
          );
        })}
      </nav>

      <div className="border-t border-slate-800/50 p-3 space-y-2">
        <div className="flex items-center gap-3 rounded-lg px-3 py-2.5 bg-slate-800/30 border border-slate-700/30">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-cyan-400/20 to-blue-500/20 border border-slate-700/50 flex-shrink-0">
            <User2 className="h-4 w-4 text-cyan-400" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-medium text-white">{profile?.full_name}</div>
            <div className="truncate text-xs text-slate-500">{profile?.email}</div>
          </div>
        </div>

        <button
          onClick={onToggleTheme}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-400 hover:bg-slate-800/50 hover:text-slate-200 transition-all border border-transparent hover:border-slate-700/50"
        >
          {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
        </button>

        <button
          onClick={onSignOut}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-400 hover:bg-red-500/10 hover:text-red-400 transition-all border border-transparent hover:border-red-500/20"
        >
          <LogOut className="h-4 w-4" />
          Sign Out
        </button>
      </div>
    </>
  );
}
