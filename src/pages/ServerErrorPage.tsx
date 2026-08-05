import { Link } from 'react-router-dom';
import { AlertTriangle, Home, RefreshCw } from 'lucide-react';

export function ServerErrorPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 p-4">
      <div className="max-w-md rounded-xl border border-red-500/30 bg-slate-900/80 p-8 text-center">
        <AlertTriangle className="mx-auto h-12 w-12 text-red-400" />
        <h1 className="mt-4 font-mono text-3xl font-bold text-white">500</h1>
        <p className="mt-2 text-slate-400">Internal server error. Something went wrong on our end.</p>
        <div className="mt-6 flex items-center justify-center gap-3">
          <button onClick={() => window.location.reload()} className="btn-primary inline-flex items-center gap-2">
            <RefreshCw className="h-4 w-4" /> Retry
          </button>
          <Link to="/" className="btn-secondary inline-flex items-center gap-2">
            <Home className="h-4 w-4" /> Home
          </Link>
        </div>
      </div>
    </div>
  );
}
