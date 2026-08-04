import { Link } from 'react-router-dom';
import { Brain, ArrowRight, Briefcase, User, ChevronDown, Sun, Moon } from 'lucide-react';
import { useTheme } from '@/lib/theme';

export function LandingPage() {
  const { theme, toggleTheme } = useTheme();
  return (
    <div className="min-h-screen text-slate-50">
      {/* Hero */}
      <div
        className="relative flex min-h-screen flex-col overflow-hidden bg-cover bg-top"
        style={{ backgroundImage: "url('/images/bg.jpg')" }}
      >
        <div className="absolute inset-0 bg-slate-950/80" />

        {/* Header */}
        <header className="relative z-50 flex items-center justify-between px-6 py-6">
          <Link to="/" className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-cyan-400 to-blue-500">
              <Brain className="h-5 w-5 text-slate-950" />
            </div>
            <span className="font-mono text-3xl tracking-widest">SYNAPSE</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link to="/login" className="px-4 py-2 text-sm text-slate-300 transition-colors hover:text-cyan-400">Sign In</Link>
            <Link to="/register/seeker" className="rounded-lg bg-cyan-500 px-4 py-2 text-sm font-bold text-slate-950 transition-all hover:bg-cyan-400">Get Started</Link>
            <button
              onClick={toggleTheme}
              className="flex items-center gap-2 rounded-lg border border-slate-700/50 bg-slate-800/50 px-3 py-2 text-sm text-slate-300 transition-colors hover:text-white"
            >
              {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
          </div>
        </header>

        {/* Intro */}
        <section className="relative z-10 flex flex-1 flex-col items-center justify-center px-6 py-24 text-center fade-in">
          <div className="mb-6 text-xs font-semibold uppercase tracking-[0.3em] text-cyan-400">
            AI-Driven Hiring Platform
          </div>
          <h1 className="font-mono text-6xl leading-[0.95] tracking-wide md:text-8xl">
            THIS IS
            <br />
            YOUR SYNAPSE
          </h1>
          <p className="mx-auto mt-8 max-w-2xl text-lg leading-relaxed text-slate-300">
            A free, AI-powered platform where resumes come alive and hiring makes sense.
            We read every line, match every skill, and connect the right people to the
            right opportunities.
          </p>
          <div className="mt-12 flex flex-col justify-center gap-4 sm:flex-row">
            <Link
              to="/register/seeker"
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-cyan-500 px-8 py-4 text-lg font-bold text-slate-950 transition-all duration-200 hover:bg-cyan-400 hover:shadow-[0_0_30px_rgba(24,191,239,0.5)]"
            >
              I'm Looking for a Job <ArrowRight className="h-5 w-5" />
            </Link>
            <Link
              to="/register/employer"
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-white/25 bg-white/5 px-8 py-4 text-lg font-bold text-white backdrop-blur-sm transition-all duration-200 hover:border-cyan-400 hover:text-cyan-400"
            >
              I'm Hiring Talent <ArrowRight className="h-5 w-5" />
            </Link>
          </div>
          <a
            href="#main"
            className="mt-16 flex h-14 w-14 items-center justify-center rounded-full border border-slate-700/50 text-slate-400 transition-all hover:border-cyan-500/50 hover:text-cyan-400"
          >
            <ChevronDown className="h-6 w-6" />
          </a>
        </section>
      </div>

      {/* Main content */}
      <main id="main" className="mx-auto max-w-6xl px-6 py-20">
        {/* Featured */}
        <article className="mb-24 text-center">
          <div className="mb-6 inline-block rounded-full border border-cyan-500/30 bg-cyan-500/10 px-4 py-1 font-mono text-sm uppercase tracking-widest text-cyan-400">
            How Synapse Works
          </div>
          <h2 className="mx-auto max-w-3xl font-mono text-5xl leading-[1.05] tracking-wide md:text-6xl">
            One platform.<br />Both sides of hiring.
          </h2>
          <p className="mx-auto mt-6 max-w-2xl leading-relaxed text-slate-400">
            Upload a resume, get a match score, and let AI rewrite it to fit. Employers
            post jobs, rank applicants, and shortlist the best — all in one place.
          </p>
          <img src="/images/pic01.jpg" alt="Synapse platform" className="mt-12 w-full object-cover" />
        </article>

        {/* For both sides */}
        <section className="mt-24 grid gap-16 md:grid-cols-2">
          <div>
            <div className="mb-6 inline-flex items-center gap-2 font-mono text-2xl text-cyan-400">
              <User className="h-6 w-6" /> For Job Seekers
            </div>
            <ul className="space-y-4">
              {[
                'Upload your resume — AI parses and structures it instantly',
                'See your Match Score for every job with detailed gap analysis',
                'Get AI-powered rewrite suggestions to strengthen weak sections',
                'Browse ranked job feed — apply or save with one click',
              ].map((step, i) => (
                <li key={i} className="flex items-start gap-3">
                  <span className="mt-2 h-1 w-1 flex-shrink-0 rounded-full bg-cyan-400" />
                  <span className="leading-relaxed text-slate-300">{step}</span>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <div className="mb-6 inline-flex items-center gap-2 font-mono text-2xl text-violet-400">
              <Briefcase className="h-6 w-6" /> For Employers
            </div>
            <ul className="space-y-4">
              {[
                'Post job openings with requirements and responsibilities',
                'Receive ranked applicant shortlists with AI scoring',
                'Review per-candidate gap summaries and AI analysis',
                'Shortlist, reject, or hire with one-click actions',
              ].map((step, i) => (
                <li key={i} className="flex items-start gap-3">
                  <span className="mt-2 h-1 w-1 flex-shrink-0 rounded-full bg-violet-400" />
                  <span className="leading-relaxed text-slate-300">{step}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* CTA */}
        <section className="mt-24 text-center">
          <h2 className="font-mono text-4xl tracking-wide md:text-5xl">Ready to transform your hiring?</h2>
          <p className="mb-10 mt-4 text-slate-400">
            Join thousands of job seekers and employers using SYNAPSE to find perfect matches.
          </p>
          <div className="flex flex-col justify-center gap-4 sm:flex-row">
            <Link
              to="/register/seeker"
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-cyan-500 px-8 py-4 text-lg font-bold text-slate-950 transition-all duration-200 hover:bg-cyan-400 hover:shadow-[0_0_30px_rgba(24,191,239,0.5)]"
            >
              Get Started as Seeker <ArrowRight className="h-5 w-5" />
            </Link>
            <Link
              to="/register/employer"
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-white/25 bg-white/5 px-8 py-4 text-lg font-bold text-white backdrop-blur-sm transition-all duration-200 hover:border-cyan-400 hover:text-cyan-400"
            >
              Get Started as Employer <ArrowRight className="h-5 w-5" />
            </Link>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/50 px-6 py-10 text-center">
        <div className="mb-6 flex justify-center gap-4">
          <Link to="/login" className="text-sm text-slate-400 transition-colors hover:text-cyan-400">Sign In</Link>
          <span className="text-slate-700">•</span>
          <Link to="/register/seeker" className="text-sm text-slate-400 transition-colors hover:text-cyan-400">Sign Up</Link>
        </div>
        <p className="text-xs text-slate-500">
          SYNAPSE &copy; {new Date().getFullYear()}. Powered by Gemini AI, FastAPI, and React.
        </p>
      </footer>
    </div>
  );
}
