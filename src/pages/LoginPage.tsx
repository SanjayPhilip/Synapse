import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Brain, ArrowLeft, AlertCircle } from 'lucide-react';
import { signIn } from '@/lib/auth';
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
              <label className="label">Password</label>
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

          <p className="mt-6 text-center text-sm text-slate-500">
            Don't have an account?{' '}
            <Link to="/register/seeker" className="font-medium text-primary-600 hover:text-primary-700">Sign up</Link>
          </p>
        </div>

        <Link to="/" className="mt-6 flex items-center justify-center gap-1 text-sm text-slate-500 hover:text-slate-700">
          <ArrowLeft className="h-4 w-4" /> Back to home
        </Link>
      </div>
    </div>
  );
}
