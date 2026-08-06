import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, Briefcase, Users, Search, Rocket, X, ChevronRight, ChevronLeft } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

interface Step {
  icon: typeof Upload;
  title: string;
  description: string;
  path: string;
  cta: string;
}

const SEEKER_STEPS: Step[] = [
  { icon: Upload, title: 'Upload your resume', description: 'Start with your resume — we parse it and give you a match score against every job.', path: '/app/resume', cta: 'Upload resume' },
  { icon: Search, title: 'Find your match', description: 'Browse the job feed sorted by match score, filter by location, salary, and remote.', path: '/app/jobs', cta: 'Browse jobs' },
  { icon: Users, title: 'Track applications', description: 'Apply in one click, auto-apply, and track every application from one place.', path: '/app/applications', cta: 'See applications' },
];

const EMPLOYER_STEPS: Step[] = [
  { icon: Briefcase, title: 'Post your first job', description: 'Create a posting and our AI matches applicants against it automatically.', path: '/app/postings', cta: 'Post a job' },
  { icon: Users, title: 'Review ranked applicants', description: 'Candidates are ranked by match score with AI gap explanations.', path: '/app/applicants', cta: 'View applicants' },
  { icon: Rocket, title: 'Track hiring analytics', description: 'Watch funnel, time-to-fill, and match-score distribution on the analytics tab.', path: '/app/analytics', cta: 'Open analytics' },
];

export function OnboardingBanner() {
  const { activeRole } = useAuth();
  const navigate = useNavigate();
  const [stepIndex, setStepIndex] = useState(0);
  const [dismissed, setDismissed] = useState(() => {
    try {
      return localStorage.getItem(`synapse_onboarded_${activeRole}`) === '1';
    } catch {
      return false;
    }
  });

  if (dismissed) return null;
  const steps = activeRole === 'employer' ? EMPLOYER_STEPS : SEEKER_STEPS;
  const step = steps[stepIndex];
  const isLast = stepIndex === steps.length - 1;

  function complete() {
    try { localStorage.setItem(`synapse_onboarded_${activeRole}`, '1'); } catch { /* ignore */ }
    setDismissed(true);
  }

  function goTo() {
    navigate(step.path);
    complete();
  }

  return (
    <div className="relative mb-6 overflow-hidden rounded-xl border border-cyan-500/30 bg-gradient-to-r from-cyan-500/10 via-blue-500/10 to-violet-500/10 p-5">
      <button onClick={complete} className="absolute right-3 top-3 rounded-lg p-1 text-slate-500 hover:bg-slate-800/60 hover:text-white" aria-label="Dismiss">
        <X className="h-4 w-4" />
      </button>
      <div className="flex items-start gap-4">
        <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500/30 to-blue-500/30 border border-cyan-500/30">
          <step.icon className="h-5 w-5 text-cyan-400" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-white">{step.title}</h3>
            <span className="badge bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">Step {stepIndex + 1} of {steps.length}</span>
          </div>
          <p className="mt-1 text-sm text-slate-400">{step.description}</p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button onClick={goTo} className="btn-primary text-xs">
              <step.icon className="h-3.5 w-3.5" /> {step.cta}
            </button>
            <button onClick={complete} className="btn-ghost text-xs text-slate-400">Skip tour</button>
            {!isLast && (
              <button onClick={() => setStepIndex(i => i + 1)} className="btn-secondary text-xs">
                Next <ChevronRight className="h-3.5 w-3.5" />
              </button>
            )}
            {isLast && (
              <button onClick={complete} className="btn-secondary text-xs">
                Done <Rocket className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          <div className="mt-3 flex items-center gap-1.5">
            {steps.map((_, i) => (
              <button key={i} onClick={() => setStepIndex(i)} className={`h-1.5 rounded-full transition-all ${i === stepIndex ? 'w-6 bg-cyan-400' : 'w-3 bg-slate-700 hover:bg-slate-600'}`} aria-label={`Step ${i + 1}`} />
            ))}
            {stepIndex > 0 && (
              <button onClick={() => setStepIndex(i => i - 1)} className="ml-1 text-slate-500 hover:text-slate-300" aria-label="Previous step">
                <ChevronLeft className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
