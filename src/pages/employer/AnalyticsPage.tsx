import { useEffect, useState } from 'react';
import { BarChart3, TrendingUp, Briefcase, Users, CheckCircle2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { getJobPostings, getApplicationsForJob } from '@/lib/api';
import type { JobPosting, Application } from '@/types';
import { Spinner, EmptyState } from '@/components/ui';

export function AnalyticsPage() {
  const { profile } = useAuth();
  const [jobs, setJobs] = useState<JobPosting[]>([]);
  const [allApps, setAllApps] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile) return;
    (async () => {
      try {
        const j = await getJobPostings({ employerId: profile.id });
        setJobs(j);
        const allApplications: Application[] = [];
        for (const job of j) {
          const apps = await getApplicationsForJob(job.id);
          allApplications.push(...apps);
        }
        setAllApps(allApplications);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, [profile]);

  if (loading) return <div className="flex justify-center py-20"><Spinner size={32} /></div>;

  const activeJobs = jobs.filter(j => j.status === 'active').length;
  const totalApps = allApps.length;
  const hired = allApps.filter(a => a.status === 'hired').length;
  const shortlisted = allApps.filter(a => a.status === 'shortlisted').length;
  const avgScore = allApps.filter(a => a.match_score).length > 0
    ? allApps.filter(a => a.match_score).reduce((sum, a) => sum + (a.match_score || 0), 0) / allApps.filter(a => a.match_score).length
    : 0;

  // Applications per job
  const appsPerJob = jobs.map(job => {
    const count = allApps.filter(a => a.job_posting_id === job.id).length;
    return { title: job.title, count, status: job.status };
  }).sort((a, b) => b.count - a.count);

  const maxApps = Math.max(...appsPerJob.map(j => j.count), 1);

  // Status distribution
  const statusDist = [
    { label: 'Applied', count: allApps.filter(a => a.status === 'applied').length, color: 'bg-primary-500' },
    { label: 'Shortlisted', count: shortlisted, color: 'bg-warning-500' },
    { label: 'Hired', count: hired, color: 'bg-success-500' },
    { label: 'Rejected', count: allApps.filter(a => a.status === 'rejected').length, color: 'bg-danger-500' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Analytics</h1>
        <p className="text-slate-500">Hiring insights and application metrics</p>
      </div>

      {/* Key metrics */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: 'Active Postings', value: activeJobs, icon: Briefcase, color: 'primary' },
          { label: 'Total Applications', value: totalApps, icon: Users, color: 'accent' },
          { label: 'Shortlisted', value: shortlisted, icon: TrendingUp, color: 'warning' },
          { label: 'Hired', value: hired, icon: CheckCircle2, color: 'success' },
        ].map((stat) => (
          <div key={stat.label} className="card p-5">
            <div className={`flex h-10 w-10 items-center justify-center rounded-lg bg-${stat.color}-100`}>
              <stat.icon className={`h-5 w-5 text-${stat.color}-600`} />
            </div>
            <div className="mt-3 text-2xl font-bold text-slate-900">{stat.value}</div>
            <div className="text-sm text-slate-500">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Average score */}
      <div className="card p-6">
        <h3 className="text-base font-semibold text-slate-900">Average Match Score</h3>
        <div className="mt-4 flex items-baseline gap-2">
          <span className="text-4xl font-bold text-primary-600">{avgScore.toFixed(1)}</span>
          <span className="text-slate-400">/ 100</span>
        </div>
        <div className="mt-3 h-3 w-full rounded-full bg-slate-200">
          <div className="h-3 rounded-full bg-primary-500 transition-all duration-500" style={{ width: `${avgScore}%` }} />
        </div>
      </div>

      {/* Applications per job */}
      <div className="card p-6">
        <h3 className="text-base font-semibold text-slate-900">Applications per Job Posting</h3>
        {appsPerJob.length === 0 ? (
          <p className="mt-4 text-sm text-slate-500">No data available yet.</p>
        ) : (
          <div className="mt-4 space-y-3">
            {appsPerJob.map((item, i) => (
              <div key={i}>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-700 truncate pr-2">{item.title}</span>
                  <span className="font-medium text-slate-900">{item.count}</span>
                </div>
                <div className="mt-1 h-2 w-full rounded-full bg-slate-200">
                  <div className="h-2 rounded-full bg-primary-500 transition-all duration-500" style={{ width: `${(item.count / maxApps) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Status distribution */}
      <div className="card p-6">
        <h3 className="text-base font-semibold text-slate-900">Application Status Distribution</h3>
        {totalApps === 0 ? (
          <EmptyState icon={<BarChart3 className="h-12 w-12" />} title="No data" description="Application status will appear here once you have applicants." />
        ) : (
          <div className="mt-4 space-y-3">
            {statusDist.map((s) => (
              <div key={s.label}>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-700">{s.label}</span>
                  <span className="font-medium text-slate-900">{s.count}</span>
                </div>
                <div className="mt-1 h-2 w-full rounded-full bg-slate-200">
                  <div className={`h-2 rounded-full ${s.color} transition-all duration-500`} style={{ width: `${totalApps > 0 ? (s.count / totalApps) * 100 : 0}%` }} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
