import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FileText, Target, Briefcase, Bookmark, TrendingUp, ArrowRight } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { getCurrentResume, getJobPostings, getApplications, getSavedJobs } from '@/lib/api';
import type { Resume, JobPosting, Application, SavedJob } from '@/types';
import { ScoreRing } from '@/components/ui';

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

  if (loading) return <div className="flex justify-center py-20"><div className="animate-spin rounded-full border-2 border-slate-200 border-t-primary-600 h-8 w-8" /></div>;

  const stats = [
    { label: 'Resume Status', value: resume ? 'Active' : 'Not uploaded', icon: FileText, color: resume ? 'success' : 'warning', link: '/app/resume' },
    { label: 'Applications', value: applications.length, icon: Target, color: 'primary', link: '/app/applications' },
    { label: 'Saved Jobs', value: savedJobs.length, icon: Bookmark, color: 'accent', link: '/app/jobs' },
    { label: 'Open Jobs', value: jobs.length, icon: Briefcase, color: 'primary', link: '/app/jobs' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Welcome back, {profile?.full_name?.split(' ')[0]}</h1>
        <p className="text-slate-500">Here's your job search overview</p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Link key={stat.label} to={stat.link} className="card p-5 transition-all hover:shadow-md hover:-translate-y-0.5">
            <div className="flex items-center justify-between">
              <div className={`flex h-10 w-10 items-center justify-center rounded-lg bg-${stat.color}-100`}>
                <stat.icon className={`h-5 w-5 text-${stat.color}-600`} />
              </div>
              <ArrowRight className="h-4 w-4 text-slate-300" />
            </div>
            <div className="mt-3 text-2xl font-bold text-slate-900">{stat.value}</div>
            <div className="text-sm text-slate-500">{stat.label}</div>
          </Link>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Resume status */}
        <div className="card p-6 lg:col-span-1">
          <h3 className="text-base font-semibold text-slate-900">Resume Status</h3>
          {resume ? (
            <div className="mt-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-success-100">
                  <FileText className="h-5 w-5 text-success-600" />
                </div>
                <div>
                  <div className="text-sm font-medium text-slate-900">{resume.file_name}</div>
                  <div className="text-xs text-slate-500">{resume.skills.length} skills extracted</div>
                </div>
              </div>
              <Link to="/app/resume" className="btn-secondary mt-4 w-full">View Resume</Link>
            </div>
          ) : (
            <div className="mt-4">
              <p className="text-sm text-slate-500">You haven't uploaded a resume yet. Upload one to start matching with jobs.</p>
              <Link to="/app/resume" className="btn-primary mt-4 w-full">Upload Resume</Link>
            </div>
          )}
        </div>

        {/* Quick match */}
        <div className="card p-6 lg:col-span-1">
          <h3 className="text-base font-semibold text-slate-900">Quick Match Score</h3>
          <p className="mt-1 text-sm text-slate-500">Paste a job description to see your match score</p>
          <div className="mt-4 flex flex-col items-center">
            <ScoreRing score={0} size={100} />
            <Link to="/app/match" className="btn-primary mt-4 w-full">
              <Target className="h-4 w-4" /> Analyze a Job
            </Link>
          </div>
        </div>

        {/* Recent applications */}
        <div className="card p-6 lg:col-span-1">
          <h3 className="text-base font-semibold text-slate-900">Recent Applications</h3>
          {applications.length > 0 ? (
            <div className="mt-4 space-y-2">
              {applications.slice(0, 3).map((app) => (
                <div key={app.id} className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium text-slate-900">{app.job_posting?.title}</div>
                    <div className="text-xs text-slate-500 capitalize">{app.status}</div>
                  </div>
                  {app.match_score && (
                    <span className="badge bg-primary-100 text-primary-700">{app.match_score.toFixed(0)}%</span>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-4 text-sm text-slate-500">No applications yet. Browse the job feed to get started.</p>
          )}
          <Link to="/app/applications" className="btn-ghost mt-4 w-full">View All</Link>
        </div>
      </div>

      {/* Recommended jobs */}
      <div className="card p-6">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold text-slate-900">Recommended Jobs</h3>
          <Link to="/app/jobs" className="text-sm font-medium text-primary-600 hover:text-primary-700">View all</Link>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {jobs.slice(0, 3).map((job) => (
            <Link key={job.id} to="/app/jobs" className="rounded-lg border border-slate-200 p-4 transition-all hover:border-primary-300 hover:shadow-sm">
              <div className="text-sm font-semibold text-slate-900">{job.title}</div>
              <div className="text-xs text-slate-500">{job.location || 'Remote'}</div>
              {job.salary_min && (
                <div className="mt-2 text-xs text-slate-600">${job.salary_min.toLocaleString()} - ${job.salary_max?.toLocaleString()}</div>
              )}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
