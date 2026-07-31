import { type ReactNode, useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Brain, LayoutDashboard, FileText, Target, Briefcase, Bookmark, Settings, LogOut, Users, BarChart3, Menu, X, User2, Repeat, Shield, Sun, Moon } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { ChatAssistant } from '@/components/ChatAssistant';
import { api } from '@/lib/api-client';

export function AppShell({ children, activeModule }: { children: ReactNode; activeModule: string }) {
  const { profile, activeRole, setActiveRole, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('theme');
      if (saved) return saved === 'dark';
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  });

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDarkMode]);

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
    // Upgrade profile to 'both' if not already
    if (profile.role !== 'both') {
      await api.put('/api/v1/auth/me', { role: 'both' });
    }
    setActiveRole(newRole);
    setSidebarOpen(false);
    navigate('/app/dashboard');
  }

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors">
      {/* Sidebar - Desktop */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 lg:flex">
        <SidebarContent
          profile={profile}
          isAdmin={isAdmin}
          isEmployer={isEmployer}
          navItems={navItems}
          activeModule={activeModule}
          location={location}
          onSignOut={handleSignOut}
          onRoleSwitch={handleRoleSwitch}
          canSwitchRole={!isAdmin && (profile?.role === 'both' || true)}
          isDarkMode={isDarkMode}
          setIsDarkMode={setIsDarkMode}
        />
      </aside>

      {/* Sidebar - Mobile */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-slate-900/50" onClick={() => setSidebarOpen(false)} />
          <aside className="absolute inset-y-0 left-0 flex w-64 flex-col bg-white dark:bg-slate-900 animate-slide-in-right">
            <SidebarContent
              profile={profile}
              isAdmin={isAdmin}
              isEmployer={isEmployer}
              navItems={navItems}
              activeModule={activeModule}
              location={location}
              onSignOut={handleSignOut}
              onRoleSwitch={handleRoleSwitch}
              canSwitchRole={!isAdmin && (profile?.role === 'both' || true)}
              onClose={() => setSidebarOpen(false)}
              isDarkMode={isDarkMode}
              setIsDarkMode={setIsDarkMode}
            />
          </aside>
        </div>
      )}

      {/* Main */}
      <div className="flex-1 lg:pl-60">
        {/* Mobile header */}
        <header className="sticky top-0 z-20 flex items-center justify-between border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-3 lg:hidden">
          <button onClick={() => setSidebarOpen(true)} className="btn-ghost p-2 text-slate-600 dark:text-slate-400">
            <Menu className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary-600" />
            <span className="font-semibold text-slate-900 dark:text-white">Synapse</span>
          </div>
          <div className="w-9" />
        </header>

        <main className="p-4 lg:p-8">
          {children}
        </main>
      </div>

      <ChatAssistant activeModule={activeModule} />
    </div>
  );
}

function SidebarContent({ profile, isAdmin, isEmployer, navItems, activeModule, location, onSignOut, onRoleSwitch, canSwitchRole, onClose, isDarkMode, setIsDarkMode }: {
  profile: any;
  isAdmin: boolean;
  isEmployer: boolean;
  navItems: any[];
  activeModule: string;
  location: any;
  onSignOut: () => void;
  onRoleSwitch: () => void;
  canSwitchRole: boolean;
  onClose?: () => void;
  isDarkMode: boolean;
  setIsDarkMode: (val: boolean) => void;
}) {
  const navigate = useNavigate();

  return (
    <>
      <div className={`flex h-16 items-center gap-2 border-b border-slate-200 dark:border-slate-800 px-5 ${isAdmin ? 'bg-red-600 dark:bg-red-700' : ''}`}>
        <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${isAdmin ? 'bg-red-800' : 'bg-primary-600'}`}>
          {isAdmin ? <Shield className="h-5 w-5 text-white" /> : <Brain className="h-5 w-5 text-white" />}
        </div>
        <span className={`text-lg font-bold ${isAdmin ? 'text-white' : 'text-slate-900 dark:text-white'}`}>
          {isAdmin ? 'Admin Panel' : 'Synapse'}
        </span>
        {onClose && (
          <button onClick={onClose} className={`ml-auto lg:hidden ${isAdmin ? 'text-red-200' : 'text-slate-400 dark:text-slate-500'}`}>
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* Role switcher */}
      {canSwitchRole && (
        <div className="px-3 pt-3">
          <button
            onClick={onRoleSwitch}
            className="flex w-full items-center justify-between rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 px-3 py-2 text-xs font-medium text-slate-600 dark:text-slate-400 transition-colors hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <span className="capitalize">{isEmployer ? 'Employer' : 'Seeker'} Mode</span>
            <span className="flex items-center gap-1 text-primary-600 dark:text-primary-400">
              <Repeat className="h-3 w-3" />
              Switch to {isEmployer ? 'Seeker' : 'Employer'}
            </span>
          </button>
        </div>
      )}

      <nav className="flex-1 space-y-1 p-3">
        {navItems.map((item) => {
          const active = location.pathname === item.path || activeModule === item.id;
          return (
            <button
              key={item.id}
              onClick={() => { navigate(item.path); onClose?.(); }}
              className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                active 
                  ? 'bg-primary-50 dark:bg-primary-950/30 text-primary-700 dark:text-primary-400' 
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/50'
              }`}
            >
              <item.icon className={`h-4 w-4 ${active ? 'text-primary-600 dark:text-primary-400' : 'text-slate-400 dark:text-slate-500'}`} />
              {item.label}
            </button>
          );
        })}
      </nav>

      <div className="border-t border-slate-200 dark:border-slate-800 p-3 space-y-1.5">
        {/* Dark Mode Toggle Button */}
        <button
          onClick={() => setIsDarkMode(!isDarkMode)}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          {isDarkMode ? (
            <>
              <Sun className="h-4 w-4 text-amber-500" />
              <span>Light Mode</span>
            </>
          ) : (
            <>
              <Moon className="h-4 w-4 text-indigo-500" />
              <span>Dark Mode</span>
            </>
          )}
        </button>

        <div className="flex items-center gap-3 rounded-lg px-3 py-2 bg-slate-50 dark:bg-slate-800/30 border border-slate-100 dark:border-slate-800/50">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-200 dark:bg-slate-800 flex-shrink-0">
            <User2 className="h-4 w-4 text-slate-500 dark:text-slate-400" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-medium text-slate-900 dark:text-white">{profile?.full_name}</div>
            <div className="truncate text-xs text-slate-500 dark:text-slate-400">{profile?.email}</div>
          </div>
        </div>

        <button onClick={onSignOut} className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-danger-50 dark:hover:bg-danger-950/20 hover:text-danger-600">
          <LogOut className="h-4 w-4 text-slate-400 dark:text-slate-500" />
          Sign Out
        </button>
      </div>
    </>
  );
}
