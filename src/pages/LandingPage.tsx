import { Link } from 'react-router-dom';
import { Brain, FileText, Target, Zap, ArrowRight, Briefcase, User, CheckCircle2, BarChart3, MessageSquare, Sparkles } from 'lucide-react';

export function LandingPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      {/* Nav */}
      <nav className="sticky top-0 z-40 border-b border-slate-200 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3.5">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-600">
              <Brain className="h-5 w-5 text-white" />
            </div>
            <span className="text-lg font-bold text-slate-900">Synapse</span>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/login" className="btn-ghost">Sign In</Link>
            <Link to="/register/seeker" className="btn-primary">Get Started</Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary-50 via-white to-accent-50" />
        <div className="relative mx-auto max-w-7xl px-6 py-20 lg:py-28">
          <div className="mx-auto max-w-3xl text-center">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-primary-100 px-4 py-1.5 text-sm font-medium text-primary-700">
              <Sparkles className="h-4 w-4" />
              AI-Driven Hiring Platform
            </div>
            <h1 className="text-4xl font-bold leading-tight text-slate-900 sm:text-5xl lg:text-6xl">
              Where talent meets opportunity through{' '}
              <span className="bg-gradient-to-r from-primary-600 to-accent-600 bg-clip-text text-transparent">intelligent matching</span>
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg text-slate-600">
              One bidirectional engine that connects job seekers and employers with transparent match scoring, AI-powered resume optimization, and explainable hiring decisions.
            </p>
            <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link to="/register/seeker" className="btn-primary w-full sm:w-auto">
                <User className="h-4 w-4" />
                I'm looking for a job
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link to="/register/employer" className="btn-secondary w-full sm:w-auto">
                <Briefcase className="h-4 w-4" />
                I'm hiring talent
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="border-y border-slate-200 bg-white py-12">
        <div className="mx-auto grid max-w-5xl grid-cols-2 gap-8 px-6 md:grid-cols-4">
          {[
            { value: '40/60', label: 'Keyword + Semantic Scoring' },
            { value: '2-in-1', label: 'Seeker & Employer Platform' },
            { value: '100%', label: 'Explainable Match Reports' },
            { value: 'AI', label: 'Resume Optimization' },
          ].map((stat) => (
            <div key={stat.label} className="text-center">
              <div className="text-3xl font-bold text-primary-600">{stat.value}</div>
              <div className="mt-1 text-sm text-slate-500">{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="py-20">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold text-slate-900">Built for both sides of hiring</h2>
            <p className="mt-3 text-slate-600">A single connecting point where signal passes in both directions — seeker to employer and employer to seeker.</p>
          </div>
          <div className="mt-14 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[
              { icon: FileText, title: 'Resume Parsing', desc: 'Upload PDF or DOCX and get structured JSON with skills, experience, and education extracted automatically.', color: 'primary' },
              { icon: Target, title: 'Match Score', desc: 'Every match gets a 0-100 score with an itemized gap report showing missing skills and experience gaps.', color: 'accent' },
              { icon: Zap, title: 'AI Rewrites', desc: 'Get evidence-grounded suggestions to improve weak resume sections — no fabrication, only your real experience.', color: 'warning' },
              { icon: BarChart3, title: 'Ranked Job Feed', desc: 'Browse external and on-platform listings ranked against your resume with per-job apply choices.', color: 'success' },
              { icon: Briefcase, title: 'Employer Dashboard', desc: 'Post jobs, receive ranked applicant shortlists, and review per-candidate gap summaries with one click.', color: 'primary' },
              { icon: MessageSquare, title: 'AI Chat Assistant', desc: 'A persistent, context-aware assistant that routes queries to the right module via tool-calling.', color: 'accent' },
            ].map((feature) => (
              <div key={feature.title} className="card p-6 transition-all hover:shadow-md hover:-translate-y-0.5">
                <div className={`mb-4 flex h-11 w-11 items-center justify-center rounded-lg bg-${feature.color}-100`}>
                  <feature.icon className={`h-5 w-5 text-${feature.color}-600`} />
                </div>
                <h3 className="text-base font-semibold text-slate-900">{feature.title}</h3>
                <p className="mt-2 text-sm text-slate-600">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="bg-slate-900 py-20">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold text-white">How Synapse works</h2>
            <p className="mt-3 text-slate-400">Transparent diagnostics at every step — no black boxes.</p>
          </div>
          <div className="mt-14 grid gap-8 md:grid-cols-2">
            <div className="rounded-xl bg-slate-800 p-8">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-primary-500/20 px-3 py-1 text-sm font-medium text-primary-300">
                <User className="h-4 w-4" /> For Job Seekers
              </div>
              <ol className="space-y-4">
                {['Upload your resume — get structured data instantly', 'Paste a job description — see your Match Score + gaps', 'Review AI rewrite suggestions and improve weak sections', 'Browse ranked job feed — apply or save with one click'].map((step, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <CheckCircle2 className="mt-0.5 h-5 w-5 flex-shrink-0 text-success-400" />
                    <span className="text-slate-300">{step}</span>
                  </li>
                ))}
              </ol>
            </div>
            <div className="rounded-xl bg-slate-800 p-8">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-accent-500/20 px-3 py-1 text-sm font-medium text-accent-300">
                <Briefcase className="h-4 w-4" /> For Employers
              </div>
              <ol className="space-y-4">
                {['Create an employer account and post job openings', 'Receive applications as seekers apply to your postings', 'View ranked applicant shortlists with the same scoring engine', 'Review per-candidate gap summaries — shortlist or hire'].map((step, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <CheckCircle2 className="mt-0.5 h-5 w-5 flex-shrink-0 text-accent-400" />
                    <span className="text-slate-300">{step}</span>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20">
        <div className="mx-auto max-w-4xl px-6">
          <div className="rounded-2xl bg-gradient-to-r from-primary-600 to-accent-600 px-8 py-12 text-center">
            <h2 className="text-3xl font-bold text-white">Ready to find your perfect match?</h2>
            <p className="mx-auto mt-3 max-w-xl text-primary-100">Join Synapse today and experience hiring with full transparency.</p>
            <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link to="/register/seeker" className="btn bg-white text-primary-700 hover:bg-primary-50 w-full sm:w-auto">
                Sign up as Seeker
              </Link>
              <Link to="/register/employer" className="btn bg-primary-800 text-white hover:bg-primary-900 w-full sm:w-auto">
                Sign up as Employer
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-10">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-6 sm:flex-row">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-600">
              <Brain className="h-4 w-4 text-white" />
            </div>
            <span className="font-semibold text-slate-900">Synapse</span>
          </div>
          <p className="text-sm text-slate-500">AI-Driven Resume Optimization, Job Matching & Bidirectional Hiring Platform</p>
        </div>
      </footer>
    </div>
  );
}
