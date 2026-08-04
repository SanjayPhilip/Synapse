import { Link } from 'react-router-dom';
import { Brain, ArrowLeft } from 'lucide-react';
import { GlassmorphicCard } from '@/components/GlassmorphicCard';

export function NotFoundPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4">
      <div className="w-full max-w-md text-center">
        <Link to="/" className="mb-8 flex items-center justify-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-cyan-400 to-blue-500">
            <Brain className="h-5 w-5 text-slate-950" />
          </div>
          <span className="font-mono text-xl font-bold text-white">SYNAPSE</span>
        </Link>

        <GlassmorphicCard className="p-10">
          <div className="font-mono text-7xl font-bold text-cyan-400">404</div>
          <h1 className="mt-4 text-2xl font-bold text-white">Page not found</h1>
          <p className="mt-2 text-sm text-slate-400">
            The page you're looking for doesn't exist or has been moved.
          </p>
          <Link
            to="/"
            className="mt-8 inline-flex items-center justify-center gap-2 rounded-lg bg-cyan-500 px-6 py-3 text-sm font-bold text-slate-950 transition-all hover:bg-cyan-400"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Homepage
          </Link>
        </GlassmorphicCard>
      </div>
    </div>
  );
}
