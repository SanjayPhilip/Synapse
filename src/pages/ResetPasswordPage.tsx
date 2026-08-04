import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Brain, ArrowLeft, AlertCircle } from 'lucide-react';
import { resetPassword } from '@/lib/api';
import { GlassmorphicCard } from '@/components/GlassmorphicCard';

export function ResetPasswordPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    if (!token) { setError('Missing reset token. Request a new reset link.'); return; }
    if (password !== confirmPassword) { setError('Passwords do not match.'); return; }
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return; }
    setLoading(true);
    try { const data = await resetPassword(token, password); setMessage(data.message); } catch (e: any) { setError(e.message); } finally { setLoading(false); }
  }

  const inputClass = "w-full rounded-lg border border-slate-700 bg-slate-800/50 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500";

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4">
      <div className="w-full max-w-md">
        <Link to="/" className="mb-8 flex items-center justify-center gap-2">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center">
            <Brain className="h-5 w-5 text-slate-950" />
          </div>
          <span className="font-mono text-xl font-bold text-white">SYNAPSE</span>
        </Link>

        <GlassmorphicCard className="p-8">
          <h1 className="text-2xl font-bold text-white">Set a new password</h1>
          <p className="mt-1 text-sm text-slate-400">Choose a new password for your Synapse account</p>

          {message ? (
            <div className="mt-6 space-y-4">
              <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/30 px-3 py-3 text-sm text-emerald-400">{message}</div>
              <button onClick={() => navigate('/login')} className="btn-primary w-full">Back to Login</button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              <div>
                <label className="label text-slate-300">New Password</label>
                <input type="password" required className={inputClass} placeholder="Min. 6 characters" value={password} onChange={(e) => setPassword(e.target.value)} />
              </div>
              <div>
                <label className="label text-slate-300">Confirm New Password</label>
                <input type="password" required className={inputClass} placeholder="Repeat new password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
              </div>
              {error && (
                <div className="flex items-center gap-2 rounded-xl bg-red-500/10 border border-red-500/30 px-3 py-2 text-sm text-red-400">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" /> {error}
                </div>
              )}
              <button type="submit" disabled={loading} className="btn-primary w-full">{loading ? 'Updating...' : 'Update Password'}</button>
            </form>
          )}
        </GlassmorphicCard>

        <Link to="/login" className="mt-6 flex items-center justify-center gap-1 text-sm text-slate-500 hover:text-slate-300">
          <ArrowLeft className="h-4 w-4" /> Back to login
        </Link>
      </div>
    </div>
  );
}
