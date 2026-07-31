import { useEffect, useState } from 'react';
import { Users, Star, CheckCircle2, XCircle, ChevronRight, Lightbulb, TrendingUp, AlertTriangle, Download } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { getJobPostings, getApplicationsForJob, updateApplication } from '@/lib/api';
import { api } from '@/lib/api-client';
import { computeMatchScore } from '@/lib/matching';
import { generateGapSummary } from '@/lib/gap-summary';
import type { JobPosting, Application, Resume, Profile } from '@/types';
import { Spinner, EmptyState, Badge, ScoreRing } from '@/components/ui';

interface ApplicantWithDetails extends Application {
  resume?: Resume;
  profile?: Profile;
  score?: number;
  gapReport?: any;
}

export function ApplicantsPage() {
  const { profile } = useAuth();
  const [jobs, setJobs] = useState<JobPosting[]>([]);
  const [selectedJobId, setSelectedJobId] = useState('');
  const [applicants, setApplicants] = useState<ApplicantWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedApplicant, setSelectedApplicant] = useState<ApplicantWithDetails | null>(null);

  useEffect(() => {
    if (!profile) return;
    (async () => {
      const j = await getJobPostings({ employerId: profile.id, status: 'active' });
      setJobs(j);
      if (j.length > 0) {
        setSelectedJobId(j[0].id);
      }
      setLoading(false);
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

        if (app.resume_id) {
          try {
            resume = await api.get<Resume>(`/api/v1/resumes/${app.resume_id}`);
          } catch { resume = null; }
        }

        try {
          applicantProfile = await api.get<Profile>(`/api/v1/auth/me`);
        } catch { applicantProfile = null; }

        let score = app.match_score || 0;
        let gapReport = null;

        if (resume && !app.match_score) {
          const result = computeMatchScore(resume.raw_text, resume.skills, job.description, job.requirements);
          score = result.overall_score;
          gapReport = result.gap_report;
          await updateApplication(app.id, { match_score: score });
        }

        detailed.push({
          ...app,
          resume: resume || undefined,
          profile: applicantProfile || undefined,
          score,
          gapReport,
        });
      }

      detailed.sort((a, b) => (b.score || 0) - (a.score || 0));
      setApplicants(detailed);
      setLoading(false);
    })();
  }, [selectedJobId, jobs]);

  function exportApplicantsCSV() {
    if (applicants.length === 0) {
      alert('No applicants to export.');
      return;
    }
    const job = jobs.find((j) => j.id === selectedJobId);
    const title = job ? job.title : 'Job';

    const headers = ['Candidate Name', 'Email', 'Applied Date', 'Status', 'Match Score (%)', 'Matched Skills', 'Missing Skills'];
    const rows = applicants.map((a) => {
      const name = a.profile?.full_name || 'Applicant';
      const email = a.profile?.email || '';
      const date = new Date(a.created_at).toLocaleDateString();
      const status = a.status;
      const score = a.score ? a.score.toFixed(1) : 'N/A';
      const matched = a.gapReport?.matched_skills ? a.gapReport.matched_skills.join('; ') : '';
      const missing = a.gapReport?.missing_skills ? a.gapReport.missing_skills.join('; ') : '';
      return [name, email, date, status, score, matched, missing]
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(',');
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `synapse_applicants_${title.toLowerCase().replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  async function handleStatusChange(app: ApplicantWithDetails, status: 'shortlisted' | 'rejected' | 'hired') {
    await updateApplication(app.id, { status });
    setApplicants(prev => prev.map(a => a.id === app.id ? { ...a, status } : a));
    if (selectedApplicant?.id === app.id) {
      setSelectedApplicant({ ...selectedApplicant, status });
    }
  }

  if (loading && !applicants.length) return <div className="flex justify-center py-20"><Spinner size={32} /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Applicant Rankings</h1>
          <p className="text-slate-500">View candidates ranked by match score for each posting</p>
        </div>
        {applicants.length > 0 && (
          <button onClick={exportApplicantsCSV} className="btn-secondary flex items-center gap-2">
            <Download className="h-4 w-4" />
            Export Shortlist (CSV)
          </button>
        )}
      </div>

      {/* Job selector */}
      {jobs.length > 0 && (
        <div>
          <label className="label">Select Job Posting</label>
          <select className="input max-w-md" value={selectedJobId} onChange={(e) => setSelectedJobId(e.target.value)}>
            {jobs.map((job) => (
              <option key={job.id} value={job.id}>{job.title}</option>
            ))}
          </select>
        </div>
      )}

      {jobs.length === 0 ? (
        <EmptyState icon={<Users className="h-12 w-12" />} title="No job postings" description="Create a job posting first to start receiving applications." />
      ) : applicants.length === 0 ? (
        <EmptyState icon={<Users className="h-12 w-12" />} title="No applicants yet" description="No one has applied to this posting yet. Check back later." />
      ) : (
        <>
          {/* Ranked table */}
          <div className="card overflow-hidden">
            <table className="w-full">
              <thead className="border-b border-slate-200 bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Candidate</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Match Score</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Applied</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {applicants.map((app) => (
                  <tr key={app.id} className="hover:bg-slate-50 cursor-pointer" onClick={() => setSelectedApplicant(app)}>
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-900">{app.profile?.full_name || 'Unknown'}</div>
                      <div className="text-xs text-slate-500">{app.profile?.email}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className={`text-lg font-bold ${(app.score || 0) >= 75 ? 'text-success-600' : (app.score || 0) >= 50 ? 'text-warning-600' : 'text-danger-600'}`}>
                          {(app.score || 0).toFixed(0)}
                        </div>
                        <div className="h-2 w-16 rounded-full bg-slate-200">
                          <div className={`h-2 rounded-full ${(app.score || 0) >= 75 ? 'bg-success-500' : (app.score || 0) >= 50 ? 'bg-warning-500' : 'bg-danger-500'}`} style={{ width: `${app.score || 0}%` }} />
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge color={app.status === 'applied' ? 'blue' : app.status === 'shortlisted' ? 'amber' : app.status === 'hired' ? 'green' : 'red'}>
                        {app.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-500">{new Date(app.created_at).toLocaleDateString()}</td>
                    <td className="px-4 py-3">
                      <ChevronRight className="h-4 w-4 text-slate-400" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Detail drawer */}
          {selectedApplicant && (
            <div className="fixed inset-0 z-50 flex justify-end" onClick={() => setSelectedApplicant(null)}>
              <div className="absolute inset-0 bg-slate-900/50" />
              <div className="relative z-10 w-full max-w-md overflow-y-auto bg-white shadow-xl animate-slide-in-right" onClick={(e) => e.stopPropagation()}>
                <div className="sticky top-0 flex items-center justify-between border-b border-slate-200 bg-white px-5 py-3.5">
                  <h3 className="font-semibold text-slate-900">Candidate Details</h3>
                  <button onClick={() => setSelectedApplicant(null)} className="text-slate-400 hover:text-slate-600">&times;</button>
                </div>
                <div className="p-5 space-y-5">
                  <div className="flex items-center gap-4">
                    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary-100 text-xl font-bold text-primary-700">
                      {selectedApplicant.profile?.full_name?.charAt(0) || '?'}
                    </div>
                    <div>
                      <div className="font-semibold text-slate-900">{selectedApplicant.profile?.full_name}</div>
                      <div className="text-sm text-slate-500">{selectedApplicant.profile?.email}</div>
                    </div>
                  </div>

                  <div className="flex justify-center">
                    <ScoreRing score={selectedApplicant.score || 0} size={100} />
                  </div>

                  {selectedApplicant.resume?.skills && selectedApplicant.resume.skills.length > 0 && (
                    <div>
                      <h4 className="text-sm font-semibold text-slate-700 mb-2">Candidate Skills</h4>
                      <div className="flex flex-wrap gap-1.5">
                        {selectedApplicant.resume.skills.map((s, i) => (
                          <span key={i} className="badge bg-primary-100 text-primary-700">{s}</span>
                        ))}
                      </div>
                    </div>
                  )}

                  {selectedApplicant.gapReport && (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <Lightbulb className="h-4 w-4 text-accent-600" />
                        <h4 className="text-sm font-semibold text-slate-700">AI Gap Summary</h4>
                      </div>
                      {(() => {
                        const job = jobs.find(j => j.id === selectedJobId);
                        const summary = generateGapSummary(
                          selectedApplicant.gapReport,
                          selectedApplicant.score || 0,
                          job?.title
                        );
                        return (
                          <>
                            <p className="text-sm font-medium text-slate-800">{summary.headline}</p>
                            {summary.strengths.length > 0 && (
                              <div className="space-y-1.5">
                                {summary.strengths.map((s, i) => (
                                  <div key={i} className="flex items-start gap-2 text-sm text-slate-600">
                                    <CheckCircle2 className="h-4 w-4 text-success-600 flex-shrink-0 mt-0.5" />
                                    <span>{s}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                            {summary.concerns.length > 0 && (
                              <div className="space-y-1.5">
                                {summary.concerns.map((c, i) => (
                                  <div key={i} className="flex items-start gap-2 text-sm text-slate-600">
                                    <AlertTriangle className="h-4 w-4 text-warning-600 flex-shrink-0 mt-0.5" />
                                    <span>{c}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                            <div className="flex items-start gap-2 rounded-lg bg-primary-50 p-3">
                              <TrendingUp className="h-4 w-4 text-primary-600 flex-shrink-0 mt-0.5" />
                              <p className="text-sm text-slate-700">{summary.recommendation}</p>
                            </div>
                          </>
                        );
                      })()}

                      <h4 className="text-sm font-semibold text-slate-700 pt-2 border-t border-slate-100">Detailed Gap Analysis</h4>
                      {selectedApplicant.gapReport.matched_skills?.length > 0 && (
                        <div>
                          <div className="text-xs font-medium text-success-700 mb-1.5 flex items-center gap-1">
                            <CheckCircle2 className="h-3.5 w-3.5" /> Matched
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {selectedApplicant.gapReport.matched_skills.map((s: string, i: number) => (
                              <span key={i} className="badge bg-success-100 text-success-700">{s}</span>
                            ))}
                          </div>
                        </div>
                      )}
                      {selectedApplicant.gapReport.missing_skills?.length > 0 && (
                        <div>
                          <div className="text-xs font-medium text-danger-700 mb-1.5 flex items-center gap-1">
                            <XCircle className="h-3.5 w-3.5" /> Missing
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {selectedApplicant.gapReport.missing_skills.map((s: string, i: number) => (
                              <span key={i} className="badge bg-danger-100 text-danger-700">{s}</span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {selectedApplicant.resume?.parsed_data?.summary && (
                    <div>
                      <h4 className="text-sm font-semibold text-slate-700 mb-1">Summary</h4>
                      <p className="text-sm text-slate-600">{selectedApplicant.resume.parsed_data.summary}</p>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex flex-wrap gap-2 border-t border-slate-200 pt-4">
                    {selectedApplicant.status === 'applied' && (
                      <button onClick={() => handleStatusChange(selectedApplicant, 'shortlisted')} className="btn bg-warning-500 text-white hover:bg-warning-600">
                        <Star className="h-4 w-4" /> Shortlist
                      </button>
                    )}
                    {selectedApplicant.status === 'shortlisted' && (
                      <button onClick={() => handleStatusChange(selectedApplicant, 'hired')} className="btn bg-success-600 text-white hover:bg-success-700">
                        <CheckCircle2 className="h-4 w-4" /> Mark Hired
                      </button>
                    )}
                    {selectedApplicant.status !== 'rejected' && selectedApplicant.status !== 'hired' && (
                      <button onClick={() => handleStatusChange(selectedApplicant, 'rejected')} className="btn bg-danger-50 text-danger-600 hover:bg-danger-100">
                        <XCircle className="h-4 w-4" /> Reject
                      </button>
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
