import { useEffect, useState } from 'react';
import { Users, Star, CheckCircle2, XCircle, ChevronRight, Lightbulb, Download, Search } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useSearchParams } from 'react-router-dom';
import { getJobPostings, getApplicationsForJob, updateApplication, getGapExplanation, getApplicationHistory } from '@/lib/api';
import { api } from '@/lib/api-client';
import { computeMatchScore } from '@/lib/matching';
import type { JobPosting, Application, Resume, Profile, ApplicationStatusHistory } from '@/types';
import { Spinner, EmptyState, Badge, ScoreRing } from '@/components/ui';
import { GlassmorphicCard } from '@/components/GlassmorphicCard';

interface ApplicantWithDetails extends Application {
  resume?: Resume;
  profile?: Profile;
  score?: number;
  gapReport?: any;
}

export function ApplicantsPage() {
  const { profile } = useAuth();
  const [searchParams] = useSearchParams();
  const [applicantSearch, setApplicantSearch] = useState(searchParams.get('q') || '');
  const [jobs, setJobs] = useState<JobPosting[]>([]);
  const [selectedJobId, setSelectedJobId] = useState('');
  const [applicants, setApplicants] = useState<ApplicantWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedApplicant, setSelectedApplicant] = useState<ApplicantWithDetails | null>(null);
  const [aiExplanation, setAiExplanation] = useState('');
  const [history, setHistory] = useState<ApplicationStatusHistory[]>([]);

  useEffect(() => {
    if (!profile) return;
    (async () => {
      const j = await getJobPostings({ employerId: profile.id, status: 'active' });
      setJobs(j); if (j.length > 0) setSelectedJobId(j[0].id); setLoading(false);
    })();
  }, [profile]);

  useEffect(() => {
    if (!selectedJobId) return;
    (async () => {
      setLoading(true);
      const job = jobs.find(j => j.id === selectedJobId);
      if (!job) return;
      const apps = await getApplicationsForJob(selectedJobId);
      const detailed: ApplicantWithDetails[] = [];
      for (const app of apps) {
        let resume: Resume | null = null;
        let applicantProfile: Profile | null = null;
        if (app.resume_id) { try { resume = await api.get<Resume>(`/api/v1/resumes/${app.resume_id}`); } catch { resume = null; } }
        try { applicantProfile = await api.get<Profile>(`/api/v1/auth/users/${app.seeker_id}`); } catch { applicantProfile = null; }
        let score = app.match_score || 0;
        let gapReport = null;
        if (resume && !app.match_score) {
          const result = computeMatchScore(resume.raw_text, resume.skills, job.description, job.requirements);
          score = result.overall_score; gapReport = result.gap_report;
          await updateApplication(app.id, { match_score: score });
        }
        detailed.push({ ...app, resume: resume || undefined, profile: applicantProfile || undefined, score, gapReport });
      }
      detailed.sort((a, b) => (b.score || 0) - (a.score || 0));
      setApplicants(detailed); setLoading(false);
    })();
  }, [selectedJobId, jobs]);

  useEffect(() => {
    if (!selectedApplicant || !selectedApplicant.resume_id || !selectedJobId) { setAiExplanation(''); return; }
    (async () => {
      try { const result = await getGapExplanation({ resume_id: selectedApplicant.resume_id, job_posting_id: selectedJobId }); setAiExplanation(result.explanation); } catch { setAiExplanation(''); }
    })();
  }, [selectedApplicant, selectedJobId]);

  useEffect(() => {
    if (!selectedApplicant) { setHistory([]); return; }
    (async () => {
      try { setHistory(await getApplicationHistory(selectedApplicant.id)); } catch { setHistory([]); }
    })();
  }, [selectedApplicant]);

  function exportApplicantsCSV() {
    if (filteredApplicants.length === 0) { alert('No applicants to export.'); return; }
    const job = jobs.find((j) => j.id === selectedJobId);
    const title = job ? job.title : 'Job';
    const headers = ['Candidate Name', 'Email', 'Applied Date', 'Status', 'Match Score (%)', 'Matched Skills', 'Missing Skills'];
    const rows = filteredApplicants.map((a) => {
      return [a.profile?.full_name || 'Applicant', a.profile?.email || '', new Date(a.created_at).toLocaleDateString(), a.status, a.score ? a.score.toFixed(1) : 'N/A', a.gapReport?.matched_skills?.join('; ') || '', a.gapReport?.missing_skills?.join('; ') || ''].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',');
    });
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows].join('\n');
    const link = document.createElement('a'); link.setAttribute('href', encodeURI(csvContent));
    link.setAttribute('download', `synapse_applicants_${title.toLowerCase().replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
  }

  async function handleStatusChange(app: ApplicantWithDetails, status: 'shortlisted' | 'rejected' | 'hired') {
    await updateApplication(app.id, { status });
    setApplicants(prev => prev.map(a => a.id === app.id ? { ...a, status } : a));
    if (selectedApplicant?.id === app.id) setSelectedApplicant({ ...selectedApplicant, status });
  }

  if (loading && !applicants.length) return <div className="flex justify-center py-20"><Spinner size={32} /></div>;

  const q = applicantSearch.trim().toLowerCase();
  const filteredApplicants = q
    ? applicants.filter((a) => {
        const name = a.profile?.full_name?.toLowerCase() || '';
        const email = a.profile?.email?.toLowerCase() || '';
        const skills = a.resume?.skills?.join(' ')?.toLowerCase() || '';
        const jobTitle = (a as any).job_posting?.title?.toLowerCase() || '';
        return name.includes(q) || email.includes(q) || skills.includes(q) || jobTitle.includes(q);
      })
    : applicants;

  const inputClass = "w-full rounded-lg border border-slate-700 bg-slate-800/50 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500";
  const scoreColor = (s: number) => s >= 75 ? 'text-emerald-400' : s >= 50 ? 'text-amber-400' : 'text-red-400';
  const scoreBar = (s: number) => s >= 75 ? 'bg-emerald-500' : s >= 50 ? 'bg-amber-500' : 'bg-red-500';
  const statusColors: Record<string, string> = { applied: 'blue', shortlisted: 'amber', hired: 'green', rejected: 'red' };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-mono text-3xl font-bold text-white">Applicant Rankings</h1>
          <p className="text-slate-400">View candidates ranked by match score</p>
        </div>
        {applicants.length > 0 && (
          <button onClick={exportApplicantsCSV} className="btn-secondary flex items-center gap-2"><Download className="h-4 w-4" /> Export CSV</button>
        )}
      </div>

      {jobs.length > 0 && (
        <div>
          <label className="label text-slate-300">Select Job Posting</label>
          <select className={`${inputClass} max-w-md`} value={selectedJobId} onChange={(e) => setSelectedJobId(e.target.value)}>
            {jobs.map((job) => <option key={job.id} value={job.id}>{job.title}</option>)}
          </select>
        </div>
      )}

      {applicants.length > 0 && (
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
          <input value={applicantSearch} onChange={(e) => setApplicantSearch(e.target.value)} placeholder="Search by name, email, or skill..." className={`${inputClass} pl-10`} />
        </div>
      )}

      {jobs.length === 0 ? (
        <EmptyState icon={<Users className="h-12 w-12" />} title="No job postings" description="Create a posting first to receive applications." />
      ) : applicants.length === 0 ? (
        <EmptyState icon={<Users className="h-12 w-12" />} title="No applicants yet" description="No one has applied to this posting yet." />
      ) : filteredApplicants.length === 0 ? (
        <EmptyState icon={<Search className="h-12 w-12" />} title="No matching applicants" description="Try a different search term." />
      ) : (
        <>
          {(() => {
            const statusCounts = filteredApplicants.reduce<Record<string, number>>((acc, a) => { acc[a.status] = (acc[a.status] || 0) + 1; return acc; }, {});
            const avg = Math.round(filteredApplicants.reduce((s, a) => s + (a.score || 0), 0) / filteredApplicants.length);
            const statusMeta: Record<string, { label: string; dot: string; text: string }> = {
              applied: { label: 'Applied', dot: 'bg-blue-500', text: 'text-blue-400' },
              shortlisted: { label: 'Shortlisted', dot: 'bg-amber-500', text: 'text-amber-400' },
              rejected: { label: 'Rejected', dot: 'bg-red-500', text: 'text-red-400' },
              hired: { label: 'Hired', dot: 'bg-emerald-500', text: 'text-emerald-400' },
            };
            return (
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
                <GlassmorphicCard className="p-4">
                  <div className="text-xs font-semibold text-slate-500 uppercase">Applicants</div>
                  <div className="mt-1 text-2xl font-bold text-white">{filteredApplicants.length}</div>
                </GlassmorphicCard>
                <GlassmorphicCard className="p-4">
                  <div className="text-xs font-semibold text-slate-500 uppercase">Avg Match</div>
                  <div className="mt-1 text-2xl font-bold text-cyan-400">{avg}%</div>
                </GlassmorphicCard>
                {(['applied', 'shortlisted', 'rejected', 'hired'] as const).map((s) => (
                  <GlassmorphicCard key={s} className="p-4">
                    <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase">
                      <span className={`h-2 w-2 rounded-full ${statusMeta[s].dot}`} /> {statusMeta[s].label}
                    </div>
                    <div className={`mt-1 text-2xl font-bold ${statusMeta[s].text}`}>{statusCounts[s] || 0}</div>
                  </GlassmorphicCard>
                ))}
              </div>
            );
          })()}

          <GlassmorphicCard className="overflow-hidden">
            <table className="w-full">
              <thead className="border-b border-slate-700/50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Candidate</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Match Score</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Applied</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {filteredApplicants.map((app) => (
                  <tr key={app.id} className="hover:bg-slate-800/30 cursor-pointer transition-colors" onClick={() => setSelectedApplicant(app)}>
                    <td className="px-4 py-3">
                      <div className="font-medium text-white">{app.profile?.full_name || 'Unknown'}</div>
                      <div className="text-xs text-slate-500">{app.profile?.email}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className={`text-lg font-bold ${scoreColor(app.score || 0)}`}>{(app.score || 0).toFixed(0)}</div>
                        <div className="h-2 w-16 rounded-full bg-slate-800">
                          <div className={`h-2 rounded-full ${scoreBar(app.score || 0)}`} style={{ width: `${app.score || 0}%` }} />
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3"><Badge color={statusColors[app.status]}>{app.status}</Badge></td>
                    <td className="px-4 py-3 text-sm text-slate-500">{new Date(app.created_at).toLocaleDateString()}</td>
                    <td className="px-4 py-3"><ChevronRight className="h-4 w-4 text-slate-600" /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </GlassmorphicCard>

          {selectedApplicant && (
            <div className="fixed inset-0 z-50 flex justify-end" onClick={() => setSelectedApplicant(null)}>
              <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" />
              <div className="relative z-10 w-full max-w-md overflow-y-auto bg-slate-900 border-l border-slate-800 shadow-xl animate-slide-in-right" onClick={(e) => e.stopPropagation()}>
                <div className="sticky top-0 flex items-center justify-between border-b border-slate-800 bg-slate-900 px-5 py-3.5">
                  <h3 className="font-semibold text-white">Candidate Details</h3>
                  <button onClick={() => setSelectedApplicant(null)} className="text-slate-400 hover:text-white">&times;</button>
                </div>
                <div className="p-5 space-y-5">
                  <div className="flex items-center gap-4">
                    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-cyan-500/20 border border-cyan-500/30 text-xl font-bold text-cyan-400">{selectedApplicant.profile?.full_name?.charAt(0) || '?'}</div>
                    <div>
                      <div className="font-semibold text-white">{selectedApplicant.profile?.full_name}</div>
                      <div className="text-sm text-slate-400">{selectedApplicant.profile?.email}</div>
                    </div>
                  </div>
                  <div className="flex justify-center"><ScoreRing score={selectedApplicant.score || 0} size={100} /></div>

                  {history.length > 0 && (
                    <div>
                      <h4 className="text-sm font-semibold text-slate-300 mb-3">Status Timeline</h4>
                      <ol className="relative space-y-3 border-l border-slate-700 pl-4">
                        {history.map((h) => (
                          <li key={h.id} className="relative">
                            <span className={`absolute -left-[21.5px] top-1 h-2.5 w-2.5 rounded-full ${h.reason === 'manual' ? 'bg-violet-500' : h.reason === 'auto_screen' ? 'bg-cyan-500' : 'bg-slate-500'}`} />
                            <div className="text-sm font-medium text-white capitalize">{h.new_status}</div>
                            <div className="text-xs text-slate-500">
                              {h.reason === 'manual' ? 'Manual decision' : h.reason === 'auto_screen' ? 'Auto-screened' : 'Submitted'}
                              {' · '}{new Date(h.created_at).toLocaleString()}
                            </div>
                            {h.notes && <div className="text-xs text-slate-400 mt-0.5">"{h.notes}"</div>}
                          </li>
                        ))}
                      </ol>
                    </div>
                  )}

                  {selectedApplicant.resume?.skills && selectedApplicant.resume.skills.length > 0 && (
                    <div>
                      <h4 className="text-sm font-semibold text-slate-300 mb-2">Candidate Skills</h4>
                      <div className="flex flex-wrap gap-1.5">{selectedApplicant.resume.skills.map((s, i) => <span key={i} className="badge bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">{s}</span>)}</div>
                    </div>
                  )}

                  {selectedApplicant.gapReport && (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2"><Lightbulb className="h-4 w-4 text-violet-400" /><h4 className="text-sm font-semibold text-slate-300">AI Gap Analysis</h4></div>
                      {aiExplanation ? <p className="text-sm text-slate-400 leading-relaxed">{aiExplanation}</p> : <div className="flex items-center gap-2 text-sm text-slate-500"><Spinner size={16} /> Loading AI analysis...</div>}
                      <h4 className="text-sm font-semibold text-slate-300 pt-2 border-t border-slate-800">Detailed Gap</h4>
                      {selectedApplicant.gapReport.matched_skills?.length > 0 && (
                        <div>
                          <div className="text-xs font-medium text-emerald-400 mb-1.5 flex items-center gap-1"><CheckCircle2 className="h-3.5 w-3.5" /> Matched</div>
                          <div className="flex flex-wrap gap-1.5">{selectedApplicant.gapReport.matched_skills.map((s: string, i: number) => <span key={i} className="badge bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">{s}</span>)}</div>
                        </div>
                      )}
                      {selectedApplicant.gapReport.missing_skills?.length > 0 && (
                        <div>
                          <div className="text-xs font-medium text-red-400 mb-1.5 flex items-center gap-1"><XCircle className="h-3.5 w-3.5" /> Missing</div>
                          <div className="flex flex-wrap gap-1.5">{selectedApplicant.gapReport.missing_skills.map((s: string, i: number) => <span key={i} className="badge bg-red-500/20 text-red-400 border border-red-500/30">{s}</span>)}</div>
                        </div>
                      )}
                    </div>
                  )}

                  {selectedApplicant.resume?.parsed_data?.summary && (
                    <div><h4 className="text-sm font-semibold text-slate-300 mb-1">Summary</h4><p className="text-sm text-slate-400">{selectedApplicant.resume.parsed_data.summary}</p></div>
                  )}

                  <div className="flex flex-wrap gap-2 border-t border-slate-800 pt-4">
                    {selectedApplicant.status === 'applied' && (
                      <button onClick={() => handleStatusChange(selectedApplicant, 'shortlisted')} className="btn bg-amber-500 text-white hover:bg-amber-600"><Star className="h-4 w-4" /> Shortlist</button>
                    )}
                    {selectedApplicant.status === 'shortlisted' && (
                      <button onClick={() => handleStatusChange(selectedApplicant, 'hired')} className="btn bg-emerald-600 text-white hover:bg-emerald-700"><CheckCircle2 className="h-4 w-4" /> Mark Hired</button>
                    )}
                    {selectedApplicant.status !== 'rejected' && selectedApplicant.status !== 'hired' && (
                      <button onClick={() => handleStatusChange(selectedApplicant, 'rejected')} className="btn bg-red-500/10 text-red-400 border border-red-500/30 hover:bg-red-500/20"><XCircle className="h-4 w-4" /> Reject</button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
