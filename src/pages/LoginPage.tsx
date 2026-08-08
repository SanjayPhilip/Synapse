import { useState, FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Brain, ArrowLeft, AlertCircle, Mail, Lock } from 'lucide-react';
import { signIn } from '@/lib/auth';
import { forgotPassword } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import NeuralNetworkBg from '@/components/NeuralNetworkBg';
import { GlassmorphicCard } from '@/components/GlassmorphicCard';

export function LoginPage() {
  const navigate = useNavigate();
  const { refreshProfile } = useAuth();
  const [role, setRole] = useState<'seeker' | 'employer'>('seeker');
  const [email, setEmail] = useState(localStorage.getItem('synapse_remember_email') || '');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(Boolean(localStorage.getItem('synapse_remember_email')));
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
      if (rememberMe) localStorage.setItem('synapse_remember_email', email);
      else localStorage.removeItem('synapse_remember_email');
      await handleLoginSuccess();
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white overflow-hidden flex flex-col">
      <NeuralNetworkBg nodeCount={15} animationSpeed={1} />

      {/* Navigation */}
      <nav className="relative z-50 flex items-center justify-between px-6 py-4 border-b border-slate-800/50 backdrop-blur-md">
        <Link to="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center">
            <Brain className="w-4 h-4 text-slate-950" />
          </div>
          <span className="text-xl font-bold font-mono">SYNAPSE</span>
        </Link>
        <div className="flex gap-4 items-center">
          <Link to="/" className="text-slate-300 hover:text-cyan-400 transition-colors text-sm font-medium">
            Homepage
          </Link>
          <Link to="/register/seeker" className="text-slate-300 hover:text-cyan-400 transition-colors text-sm font-medium">
            Sign Up
          </Link>
        </div>
      </nav>

      {/* Main Content */}
      <div className="relative z-10 flex-1 flex items-center justify-center px-6 py-12">
        <GlassmorphicCard glowColor="cyan" className="w-full max-w-md p-8">
          {/* Role Tabs */}
          <div className="flex gap-4 mb-8">
            <button
              onClick={() => setRole('seeker')}
              className={`flex-1 py-3 px-4 rounded-lg font-mono font-bold transition-all duration-200 ${
                role === 'seeker'
                  ? 'bg-cyan-500 text-slate-950 shadow-[0_0_20px_rgba(0,217,255,0.4)]'
                  : 'bg-slate-800/50 text-slate-300 hover:bg-slate-700/50'
              }`}
            >
              Job Seeker
            </button>
            <button
              onClick={() => setRole('employer')}
              className={`flex-1 py-3 px-4 rounded-lg font-mono font-bold transition-all duration-200 ${
                role === 'employer'
                  ? 'bg-violet-600 text-white shadow-[0_0_20px_rgba(217,70,239,0.4)]'
                  : 'bg-slate-800/50 text-slate-300 hover:bg-slate-700/50'
              }`}
            >
              Employer
            </button>
          </div>

          {/* Heading */}
          <h1 className="text-3xl font-bold font-mono mb-2">Welcome Back</h1>
          <p className="text-slate-400 mb-8">
            Sign in to your {role === 'seeker' ? 'job seeker' : 'employer'} account
          </p>

          {error && (
            <div className="mb-6 flex items-center gap-2 rounded-lg bg-red-500/10 border border-red-500/20 px-3 py-2 text-sm text-red-400">
              <AlertCircle className="h-4 w-4" /> {error}
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-mono text-slate-300">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 w-5 h-5 text-slate-500" />
                <input
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input pl-10"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-mono text-slate-300">Password</label>
                <ForgotPasswordButton />
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-3 w-5 h-5 text-slate-500" />
                <input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input pl-10"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className={`w-full py-3 font-bold rounded-lg transition-all duration-200 ${
                role === 'seeker'
                  ? 'bg-cyan-500 hover:bg-cyan-600 text-slate-950 hover:shadow-[0_0_30px_rgba(0,217,255,0.5)]'
                  : 'bg-violet-600 hover:bg-violet-700 text-white hover:shadow-[0_0_30px_rgba(217,70,239,0.5)]'
              }`}
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
            <label className="flex items-center gap-2 text-sm text-slate-400">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="h-4 w-4 rounded border-slate-600 bg-slate-800 accent-cyan-500"
              />
              Remember me
            </label>
          </form>

          {/* Demo Accounts */}
          <div className="mt-6 border-t border-slate-700/50 pt-6">
            <p className="text-xs font-mono text-slate-500 text-center mb-3">
              Quick Demo Access
            </p>
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: 'Seeker', email: 'seeker@synapse.demo', color: 'cyan' },
                { label: 'Employer', email: 'employer@synapse.demo', color: 'violet' },
                { label: 'Admin', email: 'admin@synapse.demo', color: 'red' },
              ].map((demo) => (
                <button
                  key={demo.label}
                  type="button"
                  disabled={loading}
                  onClick={async () => {
                    setEmail(demo.email);
                    setPassword('Demo1234!');
                    setError('');
                    setLoading(true);
                    const { error } = await signIn(demo.email, 'Demo1234!');
                    setLoading(false);
                    if (error) setError(error);
                    else await handleLoginSuccess();
                  }}
                  className={`py-2 px-3 rounded-lg text-xs font-bold transition-all ${
                    demo.color === 'cyan'
                      ? 'bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20 border border-cyan-500/20'
                      : demo.color === 'violet'
                      ? 'bg-violet-500/10 text-violet-400 hover:bg-violet-500/20 border border-violet-500/20'
                      : 'bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20'
                  }`}
                >
                  {demo.label}
                </button>
              ))}
            </div>
          </div>

          {/* Sign Up Link */}
          <p className="text-center text-slate-400 mt-8">
            Don't have an account?{' '}
            <Link to="/register/seeker" className="text-cyan-400 hover:text-cyan-300 font-mono font-bold transition-colors">
              Sign up here
            </Link>
          </p>
        </GlassmorphicCard>
      </div>
    </div>
  );
}

function ForgotPasswordButton() {
  const navigate = useNavigate();
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

  function handleClose() {
    setOpen(false);
  }

  async function handleReset() {
    setErr('');
    setMsg('');
    setResetLink('');
    setSubmitting(true);
    try {
      const data = await forgotPassword(resetEmail);
      if (!data.email_found) {
        alert('No account found with that email. Redirecting to sign up.');
        navigate('/register/seeker');
        return;
      }
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
        className="text-xs text-cyan-400 hover:text-cyan-300 transition-colors font-medium"
      >
        Forgot Password?
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={handleClose} />
          <div className="relative z-10 w-full max-w-sm glass rounded-xl p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold font-mono text-white">Reset Password</h3>
              <button onClick={handleClose} className="text-slate-400 hover:text-white text-xl leading-none">&times;</button>
            </div>

            {msg ? (
              <div className="space-y-3">
                <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 px-3 py-3 text-sm text-emerald-400">
                  {msg}
                </div>
                {resetLink && (
                  <div className="space-y-1">
                    <p className="text-xs text-slate-400">
                      Demo mode: open the reset link to set a new password.
                    </p>
                    <a href={resetLink} className="block rounded-lg bg-cyan-500/10 border border-cyan-500/20 px-3 py-2 text-sm text-cyan-400 break-all hover:bg-cyan-500/20">
                      {resetLink}
                    </a>
                  </div>
                )}
                <button onClick={handleClose} className="btn-primary w-full text-sm">Back to Login</button>
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-mono text-slate-300">Email Address</label>
                  <input
                    type="email"
                    required
                    className="input mt-1"
                    placeholder="your@email.com"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleReset(); }}
                  />
                </div>
                {err && (
                  <div className="flex items-center gap-2 rounded-lg bg-red-500/10 border border-red-500/20 px-3 py-2 text-sm text-red-400">
                    <AlertCircle className="h-4 w-4 flex-shrink-0" /> {err}
                  </div>
                )}
                <div className="flex gap-2 pt-1">
                  <button type="button" onClick={handleClose} className="btn-ghost flex-1">Cancel</button>
                  <button type="button" onClick={handleReset} disabled={submitting || !resetEmail.trim()} className="btn-primary flex-1">
                    {submitting ? 'Sending...' : 'Send Reset Link'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
