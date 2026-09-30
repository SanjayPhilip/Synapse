import { useState, useEffect } from 'react';
import { DollarSign, TrendingUp, Copy, Check, Sparkles, ShieldCheck, ChevronRight, RefreshCw, X } from 'lucide-react';
import { getSalaryNegotiationAdvice } from '@/lib/api';
import type { SalaryNegotiationResponse, NegotiationScript } from '@/types';
import { Spinner } from '@/components/ui';

interface SalaryNegotiatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialJobTitle?: string;
  initialOfferedSalary?: number | null;
  initialLocation?: string;
}

export function SalaryNegotiatorModal({
  isOpen,
  onClose,
  initialJobTitle = '',
  initialOfferedSalary = null,
  initialLocation = 'Remote',
}: SalaryNegotiatorModalProps) {
  const [jobTitle, setJobTitle] = useState(initialJobTitle || '');
  const [offeredSalary, setOfferedSalary] = useState<string>(initialOfferedSalary ? String(initialOfferedSalary) : '');
  const [targetSalary, setTargetSalary] = useState<string>('');
  const [location, setLocation] = useState(initialLocation || 'Remote');
  const [experienceLevel, setExperienceLevel] = useState('Mid-Level');
  const [currency, setCurrency] = useState('USD');

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SalaryNegotiationResponse | null>(null);
  const [activeScriptIdx, setActiveScriptIdx] = useState(0);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (initialJobTitle) setJobTitle(initialJobTitle);
      if (initialOfferedSalary) setOfferedSalary(String(initialOfferedSalary));
      if (initialLocation) setLocation(initialLocation);
    }
  }, [isOpen, initialJobTitle, initialOfferedSalary, initialLocation]);

  if (!isOpen) return null;

  async function handleAnalyze(e?: React.FormEvent) {
    if (e) e.preventDefault();
    if (!jobTitle.trim()) return;

    setLoading(true);
    try {
      const data = await getSalaryNegotiationAdvice({
        job_title: jobTitle.trim(),
        offered_salary: offeredSalary ? parseFloat(offeredSalary) : null,
        target_salary: targetSalary ? parseFloat(targetSalary) : null,
        location: location.trim() || 'Remote',
        experience_level: experienceLevel,
        currency,
      });
      setResult(data);
      setActiveScriptIdx(0);
    } catch (err) {
      console.error('Failed to calculate salary negotiation strategy:', err);
    } finally {
      setLoading(false);
    }
  }

  function handleCopy(text: string) {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const formatCurr = (n: number) => {
    const sym = currency === 'USD' ? '$' : currency === 'EUR' ? '€' : currency === 'GBP' ? '£' : `${currency} `;
    return `${sym}${n.toLocaleString()}`;
  };

  const inputClass =
    'w-full rounded-lg border border-slate-700 bg-slate-800/80 px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-md" />
      <div
        className="relative z-10 w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl border border-slate-700/60 bg-slate-900/95 p-6 shadow-2xl animate-fade-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
              <DollarSign className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                Salary Negotiation Assistant
                <span className="badge bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-xs">AI Powered</span>
              </h2>
              <p className="text-xs text-slate-400">Benchmark market value, build counter-offers, and export negotiation scripts.</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Input Form */}
        {!result || loading ? (
          <form onSubmit={handleAnalyze} className="mt-6 space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="text-xs font-semibold uppercase text-slate-400 mb-1.5 block">Job Title *</label>
                <input
                  type="text"
                  required
                  value={jobTitle}
                  onChange={(e) => setJobTitle(e.target.value)}
                  placeholder="e.g. Senior Backend Engineer"
                  className={inputClass}
                />
              </div>

              <div>
                <label className="text-xs font-semibold uppercase text-slate-400 mb-1.5 block">Location / Work Mode</label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="e.g. Remote, San Francisco, Austin"
                  className={inputClass}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div>
                <label className="text-xs font-semibold uppercase text-slate-400 mb-1.5 block">Current / Offered Salary</label>
                <input
                  type="number"
                  min="0"
                  step="1000"
                  value={offeredSalary}
                  onChange={(e) => setOfferedSalary(e.target.value)}
                  placeholder="e.g. 120000"
                  className={inputClass}
                />
              </div>

              <div>
                <label className="text-xs font-semibold uppercase text-slate-400 mb-1.5 block">Target Salary (Optional)</label>
                <input
                  type="number"
                  min="0"
                  step="1000"
                  value={targetSalary}
                  onChange={(e) => setTargetSalary(e.target.value)}
                  placeholder="e.g. 140000"
                  className={inputClass}
                />
              </div>

              <div>
                <label className="text-xs font-semibold uppercase text-slate-400 mb-1.5 block">Experience Level</label>
                <select
                  value={experienceLevel}
                  onChange={(e) => setExperienceLevel(e.target.value)}
                  className={inputClass}
                >
                  <option value="Entry-Level">Entry-Level (0-2 yrs)</option>
                  <option value="Mid-Level">Mid-Level (3-5 yrs)</option>
                  <option value="Senior">Senior (6-8 yrs)</option>
                  <option value="Lead / Staff">Lead / Staff (9+ yrs)</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t border-slate-800">
              <button
                type="submit"
                disabled={loading || !jobTitle.trim()}
                className="btn-primary flex items-center gap-2 py-2.5 px-6 font-semibold shadow-lg shadow-cyan-500/20"
              >
                {loading ? <Spinner size={16} /> : <Sparkles className="h-4 w-4" />}
                Analyze Compensation &amp; Counter Strategy
              </button>
            </div>
          </form>
        ) : (
          /* Results View */
          <div className="mt-6 space-y-6">
            {/* Top Stat Cards */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-xl border border-slate-800 bg-slate-800/40 p-3.5">
                <span className="text-xs text-slate-500 uppercase font-semibold">25th Percentile</span>
                <div className="mt-1 text-lg font-bold text-slate-300">{formatCurr(result.benchmark_min)}</div>
              </div>
              <div className="rounded-xl border border-slate-800 bg-slate-800/40 p-3.5">
                <span className="text-xs text-slate-500 uppercase font-semibold">Market Median</span>
                <div className="mt-1 text-lg font-bold text-white">{formatCurr(result.benchmark_mid)}</div>
              </div>
              <div className="rounded-xl border border-slate-800 bg-slate-800/40 p-3.5">
                <span className="text-xs text-slate-500 uppercase font-semibold">75th Percentile</span>
                <div className="mt-1 text-lg font-bold text-slate-300">{formatCurr(result.benchmark_max)}</div>
              </div>
              <div className="rounded-xl border border-cyan-500/40 bg-cyan-500/10 p-3.5">
                <span className="text-xs text-cyan-400 uppercase font-semibold">Recommended Counter</span>
                <div className="mt-1 text-xl font-extrabold text-cyan-300">
                  {formatCurr(result.recommended_counter)}
                  {result.recommended_counter_percentage > 0 && (
                    <span className="ml-1 text-xs font-normal text-emerald-400">
                      (+{result.recommended_counter_percentage}%)
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Summary */}
            <div className="rounded-xl border border-slate-800 bg-slate-800/30 p-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-cyan-400 mb-1">
                <TrendingUp className="h-4 w-4" /> Market Intelligence &amp; Strategy
              </div>
              <p className="text-sm text-slate-300 leading-relaxed">{result.strategy_summary}</p>
            </div>

            {/* Leverage Points */}
            <div>
              <h3 className="text-sm font-semibold text-white mb-2.5 flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-emerald-400" /> Key Leverage Points
              </h3>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {result.leverage_points.map((pt, idx) => (
                  <div key={idx} className="flex items-start gap-2 rounded-lg border border-slate-800/80 bg-slate-800/20 p-2.5 text-xs text-slate-300">
                    <ChevronRight className="h-3.5 w-3.5 text-cyan-400 flex-shrink-0 mt-0.5" />
                    <span>{pt}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Scripts Tabs */}
            {result.scripts.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-white">Negotiation Email Templates</h3>
                  <button
                    onClick={() => handleCopy(result.scripts[activeScriptIdx].body)}
                    className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1.5 text-cyan-300 hover:text-white"
                  >
                    {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                    {copied ? 'Copied to Clipboard!' : 'Copy Script'}
                  </button>
                </div>

                <div className="flex flex-wrap gap-1.5 border-b border-slate-800 pb-2">
                  {result.scripts.map((script, idx) => (
                    <button
                      key={idx}
                      onClick={() => setActiveScriptIdx(idx)}
                      className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                        activeScriptIdx === idx
                          ? 'bg-cyan-500 text-slate-950 font-semibold'
                          : 'bg-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      {script.title}
                    </button>
                  ))}
                </div>

                <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
                  <div className="text-xs text-slate-400 italic mb-3">
                    Scenario: {result.scripts[activeScriptIdx].scenario}
                  </div>
                  <pre className="font-mono text-xs text-slate-200 whitespace-pre-wrap leading-relaxed select-all">
                    {result.scripts[activeScriptIdx].body}
                  </pre>
                </div>
              </div>
            )}

            {/* Tactical Tips */}
            <div>
              <h3 className="text-sm font-semibold text-white mb-2">Tactical Negotiation Rules</h3>
              <ul className="space-y-1.5">
                {result.tactical_tips.map((tip, idx) => (
                  <li key={idx} className="flex items-center gap-2 text-xs text-slate-400">
                    <span className="h-1.5 w-1.5 rounded-full bg-cyan-400" />
                    <span>{tip}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Recalculate CTA */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-800">
              <button
                onClick={() => setResult(null)}
                className="btn-secondary text-xs flex items-center gap-1.5"
              >
                <RefreshCw className="h-3.5 w-3.5" /> Adjust Parameters
              </button>
              <button onClick={onClose} className="btn-primary text-xs py-2 px-5">
                Done
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
