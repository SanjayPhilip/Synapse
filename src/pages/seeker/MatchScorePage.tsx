import { useState, useEffect } from 'react';
import { Target, Zap, CheckCircle2, XCircle, AlertCircle, Lightbulb, TrendingUp, AlertTriangle } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { getCurrentResume, getJobPostings, saveMatchScore } from '@/lib/api';
import { computeMatchScore, scoreLabel, type ScoreResult } from '@/lib/matching';
import type { Resume, JobPosting } from '@/types';
import { ScoreRing, ProgressBar, Spinner, EmptyState } from '@/components/ui';
import { RewriteSuggestions } from '@/components/RewriteSuggestions';
import { generateSeekerGapSummary } from '@/lib/gap-summary';
import { GlassmorphicCard } from '@/components/GlassmorphicCard';

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
      const [r, j] = await Promise.all([getCurrentResume(profile.id), getJobPostings({ status: 'active' })]);
      setResume(r); setJobs(j); setLoading(false);
    })();
  }, [profile]);

  function handleCompute() {
    if (!resume) return;
    setComputing(true);
    let jd = jdText;
    let requirements: string[] = [];
    if (mode === 'select' && selectedJobId) {
      const job = jobs.find((j) => j.id === selectedJobId);
      if (job) { jd = job.description; requirements = job.requirements; }
    }
    const score = computeMatchScore(resume.raw_text, resume.skills, jd, requirements);
    setResult(score);
    if (mode === 'select' && selectedJobId) {
      saveMatchScore({
        resume_id: resume.id, job_posting_id: selectedJobId, direction: 'seeker',
        overall_score: score.overall_score, keyword_score: score.keyword_score,
        semantic_score: score.semantic_score, gap_report: score.gap_report as any,
      }).catch((e) => console.error(e));
    }
    setComputing(false);
  }

  if (loading) return <div className="flex justify-center py-20"><Spinner size={32} /></div>;

  if (!resume) {
    return (
      <div className="space-y-6">
        <h1 className="font-mono text-3xl font-bold text-white">Match Score Analyzer</h1>
        <EmptyState icon={<Target className="h-12 w-12" />} title="Upload a resume first" description="You need a resume before computing match scores." />
      </div>
    );
  }

  const inputClass = "w-full rounded-lg border border-slate-700 bg-slate-800/50 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-mono text-3xl font-bold text-white">Match Score Analyzer</h1>
        <p className="text-slate-400">Paste a job description or select a posting to see your match score</p>
      </div>

      <div className="flex gap-2">
        <button onClick={() => setMode('paste')} className={`btn ${mode === 'paste' ? 'bg-cyan-600 text-white' : 'bg-slate-800 text-slate-300 border border-slate-700'}`}>Paste JD</button>
        <button onClick={() => setMode('select')} className={`btn ${mode === 'select' ? 'bg-cyan-600 text-white' : 'bg-slate-800 text-slate-300 border border-slate-700'}`}>Select from Jobs</button>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <GlassmorphicCard className="p-6">
          {mode === 'paste' ? (
            <>
              <label className="label text-slate-300">Job Description</label>
              <textarea value={jdText} onChange={(e) => setJdText(e.target.value)} placeholder="Paste the full job description here..." className={`${inputClass} h-64 resize-none`} />
              <button onClick={handleCompute} disabled={computing || !jdText.trim()} className="btn-primary mt-4 w-full">
                {computing ? <Spinner size={16} /> : <Zap className="h-4 w-4" />} Analyze Match
              </button>
            </>
          ) : (
            <>
              <label className="label text-slate-300">Select a Job Posting</label>
              <select value={selectedJobId} onChange={(e) => setSelectedJobId(e.target.value)} className={inputClass}>
                <option value="">Choose a job...</option>
                {jobs.map((job) => <option key={job.id} value={job.id}>{job.title} — {job.location || 'Remote'}</option>)}
              </select>
              {selectedJobId && (() => {
                const job = jobs.find((j) => j.id === selectedJobId);
                return job ? (
                  <div className="mt-4 rounded-xl border border-slate-700/50 bg-slate-800/30 p-4">
                    <div className="font-medium text-white">{job.title}</div>
                    <div className="mt-1 text-sm text-slate-400 line-clamp-4">{job.description}</div>
                    {job.requirements.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {job.requirements.map((r, i) => <span key={i} className="badge bg-slate-800 text-slate-300 border border-slate-700">{r}</span>)}
                      </div>
                    )}
                  </div>
                ) : null;
              })()}
              <button onClick={handleCompute} disabled={computing || !selectedJobId} className="btn-primary mt-4 w-full">
                {computing ? <Spinner size={16} /> : <Zap className="h-4 w-4" />} Analyze Match
              </button>
            </>
          )}
        </GlassmorphicCard>

        <GlassmorphicCard className="p-6">
          {!result && !computing && <EmptyState icon={<Target className="h-12 w-12" />} title="No analysis yet" description="Your match score will appear here after analysis." />}
          {computing && (
            <div className="flex flex-col items-center justify-center py-20">
              <Spinner size={32} />
              <p className="mt-4 text-sm text-slate-400">Computing match score...</p>
            </div>
          )}
          {result && !computing && (
            <div className="animate-fade-in space-y-5">
              <div className="flex flex-col items-center">
                <ScoreRing score={result.overall_score} size={140} />
                <div className="mt-2 text-sm font-medium text-slate-400">{scoreLabel(result.overall_score)}</div>
              </div>
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-sm"><span className="text-slate-400">Keyword Match (40%)</span><span className="font-medium text-white">{result.keyword_score.toFixed(1)}%</span></div>
                  <ProgressBar value={result.keyword_score} color="primary" />
                </div>
                <div>
                  <div className="flex justify-between text-sm"><span className="text-slate-400">Semantic Match (60%)</span><span className="font-medium text-white">{result.semantic_score.toFixed(1)}%</span></div>
                  <ProgressBar value={result.semantic_score} color="accent" />
                </div>
              </div>

              {(() => {
                const job = jobs.find((j) => j.id === selectedJobId);
                const summary = generateSeekerGapSummary(result.gap_report, result.overall_score, job?.title);
                return (
                  <div className="space-y-3 border-t border-slate-700/50 pt-4">
                    <div className="flex items-center gap-2"><Lightbulb className="h-4 w-4 text-violet-400" /><h4 className="text-sm font-semibold text-slate-300">AI Gap Summary</h4></div>
                    <p className="text-sm font-medium text-white">{summary.headline}</p>
                    {summary.strengths.length > 0 && <div className="space-y-1.5">{summary.strengths.map((s, i) => (
                      <div key={i} className="flex items-start gap-2 text-sm text-slate-300"><CheckCircle2 className="h-4 w-4 text-emerald-400 flex-shrink-0 mt-0.5" /><span>{s}</span></div>
                    ))}</div>}
                    {summary.concerns.length > 0 && <div className="space-y-1.5">{summary.concerns.map((c, i) => (
                      <div key={i} className="flex items-start gap-2 text-sm text-slate-300"><AlertTriangle className="h-4 w-4 text-amber-400 flex-shrink-0 mt-0.5" /><span>{c}</span></div>
                    ))}</div>}
                    <div className="flex items-start gap-2 rounded-xl bg-cyan-500/10 border border-cyan-500/20 p-3">
                      <TrendingUp className="h-4 w-4 text-cyan-400 flex-shrink-0 mt-0.5" />
                      <p className="text-sm text-slate-300">{summary.recommendation}</p>
                    </div>
                  </div>
                );
              })()}

              <div className="space-y-3 border-t border-slate-700/50 pt-4">
                <h4 className="text-sm font-semibold text-slate-300">Detailed Gap Report</h4>
                {result.gap_report.matched_skills.length > 0 && (
                  <div>
                    <div className="text-xs font-medium text-emerald-400 mb-1.5 flex items-center gap-1"><CheckCircle2 className="h-3.5 w-3.5" /> Matched Skills</div>
                    <div className="flex flex-wrap gap-1.5">{result.gap_report.matched_skills.map((s: string, i: number) => <span key={i} className="badge bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">{s}</span>)}</div>
                  </div>
                )}
                {result.gap_report.missing_skills.length > 0 && (
                  <div>
                    <div className="text-xs font-medium text-red-400 mb-1.5 flex items-center gap-1"><XCircle className="h-3.5 w-3.5" /> Missing Skills</div>
                    <div className="flex flex-wrap gap-1.5">{result.gap_report.missing_skills.map((s: string, i: number) => <span key={i} className="badge bg-red-500/20 text-red-400 border border-red-500/30">{s}</span>)}</div>
                  </div>
                )}
                {result.gap_report.keyword_mismatches.length > 0 && (
                  <div>
                    <div className="text-xs font-medium text-amber-400 mb-1.5 flex items-center gap-1"><AlertCircle className="h-3.5 w-3.5" /> Resume Keywords Not in JD</div>
                    <div className="flex flex-wrap gap-1.5">{result.gap_report.keyword_mismatches.slice(0, 10).map((s: string, i: number) => <span key={i} className="badge bg-amber-500/20 text-amber-400 border border-amber-500/30">{s}</span>)}</div>
                  </div>
                )}
              </div>
            </div>
          )}
        </GlassmorphicCard>
      </div>

      {result && !computing && mode === 'select' && selectedJobId && (() => {
        const job = jobs.find((j) => j.id === selectedJobId);
        if (!job) return null;
        return (
          <GlassmorphicCard className="p-6">
            <RewriteSuggestions resume={resume} job={job} />
          </GlassmorphicCard>
        );
      })()}
    </div>
  );
}
