import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Brain, ArrowLeft, AlertCircle } from 'lucide-react';
import { signIn } from '@/lib/auth';
import { forgotPassword } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';

export function LoginPage() {
  const navigate = useNavigate();
  const { refreshProfile } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleLoginSuccess() {
    await refreshProfile();
    navigate('/app');
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    const { error } = await signIn(email, password);
    setLoading(false);
    if (error) {
      setError(error);
    } else {
      await handleLoginSuccess();
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary-50 via-white to-accent-50 px-4">
      <div className="w-full max-w-md">
        <Link to="/" className="mb-8 flex items-center justify-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-600">
            <Brain className="h-5 w-5 text-white" />
          </div>
          <span className="text-xl font-bold text-slate-900">Synapse</span>
        </Link>

        <div className="card p-8">
          <h1 className="text-2xl font-bold text-slate-900">Welcome back</h1>
          <p className="mt-1 text-sm text-slate-500">Sign in to your Synapse account</p>

          {error && (
            <div className="mt-4 flex items-center gap-2 rounded-lg bg-danger-50 px-3 py-2 text-sm text-danger-700">
              <AlertCircle className="h-4 w-4" /> {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label className="label">Email</label>
              <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="input" placeholder="you@example.com" />
            </div>
            <div>
              <div className="flex items-center justify-between">
                <label className="label">Password</label>
                <ForgotPasswordButton />
              </div>
              <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className="input" placeholder="••••••••" />
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          {/* Quick Demo Login */}
          <div className="mt-6 border-t border-slate-200 pt-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 text-center mb-3">
              Or Try Quick Demo Accounts
            </p>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                disabled={loading}
                onClick={async () => {
                  setEmail('seeker@synapse.demo');
                  setPassword('Demo1234!');
                  setError('');
                  setLoading(true);
                  const { error } = await signIn('seeker@synapse.demo', 'Demo1234!');
                  setLoading(false);
                  if (error) setError(error);
                  else await handleLoginSuccess();
                }}
                className="btn-secondary text-xs py-2 w-full justify-center"
              >
                Seeker
              </button>
              <button
                type="button"
                disabled={loading}
                onClick={async () => {
                  setEmail('employer@synapse.demo');
                  setPassword('Demo1234!');
                  setError('');
                  setLoading(true);
                  const { error } = await signIn('employer@synapse.demo', 'Demo1234!');
                  setLoading(false);
                  if (error) setError(error);
                  else await handleLoginSuccess();
                }}
                className="btn-secondary text-xs py-2 w-full justify-center"
              >
                Employer
              </button>
              <button
                type="button"
                disabled={loading}
                onClick={async () => {
                  setEmail('admin@synapse.demo');
                  setPassword('Demo1234!');
                  setError('');
                  setLoading(true);
                  const { error } = await signIn('admin@synapse.demo', 'Demo1234!');
                  setLoading(false);
                  if (error) setError(error);
                  else await handleLoginSuccess();
                }}
                className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700 transition-colors hover:bg-red-100 w-full"
              >
                Admin
              </button>
            </div>
          </div>
        </div>

        <p className="mt-6 text-center text-sm text-slate-500">
          Don't have an account?{' '}
          <Link to="/register/seeker" className="font-medium text-primary-600 hover:text-primary-700">Sign up</Link>
        </p>

        <Link to="/" className="mt-6 flex items-center justify-center gap-1 text-sm text-slate-500 hover:text-slate-700">
          <ArrowLeft className="h-4 w-4" /> Back to home
        </Link>
      </div>
    </div>
  );
}

function ForgotPasswordButton() {
  const [open, setOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [msg, setMsg] = useState('');
  const [resetLink, setResetLink] = useState('');
  const [err, setErr] = useState('');
  const [submitting, setSubmitting] = useState(false);

  function handleOpen() {
    setOpen(true);
    setMsg(''); setErr(''); setResetEmail(''); setResetLink('');
  }

  async function handleReset(e: FormEvent) {
    e.preventDefault();
    setErr('');
    setMsg('');
    setResetLink('');
    setSubmitting(true);
    try {
      const data = await forgotPassword(resetEmail);
      setMsg(data.message);
      if (data.reset_token) {
        setResetLink(`${window.location.origin}/reset-password?token=${data.reset_token}`);
      }
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
        className="text-xs text-primary-600 dark:text-primary-400 hover:underline font-medium"
      >
        Forgot Password?
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <div className="relative z-10 w-full max-w-sm card p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-slate-900">Reset Password</h3>
              <button onClick={() => setOpen(false)} className="text-slate-400 hover:text-slate-600 text-xl leading-none">&times;</button>
            </div>

            {msg ? (
              <div className="space-y-3">
                <div className="rounded-lg bg-green-50 border border-green-200 px-3 py-3 text-sm text-green-700">
                  {msg}
                </div>
                {resetLink && (
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-slate-500">
                      Demo mode (no email server): open the reset link to set a new password.
                    </p>
                    <a href={resetLink} className="block rounded-lg bg-primary-50 border border-primary-200 px-3 py-2 text-sm text-primary-700 break-all hover:bg-primary-100">
                      {resetLink}
                    </a>
                  </div>
                )}
                <button onClick={() => setOpen(false)} className="btn-primary w-full text-sm">Back to Login</button>
              </div>
            ) : (
              <form onSubmit={handleReset} className="space-y-3">
                <div>
                  <label className="label">Email Address</label>
                  <input
                    type="email"
                    required
                    className="input"
                    placeholder="your@email.com"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                  />
                </div>
                {err && (
                  <div className="flex items-center gap-2 rounded-lg bg-danger-50 px-3 py-2 text-sm text-danger-700">
                    <AlertCircle className="h-4 w-4 flex-shrink-0" /> {err}
                  </div>
                )}
                <div className="flex gap-2 pt-1">
                  <button type="button" onClick={() => setOpen(false)} className="btn-secondary flex-1">Cancel</button>
                  <button type="submit" disabled={submitting} className="btn-primary flex-1">
                    {submitting ? 'Sending...' : 'Send Reset Link'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
