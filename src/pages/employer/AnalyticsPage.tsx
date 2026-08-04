import { useEffect, useState } from 'react';
import { BarChart3, TrendingUp, Briefcase, Users, CheckCircle2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { getJobPostings, getApplicationsForJob } from '@/lib/api';
import type { JobPosting, Application } from '@/types';
import { Spinner, EmptyState } from '@/components/ui';
import { GlassmorphicCard } from '@/components/GlassmorphicCard';

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
        for (const job of j) { const apps = await getApplicationsForJob(job.id); allApplications.push(...apps); }
        setAllApps(allApplications);
      } catch (e) { console.error(e); } finally { setLoading(false); }
    })();
  }, [profile]);

  if (loading) return <div className="flex justify-center py-20"><Spinner size={32} /></div>;

  const activeJobs = jobs.filter(j => j.status === 'active').length;
  const totalApps = allApps.length;
  const hired = allApps.filter(a => a.status === 'hired').length;
  const shortlisted = allApps.filter(a => a.status === 'shortlisted').length;
  const avgScore = allApps.filter(a => a.match_score).length > 0
    ? allApps.filter(a => a.match_score).reduce((sum, a) => sum + (a.match_score || 0), 0) / allApps.filter(a => a.match_score).length : 0;

  const appsPerJob = jobs.map(job => ({ title: job.title, count: allApps.filter(a => a.job_posting_id === job.id).length, status: job.status })).sort((a, b) => b.count - a.count);
  const maxApps = Math.max(...appsPerJob.map(j => j.count), 1);

  const statusDist = [
    { label: 'Applied', count: allApps.filter(a => a.status === 'applied').length, color: 'bg-cyan-500' },
    { label: 'Shortlisted', count: shortlisted, color: 'bg-amber-500' },
    { label: 'Hired', count: hired, color: 'bg-emerald-500' },
    { label: 'Rejected', count: allApps.filter(a => a.status === 'rejected').length, color: 'bg-red-500' },
  ];

  const statIcons: Record<string, string> = {
    'Active Postings': 'bg-cyan-500/20 text-cyan-400',
    'Total Applications': 'bg-violet-500/20 text-violet-400',
    'Shortlisted': 'bg-amber-500/20 text-amber-400',
    'Hired': 'bg-emerald-500/20 text-emerald-400',
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-mono text-3xl font-bold text-white">Analytics</h1>
        <p className="text-slate-400">Hiring insights and application metrics</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: 'Active Postings', value: activeJobs, icon: Briefcase },
          { label: 'Total Applications', value: totalApps, icon: Users },
          { label: 'Shortlisted', value: shortlisted, icon: TrendingUp },
          { label: 'Hired', value: hired, icon: CheckCircle2 },
        ].map((stat) => (
          <GlassmorphicCard key={stat.label} className="p-5">
            <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${statIcons[stat.label]}`}>
              <stat.icon className="h-5 w-5" />
            </div>
            <div className="mt-3 text-3xl font-bold font-mono text-white">{stat.value}</div>
            <div className="text-sm text-slate-500">{stat.label}</div>
          </GlassmorphicCard>
        ))}
      </div>

      <GlassmorphicCard className="p-6">
        <h3 className="text-base font-semibold text-white">Average Match Score</h3>
        <div className="mt-4 flex items-baseline gap-2">
          <span className="text-4xl font-bold font-mono text-cyan-400">{avgScore.toFixed(1)}</span>
          <span className="text-slate-500">/ 100</span>
        </div>
        <div className="mt-3 h-3 w-full rounded-full bg-slate-800">
          <div className="h-3 rounded-full bg-cyan-500 transition-all duration-500" style={{ width: `${avgScore}%` }} />
        </div>
      </GlassmorphicCard>

      <GlassmorphicCard className="p-6">
        <h3 className="text-base font-semibold text-white">Applications per Job</h3>
        {appsPerJob.length === 0 ? (
          <p className="mt-4 text-sm text-slate-400">No data yet.</p>
        ) : (
          <div className="mt-4 space-y-3">
            {appsPerJob.map((item, i) => (
              <div key={i}>
                <div className="flex justify-between text-sm"><span className="text-slate-300 truncate pr-2">{item.title}</span><span className="font-medium text-white">{item.count}</span></div>
                <div className="mt-1 h-2 w-full rounded-full bg-slate-800">
                  <div className="h-2 rounded-full bg-violet-500 transition-all duration-500" style={{ width: `${(item.count / maxApps) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        )}
      </GlassmorphicCard>

      <GlassmorphicCard className="p-6">
        <h3 className="text-base font-semibold text-white">Status Distribution</h3>
        {totalApps === 0 ? (
          <EmptyState icon={<BarChart3 className="h-12 w-12" />} title="No data" description="Status distribution will appear once you have applicants." />
        ) : (
          <div className="mt-4 space-y-3">
            {statusDist.map((s) => (
              <div key={s.label}>
                <div className="flex justify-between text-sm"><span className="text-slate-300">{s.label}</span><span className="font-medium text-white">{s.count}</span></div>
                <div className="mt-1 h-2 w-full rounded-full bg-slate-800">
                  <div className={`h-2 rounded-full ${s.color} transition-all duration-500`} style={{ width: `${totalApps > 0 ? (s.count / totalApps) * 100 : 0}%` }} />
                </div>
              </div>
            ))}
          </div>
        )}
      </GlassmorphicCard>
    </div>
  );
}
