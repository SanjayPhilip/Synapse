import { useState, FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Brain, ArrowLeft, AlertCircle, Mail, Lock } from 'lucide-react';
import { signIn } from '@/lib/auth';
import { forgotPassword, oauthLogin } from '@/lib/api';
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

  async function handleOAuth(provider: 'google' | 'linkedin' | 'github') {
    setError('');
    setLoading(true);
    try {
      const mockEmail = `user.${provider}.${Math.floor(Math.random() * 1000)}@synapse.io`;
      const res = await oauthLogin({
        provider,
        token: `oauth_token_${provider}_${Date.now()}`,
        role,
        email: mockEmail,
        name: `${provider.charAt(0).toUpperCase() + provider.slice(1)} User`,
      });
      if (res && res.access_token) {
        localStorage.setItem('synapse_token', res.access_token);
        localStorage.setItem('synapse_user', JSON.stringify(res.user));
        localStorage.setItem('synapse_active_role', res.user.role || role);
        await handleLoginSuccess();
      }
    } catch (err: any) {
      setError(err.message || `Failed to sign in with ${provider}`);
    } finally {
      setLoading(false);
    }
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
              <label htmlFor="email" className="text-sm font-mono text-slate-300">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 w-5 h-5 text-slate-500" />
                <input
                  id="email"
                  name="email"
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
                <label htmlFor="password" className="text-sm font-mono text-slate-300">Password</label>
                <ForgotPasswordButton />
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-3 w-5 h-5 text-slate-500" />
                <input
                  id="password"
                  name="password"
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

          {/* Social Logins */}
          <div className="mt-6">
            <div className="relative flex py-2 items-center">
              <div className="flex-grow border-t border-slate-800"></div>
              <span className="flex-shrink mx-3 text-xs text-slate-500">or continue with</span>
              <div className="flex-grow border-t border-slate-800"></div>
            </div>
            <div className="grid grid-cols-3 gap-2 mt-2">
              <button
                type="button"
                onClick={() => handleOAuth('google')}
                className="py-2 px-3 rounded-lg text-xs font-semibold bg-slate-900/80 hover:bg-slate-800 border border-slate-700/60 text-slate-200 flex items-center justify-center gap-1.5 transition-colors"
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24">
                  <path fill="#EA4335" d="M12 5c1.6 0 3 .6 4.1 1.7l3.1-3.1C17.3 1.8 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.3l3.7 2.9C6.5 7.3 9 5 12 5z"/>
                  <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.6h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.9z"/>
                  <path fill="#FBBC05" d="M5.6 14.8c-.2-.7-.4-1.5-.4-2.3s.2-1.6.4-2.3L1.9 7.3C.7 9.7 0 12.3 0 15.1s.7 5.4 1.9 7.8l3.7-2.9z"/>
                  <path fill="#34A853" d="M12 23.5c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.5-2.3-6.4-5.2L1.9 16.5C3.7 20.2 7.5 23.5 12 23.5z"/>
                </svg>
                Google
              </button>
              <button
                type="button"
                onClick={() => handleOAuth('linkedin')}
                className="py-2 px-3 rounded-lg text-xs font-semibold bg-slate-900/80 hover:bg-slate-800 border border-slate-700/60 text-slate-200 flex items-center justify-center gap-1.5 transition-colors"
              >
                <svg className="w-3.5 h-3.5 fill-[#0A66C2]" viewBox="0 0 24 24">
                  <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.88 8.56a1.68 1.68 0 0 0 1.68-1.68c0-.93-.75-1.69-1.68-1.69a1.69 1.69 0 0 0-1.69 1.69c0 .93.76 1.68 1.69 1.68m1.39 9.94v-8.37H5.5v8.37h2.77z"/>
                </svg>
                LinkedIn
              </button>
              <button
                type="button"
                onClick={() => handleOAuth('github')}
                className="py-2 px-3 rounded-lg text-xs font-semibold bg-slate-900/80 hover:bg-slate-800 border border-slate-700/60 text-slate-200 flex items-center justify-center gap-1.5 transition-colors"
              >
                <svg className="w-3.5 h-3.5 fill-white" viewBox="0 0 24 24">
                  <path d="M12 2A10 10 0 0 0 2 12c0 4.42 2.87 8.17 6.84 9.5.5.08.66-.23.66-.5v-1.69c-2.77.6-3.36-1.34-3.36-1.34-.46-1.16-1.11-1.47-1.11-1.47-.91-.62.07-.6.07-.6 1 .07 1.53 1.03 1.53 1.03.87 1.52 2.34 1.07 2.91.83.1-.65.35-1.09.63-1.34-2.22-.25-4.55-1.11-4.55-4.92 0-1.11.38-2 1.03-2.71-.1-.25-.45-1.29.1-2.64 0 0 .84-.27 2.75 1.02.79-.22 1.65-.33 2.5-.33.85 0 1.71.11 2.5.33 1.91-1.29 2.75-1.02 2.75-1.02.55 1.35.2 2.39.1 2.64.65.71 1.03 1.6 1.03 2.71 0 3.82-2.34 4.66-4.57 4.91.36.31.69.92.69 1.85V21c0 .27.16.59.67.5C19.14 20.16 22 16.42 22 12A10 10 0 0 0 12 2z"/>
                </svg>
                GitHub
              </button>
            </div>
          </div>

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
