import { useEffect, useState } from 'react';
import {
  Users, Briefcase, FileText, BarChart3, Activity, Shield,
  Trash2, ToggleLeft, ToggleRight, AlertCircle, CheckCircle2,
  TrendingUp, Clock, ArrowUp, Search
} from 'lucide-react';
import { api } from '@/lib/api-client';
import { GlassmorphicCard } from '@/components/GlassmorphicCard';

interface AdminStats {
  total_users: number;
  total_seekers: number;
  total_employers: number;
  total_jobs: number;
  active_jobs: number;
  total_resumes: number;
  total_applications: number;
  total_matches: number;
  average_match_score: number;
}

interface AdminUser {
  id: string;
  email: string;
  full_name: string;
  role: string;
  company_name: string | null;
  is_active: boolean;
  created_at: string | null;
}

interface AdminJob {
  id: string;
  title: string;
  employer_name: string;
  company_name: string;
  location: string | null;
  is_remote: boolean;
  job_type: string | null;
  status: string;
  applications_count: number;
  created_at: string | null;
}

interface RecentActivity {
  id: string;
  seeker_name: string;
  seeker_email: string;
  job_title: string;
  status: string;
  match_score: number | null;
  created_at: string | null;
}

type AdminTab = 'overview' | 'users' | 'jobs' | 'activity';

export function AdminDashboard() {
  const [tab, setTab] = useState<AdminTab>('overview');
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [jobs, setJobs] = useState<AdminJob[]>([]);
  const [activity, setActivity] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionMsg, setActionMsg] = useState('');
  const [userSearch, setUserSearch] = useState('');
  const [jobSearch, setJobSearch] = useState('');

  useEffect(() => { loadAll(); }, []);

  async function loadAll() {
    setLoading(true);
    setError('');
    try {
      const [s, u, j, a] = await Promise.all([
        api.get<AdminStats>('/api/v1/admin/stats'),
        api.get<{ items: AdminUser[] }>('/api/v1/admin/users'),
        api.get<{ items: AdminJob[] }>('/api/v1/admin/jobs'),
        api.get<{ items: RecentActivity[] }>('/api/v1/admin/activity'),
      ]);
      setStats(s); setUsers(u.items); setJobs(j.items); setActivity(a.items);
    } catch (e: any) {
      setError(e.message || 'Failed to load admin data');
    } finally {
      setLoading(false);
    }
  }

  async function toggleUserStatus(user: AdminUser) {
    try {
      await api.put(`/api/v1/admin/users/${user.id}/status?is_active=${!user.is_active}`, {});
      setUsers(prev => prev.map(u => u.id === user.id ? { ...u, is_active: !u.is_active } : u));
      setActionMsg(`${user.full_name} ${!user.is_active ? 'activated' : 'deactivated'}.`);
      setTimeout(() => setActionMsg(''), 3000);
    } catch (e: any) { setError(e.message); }
  }

  async function deleteUser(user: AdminUser) {
    if (!confirm(`Delete user "${user.full_name}"? This cannot be undone.`)) return;
    try {
      await api.delete(`/api/v1/admin/users/${user.id}`);
      setUsers(prev => prev.filter(u => u.id !== user.id));
      setActionMsg(`User "${user.full_name}" deleted.`);
      setTimeout(() => setActionMsg(''), 3000);
    } catch (e: any) { setError(e.message); }
  }

  async function deleteJob(job: AdminJob) {
    if (!confirm(`Delete job posting "${job.title}"? This cannot be undone.`)) return;
    try {
      await api.delete(`/api/v1/admin/jobs/${job.id}`);
      setJobs(prev => prev.filter(j => j.id !== job.id));
      setActionMsg(`Job "${job.title}" deleted.`);
      setTimeout(() => setActionMsg(''), 3000);
    } catch (e: any) { setError(e.message); }
  }

  const roleColor: Record<string, string> = {
    admin: 'bg-red-500', employer: 'bg-violet-500', seeker: 'bg-cyan-500', both: 'bg-emerald-500',
  };
  const roleBadge: Record<string, string> = {
    admin: 'bg-red-500/20 text-red-400 border border-red-500/30',
    employer: 'bg-violet-500/20 text-violet-400 border border-violet-500/30',
    seeker: 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30',
    both: 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30',
  };
  const statusBadge: Record<string, string> = {
    applied: 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30',
    shortlisted: 'bg-amber-500/20 text-amber-400 border border-amber-500/30',
    rejected: 'bg-red-500/20 text-red-400 border border-red-500/30',
    hired: 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30',
  };

  const filteredUsers = users.filter(u =>
    u.full_name.toLowerCase().includes(userSearch.toLowerCase()) ||
    u.email.toLowerCase().includes(userSearch.toLowerCase())
  );
  const filteredJobs = jobs.filter(j =>
    j.title.toLowerCase().includes(jobSearch.toLowerCase()) ||
    j.employer_name.toLowerCase().includes(jobSearch.toLowerCase())
  );

  if (loading) {
    return <div className="flex h-64 items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-700 border-t-red-400" />
    </div>;
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-red-500/20">
            <Shield className="h-5 w-5 text-red-400" />
          </div>
          <div>
            <h1 className="font-mono text-3xl font-bold text-white">Admin Dashboard</h1>
            <p className="text-sm text-slate-400">Platform control center</p>
          </div>
        </div>
        <button onClick={loadAll} className="btn-secondary">
          <Activity className="h-4 w-4 mr-1" /> Refresh
        </button>
      </div>

      {/* Alerts */}
      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          <AlertCircle className="h-4 w-4 flex-shrink-0" /> {error}
        </div>
      )}
      {actionMsg && (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-400">
          <CheckCircle2 className="h-4 w-4 flex-shrink-0" /> {actionMsg}
        </div>
      )}

      {/* Stat Cards */}
      {stats && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[
            { label: 'Users', value: stats.total_users, sub: `${stats.total_seekers} seekers`, icon: Users, bg: 'bg-cyan-500', glow: 'rgba(6,182,212,0.3)' },
            { label: 'Job Postings', value: stats.total_jobs, sub: `${stats.active_jobs} active`, icon: Briefcase, bg: 'bg-violet-500', glow: 'rgba(139,92,246,0.3)' },
            { label: 'Applications', value: stats.total_applications, sub: `${stats.total_matches} matches`, icon: FileText, bg: 'bg-amber-500', glow: 'rgba(245,158,11,0.3)' },
            { label: 'Avg Match Score', value: `${stats.average_match_score}%`, sub: 'Platform average', icon: BarChart3, bg: 'bg-emerald-500', glow: 'rgba(16,185,129,0.3)' },
          ].map(card => (
            <div key={card.label} className={`relative overflow-hidden rounded-xl ${card.bg} p-5 text-white shadow-sm`} style={{ boxShadow: `0 0 30px ${card.glow}` }}>
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-sm font-medium text-white/80">{card.label}</div>
                  <div className="mt-1 text-3xl font-bold font-mono">{card.value}</div>
                  <div className="mt-1 flex items-center gap-1 text-xs text-white/70">
                    <ArrowUp className="h-3 w-3" /> {card.sub}
                  </div>
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/20">
                  <card.icon className="h-5 w-5" />
                </div>
              </div>
              <div className="absolute -bottom-4 -right-4 h-24 w-24 rounded-full bg-white/10" />
            </div>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-slate-800">
        <nav className="-mb-px flex gap-6">
          {([
            { id: 'overview' as AdminTab, label: 'Overview', icon: BarChart3 },
            { id: 'users' as AdminTab, label: `Users (${users.length})`, icon: Users },
            { id: 'jobs' as AdminTab, label: `Jobs (${jobs.length})`, icon: Briefcase },
            { id: 'activity' as AdminTab, label: 'Activity', icon: Activity },
          ]).map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 border-b-2 px-1 py-3 text-sm font-medium transition-colors ${
                tab === t.id ? 'border-red-500 text-red-400' : 'border-transparent text-slate-500 hover:border-slate-600 hover:text-slate-300'
              }`}>
              <t.icon className="h-4 w-4" /> {t.label}
            </button>
          ))}
        </nav>
      </div>

      {/* OVERVIEW TAB */}
      {tab === 'overview' && stats && (
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <GlassmorphicCard className="p-6">
            <h3 className="text-sm font-semibold text-white mb-4">User Role Breakdown</h3>
            <div className="space-y-5">
              {[
                { label: 'Job Seekers', count: stats.total_seekers, total: stats.total_users, color: 'bg-cyan-500' },
                { label: 'Employers', count: stats.total_employers, total: stats.total_users, color: 'bg-violet-500' },
                { label: 'Admins', count: users.filter(u => u.role === 'admin').length, total: stats.total_users, color: 'bg-red-500' },
              ].map(bar => (
                <div key={bar.label}>
                  <div className="mb-2 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`h-3 w-3 rounded-full ${bar.color}`} />
                      <span className="text-sm font-medium text-slate-300">{bar.label}</span>
                    </div>
                    <span className="text-sm font-semibold text-white">{bar.count}</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-slate-800">
                    <div className={`h-full rounded-full ${bar.color} transition-all`} style={{ width: bar.total > 0 ? `${(bar.count / bar.total) * 100}%` : '0%' }} />
                  </div>
                </div>
              ))}
            </div>
          </GlassmorphicCard>

          <GlassmorphicCard className="p-6">
            <h3 className="text-sm font-semibold text-white mb-4">Platform Statistics</h3>
            <div className="grid grid-cols-2 gap-4">
              {[
                { label: 'Total Resumes', value: stats.total_resumes, icon: FileText, color: 'text-cyan-400 bg-cyan-500/20' },
                { label: 'Total Matches', value: stats.total_matches, icon: BarChart3, color: 'text-amber-400 bg-amber-500/20' },
                { label: 'Active Jobs', value: stats.active_jobs, icon: Briefcase, color: 'text-emerald-400 bg-emerald-500/20' },
                { label: 'Employers', value: stats.total_employers, icon: Users, color: 'text-violet-400 bg-violet-500/20' },
              ].map(item => (
                <div key={item.label} className="rounded-xl border border-slate-700/50 bg-slate-800/30 p-4">
                  <div className={`mb-3 inline-flex h-9 w-9 items-center justify-center rounded-lg ${item.color}`}>
                    <item.icon className="h-4 w-4" />
                  </div>
                  <div className="text-2xl font-bold font-mono text-white">{item.value}</div>
                  <div className="text-xs text-slate-500">{item.label}</div>
                </div>
              ))}
            </div>
          </GlassmorphicCard>

          <GlassmorphicCard className="p-6 xl:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-white">Recent Applications</h3>
              <button onClick={() => setTab('activity')} className="text-xs font-medium text-cyan-400 hover:text-cyan-300">View all →</button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-700/50">
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Applicant</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Job</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Score</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {activity.slice(0, 5).map(a => (
                    <tr key={a.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-700 text-xs font-semibold text-slate-300">{a.seeker_name[0]}</div>
                          <div>
                            <div className="font-medium text-white">{a.seeker_name}</div>
                            <div className="text-xs text-slate-500">{a.seeker_email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-300">{a.job_title}</td>
                      <td className="px-4 py-3">
                        {a.match_score !== null ? (
                          <span className="badge bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">{a.match_score.toFixed(0)}%</span>
                        ) : <span className="text-slate-600">—</span>}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`badge capitalize ${statusBadge[a.status] || 'bg-slate-700/50 text-slate-400 border border-slate-600/50'}`}>{a.status}</span>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500">{a.created_at ? new Date(a.created_at).toLocaleDateString() : '—'}</td>
                    </tr>
                  ))}
                  {activity.length === 0 && <tr><td colSpan={5} className="px-4 py-8 text-center text-sm text-slate-500">No activity yet.</td></tr>}
                </tbody>
              </table>
            </div>
          </GlassmorphicCard>
        </div>
      )}

      {/* USERS TAB */}
      {tab === 'users' && (
        <GlassmorphicCard className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-white">User Management</h3>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <input type="text" placeholder="Search users..." value={userSearch} onChange={(e) => setUserSearch(e.target.value)}
                className="rounded-lg border border-slate-700 bg-slate-800/50 py-2 pl-9 pr-4 text-sm text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500" />
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-700/50">
                  {['User', 'Role', 'Company', 'Joined', 'Status', 'Actions'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {filteredUsers.map(u => (
                  <tr key={u.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold text-white ${roleColor[u.role] || 'bg-slate-600'}`}>{u.full_name[0]}</div>
                        <div>
                          <div className="font-medium text-white">{u.full_name}</div>
                          <div className="text-xs text-slate-500">{u.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3"><span className={`badge capitalize ${roleBadge[u.role]}`}>{u.role}</span></td>
                    <td className="px-4 py-3 text-slate-300">{u.company_name || '—'}</td>
                    <td className="px-4 py-3 text-xs text-slate-500">{u.created_at ? new Date(u.created_at).toLocaleDateString() : '—'}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <div className={`h-2 w-2 rounded-full ${u.is_active ? 'bg-emerald-500' : 'bg-red-500'}`} />
                        <span className={`text-xs font-medium ${u.is_active ? 'text-emerald-400' : 'text-red-400'}`}>{u.is_active ? 'Active' : 'Inactive'}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1">
                        <button onClick={() => toggleUserStatus(u)} title={u.is_active ? 'Deactivate' : 'Activate'}
                          className={`rounded-lg p-1.5 transition-colors ${u.is_active ? 'text-amber-400 hover:bg-amber-500/20' : 'text-emerald-400 hover:bg-emerald-500/20'}`}>
                          {u.is_active ? <ToggleRight className="h-5 w-5" /> : <ToggleLeft className="h-5 w-5" />}
                        </button>
                        {u.role !== 'admin' && (
                          <button onClick={() => deleteUser(u)} title="Delete user" className="rounded-lg p-1.5 text-red-400 transition-colors hover:bg-red-500/20">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredUsers.length === 0 && <p className="py-8 text-center text-sm text-slate-500">No users found.</p>}
          </div>
        </GlassmorphicCard>
      )}

      {/* JOBS TAB */}
      {tab === 'jobs' && (
        <GlassmorphicCard className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-white">Job Postings</h3>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <input type="text" placeholder="Search jobs..." value={jobSearch} onChange={(e) => setJobSearch(e.target.value)}
                className="rounded-lg border border-slate-700 bg-slate-800/50 py-2 pl-9 pr-4 text-sm text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500" />
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-700/50">
                  {['Job Title', 'Employer', 'Location', 'Type', 'Status', 'Apps', 'Actions'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {filteredJobs.map(j => (
                  <tr key={j.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="px-4 py-3 font-medium text-white">{j.title}</td>
                    <td className="px-4 py-3"><div className="text-slate-300">{j.employer_name}</div><div className="text-xs text-slate-500">{j.company_name}</div></td>
                    <td className="px-4 py-3 text-slate-300">{j.location || '—'}{j.is_remote && <span className="ml-1 text-xs text-cyan-400">(Remote)</span>}</td>
                    <td className="px-4 py-3 capitalize text-slate-300">{j.job_type?.replace('_', ' ') || '—'}</td>
                    <td className="px-4 py-3"><span className={`badge ${j.status === 'active' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-slate-700/50 text-slate-400 border border-slate-600/50'}`}>{j.status}</span></td>
                    <td className="px-4 py-3"><span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-800 text-xs font-semibold text-slate-300">{j.applications_count}</span></td>
                    <td className="px-4 py-3 text-center">
                      <button onClick={() => deleteJob(j)} title="Delete job" className="rounded-lg p-1.5 text-red-400 transition-colors hover:bg-red-500/20">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredJobs.length === 0 && <p className="py-8 text-center text-sm text-slate-500">No job postings found.</p>}
          </div>
        </GlassmorphicCard>
      )}

      {/* ACTIVITY TAB */}
      {tab === 'activity' && (
        <GlassmorphicCard className="p-6">
          <h3 className="text-sm font-semibold text-white mb-4">Application Activity</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-700/50">
                  {['Applicant', 'Applied For', 'Match Score', 'Status', 'Applied On'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {activity.map(a => (
                  <tr key={a.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-700 text-xs font-semibold text-slate-300">{a.seeker_name[0]}</div>
                        <div>
                          <div className="font-medium text-white">{a.seeker_name}</div>
                          <div className="text-xs text-slate-500">{a.seeker_email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-300">{a.job_title}</td>
                    <td className="px-4 py-3">
                      {a.match_score !== null ? <span className="badge bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">{a.match_score.toFixed(1)}%</span> : <span className="text-slate-600">—</span>}
                    </td>
                    <td className="px-4 py-3"><span className={`badge capitalize ${statusBadge[a.status] || 'bg-slate-700/50 text-slate-400 border border-slate-600/50'}`}>{a.status}</span></td>
                    <td className="px-4 py-3 text-xs text-slate-500">
                      <div className="flex items-center gap-1"><Clock className="h-3 w-3" />{a.created_at ? new Date(a.created_at).toLocaleDateString() : '—'}</div>
                    </td>
                  </tr>
                ))}
                {activity.length === 0 && <tr><td colSpan={5} className="px-4 py-8 text-center text-sm text-slate-500">No application activity yet.</td></tr>}
              </tbody>
            </table>
          </div>
        </GlassmorphicCard>
      )}
    </div>
  );
}
