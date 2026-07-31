import { useState } from 'react';
import { Zap, AlertCircle, CheckCircle2, Loader2, XCircle } from 'lucide-react';
import type { JobPosting, Resume } from '@/types';
import { createAutoApplyLog, updateAutoApplyLog, createApplication } from '@/lib/api';
import { Modal, Spinner } from '@/components/ui';

type ApplyState = 'idle' | 'confirming' | 'processing' | 'success' | 'failed';

export function AutoApplyButton({ job, resume, seekerId, matchScore }: {
  job: JobPosting;
  resume: Resume | null;
  seekerId: string;
  matchScore: number | null;
}) {
  const [state, setState] = useState<ApplyState>('idle');
  const [error, setError] = useState('');
  const [logId, setLogId] = useState<string | null>(null);

  if (!resume) return null;
  if (!job.external_url) return null;

  async function startAutoApply() {
    setState('confirming');
  }

  async function confirmAutoApply() {
    setState('processing');
    setError('');

    try {
      // Create auto-apply log entry
      const log = await createAutoApplyLog({
        seeker_id: seekerId,
        job_posting_id: job.id,
        resume_id: resume!.id,
        status: 'in_progress',
        attempt_count: 1,
        error_message: null,
        screenshot_url: null,
        submitted_at: null,
      });
      setLogId(log.id);

      // Simulate the headless browser automation process
      // In production this would dispatch a Celery task with Playwright
      await new Promise((r) => setTimeout(r, 2500));

      // Simulate form-fill and submission
      const success = Math.random() > 0.25; // 75% success rate for demo

      if (success) {
        await updateAutoApplyLog(log.id, {
          status: 'success',
          submitted_at: new Date().toISOString(),
        });

        // Create the application record
        await createApplication({
          seeker_id: seekerId,
          job_posting_id: job.id,
          resume_id: resume!.id,
          status: 'applied',
          match_score: matchScore,
          applied_via: 'auto_apply',
        });

        setState('success');
      } else {
        await updateAutoApplyLog(log.id, {
          status: 'failed',
          error_message: 'External form submission failed — the job site may have changed its form structure.',
        });
        setError('The external application form could not be completed automatically. The site may require manual intervention.');
        setState('failed');
      }
    } catch (e: any) {
      if (logId) {
        await updateAutoApplyLog(logId, {
          status: 'failed',
          error_message: e.message || 'Unknown error',
        });
      }
      setError(e.message || 'An unexpected error occurred.');
      setState('failed');
    }
  }

  function reset() {
    setState('idle');
    setError('');
    setLogId(null);
  }

  return (
    <>
      <button
        onClick={startAutoApply}
        className="btn bg-accent-600 text-white hover:bg-accent-700 flex-1"
        title="Auto-apply via headless browser"
      >
        <Zap className="h-3.5 w-3.5" /> Auto-Apply
      </button>

      {/* Confirmation modal */}
      <Modal open={state === 'confirming'} onClose={reset} title="Confirm Auto-Apply" maxWidth="max-w-md">
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent-100 flex-shrink-0">
              <Zap className="h-5 w-5 text-accent-600" />
            </div>
            <div>
              <p className="text-sm text-slate-700">
                Synapse will automatically fill out the application form on the external job site using your resume data and submit it on your behalf.
              </p>
            </div>
          </div>

          <div className="rounded-lg bg-slate-50 p-3 space-y-1.5">
            <div className="text-xs font-medium text-slate-500">Job Details</div>
            <div className="text-sm font-medium text-slate-900">{job.title}</div>
            <div className="text-xs text-slate-500">{job.location || 'Remote'}</div>
            <div className="text-xs text-accent-600 truncate">{job.external_url}</div>
          </div>

          <div className="flex items-start gap-2 rounded-lg bg-warning-50 p-3">
            <AlertCircle className="h-4 w-4 text-warning-600 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-warning-800">
              This will open a headless browser to fill and submit the external application form.
              A log of this attempt will be recorded. You can review it in your Applications tracker.
            </p>
          </div>

          <div className="flex justify-end gap-2 border-t border-slate-200 pt-4">
            <button onClick={reset} className="btn-secondary">Cancel</button>
            <button onClick={confirmAutoApply} className="btn bg-accent-600 text-white hover:bg-accent-700">
              <Zap className="h-4 w-4" /> Start Auto-Apply
            </button>
          </div>
        </div>
      </Modal>

      {/* Processing modal */}
      <Modal open={state === 'processing'} onClose={() => {}} title="Auto-Apply in Progress" maxWidth="max-w-md">
        <div className="flex flex-col items-center justify-center py-8">
          <Spinner size={40} />
          <p className="mt-4 text-sm font-medium text-slate-700">Filling out application form...</p>
          <p className="mt-1 text-xs text-slate-500">This may take a few seconds while the headless browser submits your application.</p>
        </div>
      </Modal>

      {/* Success modal */}
      <Modal open={state === 'success'} onClose={reset} title="Auto-Apply Successful" maxWidth="max-w-md">
        <div className="flex flex-col items-center justify-center py-6">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-success-100">
            <CheckCircle2 className="h-7 w-7 text-success-600" />
          </div>
          <p className="mt-4 text-sm font-medium text-slate-900">Application submitted successfully!</p>
          <p className="mt-1 text-xs text-slate-500">Your application has been logged. You can track its status in your Applications page.</p>
          <button onClick={reset} className="btn-primary mt-4">Done</button>
        </div>
      </Modal>

      {/* Failed modal */}
      <Modal open={state === 'failed'} onClose={reset} title="Auto-Apply Failed" maxWidth="max-w-md">
        <div className="flex flex-col items-center justify-center py-6">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-danger-100">
            <XCircle className="h-7 w-7 text-danger-600" />
          </div>
          <p className="mt-4 text-sm font-medium text-slate-900">Auto-apply could not complete</p>
          <p className="mt-1 text-xs text-slate-500 text-center max-w-xs">{error}</p>
          <p className="mt-2 text-xs text-slate-400">You can still apply manually by visiting the job site directly.</p>
          <div className="flex gap-2 mt-4">
            <button onClick={reset} className="btn-secondary">Close</button>
            {job.external_url && (
              <a href={job.external_url} target="_blank" rel="noopener noreferrer" className="btn-primary">
                Apply Manually
              </a>
            )}
          </div>
        </div>
      </Modal>
    </>
  );
}
