import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Briefcase, Users, BarChart3, Plus, ArrowRight } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { getJobPostings, getApplicationsForJob } from '@/lib/api';
import { seedSampleJobs } from '@/lib/seed';
import type { JobPosting } from '@/types';
import { Spinner } from '@/components/ui';

export function EmployerDashboard() {
  const { profile } = useAuth();
  const [jobs, setJobs] = useState<JobPosting[]>([]);
  const [totalApps, setTotalApps] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile) return;
    (async () => {
      try {
        try { await seedSampleJobs(); } catch (se) { console.warn('Seed skipped or failed:', se); }
        const j = await getJobPostings({ employerId: profile.id });
        setJobs(j);
        
        const appResults = await Promise.allSettled(j.map((job) => getApplicationsForJob(job.id)));
        let appCount = 0;
        appResults.forEach((res) => {
          if (res.status === 'fulfilled') appCount += res.value.length;
        });
        setTotalApps(appCount);
      } catch (e) {
        console.error('Failed to load employer dashboard data:', e);
      } finally {
        setLoading(false);
      }
    })();
  }, [profile]);

  if (loading) return <div className="flex justify-center py-20"><Spinner size={32} /></div>;

  const activeJobs = jobs.filter(j => j.status === 'active').length;
  const draftJobs = jobs.filter(j => j.status === 'draft').length;

  const stats = [
    { label: 'Active Postings', value: activeJobs, icon: Briefcase, color: 'primary', link: '/app/postings' },
    { label: 'Total Applications', value: totalApps, icon: Users, color: 'accent', link: '/app/applicants' },
    { label: 'Draft Jobs', value: draftJobs, icon: BarChart3, color: 'warning', link: '/app/postings' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Employer Dashboard</h1>
          <p className="text-slate-500 dark:text-slate-400">Welcome, {profile?.company_name || profile?.full_name}</p>
        </div>
        <Link to="/app/postings" className="btn-primary">
          <Plus className="h-4 w-4" /> New Posting
        </Link>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        {stats.map((stat) => (
          <Link key={stat.label} to={stat.link} className="card p-5 transition-all hover:shadow-md hover:-translate-y-0.5">
            <div className="flex items-center justify-between">
              <div className={`flex h-10 w-10 items-center justify-center rounded-lg bg-${stat.color}-100`}>
                <stat.icon className={`h-5 w-5 text-${stat.color}-600`} />
              </div>
              <ArrowRight className="h-4 w-4 text-slate-300" />
            </div>
            <div className="mt-3 text-2xl font-bold text-slate-900 dark:text-white">{stat.value}</div>
            <div className="text-sm text-slate-500 dark:text-slate-400">{stat.label}</div>
          </Link>
        ))}
      </div>

      {/* Recent postings */}
      <div className="card p-6">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold text-slate-900 dark:text-white">Recent Job Postings</h3>
          <Link to="/app/postings" className="text-sm font-medium text-primary-600 hover:text-primary-700">View all</Link>
        </div>
        <div className="mt-4 space-y-3">
          {jobs.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-slate-400">No job postings yet. Create your first posting to start receiving applications.</p>
          ) : (
            jobs.slice(0, 5).map((job) => (
              <Link key={job.id} to="/app/applicants" className="flex items-center justify-between rounded-lg border border-slate-200 dark:border-slate-700 p-4 transition-colors hover:border-primary-300">
                <div className="min-w-0">
                  <div className="font-medium text-slate-900 dark:text-white">{job.title}</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">{job.location || 'Remote'}</div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`badge ${job.status === 'active' ? 'bg-success-100 text-success-700' : job.status === 'draft' ? 'bg-warning-100 text-warning-700' : 'bg-slate-100 text-slate-600'}`}>
                    {job.status}
                  </span>
                </div>
              </Link>
            ))
          )}
        </div>
      </div>

      {/* Quick actions */}
      <div className="grid gap-4 md:grid-cols-2">
        <Link to="/app/postings" className="card flex items-center gap-4 p-5 transition-all hover:shadow-md">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary-100">
            <Briefcase className="h-6 w-6 text-primary-600" />
          </div>
          <div>
            <div className="font-semibold text-slate-900 dark:text-white">Manage Postings</div>
            <div className="text-sm text-slate-500 dark:text-slate-400">Create, edit, and close job listings</div>
          </div>
        </Link>
        <Link to="/app/applicants" className="card flex items-center gap-4 p-5 transition-all hover:shadow-md">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-accent-100">
            <Users className="h-6 w-6 text-accent-600" />
          </div>
          <div>
            <div className="font-semibold text-slate-900 dark:text-white">Review Applicants</div>
            <div className="text-sm text-slate-500 dark:text-slate-400">View ranked candidates and shortlist</div>
          </div>
        </Link>
      </div>
    </div>
  );
}
