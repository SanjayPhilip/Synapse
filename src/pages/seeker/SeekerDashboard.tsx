import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FileText, Target, Briefcase, Bookmark, ArrowRight, Sparkles } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { getCurrentResume, getJobPostings, getApplications, getSavedJobs } from '@/lib/api';
import type { Resume, JobPosting, Application, SavedJob } from '@/types';
import { ScoreRing } from '@/components/ui';
import { GlassmorphicCard } from '@/components/GlassmorphicCard';

export function SeekerDashboard() {
  const { profile } = useAuth();
  const [resume, setResume] = useState<Resume | null>(null);
  const [jobs, setJobs] = useState<JobPosting[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [savedJobs, setSavedJobs] = useState<SavedJob[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile) return;
    (async () => {
      try {
        const [r, j, a, s] = await Promise.all([
          getCurrentResume(profile.id),
          getJobPostings({ status: 'active', limit: 5 }),
          getApplications(profile.id),
          getSavedJobs(profile.id),
        ]);
        setResume(r);
        setJobs(j);
        setApplications(a);
        setSavedJobs(s);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, [profile]);

  if (loading) return <div className="flex justify-center py-20"><div className="animate-spin rounded-full border-2 border-slate-700 border-t-cyan-400 h-8 w-8" /></div>;

  const stats = [
    { label: 'Resume Status', value: resume ? 'Active' : 'Not uploaded', icon: FileText, color: resume ? 'success' : 'warning', link: '/app/resume' },
    { label: 'Applications', value: applications.length, icon: Target, color: 'primary', link: '/app/applications' },
    { label: 'Saved Jobs', value: savedJobs.length, icon: Bookmark, color: 'accent', link: '/app/jobs' },
    { label: 'Open Jobs', value: jobs.length, icon: Briefcase, color: 'primary', link: '/app/jobs' },
  ];

  const getColorClass = (color: string) => {
    switch (color) {
      case 'success': return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
      case 'warning': return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
      case 'accent': return 'bg-violet-500/20 text-violet-400 border-violet-500/30';
      default: return 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30';
    }
  };

  const getIconBg = (color: string) => {
    switch (color) {
      case 'success': return 'bg-emerald-500/20';
      case 'warning': return 'bg-amber-500/20';
      case 'accent': return 'bg-violet-500/20';
      default: return 'bg-cyan-500/20';
    }
  };

  const getIconColor = (color: string) => {
    switch (color) {
      case 'success': return 'text-emerald-400';
      case 'warning': return 'text-amber-400';
      case 'accent': return 'text-violet-400';
      default: return 'text-cyan-400';
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-mono text-3xl font-bold text-white">Welcome back, {profile?.full_name?.split(' ')[0]}</h1>
        <p className="text-slate-400 mt-1">Your job search command center</p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Link key={stat.label} to={stat.link} className="group">
            <GlassmorphicCard className="p-5 transition-all hover:scale-[1.02] hover:shadow-[0_0_30px_rgba(6,182,212,0.15)]">
              <div className="flex items-center justify-between">
                <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${getIconBg(stat.color)}`}>
                  <stat.icon className={`h-5 w-5 ${getIconColor(stat.color)}`} />
                </div>
                <ArrowRight className="h-4 w-4 text-slate-500 group-hover:text-cyan-400 transition-colors" />
              </div>
              <div className="mt-4 text-3xl font-bold font-mono text-white">{stat.value}</div>
              <div className="text-sm text-slate-500">{stat.label}</div>
            </GlassmorphicCard>
          </Link>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Resume status */}
        <div className="lg:col-span-1">
          <GlassmorphicCard className="p-6">
            <h3 className="text-base font-semibold text-white">Resume Status</h3>
            {resume ? (
              <div className="mt-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500/20">
                    <FileText className="h-5 w-5 text-emerald-400" />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-white">{resume.file_name}</div>
                    <div className="text-xs text-slate-500">{resume.skills.length} skills extracted</div>
                  </div>
                </div>
                <Link to="/app/resume" className="btn-primary mt-4 w-full">View Resume</Link>
              </div>
            ) : (
              <div className="mt-4">
                <p className="text-sm text-slate-400">Upload a resume to start matching with jobs.</p>
                <Link to="/app/resume" className="btn-primary mt-4 w-full">Upload Resume</Link>
              </div>
            )}
          </GlassmorphicCard>
        </div>

        {/* Quick match */}
        <div className="lg:col-span-1">
          <GlassmorphicCard className="p-6">
            <h3 className="text-base font-semibold text-white">Quick Match Score</h3>
            <p className="mt-1 text-sm text-slate-400">Paste a job description to see your match score</p>
            <div className="mt-4 flex flex-col items-center">
              <ScoreRing score={0} size={100} />
              <Link to="/app/match" className="btn-primary mt-4 w-full">
                <Target className="h-4 w-4 mr-2" /> Analyze a Job
              </Link>
            </div>
          </GlassmorphicCard>
        </div>

        {/* Recent applications */}
        <div className="lg:col-span-1">
          <GlassmorphicCard className="p-6">
            <h3 className="text-base font-semibold text-white">Recent Applications</h3>
            {applications.length > 0 ? (
              <div className="mt-4 space-y-2">
                {applications.slice(0, 3).map((app) => (
                  <div key={app.id} className="flex items-center justify-between rounded-lg border border-slate-700/50 bg-slate-800/30 px-3 py-2.5">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium text-white">{app.job_posting?.title}</div>
                      <div className="text-xs text-slate-500 capitalize">{app.status}</div>
                    </div>
                    {app.match_score && (
                      <span className="badge bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">{app.match_score.toFixed(0)}%</span>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-4 text-sm text-slate-400">No applications yet. Browse the job feed to get started.</p>
            )}
            <Link to="/app/applications" className="btn-ghost mt-4 w-full">View All</Link>
          </GlassmorphicCard>
        </div>
      </div>

      {/* Recommended jobs */}
      <GlassmorphicCard className="p-6">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold text-white">Recommended Jobs</h3>
          <Link to="/app/jobs" className="text-sm font-medium text-cyan-400 hover:text-cyan-300">View all</Link>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {jobs.slice(0, 3).map((job) => (
            <Link key={job.id} to="/app/jobs" className="group rounded-xl border border-slate-700/50 bg-slate-800/30 p-4 transition-all hover:border-cyan-500/30 hover:shadow-[0_0_20px_rgba(6,182,212,0.1)]">
              <div className="text-sm font-semibold text-white">{job.title}</div>
              <div className="text-xs text-slate-500">{job.location || 'Remote'}</div>
              {job.salary_min && (
                <div className="mt-2 text-xs text-slate-400">${job.salary_min.toLocaleString()} - ${job.salary_max?.toLocaleString()}</div>
              )}
            </Link>
          ))}
          {jobs.length === 0 && (
            <div className="col-span-full py-8 text-center text-slate-500">
              <Sparkles className="h-8 w-8 mx-auto mb-2 text-slate-700" />
              No jobs yet. Check back soon!
            </div>
          )}
        </div>
      </GlassmorphicCard>
    </div>
  );
}