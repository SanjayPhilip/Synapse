import { useState, useEffect } from 'react';
import { Sparkles, Check, X, Edit3, Save, RotateCcw, Lightbulb, TrendingUp, ArrowRight } from 'lucide-react';
import type { Resume, JobPosting, RewriteSuggestion } from '@/types';
import { getRewriteSuggestions, createRewriteSuggestions, updateRewriteSuggestion } from '@/lib/api';
import { computeMatchScore, scoreLabel } from '@/lib/matching';
import { computeProjectedScore } from '@/lib/projected-score';
import { Spinner, EmptyState } from '@/components/ui';
import type { GapReport } from '@/types';

export function RewriteSuggestions({ resume, job, gapReport }: {
  resume: Resume;
  job: JobPosting;
  gapReport: GapReport;
}) {
  const [suggestions, setSuggestions] = useState<RewriteSuggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');

  useEffect(() => {
    loadSuggestions();
  }, [resume.id, job.id]);

  async function loadSuggestions() {
    setLoading(true);
    try {
      const existing = await getRewriteSuggestions(resume.id, job.id);
      setSuggestions(existing);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  async function handleGenerate() {
    setGenerating(true);
    try {
      // Call backend Gemini-powered rewrite generation endpoint directly.
      // The backend generates AI suggestions and persists them in one step.
      const created = await createRewriteSuggestions(resume.id, job.id);
      setSuggestions(created);
    } catch (e) {
      console.error(e);
      alert('Failed to generate suggestions. Make sure the backend is running and your Gemini API key is configured.');
    } finally {
      setGenerating(false);
    }
  }

  async function handleAccept(suggestion: RewriteSuggestion) {
    await updateRewriteSuggestion(suggestion.id, {
      status: 'accepted',
      resolved_at: new Date().toISOString(),
    });
    setSuggestions(prev => prev.map(s => s.id === suggestion.id ? { ...s, status: 'accepted', resolved_at: new Date().toISOString() } : s));
  }

  async function handleReject(suggestion: RewriteSuggestion) {
    await updateRewriteSuggestion(suggestion.id, {
      status: 'rejected',
      resolved_at: new Date().toISOString(),
    });
    setSuggestions(prev => prev.map(s => s.id === suggestion.id ? { ...s, status: 'rejected', resolved_at: new Date().toISOString() } : s));
  }

  function startEdit(suggestion: RewriteSuggestion) {
    setEditingId(suggestion.id);
    setEditText(suggestion.suggested_text);
  }

  async function saveEdit(suggestion: RewriteSuggestion) {
    await updateRewriteSuggestion(suggestion.id, {
      status: 'edited',
      user_edited_text: editText,
      resolved_at: new Date().toISOString(),
    });
    setSuggestions(prev => prev.map(s => s.id === suggestion.id ? { ...s, status: 'edited', user_edited_text: editText, resolved_at: new Date().toISOString() } : s));
    setEditingId(null);
  }

  if (loading) return <div className="flex justify-center py-8"><Spinner size={24} /></div>;

  const pendingCount = suggestions.filter(s => s.status === 'pending').length;
  const resolvedCount = suggestions.filter(s => s.status !== 'pending').length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-accent-600" />
          <h3 className="text-base font-semibold text-slate-900">AI Rewrite Suggestions</h3>
          {suggestions.length > 0 && (
            <span className="badge bg-slate-100 text-slate-600">{pendingCount} pending · {resolvedCount} resolved</span>
          )}
        </div>
        {suggestions.length === 0 && !generating && (
          <button onClick={handleGenerate} className="btn-primary">
            <Sparkles className="h-4 w-4" /> Generate Suggestions
          </button>
        )}
      </div>

      {generating && (
        <div className="flex flex-col items-center justify-center py-12">
          <Spinner size={32} />
          <p className="mt-3 text-sm text-slate-500">Analyzing your resume against the job description...</p>
        </div>
      )}

      {!generating && suggestions.length === 0 && (
        <div className="rounded-lg border border-dashed border-slate-300 p-6">
          <div className="flex items-start gap-3">
            <Lightbulb className="h-5 w-5 text-warning-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-slate-600">
                Click "Generate Suggestions" to get AI-powered rewrite recommendations for weak sections of your resume.
                Suggestions are grounded in your real experience — no fabrication.
              </p>
            </div>
          </div>
        </div>
      )}

      {suggestions.length > 0 && !generating && (
        <div className="space-y-3">
          {suggestions.map((suggestion) => (
            <div
              key={suggestion.id}
              className={`rounded-lg border p-4 transition-all ${
                suggestion.status === 'accepted' ? 'border-success-200 bg-success-50' :
                suggestion.status === 'rejected' ? 'border-slate-200 bg-slate-50 opacity-60' :
                suggestion.status === 'edited' ? 'border-accent-200 bg-accent-50' :
                'border-slate-200 bg-white'
              }`}
            >
              {/* Section badge + status */}
              <div className="flex items-center justify-between">
                <span className="badge bg-primary-100 text-primary-700 capitalize">{suggestion.section_type}</span>
                {suggestion.status !== 'pending' && (
                  <span className={`badge capitalize ${
                    suggestion.status === 'accepted' ? 'bg-success-100 text-success-700' :
                    suggestion.status === 'rejected' ? 'bg-slate-100 text-slate-500' :
                    'bg-accent-100 text-accent-700'
                  }`}>
                    {suggestion.status}
                  </span>
                )}
              </div>

              {/* Original vs Suggested */}
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <div>
                  <div className="text-xs font-medium text-slate-500 mb-1">Original</div>
                  <div className="rounded-md bg-slate-50 p-3 text-sm text-slate-600 max-h-32 overflow-y-auto">
                    {suggestion.original_text}
                  </div>
                </div>
                <div>
                  <div className="text-xs font-medium text-accent-600 mb-1">Suggested</div>
                  {editingId === suggestion.id ? (
                    <textarea
                      className="input text-sm h-32 resize-none"
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                    />
                  ) : (
                    <div className="rounded-md bg-accent-50 p-3 text-sm text-slate-700 max-h-32 overflow-y-auto">
                      {suggestion.user_edited_text || suggestion.suggested_text}
                    </div>
                  )}
                </div>
              </div>

              {/* Reasoning */}
              <div className="mt-3 flex items-start gap-2 rounded-md bg-primary-50 p-2.5">
                <Lightbulb className="h-3.5 w-3.5 text-primary-500 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-slate-600">{suggestion.reasoning}</p>
              </div>

              {/* Actions */}
              {suggestion.status === 'pending' && (
                <div className="mt-3 flex items-center gap-2">
                  {editingId === suggestion.id ? (
                    <>
                      <button onClick={() => saveEdit(suggestion)} className="btn bg-accent-600 text-white hover:bg-accent-700 text-xs">
                        <Save className="h-3 w-3" /> Save Edit
                      </button>
                      <button onClick={() => setEditingId(null)} className="btn-secondary text-xs">Cancel</button>
                    </>
                  ) : (
                    <>
                      <button onClick={() => handleAccept(suggestion)} className="btn bg-success-600 text-white hover:bg-success-700 text-xs">
                        <Check className="h-3 w-3" /> Accept
                      </button>
                      <button onClick={() => startEdit(suggestion)} className="btn-secondary text-xs">
                        <Edit3 className="h-3 w-3" /> Edit
                      </button>
                      <button onClick={() => handleReject(suggestion)} className="btn-ghost text-xs text-danger-600 hover:bg-danger-50">
                        <X className="h-3 w-3" /> Reject
                      </button>
                    </>
                  )}
                </div>
              )}

              {suggestion.status !== 'pending' && editingId !== suggestion.id && (
                <div className="mt-3">
                  <button
                    onClick={() => { setEditingId(suggestion.id); setEditText(suggestion.user_edited_text || suggestion.suggested_text); }}
                    className="btn-ghost text-xs"
                  >
                    <RotateCcw className="h-3 w-3" /> Revisit
                  </button>
                </div>
              )}
            </div>
          ))}

          {/* Before/After Score Comparison */}
          {(() => {
            const acceptedCount = suggestions.filter(s => s.status === 'accepted' || s.status === 'edited').length;
            if (acceptedCount === 0) return null;

            const currentScore = computeMatchScore(resume.raw_text, resume.skills, job.description, job.requirements);
            const projectedScore = computeProjectedScore(resume.parsed_data, resume.raw_text, resume.skills, suggestions, job.description, job.requirements);
            const delta = projectedScore.overall_score - currentScore.overall_score;

            return (
              <div className="rounded-lg border border-primary-200 bg-gradient-to-br from-primary-50 to-accent-50 p-4">
                <div className="flex items-center gap-2 mb-3">
                  <TrendingUp className="h-4 w-4 text-primary-600" />
                  <h4 className="text-sm font-semibold text-slate-800">Projected Score Impact</h4>
                </div>
                <div className="flex items-center justify-center gap-4 sm:gap-6">
                  <div className="text-center">
                    <div className="text-xs font-medium text-slate-500 mb-1">Current</div>
                    <div className="text-2xl font-bold text-slate-700">{currentScore.overall_score.toFixed(0)}</div>
                    <div className="text-xs text-slate-400">{scoreLabel(currentScore.overall_score)}</div>
                  </div>
                  <div className="flex flex-col items-center">
                    <ArrowRight className="h-5 w-5 text-slate-400" />
                    <div className={`text-sm font-bold ${delta > 0 ? 'text-success-600' : delta < 0 ? 'text-danger-600' : 'text-slate-400'}`}>
                      {delta > 0 ? '+' : ''}{delta.toFixed(1)}
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-xs font-medium text-primary-600 mb-1">After Rewrites</div>
                    <div className={`text-2xl font-bold ${delta > 0 ? 'text-success-600' : 'text-slate-700'}`}>
                      {projectedScore.overall_score.toFixed(0)}
                    </div>
                    <div className="text-xs text-slate-400">{scoreLabel(projectedScore.overall_score)}</div>
                  </div>
                </div>
                {delta > 0 && (
                  <p className="mt-3 text-center text-xs text-slate-600">
                    Accepting {acceptedCount} suggestion{acceptedCount > 1 ? 's' : ''} would improve your match score by {delta.toFixed(1)} points.
                  </p>
                )}
                {delta <= 0 && (
                  <p className="mt-3 text-center text-xs text-slate-500">
                    These suggestions refine your resume's focus but won't significantly change your score. They still improve readability and relevance.
                  </p>
                )}
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
}
