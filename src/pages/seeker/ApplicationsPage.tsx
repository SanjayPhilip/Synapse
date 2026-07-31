import { useEffect, useState } from 'react';
import { Bookmark, ExternalLink, Zap, Calendar, CheckCircle2, XCircle, Loader2, AlertCircle } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { getApplications, getSavedJobs, getAutoApplyLogs, createApplication, getCurrentResume } from '@/lib/api';
import type { Application, SavedJob, AutoApplyLog, JobPosting } from '@/types';
import { Spinner, EmptyState, Badge } from '@/components/ui';

export function ApplicationsPage() {
  const { profile } = useAuth();
  const [applications, setApplications] = useState<Application[]>([]);
  const [savedJobs, setSavedJobs] = useState<SavedJob[]>([]);
  const [autoApplyLogs, setAutoApplyLogs] = useState<AutoApplyLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'all' | 'applied' | 'saved' | 'auto'>('all');

  useEffect(() => {
    if (!profile) return;
    (async () => {
      try {
        const [a, s, logs] = await Promise.all([
          getApplications(profile.id),
          getSavedJobs(profile.id),
          getAutoApplyLogs(profile.id).catch(() => []),
        ]);
        setApplications(a);
        setSavedJobs(s);
        setAutoApplyLogs(logs);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, [profile]);

  async function handleApplySaved(job: JobPosting) {
    if (!profile) return;
    try {
      const resume = await getCurrentResume(profile.id);
      await createApplication({
        seeker_id: profile.id,
        job_posting_id: job.id,
        resume_id: resume?.id || null,
        status: 'applied',
        match_score: null,
        applied_via: 'platform',
      });
      const updated = await getApplications(profile.id);
      setApplications(updated);
      setTab('applied');
    } catch (e: any) {
      if (e.code === '23505') {
        alert("You've already applied to this job.");
      } else {
        alert('Failed to submit application.');
      }
    }
  }

  if (loading) return <div className="flex justify-center py-20"><Spinner size={32} /></div>;

  const statusColors: Record<string, string> = {
    applied: 'blue',
    shortlisted: 'amber',
    rejected: 'red',
    hired: 'green',
  };

  const autoStatusConfig: Record<string, { color: string; icon: any; label: string }> = {
    pending: { color: 'slate', icon: Loader2, label: 'Pending' },
    in_progress: { color: 'blue', icon: Loader2, label: 'In Progress' },
    success: { color: 'green', icon: CheckCircle2, label: 'Success' },
    failed: { color: 'red', icon: XCircle, label: 'Failed' },
    cancelled: { color: 'slate', icon: AlertCircle, label: 'Cancelled' },
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Applications</h1>
        <p className="text-slate-500">Track your job applications, auto-apply logs, and saved opportunities</p>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2">
        {([
          { id: 'all', label: 'All', count: applications.length },
          { id: 'applied', label: 'Applied', count: applications.length },
          { id: 'auto', label: 'Auto-Apply Logs', count: autoApplyLogs.length },
          { id: 'saved', label: 'Saved', count: savedJobs.length },
        ] as const).map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`btn ${tab === t.id ? 'bg-primary-600 text-white' : 'bg-white text-slate-700 border border-slate-300'}`}
          >
            {t.label} <span className="ml-1 text-xs opacity-70">({t.count})</span>
          </button>
        ))}
      </div>

      {(tab === 'all' || tab === 'applied') && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-slate-700">Submitted Applications</h3>
          {applications.length === 0 ? (
            <EmptyState icon={<Zap className="h-12 w-12" />} title="No applications yet" description="Browse the job feed and apply to positions that match your profile." />
          ) : (
            applications.map((app) => (
              <div key={app.id} className="card p-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-slate-900 truncate">{app.job_posting?.title}</h3>
                      <Badge color={statusColors[app.status]}>{app.status}</Badge>
                    </div>
                    <div className="mt-1 flex items-center gap-3 text-xs text-slate-500">
                      <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{new Date(app.created_at).toLocaleDateString()}</span>
                      <span className="capitalize">{app.applied_via.replace('_', ' ')}</span>
                    </div>
                  </div>
                  {app.match_score && (
                    <div className="text-right">
                      <div className={`text-lg font-bold ${app.match_score >= 75 ? 'text-success-600' : app.match_score >= 50 ? 'text-warning-600' : 'text-danger-600'}`}>
                        {app.match_score.toFixed(0)}
                      </div>
                      <div className="text-xs text-slate-400">match</div>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {tab === 'auto' && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-slate-700">Auto-Apply Logs</h3>
          {autoApplyLogs.length === 0 ? (
            <EmptyState icon={<Zap className="h-12 w-12" />} title="No auto-apply attempts" description="When you use the Auto-Apply feature on a job, the attempt and outcome will be logged here." />
          ) : (
            autoApplyLogs.map((log) => {
              const config = autoStatusConfig[log.status] || autoStatusConfig.pending;
              const StatusIcon = config.icon;
              return (
                <div key={log.id} className="card p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-slate-900 truncate">{(log as any).job_posting?.title || 'Job'}</h3>
                        <Badge color={config.color}>
                          <StatusIcon className={`h-3 w-3 ${log.status === 'in_progress' ? 'animate-spin' : ''}`} />
                          {config.label}
                        </Badge>
                      </div>
                      <div className="mt-1 flex items-center gap-3 text-xs text-slate-500">
                        <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{new Date(log.created_at).toLocaleDateString()}</span>
                        <span>Attempt #{log.attempt_count}</span>
                        {log.submitted_at && <span>Submitted: {new Date(log.submitted_at).toLocaleString()}</span>}
                      </div>
                      {log.error_message && (
                        <div className="mt-2 flex items-start gap-2 rounded-md bg-danger-50 p-2">
                          <AlertCircle className="h-3.5 w-3.5 text-danger-600 flex-shrink-0 mt-0.5" />
                          <p className="text-xs text-danger-700">{log.error_message}</p>
                        </div>
                      )}
                    </div>
                    {(log as any).job_posting?.external_url && (
                      <a href={(log as any).job_posting.external_url} target="_blank" rel="noopener noreferrer" className="btn-secondary flex-shrink-0">
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {tab === 'saved' && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-slate-700">Saved Jobs</h3>
          {savedJobs.length === 0 ? (
            <EmptyState icon={<Bookmark className="h-12 w-12" />} title="No saved jobs" description="Bookmark jobs from the feed to review them later." />
          ) : (
            savedJobs.map((saved) => (
              <div key={saved.id} className="card p-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold text-slate-900 truncate">{saved.job_posting?.title}</h3>
                    <div className="mt-1 text-xs text-slate-500">{saved.job_posting?.location || 'Remote'}</div>
                    {saved.job_posting && saved.job_posting.requirements.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {saved.job_posting.requirements.slice(0, 4).map((r, i) => (
                          <span key={i} className="badge bg-slate-100 text-slate-600">{r}</span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    {saved.match_score_at_save && (
                      <div className="text-right">
                        <div className={`text-lg font-bold ${saved.match_score_at_save >= 75 ? 'text-success-600' : saved.match_score_at_save >= 50 ? 'text-warning-600' : 'text-danger-600'}`}>
                          {saved.match_score_at_save.toFixed(0)}
                        </div>
                        <div className="text-xs text-slate-400">match</div>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      {saved.job_posting && (
                        <button
                          onClick={() => handleApplySaved(saved.job_posting!)}
                          className="btn-primary text-xs"
                        >
                          <Zap className="h-3 w-3" /> Apply
                        </button>
                      )}
                      {saved.job_posting?.external_url && (
                        <a href={saved.job_posting.external_url} target="_blank" rel="noopener noreferrer" className="btn-secondary">
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
