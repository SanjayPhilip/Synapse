import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Brain, ArrowLeft, AlertCircle, User, Briefcase } from 'lucide-react';
import { registerSeeker, registerEmployer } from '@/lib/auth';
import { useAuth } from '@/context/AuthContext';

export function RegisterPage({ role }: { role: 'seeker' | 'employer' }) {
  const navigate = useNavigate();
  const { refreshProfile } = useAuth();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const isEmployer = role === 'employer';

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

    setLoading(true);
    const result = isEmployer
      ? await registerEmployer(email, password, fullName, companyName)
      : await registerSeeker(email, password, fullName);
    setLoading(false);

    if (result.error) {
      setError(result.error);
    } else {
      await refreshProfile();
      navigate('/app');
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary-50 via-white to-accent-50 px-4 py-8">
      <div className="w-full max-w-md">
        <Link to="/" className="mb-8 flex items-center justify-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-600">
            <Brain className="h-5 w-5 text-white" />
          </div>
          <span className="text-xl font-bold text-slate-900">Synapse</span>
        </Link>

        <div className="card p-8">
          <div className="mb-6 flex items-center gap-3">
            <div className={`flex h-11 w-11 items-center justify-center rounded-lg ${isEmployer ? 'bg-accent-100' : 'bg-primary-100'}`}>
              {isEmployer ? <Briefcase className={`h-5 w-5 ${isEmployer ? 'text-accent-600' : ''}`} /> : <User className="h-5 w-5 text-primary-600" />}
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">
                {isEmployer ? 'Employer Registration' : 'Job Seeker Registration'}
              </h1>
              <p className="text-sm text-slate-500">{isEmployer ? 'Post jobs and find talent' : 'Find your next opportunity'}</p>
            </div>
          </div>

          {error && (
            <div className="mb-4 flex items-center gap-2 rounded-lg bg-danger-50 px-3 py-2 text-sm text-danger-700">
              <AlertCircle className="h-4 w-4" /> {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">{isEmployer ? 'Your Name' : 'Full Name'}</label>
              <input type="text" required value={fullName} onChange={(e) => setFullName(e.target.value)} className="input" placeholder="John Doe" />
            </div>
            {isEmployer && (
              <div>
                <label className="label">Company Name</label>
                <input type="text" required value={companyName} onChange={(e) => setCompanyName(e.target.value)} className="input" placeholder="Acme Corp" />
              </div>
            )}
            <div>
              <label className="label">Email</label>
              <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="input" placeholder="you@example.com" />
            </div>
            <div>
              <label className="label">Password</label>
              <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className="input" placeholder="Min 8 chars, 1 uppercase, 1 number" />
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? 'Creating account...' : 'Create Account'}
            </button>
          </form>

          <div className="mt-6 flex items-center justify-between text-sm">
            <Link to={isEmployer ? '/register/seeker' : '/register/employer'} className="font-medium text-primary-600 hover:text-primary-700">
              {isEmployer ? "I'm a job seeker" : "I'm an employer"}
            </Link>
            <Link to="/login" className="text-slate-500 hover:text-slate-700">Already have an account?</Link>
          </div>
        </div>

        <Link to="/" className="mt-6 flex items-center justify-center gap-1 text-sm text-slate-500 hover:text-slate-700">
          <ArrowLeft className="h-4 w-4" /> Back to home
        </Link>
      </div>
    </div>
  );
}
