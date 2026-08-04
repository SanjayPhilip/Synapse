import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Briefcase, Users, BarChart3, Plus, ArrowRight } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { getJobPostings, getApplicationsForJob } from '@/lib/api';
import { seedSampleJobs } from '@/lib/seed';
import type { JobPosting } from '@/types';
import { Spinner } from '@/components/ui';
import { GlassmorphicCard } from '@/components/GlassmorphicCard';

export function EmployerDashboard() {
  const { profile } = useAuth();
  const [jobs, setJobs] = useState<JobPosting[]>([]);
  const [totalApps, setTotalApps] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile) return;
    (async () => {
      try {
        try { await seedSampleJobs(); } catch (se) { console.warn('Seed skipped:', se); }
        const j = await getJobPostings({ employerId: profile.id });
        setJobs(j);
        const appResults = await Promise.allSettled(j.map((job) => getApplicationsForJob(job.id)));
        let appCount = 0;
        appResults.forEach((res) => { if (res.status === 'fulfilled') appCount += res.value.length; });
        setTotalApps(appCount);
      } catch (e) {
        console.error('Failed to load employer dashboard:', e);
      } finally {
        setLoading(false);
      }
    })();
  }, [profile]);

  if (loading) return <div className="flex justify-center py-20"><Spinner size={32} /></div>;

  const activeJobs = jobs.filter(j => j.status === 'active').length;
  const draftJobs = jobs.filter(j => j.status === 'draft').length;

  const stats = [
    { label: 'Active Postings', value: activeJobs, icon: Briefcase, color: 'cyan', link: '/app/postings' },
    { label: 'Total Applications', value: totalApps, icon: Users, color: 'violet', link: '/app/applicants' },
    { label: 'Draft Jobs', value: draftJobs, icon: BarChart3, color: 'amber', link: '/app/postings' },
  ];

  const colorMap: Record<string, string> = {
    cyan: 'bg-cyan-500/20 text-cyan-400',
    violet: 'bg-violet-500/20 text-violet-400',
    amber: 'bg-amber-500/20 text-amber-400',
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-mono text-3xl font-bold text-white">Employer Dashboard</h1>
          <p className="text-slate-400 mt-1">Welcome, {profile?.company_name || profile?.full_name}</p>
        </div>
        <Link to="/app/postings" className="btn-primary">
          <Plus className="h-4 w-4 mr-1" /> New Posting
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {stats.map((stat) => (
          <Link key={stat.label} to={stat.link} className="group">
            <GlassmorphicCard className="p-5 transition-all hover:scale-[1.02] hover:shadow-[0_0_30px_rgba(139,92,246,0.15)]">
              <div className="flex items-center justify-between">
                <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${colorMap[stat.color]}`}>
                  <stat.icon className="h-5 w-5" />
                </div>
                <ArrowRight className="h-4 w-4 text-slate-500 group-hover:text-violet-400 transition-colors" />
              </div>
              <div className="mt-4 text-3xl font-bold font-mono text-white">{stat.value}</div>
              <div className="text-sm text-slate-500">{stat.label}</div>
            </GlassmorphicCard>
          </Link>
        ))}
      </div>

      <GlassmorphicCard className="p-6">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold text-white">Recent Job Postings</h3>
          <Link to="/app/postings" className="text-sm font-medium text-violet-400 hover:text-violet-300">View all</Link>
        </div>
        <div className="mt-4 space-y-3">
          {jobs.length === 0 ? (
            <p className="text-sm text-slate-400 py-8 text-center">No job postings yet. Create your first posting to start receiving applications.</p>
          ) : (
            jobs.slice(0, 5).map((job) => (
              <Link key={job.id} to="/app/applicants" className="flex items-center justify-between rounded-xl border border-slate-700/50 bg-slate-800/30 p-4 transition-all hover:border-violet-500/30">
                <div className="min-w-0">
                  <div className="font-medium text-white">{job.title}</div>
                  <div className="text-xs text-slate-500">{job.location || 'Remote'}</div>
                </div>
                <span className={`badge ${job.status === 'active' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : job.status === 'draft' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 'bg-slate-700/50 text-slate-400 border border-slate-600/50'}`}>
                  {job.status}
                </span>
              </Link>
            ))
          )}
        </div>
      </GlassmorphicCard>

      <div className="grid gap-4 md:grid-cols-2">
        <Link to="/app/postings" className="group">
          <GlassmorphicCard className="p-5 transition-all hover:scale-[1.02] hover:shadow-[0_0_30px_rgba(6,182,212,0.1)]">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-cyan-500/20">
                <Briefcase className="h-6 w-6 text-cyan-400" />
              </div>
              <div>
                <div className="font-semibold text-white">Manage Postings</div>
                <div className="text-sm text-slate-400">Create, edit, and close job listings</div>
              </div>
            </div>
          </GlassmorphicCard>
        </Link>
        <Link to="/app/applicants" className="group">
          <GlassmorphicCard className="p-5 transition-all hover:scale-[1.02] hover:shadow-[0_0_30px_rgba(139,92,246,0.1)]">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-violet-500/20">
                <Users className="h-6 w-6 text-violet-400" />
              </div>
              <div>
                <div className="font-semibold text-white">Review Applicants</div>
                <div className="text-sm text-slate-400">View ranked candidates and shortlist</div>
              </div>
            </div>
          </GlassmorphicCard>
        </Link>
      </div>
    </div>
  );
}
