import { useState, useEffect } from 'react';
import { Target, Zap, CheckCircle2, XCircle, AlertCircle, Save } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { getCurrentResume, getJobPostings, saveMatchScore } from '@/lib/api';
import { computeMatchScore, scoreLabel, type ScoreResult } from '@/lib/matching';
import type { Resume, JobPosting, GapReport } from '@/types';
import { ScoreRing, ProgressBar, Spinner, EmptyState } from '@/components/ui';
import { RewriteSuggestions } from '@/components/RewriteSuggestions';
import { generateSeekerGapSummary } from '@/lib/gap-summary';
import { Lightbulb, TrendingUp, AlertTriangle } from 'lucide-react';

export function MatchScorePage() {
  const { profile } = useAuth();
  const [resume, setResume] = useState<Resume | null>(null);
  const [jobs, setJobs] = useState<JobPosting[]>([]);
  const [selectedJobId, setSelectedJobId] = useState<string>('');
  const [jdText, setJdText] = useState('');
  const [result, setResult] = useState<ScoreResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [computing, setComputing] = useState(false);
  const [mode, setMode] = useState<'paste' | 'select'>('paste');

  useEffect(() => {
    if (!profile) return;
    (async () => {
      const [r, j] = await Promise.all([
        getCurrentResume(profile.id),
        getJobPostings({ status: 'active' }),
      ]);
      setResume(r);
      setJobs(j);
      setLoading(false);
    })();
  }, [profile]);

  function handleCompute() {
    if (!resume) return;
    setComputing(true);

    let jd = jdText;
    let requirements: string[] = [];

    if (mode === 'select' && selectedJobId) {
      const job = jobs.find((j) => j.id === selectedJobId);
      if (job) {
        jd = job.description;
        requirements = job.requirements;
      }
    }

    setTimeout(async () => {
      const score = computeMatchScore(resume.raw_text, resume.skills, jd, requirements);
      setResult(score);

      if (mode === 'select' && selectedJobId) {
        try {
          await saveMatchScore({
            resume_id: resume.id,
            job_posting_id: selectedJobId,
            direction: 'seeker',
            overall_score: score.overall_score,
            keyword_score: score.keyword_score,
            semantic_score: score.semantic_score,
            gap_report: score.gap_report as any,
          });
        } catch (e) {
          console.error(e);
        }
      }

      setComputing(false);
    }, 600);
  }

  if (loading) return <div className="flex justify-center py-20"><Spinner size={32} /></div>;

  if (!resume) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-slate-900">Match Score Analyzer</h1>
        <EmptyState
          icon={<Target className="h-12 w-12" />}
          title="Upload a resume first"
          description="You need to upload a resume before you can compute match scores against job descriptions."
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Match Score Analyzer</h1>
        <p className="text-slate-500">Paste a job description or select a posting to see your match score</p>
      </div>

      {/* Mode toggle */}
      <div className="flex gap-2">
        <button
          onClick={() => setMode('paste')}
          className={`btn ${mode === 'paste' ? 'bg-primary-600 text-white' : 'bg-white text-slate-700 border border-slate-300'}`}
        >
          Paste JD
        </button>
        <button
          onClick={() => setMode('select')}
          className={`btn ${mode === 'select' ? 'bg-primary-600 text-white' : 'bg-white text-slate-700 border border-slate-300'}`}
        >
          Select from Jobs
        </button>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Input */}
        <div className="card p-6">
          {mode === 'paste' ? (
            <>
              <label className="label">Job Description</label>
              <textarea
                value={jdText}
                onChange={(e) => setJdText(e.target.value)}
                placeholder="Paste the full job description here..."
                className="input h-64 resize-none"
              />
              <button
                onClick={handleCompute}
                disabled={computing || !jdText.trim()}
                className="btn-primary mt-4 w-full"
              >
                {computing ? <Spinner size={16} /> : <Zap className="h-4 w-4" />}
                Analyze Match
              </button>
            </>
          ) : (
            <>
              <label className="label">Select a Job Posting</label>
              <select
                value={selectedJobId}
                onChange={(e) => setSelectedJobId(e.target.value)}
                className="input"
              >
                <option value="">Choose a job...</option>
                {jobs.map((job) => (
                  <option key={job.id} value={job.id}>{job.title} — {job.location || 'Remote'}</option>
                ))}
              </select>
              {selectedJobId && (() => {
                const job = jobs.find((j) => j.id === selectedJobId);
                return job ? (
                  <div className="mt-4 rounded-lg border border-slate-200 p-4">
                    <div className="font-medium text-slate-900">{job.title}</div>
                    <div className="mt-1 text-sm text-slate-600 line-clamp-4">{job.description}</div>
                    {job.requirements.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {job.requirements.map((r, i) => (
                          <span key={i} className="badge bg-slate-100 text-slate-600">{r}</span>
                        ))}
                      </div>
                    )}
                  </div>
                ) : null;
              })()}
              <button
                onClick={handleCompute}
                disabled={computing || !selectedJobId}
                className="btn-primary mt-4 w-full"
              >
                {computing ? <Spinner size={16} /> : <Zap className="h-4 w-4" />}
                Analyze Match
              </button>
            </>
          )}
        </div>

        {/* Result */}
        <div className="card p-6">
          {!result && !computing && (
            <EmptyState
              icon={<Target className="h-12 w-12" />}
              title="No analysis yet"
              description="Your match score and gap report will appear here after analysis."
            />
          )}

          {computing && (
            <div className="flex flex-col items-center justify-center py-20">
              <Spinner size={32} />
              <p className="mt-4 text-sm text-slate-500">Computing match score...</p>
            </div>
          )}

          {result && !computing && (
            <div className="animate-fade-in space-y-5">
              <div className="flex flex-col items-center">
                <ScoreRing score={result.overall_score} size={140} />
                <div className="mt-2 text-sm font-medium text-slate-600">{scoreLabel(result.overall_score)}</div>
              </div>

              {/* Score breakdown */}
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">Keyword Match (40%)</span>
                    <span className="font-medium text-slate-900">{result.keyword_score.toFixed(1)}%</span>
                  </div>
                  <ProgressBar value={result.keyword_score} color="primary" />
                </div>
                <div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">Semantic Match (60%)</span>
                    <span className="font-medium text-slate-900">{result.semantic_score.toFixed(1)}%</span>
                  </div>
                  <ProgressBar value={result.semantic_score} color="accent" />
                </div>
              </div>

              {/* Natural language gap summary */}
              {(() => {
                const job = jobs.find((j) => j.id === selectedJobId);
                const summary = generateSeekerGapSummary(result.gap_report, result.overall_score, job?.title);
                return (
                  <div className="space-y-3 border-t border-slate-200 pt-4">
                    <div className="flex items-center gap-2">
                      <Lightbulb className="h-4 w-4 text-accent-600" />
                      <h4 className="text-sm font-semibold text-slate-700">AI Gap Summary</h4>
                    </div>
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
                  </div>
                );
              })()}

              {/* Gap report */}
              <div className="space-y-3 border-t border-slate-200 pt-4">
                <h4 className="text-sm font-semibold text-slate-700">Detailed Gap Report</h4>

                {result.gap_report.matched_skills.length > 0 && (
                  <div>
                    <div className="text-xs font-medium text-success-700 mb-1.5 flex items-center gap-1">
                      <CheckCircle2 className="h-3.5 w-3.5" /> Matched Skills
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {result.gap_report.matched_skills.map((s: string, i: number) => (
                        <span key={i} className="badge bg-success-100 text-success-700">{s}</span>
                      ))}
                    </div>
                  </div>
                )}

                {result.gap_report.missing_skills.length > 0 && (
                  <div>
                    <div className="text-xs font-medium text-danger-700 mb-1.5 flex items-center gap-1">
                      <XCircle className="h-3.5 w-3.5" /> Missing Skills
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {result.gap_report.missing_skills.map((s: string, i: number) => (
                        <span key={i} className="badge bg-danger-100 text-danger-700">{s}</span>
                      ))}
                    </div>
                  </div>
                )}

                {result.gap_report.keyword_mismatches.length > 0 && (
                  <div>
                    <div className="text-xs font-medium text-warning-700 mb-1.5 flex items-center gap-1">
                      <AlertCircle className="h-3.5 w-3.5" /> Resume Keywords Not in JD
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {result.gap_report.keyword_mismatches.slice(0, 10).map((s: string, i: number) => (
                        <span key={i} className="badge bg-warning-100 text-warning-700">{s}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Rewrite suggestions — only when a job is selected and score computed */}
      {result && !computing && mode === 'select' && selectedJobId && (() => {
        const job = jobs.find((j) => j.id === selectedJobId);
        if (!job) return null;
        return (
          <div className="card p-6">
            <RewriteSuggestions resume={resume} job={job} gapReport={result.gap_report} />
          </div>
        );
      })()}
    </div>
  );
}
