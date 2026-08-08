import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Brain, AlertCircle, User, Briefcase, Mail, CheckCircle, Loader2, Lock, ArrowRight } from 'lucide-react';
import { registerSeeker, registerEmployer } from '@/lib/auth';
import { verifyEmail, resendVerification } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import NeuralNetworkBg from '@/components/NeuralNetworkBg';
import { GlassmorphicCard } from '@/components/GlassmorphicCard';
import { PasswordStrength } from '@/components/PasswordStrength';

export function RegisterPage({ role }: { role: 'seeker' | 'employer' }) {
  const navigate = useNavigate();
  const { refreshProfile } = useAuth();
  const [step, setStep] = useState<'role' | 'form'>(role ? 'form' : 'role');
  const [selectedRole, setSelectedRole] = useState<'seeker' | 'employer'>(role);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [verificationStep, setVerificationStep] = useState<'form' | 'verifying' | 'verified'>('form');
  const [verifyToken, setVerifyToken] = useState<string | null>(null);
  const [verifyError, setVerifyError] = useState('');
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [resendMsg, setResendMsg] = useState('');
  const [resendLoading, setResendLoading] = useState(false);

  const isEmployer = selectedRole === 'employer';

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');

    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
    if (!/[A-Z]/.test(password)) {
      setError('Password must contain at least one uppercase letter');
      return;
    }
    if (!/\d/.test(password)) {
      setError('Password must contain at least one number');
      return;
    }
    if (!agreeTerms) {
      setError('Please accept the terms and conditions');
      return;
    }

    setLoading(true);
    const result = isEmployer
      ? await registerEmployer(email, password, fullName, companyName)
      : await registerSeeker(email, password, fullName);
    setLoading(false);

    if (result.error) {
      setError(result.error);
    } else if (!result.is_verified) {
      setVerifyToken(result.verify_token ?? null);
      setVerificationStep('form');
    } else {
      await refreshProfile();
      navigate('/app');
    }
  }

  async function handleVerify(e: FormEvent) {
    e.preventDefault();
    setVerifyError('');
    setVerifyLoading(true);
    try {
      await verifyEmail(verifyToken!);
      setVerificationStep('verified');
      localStorage.removeItem('synapse_token');
      localStorage.removeItem('synapse_user');
    } catch (e: unknown) {
      const err = e as Error;
      setVerifyError(err.message || 'Verification failed. Please try again.');
    } finally {
      setVerifyLoading(false);
    }
  }

  async function handleResend() {
    setResendMsg('');
    setResendLoading(true);
    try {
      const result = await resendVerification(email);
      setResendMsg(result.message);
    } catch (e: unknown) {
      setResendMsg((e as Error).message || 'Failed to resend verification email.');
    } finally {
      setResendLoading(false);
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
          <Link to="/login" className="text-slate-300 hover:text-cyan-400 transition-colors text-sm font-medium">
            Sign In
          </Link>
        </div>
      </nav>

      {/* Main Content */}
      <div className="relative z-10 flex-1 flex items-center justify-center px-6 py-12">
        {step === 'role' ? (
          <div className="w-full max-w-2xl">
            <h1 className="text-4xl font-bold font-mono text-center mb-4">
              What brings you to SYNAPSE?
            </h1>
            <p className="text-center text-slate-300 mb-12">
              Choose your role to get started with intelligent hiring
            </p>

            <div className="grid md:grid-cols-2 gap-8">
              <GlassmorphicCard
                glowColor="cyan"
                className={`p-8 transition-all duration-300 hover:scale-105 ${selectedRole === 'seeker' ? 'ring-2 ring-cyan-400' : ''}`}
                onClick={() => { setSelectedRole('seeker'); setStep('form'); }}
              >
                <div className="flex flex-col items-center text-center space-y-4">
                  <div className="w-16 h-16 rounded-lg bg-gradient-to-br from-cyan-400/30 to-blue-500/30 flex items-center justify-center">
                    <User className="w-8 h-8 text-cyan-400" />
                  </div>
                  <h2 className="text-2xl font-bold font-mono">I Want a Job</h2>
                  <p className="text-slate-300">
                    Find opportunities that match your skills and career goals with AI-powered matching.
                  </p>
                  <div className="pt-4 space-y-2 w-full text-left">
                    {['Resume parsing with Gemini AI', 'Intelligent job matching', 'Auto-apply to top matches'].map((item) => (
                      <div key={item} className="flex items-center gap-2 text-sm text-slate-300">
                        <CheckCircle className="w-4 h-4 text-cyan-400" />
                        {item}
                      </div>
                    ))}
                  </div>
                  <button className="w-full mt-6 bg-cyan-500 hover:bg-cyan-600 text-slate-950 font-bold py-3 rounded-lg transition-all hover:shadow-[0_0_20px_rgba(0,217,255,0.4)]">
                    Continue as Job Seeker
                    <ArrowRight className="ml-2 w-4 h-4 inline" />
                  </button>
                </div>
              </GlassmorphicCard>

              <GlassmorphicCard
                glowColor="violet"
                className={`p-8 transition-all duration-300 hover:scale-105 ${selectedRole === 'employer' ? 'ring-2 ring-violet-400' : ''}`}
                onClick={() => { setSelectedRole('employer'); setStep('form'); }}
              >
                <div className="flex flex-col items-center text-center space-y-4">
                  <div className="w-16 h-16 rounded-lg bg-gradient-to-br from-violet-400/30 to-pink-500/30 flex items-center justify-center">
                    <Briefcase className="w-8 h-8 text-violet-400" />
                  </div>
                  <h2 className="text-2xl font-bold font-mono">I Want to Hire</h2>
                  <p className="text-slate-300">
                    Find top talent automatically with AI screening and intelligent candidate matching.
                  </p>
                  <div className="pt-4 space-y-2 w-full text-left">
                    {['AI-powered candidate screening', 'Applicant dashboard', 'Conversational job queries'].map((item) => (
                      <div key={item} className="flex items-center gap-2 text-sm text-slate-300">
                        <CheckCircle className="w-4 h-4 text-violet-400" />
                        {item}
                      </div>
                    ))}
                  </div>
                  <button className="w-full mt-6 bg-violet-600 hover:bg-violet-700 text-white font-bold py-3 rounded-lg transition-all hover:shadow-[0_0_20px_rgba(217,70,239,0.4)]">
                    Continue as Employer
                    <ArrowRight className="ml-2 w-4 h-4 inline" />
                  </button>
                </div>
              </GlassmorphicCard>
            </div>
          </div>
        ) : (
          <GlassmorphicCard glowColor="cyan" className="w-full max-w-md p-8">
            <button
              onClick={() => setStep('role')}
              className="text-sm text-cyan-400 hover:text-cyan-300 mb-6 transition-colors"
            >
              ← Back to role selection
            </button>

            <div className="mb-6 flex items-center gap-3">
              <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${isEmployer ? 'bg-gradient-to-br from-violet-400/30 to-pink-500/30' : 'bg-gradient-to-br from-cyan-400/30 to-blue-500/30'}`}>
                {isEmployer ? <Briefcase className="w-6 h-6 text-violet-400" /> : <User className="w-6 h-6 text-cyan-400" />}
              </div>
              <div>
                <h1 className="text-2xl font-bold font-mono">Create Account</h1>
                <p className="text-sm text-slate-400">Sign up as {isEmployer ? 'an employer' : 'a job seeker'}</p>
              </div>
            </div>

            {error && (
              <div className="mb-6 flex items-center gap-2 rounded-lg bg-red-500/10 border border-red-500/20 px-3 py-2 text-sm text-red-400">
                <AlertCircle className="h-4 w-4" /> {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <label className="text-sm font-mono text-slate-300">Full Name</label>
                <div className="relative">
                  <User className="absolute left-3 top-3 w-5 h-5 text-slate-500" />
                  <input type="text" required value={fullName} onChange={(e) => setFullName(e.target.value)} className="input pl-10" placeholder="John Doe" />
                </div>
              </div>

              {isEmployer && (
                <div className="space-y-2">
                  <label className="text-sm font-mono text-slate-300">Company Name</label>
                  <div className="relative">
                    <Briefcase className="absolute left-3 top-3 w-5 h-5 text-slate-500" />
                    <input type="text" required value={companyName} onChange={(e) => setCompanyName(e.target.value)} className="input pl-10" placeholder="Acme Corp" />
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <label className="text-sm font-mono text-slate-300">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 w-5 h-5 text-slate-500" />
                  <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="input pl-10" placeholder="you@example.com" />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-mono text-slate-300">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 w-5 h-5 text-slate-500" />
                  <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className="input pl-10" placeholder="Min 8 chars, 1 uppercase, 1 number" />
                </div>
                <PasswordStrength password={password} />
              </div>

              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={agreeTerms}
                  onChange={(e) => setAgreeTerms(e.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-slate-600 bg-slate-800 accent-cyan-500"
                />
                <span className="text-sm text-slate-300">
                  I agree to the{' '}
                  <span className="text-cyan-400">Terms of Service</span> and{' '}
                  <span className="text-cyan-400">Privacy Policy</span>
                </span>
              </label>

              <button
                type="submit"
                disabled={loading}
                className={`w-full py-3 font-bold rounded-lg transition-all duration-200 ${
                  isEmployer
                    ? 'bg-violet-600 hover:bg-violet-700 text-white hover:shadow-[0_0_30px_rgba(217,70,239,0.5)]'
                    : 'bg-cyan-500 hover:bg-cyan-600 text-slate-950 hover:shadow-[0_0_30px_rgba(0,217,255,0.5)]'
                }`}
              >
                {loading ? 'Creating account...' : 'Create Account'}
              </button>
            </form>

            {/* Verification */}
            {verifyToken && verificationStep !== 'verified' && (
              <div className="mt-6 rounded-lg bg-cyan-500/10 border border-cyan-500/20 p-4">
                <div className="flex items-start gap-3">
                  <Mail className="h-5 w-5 text-cyan-400 mt-0.5" />
                  <div className="flex-1">
                    <h3 className="font-medium text-cyan-400">Verify Your Email</h3>
                    <p className="text-sm text-slate-300 mt-1">
                      Verification link sent to <strong>{email}</strong>. No link in your inbox? Use the demo button below or resend.
                    </p>
                    {verifyError && (
                      <div className="mt-2 flex items-center gap-2 rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-400">
                        <AlertCircle className="h-4 w-4" /> {verifyError}
                      </div>
                    )}
                    <form onSubmit={handleVerify} className="mt-3">
                      <button type="submit" disabled={verifyLoading} className="btn-primary w-full text-sm">
                        {verifyLoading ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Verifying...
                          </>
                        ) : (
                          'Verify Email (Demo)'
                        )}
                      </button>
                    </form>
                    <button
                      type="button"
                      onClick={handleResend}
                      disabled={resendLoading}
                      className="mt-2 w-full text-center text-xs text-cyan-400 hover:text-cyan-300 underline underline-offset-2 disabled:opacity-50"
                    >
                      {resendLoading ? 'Resending...' : 'Resend verification email'}
                    </button>
                    {resendMsg && <p className="mt-2 text-xs text-emerald-400">{resendMsg}</p>}
                  </div>
                </div>
              </div>
            )}

            {verificationStep === 'verified' && (
              <div className="mt-6 rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-4">
                <div className="flex items-center gap-3">
                  <CheckCircle className="h-5 w-5 text-emerald-400" />
                  <div>
                    <h3 className="font-medium text-emerald-400">Email Verified!</h3>
                    <p className="text-sm text-slate-300 mt-1">You can now log in to your account.</p>
                  </div>
                </div>
                <Link to="/login" className="mt-3 block w-full text-center btn-primary text-sm">
                  Go to Login
                </Link>
              </div>
            )}

            <p className="text-center text-slate-400 mt-8">
              Already have an account?{' '}
              <Link to="/login" className="text-cyan-400 hover:text-cyan-300 font-mono font-bold transition-colors">
                Sign in here
              </Link>
            </p>
          </GlassmorphicCard>
        )}
      </div>
    </div>
  );
}
