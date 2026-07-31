import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users, Briefcase, FileText, BarChart3, Activity, Shield,
  Trash2, ToggleLeft, ToggleRight, AlertCircle, CheckCircle2,
  TrendingUp, Clock, UserCheck, UserX
} from 'lucide-react';
import { api } from '@/lib/api-client';

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
  const navigate = useNavigate();
  const [tab, setTab] = useState<AdminTab>('overview');
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [jobs, setJobs] = useState<AdminJob[]>([]);
  const [activity, setActivity] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionMsg, setActionMsg] = useState('');

  useEffect(() => {
    loadAll();
  }, []);

  async function loadAll() {
    setLoading(true);
    setError('');
    try {
      const [s, u, j, a] = await Promise.all([
        api.get<AdminStats>('/api/v1/admin/stats'),
        api.get<AdminUser[]>('/api/v1/admin/users'),
        api.get<AdminJob[]>('/api/v1/admin/jobs'),
        api.get<RecentActivity[]>('/api/v1/admin/activity'),
      ]);
      setStats(s);
      setUsers(u);
      setJobs(j);
      setActivity(a);
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
    } catch (e: any) {
      setError(e.message);
    }
  }

  async function deleteUser(user: AdminUser) {
    if (!confirm(`Delete user "${user.full_name}"? This cannot be undone.`)) return;
    try {
      await api.delete(`/api/v1/admin/users/${user.id}`);
      setUsers(prev => prev.filter(u => u.id !== user.id));
      setActionMsg(`User "${user.full_name}" deleted.`);
      setTimeout(() => setActionMsg(''), 3000);
    } catch (e: any) {
      setError(e.message);
    }
  }

  async function deleteJob(job: AdminJob) {
    if (!confirm(`Delete job posting "${job.title}"? This cannot be undone.`)) return;
    try {
      await api.delete(`/api/v1/admin/jobs/${job.id}`);
      setJobs(prev => prev.filter(j => j.id !== job.id));
      setActionMsg(`Job "${job.title}" deleted.`);
      setTimeout(() => setActionMsg(''), 3000);
    } catch (e: any) {
      setError(e.message);
    }
  }

  const roleColor: Record<string, string> = {
    admin: 'bg-red-100 text-red-700',
    employer: 'bg-accent-100 text-accent-700',
    seeker: 'bg-primary-100 text-primary-700',
    both: 'bg-success-100 text-success-700',
  };

  const statusColor: Record<string, string> = {
    applied: 'bg-primary-100 text-primary-700',
    shortlisted: 'bg-success-100 text-success-700',
    rejected: 'bg-danger-100 text-danger-700',
    hired: 'bg-accent-100 text-accent-700',
  };

  const tabs: { id: AdminTab; label: string; icon: any }[] = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'users', label: `Users (${users.length})`, icon: Users },
    { id: 'jobs', label: `Jobs (${jobs.length})`, icon: Briefcase },
    { id: 'activity', label: 'Activity', icon: Activity },
  ];

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-red-600">
          <Shield className="h-6 w-6 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Admin Control Panel</h1>
          <p className="text-sm text-slate-500">System-wide oversight and management</p>
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <div className="flex items-center gap-2 rounded-lg bg-danger-50 px-4 py-3 text-sm text-danger-700">
          <AlertCircle className="h-4 w-4 flex-shrink-0" /> {error}
        </div>
      )}
      {actionMsg && (
        <div className="flex items-center gap-2 rounded-lg bg-success-50 px-4 py-3 text-sm text-success-700">
          <CheckCircle2 className="h-4 w-4 flex-shrink-0" /> {actionMsg}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 rounded-xl border border-slate-200 bg-slate-50 p-1">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all ${
              tab === t.id
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <t.icon className="h-4 w-4" />
            <span className="hidden sm:inline">{t.label}</span>
          </button>
        ))}
      </div>

      {/* OVERVIEW TAB */}
      {tab === 'overview' && stats && (
        <div className="space-y-6">
          {/* Stat Cards */}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {[
              { label: 'Total Users', value: stats.total_users, icon: Users, color: 'primary', sub: `${stats.total_seekers} seekers · ${stats.total_employers} employers` },
              { label: 'Job Postings', value: stats.total_jobs, icon: Briefcase, color: 'accent', sub: `${stats.active_jobs} active` },
              { label: 'Applications', value: stats.total_applications, icon: FileText, color: 'success', sub: `${stats.total_matches} matches computed` },
              { label: 'Avg Match Score', value: `${stats.average_match_score}%`, icon: TrendingUp, color: 'warning', sub: 'Platform-wide average' },
            ].map(card => (
              <div key={card.label} className="card p-5">
                <div className={`mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-${card.color}-100`}>
                  <card.icon className={`h-5 w-5 text-${card.color}-600`} />
                </div>
                <div className="text-2xl font-bold text-slate-900">{card.value}</div>
                <div className="mt-0.5 text-sm font-medium text-slate-700">{card.label}</div>
                <div className="mt-1 text-xs text-slate-400">{card.sub}</div>
              </div>
            ))}
          </div>

          {/* Role Breakdown */}
          <div className="card p-6">
            <h2 className="mb-4 text-base font-semibold text-slate-900">User Role Breakdown</h2>
            <div className="space-y-3">
              {[
                { label: 'Job Seekers', count: stats.total_seekers, total: stats.total_users, color: 'bg-primary-500' },
                { label: 'Employers', count: stats.total_employers, total: stats.total_users, color: 'bg-accent-500' },
                { label: 'Admins', count: users.filter(u => u.role === 'admin').length, total: stats.total_users, color: 'bg-red-500' },
              ].map(bar => (
                <div key={bar.label}>
                  <div className="mb-1 flex justify-between text-sm">
                    <span className="font-medium text-slate-700">{bar.label}</span>
                    <span className="text-slate-500">{bar.count}</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                    <div
                      className={`h-full rounded-full ${bar.color} transition-all`}
                      style={{ width: bar.total > 0 ? `${(bar.count / bar.total) * 100}%` : '0%' }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Activity Preview */}
          <div className="card p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-semibold text-slate-900">Recent Applications</h2>
              <button onClick={() => setTab('activity')} className="text-xs font-medium text-primary-600 hover:text-primary-700">View all →</button>
            </div>
            <div className="divide-y divide-slate-100">
              {activity.slice(0, 5).map(a => (
                <div key={a.id} className="flex items-center gap-3 py-2.5">
                  <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-600">
                    {a.seeker_name[0]}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-900">{a.seeker_name}</p>
                    <p className="truncate text-xs text-slate-500">Applied to {a.job_title}</p>
                  </div>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${statusColor[a.status] || 'bg-slate-100 text-slate-600'}`}>
                    {a.status}
                  </span>
                  {a.match_score !== null && (
                    <span className="text-xs font-semibold text-success-600">{a.match_score.toFixed(0)}%</span>
                  )}
                </div>
              ))}
              {activity.length === 0 && <p className="py-4 text-center text-sm text-slate-400">No activity yet.</p>}
            </div>
          </div>
        </div>
      )}

      {/* USERS TAB */}
      {tab === 'users' && (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="px-4 py-3 text-left font-semibold text-slate-600">User</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600">Role</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600">Company</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600">Joined</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600">Status</th>
                  <th className="px-4 py-3 text-center font-semibold text-slate-600">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map(u => (
                  <tr key={u.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-900">{u.full_name}</div>
                      <div className="text-xs text-slate-500">{u.email}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${roleColor[u.role] || 'bg-slate-100 text-slate-600'}`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{u.company_name || '—'}</td>
                    <td className="px-4 py-3 text-xs text-slate-500">
                      {u.created_at ? new Date(u.created_at).toLocaleDateString() : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`flex items-center gap-1 text-xs font-medium ${u.is_active ? 'text-success-600' : 'text-danger-600'}`}>
                        {u.is_active ? <UserCheck className="h-3.5 w-3.5" /> : <UserX className="h-3.5 w-3.5" />}
                        {u.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => toggleUserStatus(u)}
                          title={u.is_active ? 'Deactivate user' : 'Activate user'}
                          className={`rounded-lg p-1.5 transition-colors ${u.is_active ? 'text-warning-600 hover:bg-warning-50' : 'text-success-600 hover:bg-success-50'}`}
                        >
                          {u.is_active ? <ToggleRight className="h-5 w-5" /> : <ToggleLeft className="h-5 w-5" />}
                        </button>
                        {u.role !== 'admin' && (
                          <button
                            onClick={() => deleteUser(u)}
                            title="Delete user"
                            className="rounded-lg p-1.5 text-danger-500 transition-colors hover:bg-danger-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {users.length === 0 && <p className="py-8 text-center text-sm text-slate-400">No users found.</p>}
          </div>
        </div>
      )}

      {/* JOBS TAB */}
      {tab === 'jobs' && (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="px-4 py-3 text-left font-semibold text-slate-600">Job Title</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600">Employer</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600">Location</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600">Type</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600">Status</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600">Apps</th>
                  <th className="px-4 py-3 text-center font-semibold text-slate-600">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {jobs.map(j => (
                  <tr key={j.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-900">{j.title}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-slate-700">{j.employer_name}</div>
                      <div className="text-xs text-slate-400">{j.company_name}</div>
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {j.location || '—'}
                      {j.is_remote && <span className="ml-1 text-xs text-primary-600">(Remote)</span>}
                    </td>
                    <td className="px-4 py-3 capitalize text-slate-600">{j.job_type?.replace('_', ' ') || '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${
                        j.status === 'active' ? 'bg-success-100 text-success-700' : 'bg-slate-100 text-slate-600'
                      }`}>
                        {j.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-700">{j.applications_count}</td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => deleteJob(j)}
                        title="Delete job posting"
                        className="rounded-lg p-1.5 text-danger-500 transition-colors hover:bg-danger-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {jobs.length === 0 && <p className="py-8 text-center text-sm text-slate-400">No job postings found.</p>}
          </div>
        </div>
      )}

      {/* ACTIVITY TAB */}
      {tab === 'activity' && (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="px-4 py-3 text-left font-semibold text-slate-600">Applicant</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600">Applied For</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600">Match Score</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600">Status</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600">Applied On</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {activity.map(a => (
                  <tr key={a.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-900">{a.seeker_name}</div>
                      <div className="text-xs text-slate-500">{a.seeker_email}</div>
                    </td>
                    <td className="px-4 py-3 text-slate-700">{a.job_title}</td>
                    <td className="px-4 py-3">
                      {a.match_score !== null
                        ? <span className="font-semibold text-success-600">{a.match_score.toFixed(1)}%</span>
                        : <span className="text-slate-400">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${statusColor[a.status] || 'bg-slate-100 text-slate-600'}`}>
                        {a.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500 flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {a.created_at ? new Date(a.created_at).toLocaleDateString() : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {activity.length === 0 && <p className="py-8 text-center text-sm text-slate-400">No application activity yet.</p>}
          </div>
        </div>
      )}
    </div>
  );
}
