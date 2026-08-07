import { useEffect, useState } from 'react';
import { Bookmark, ExternalLink, Zap, Calendar, CheckCircle2, XCircle, Loader2, AlertCircle, ChevronRight, ChevronDown, Briefcase, Trash2, Send, MessageSquare, MapPin, DollarSign } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { getApplicationsPage, getSavedJobs, getAutoApplyLogs, createApplication, getCurrentResume, getApplicationHistory } from '@/lib/api';
import type { Application, SavedJob, AutoApplyLog, JobPosting } from '@/types';
import { Spinner, EmptyState, Badge, Modal } from '@/components/ui';
import { GlassmorphicCard } from '@/components/GlassmorphicCard';

export function ApplicationsPage() {
  const { profile } = useAuth();
  const [applications, setApplications] = useState<Application[]>([]);
  const [savedJobs, setSavedJobs] = useState<SavedJob[]>([]);
  const [autoApplyLogs, setAutoApplyLogs] = useState<AutoApplyLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [appsLoading, setAppsLoading] = useState(false);
  const [tab, setTab] = useState<'all' | 'applied' | 'saved' | 'auto'>('all');
  const [appPage, setAppPage] = useState(1);
  const [appPageSize, setAppPageSize] = useState(10);
  const [appTotal, setAppTotal] = useState(0);
  const [appTotalPages, setAppTotalPages] = useState(1);

  useEffect(() => {
    if (!profile) return;
    (async () => {
      try {
        const [s, logs] = await Promise.all([getSavedJobs(profile.id), getAutoApplyLogs(profile.id).catch(() => [])]);
        setSavedJobs(s); setAutoApplyLogs(logs);
      } catch (e) { console.error(e); } finally { setLoading(false); }
    })();
  }, [profile]);

  useEffect(() => {
    if (!profile) return;
    (async () => {
      setAppsLoading(true);
      try {
        const res = await getApplicationsPage(profile.id, appPage, appPageSize);
        setApplications(res.items); setAppTotalPages(res.total_pages); setAppTotal(res.total);
      } catch (e) { console.error(e); } finally { setAppsLoading(false); }
    })();
  }, [profile, appPage, appPageSize]);

  async function handleApplySaved(job: JobPosting) {
    if (!profile) return;
    try {
      const resume = await getCurrentResume(profile.id);
      await createApplication({ seeker_id: profile.id, job_posting_id: job.id, resume_id: resume?.id || null, status: 'applied', match_score: null, applied_via: 'platform' });
      setTab('applied'); setAppPage(1);
    } catch (e: any) { alert(e.code === '23505' ? "Already applied." : 'Failed to submit.'); }
  }

  if (loading) return <div className="flex justify-center py-20"><Spinner size={32} /></div>;

  const statusColors: Record<string, string> = { applied: 'blue', shortlisted: 'amber', rejected: 'red', hired: 'green' };
  const autoStatusConfig: Record<string, { color: string; icon: any; label: string }> = {
    pending: { color: 'slate', icon: Loader2, label: 'Pending' },
    in_progress: { color: 'blue', icon: Loader2, label: 'In Progress' },
    success: { color: 'green', icon: CheckCircle2, label: 'Success' },
    failed: { color: 'red', icon: XCircle, label: 'Failed' },
    cancelled: { color: 'slate', icon: AlertCircle, label: 'Cancelled' },
  };
  const scoreColor = (s: number) => s >= 75 ? 'text-emerald-400' : s >= 50 ? 'text-amber-400' : 'text-red-400';

  const [detailApp, setDetailApp] = useState<Application | null>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  async function openDetail(app: Application) {
    setDetailApp(app);
    setHistoryLoading(true);
    try {
      const h = await getApplicationHistory(app.id);
      setHistory(h);
    } catch (e) {
      console.error(e);
    } finally {
      setHistoryLoading(false);
    }
  }

  function closeDetail() {
    setDetailApp(null);
    setHistory([]);
  }

  function formatSalary(jp?: JobPosting): string | null {
    if (!jp || (jp.salary_min == null && jp.salary_max == null)) return null;
    const cur = jp.salary_currency || 'USD';
    const fmt = (n: number) => `${n.toLocaleString()} ${cur}`;
    if (jp.salary_min != null && jp.salary_max != null) return `${fmt(jp.salary_min)} – ${fmt(jp.salary_max)}`;
    return jp.salary_min != null ? `${fmt(jp.salary_min)}+` : `up to ${fmt(jp.salary_max!)}`;
  }

  const statusOrder = ['applied', 'screened', 'shortlisted', 'interviewing', 'offer', 'hired', 'rejected'];
  const statusLabels: Record<string, string> = {
    applied: 'Applied',
    screened: 'Screened',
    shortlisted: 'Shortlisted',
    interviewing: 'Interviewing',
    offer: 'Offer',
    hired: 'Hired',
    rejected: 'Rejected',
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-mono text-3xl font-bold text-white">Applications</h1>
        <p className="text-slate-400">Track your job applications, auto-apply logs, and saved opportunities</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {([
          { id: 'all', label: 'All', count: appTotal },
          { id: 'applied', label: 'Applied', count: appTotal },
          { id: 'auto', label: 'Auto-Apply', count: autoApplyLogs.length },
          { id: 'saved', label: 'Saved', count: savedJobs.length },
        ] as const).map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)} className={`btn ${tab === t.id ? 'bg-cyan-600 text-white' : 'bg-slate-800 text-slate-300 border border-slate-700'}`}>
            {t.label} <span className="ml-1 text-xs opacity-70">({t.count})</span>
          </button>
        ))}
      </div>

      {(tab === 'all' || tab === 'applied') && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-slate-300">Submitted Applications</h3>
          {applications.length === 0 ? (
            <EmptyState icon={<Zap className="h-12 w-12" />} title="No applications yet" description="Browse the job feed and apply to positions." />
          ) : applications.map((app) => (
            <GlassmorphicCard key={app.id} className="p-4 cursor-pointer hover:border-cyan-500/30 transition-colors" onClick={() => openDetail(app)}>
              <div className="flex items-center justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-white truncate">{app.job_posting?.title}</h3>
                    <Badge color={statusColors[app.status]}>{app.status}</Badge>
                  </div>
                  <div className="mt-1 flex items-center gap-3 text-xs text-slate-500">
                    <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{new Date(app.created_at).toLocaleDateString()}</span>
                    <span className="capitalize">{app.applied_via.replace('_', ' ')}</span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {app.match_score && <div className="text-right"><div className={`text-lg font-bold ${scoreColor(app.match_score)}`}>{app.match_score.toFixed(0)}</div><div className="text-xs text-slate-500">match</div></div>}
                  <ChevronRight className="h-4 w-4 text-slate-500" />
                </div>
              </div>
            </GlassmorphicCard>
          ))}
          {applications.length > 0 && (
            <div className="flex flex-col items-center gap-3 pt-1 sm:flex-row sm:justify-between">
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <span>{appTotal} total{appsLoading && <Loader2 className="h-3 w-3 animate-spin ml-1" />}</span>
                <select value={appPageSize} onChange={(e) => { setAppPageSize(Number(e.target.value)); setAppPage(1); }} className="btn bg-slate-800 text-slate-300 border border-slate-700 text-xs px-2 py-1">
                  <option value={10}>10 / page</option>
                  <option value={20}>20 / page</option>
                  <option value={50}>50 / page</option>
                </select>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => setAppPage(p => Math.max(1, p - 1))} disabled={appPage <= 1 || appsLoading} className="btn-secondary text-xs disabled:opacity-40">Prev</button>
                <span className="text-xs text-slate-400">Page {appPage} / {appTotalPages}</span>
                <button onClick={() => setAppPage(p => Math.min(appTotalPages, p + 1))} disabled={appPage >= appTotalPages || appsLoading} className="btn-secondary text-xs disabled:opacity-40">Next</button>
              </div>
            </div>
          )}
        </div>
      )}

      {tab === 'auto' && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-slate-300">Auto-Apply Logs</h3>
          {autoApplyLogs.length === 0 ? (
            <EmptyState icon={<Zap className="h-12 w-12" />} title="No auto-apply attempts" description="Auto-apply logs will appear here." />
          ) : autoApplyLogs.map((log) => {
            const config = autoStatusConfig[log.status] || autoStatusConfig.pending;
            const StatusIcon = config.icon;
            return (
              <GlassmorphicCard key={log.id} className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-white truncate">{(log as any).job_posting?.title || 'Job'}</h3>
                      <Badge color={config.color}><StatusIcon className={`h-3 w-3 ${log.status === 'in_progress' ? 'animate-spin' : ''}`} /> {config.label}</Badge>
                    </div>
                    <div className="mt-1 flex items-center gap-3 text-xs text-slate-500">
                      <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{new Date(log.created_at).toLocaleDateString()}</span>
                      <span>Attempt #{log.attempt_count}</span>
                      {log.submitted_at && <span>Submitted: {new Date(log.submitted_at).toLocaleString()}</span>}
                    </div>
                    {log.error_message && (
                      <div className="mt-2 flex items-start gap-2 rounded-lg bg-red-500/10 border border-red-500/20 p-2">
                        <AlertCircle className="h-3.5 w-3.5 text-red-400 flex-shrink-0 mt-0.5" />
                        <p className="text-xs text-red-400">{log.error_message}</p>
                      </div>
                    )}
                  </div>
                  {(log as any).job_posting?.external_url && (
                    <a href={(log as any).job_posting.external_url} target="_blank" rel="noopener noreferrer" className="btn-secondary flex-shrink-0"><ExternalLink className="h-3.5 w-3.5" /></a>
                  )}
                </div>
              </GlassmorphicCard>
            );
          })}
        </div>
      )}

      {tab === 'saved' && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-slate-300">Saved Jobs</h3>
          {savedJobs.length === 0 ? (
            <EmptyState icon={<Bookmark className="h-12 w-12" />} title="No saved jobs" description="Bookmark jobs from the feed to review later." />
          ) : savedJobs.map((saved) => (
            <GlassmorphicCard key={saved.id} className="p-4">
              <div className="flex items-center justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <h3 className="font-semibold text-white truncate">{saved.job_posting?.title}</h3>
                  <div className="mt-1 text-xs text-slate-500">{saved.job_posting?.location || 'Remote'}</div>
                  {saved.job_posting && saved.job_posting.requirements.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">{saved.job_posting.requirements.slice(0, 4).map((r, i) => <span key={i} className="badge bg-slate-800 text-slate-300 border border-slate-700">{r}</span>)}</div>
                  )}
                </div>
                <div className="flex flex-col items-end gap-2">
                  {saved.match_score_at_save && <div className="text-right"><div className={`text-lg font-bold ${scoreColor(saved.match_score_at_save)}`}>{saved.match_score_at_save.toFixed(0)}</div><div className="text-xs text-slate-500">match</div></div>}
                  <div className="flex items-center gap-2">
                    {saved.job_posting && <button onClick={() => handleApplySaved(saved.job_posting!)} className="btn-primary text-xs"><Zap className="h-3 w-3" /> Apply</button>}
                    {saved.job_posting?.external_url && <a href={saved.job_posting.external_url} target="_blank" rel="noopener noreferrer" className="btn-secondary"><ExternalLink className="h-3.5 w-3.5" /></a>}
                  </div>
                </div>
              </div>
            </GlassmorphicCard>
          ))}
        </div>
      )}

      {detailApp && (
        <Modal isOpen onClose={closeDetail} className="max-w-3xl max-h-[90vh]">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <h2 className="font-semibold text-white truncate">{detailApp.job_posting?.title}</h2>
              {detailApp.job_posting && (
                <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-400">
                  {detailApp.job_posting.location && (
                    <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{detailApp.job_posting.location}</span>
                  )}
                  {detailApp.job_posting.job_type && (
                    <span className="flex items-center gap-1"><Briefcase className="h-3.5 w-3.5" />{detailApp.job_posting.job_type}</span>
                  )}
                  {detailApp.job_posting.is_remote && <span className="badge bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">Remote</span>}
                  {formatSalary(detailApp.job_posting) && (
                    <span className="flex items-center gap-1"><DollarSign className="h-3.5 w-3.5" />{formatSalary(detailApp.job_posting)}</span>
                  )}
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Badge color={statusColors[detailApp.status] || 'slate'}>{statusLabels[detailApp.status] || detailApp.status}</Badge>
            </div>
          </div>

          {detailApp.job_posting && (
            <div className="mt-6 border-t border-slate-700/50 pt-6">
              <h3 className="text-sm font-semibold text-slate-300 mb-2">About this role</h3>
              <p className="text-sm text-slate-400 leading-relaxed whitespace-pre-line">{detailApp.job_posting.description}</p>
              {detailApp.job_posting.requirements.length > 0 && (
                <div className="mt-4">
                  <h4 className="text-sm font-semibold text-slate-300 mb-2">Requirements</h4>
                  <div className="flex flex-wrap gap-1.5">{detailApp.job_posting.requirements.map((r, i) => <span key={i} className="badge bg-slate-800 text-slate-300 border border-slate-700">{r}</span>)}</div>
                </div>
              )}
            </div>
          )}

          {detailApp.interview_link && (
            <div className="mt-6 border-t border-slate-700/50 pt-6 flex items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-emerald-400">Interview Scheduled</h3>
                <p className="text-xs text-slate-500 mt-0.5">The employer invited you to a video interview.</p>
              </div>
              <a href={detailApp.interview_link} target="_blank" rel="noopener noreferrer" className="btn-primary text-sm flex-shrink-0"><ExternalLink className="h-3.5 w-3.5 mr-1" /> Join</a>
            </div>
          )}

          <div className="mt-6 border-t border-slate-700/50 pt-6">
            <h3 className="text-sm font-semibold text-slate-300 mb-4">Status Timeline</h3>
            {historyLoading ? (
              <div className="flex justify-center py-8"><Spinner size={24} /></div>
            ) : history.length === 0 ? (
              <p className="text-slate-500 text-sm">No history available</p>
            ) : (
              <div className="relative pl-4 border-l border-slate-700/50">
                {history.map((h, idx) => {
                  const isCurrent = h.new_status === detailApp.status;
                  const statusIdx = statusOrder.indexOf(h.new_status);
                  const isCompleted = statusIdx !== -1 && statusOrder.indexOf(detailApp.status) !== -1 && statusIdx <= statusOrder.indexOf(detailApp.status);
                  return (
                    <div key={h.id} className="relative mb-6 last:mb-0">
                      <div className="absolute left-[-9px] top-0.5 flex h-3 w-3 items-center justify-center">
                        <div className={`h-2 w-2 rounded-full border-2 transition-colors ${
                          isCompleted || isCurrent ? 'bg-cyan-500 border-cyan-500' : 'bg-slate-700 border-slate-600'
                        }`} />
                      </div>
                      <div className="ml-4">
                        <div className="flex items-center gap-2">
                          <span className={`font-medium text-sm ${isCompleted || isCurrent ? 'text-white' : 'text-slate-500'}`}>
                            {statusLabels[h.new_status] || h.new_status}
                          </span>
                          {h.reason && <span className="badge bg-slate-800 text-slate-300 border border-slate-700 text-xs">{h.reason}</span>}
                        </div>
                        <div className="mt-1 text-xs text-slate-500">
                          {new Date(h.created_at).toLocaleString()}
                          {h.changed_by && <span className="ml-2">by {h.notes || 'system'}</span>}
                        </div>
                        {h.notes && h.reason === 'manual' && (
                          <div className="mt-2 text-xs text-slate-400 italic">\"{h.notes}\"</div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="mt-6 border-t border-slate-700/50 pt-6 flex items-center justify-end gap-2">
            {detailApp.job_posting?.external_url && (
              <a href={detailApp.job_posting.external_url} target="_blank" rel="noopener noreferrer" className="btn-secondary">
                <ExternalLink className="h-3.5 w-3.5 mr-1" /> View Job
              </a>
            )}
            <button onClick={closeDetail} className="btn-primary">Close</button>
          </div>
        </Modal>
      )}
    </div>
  );
}
