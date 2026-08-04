import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Brain, CheckCircle, AlertCircle, Loader2, Mail } from 'lucide-react';
import { verifyEmail } from '@/lib/api';
import { GlassmorphicCard } from '@/components/GlassmorphicCard';

export function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const [status, setStatus] = useState<'verifying' | 'verified' | 'error'>('verifying');
  const [message, setMessage] = useState('');

  useEffect(() => {
    let mounted = true;
    async function run() {
      if (!token) {
        if (mounted) { setStatus('error'); setMessage('Missing verification token. Use the link from your email.'); }
        return;
      }
      try {
        const data = await verifyEmail(token);
        localStorage.removeItem('synapse_token');
        localStorage.removeItem('synapse_user');
        if (mounted) { setStatus('verified'); setMessage(data.message); }
      } catch (e: unknown) {
        if (mounted) { setStatus('error'); setMessage((e as Error).message || 'Verification failed. The token may be invalid or expired.'); }
      }
    }
    run();
    return () => { mounted = false; };
  }, [token]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4">
      <div className="w-full max-w-md">
        <Link to="/" className="mb-8 flex items-center justify-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-cyan-400 to-blue-500">
            <Brain className="h-5 w-5 text-slate-950" />
          </div>
          <span className="font-mono text-xl font-bold text-white">SYNAPSE</span>
        </Link>

        <GlassmorphicCard className="p-8 text-center">
          {status === 'verifying' && (
            <>
              <Loader2 className="mx-auto h-10 w-10 animate-spin text-cyan-400" />
              <h1 className="mt-4 text-2xl font-bold text-white">Verifying your email</h1>
              <p className="mt-2 text-sm text-slate-400">Please wait a moment...</p>
            </>
          )}

          {status === 'verified' && (
            <>
              <CheckCircle className="mx-auto h-12 w-12 text-emerald-400" />
              <h1 className="mt-4 text-2xl font-bold text-white">Email Verified!</h1>
              <p className="mt-2 text-sm text-slate-400">{message}</p>
              <Link to="/login" className="btn-primary mt-8 block w-full text-sm">
                Go to Login
              </Link>
            </>
          )}

          {status === 'error' && (
            <>
              <AlertCircle className="mx-auto h-12 w-12 text-red-400" />
              <h1 className="mt-4 text-2xl font-bold text-white">Verification failed</h1>
              <p className="mt-2 text-sm text-slate-400">{message}</p>
              <div className="mt-6 flex items-center justify-center gap-2 text-sm text-slate-400">
                <Mail className="h-4 w-4" /> Need help?
              </div>
              <Link to="/login" className="btn-primary mt-3 block w-full text-sm">
                Back to Login
              </Link>
            </>
          )}
        </GlassmorphicCard>
      </div>
    </div>
  );
}
