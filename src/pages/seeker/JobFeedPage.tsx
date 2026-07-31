import { useEffect, useState } from 'react';
import { Briefcase, MapPin, DollarSign, ExternalLink, Bookmark, Zap, Search, SlidersHorizontal, Globe, Loader2, FileText } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { getCurrentResume, getResumes, getJobPostings, createApplication, saveJob, unsaveJob, getSavedJobs, saveMatchScore } from '@/lib/api';
import { computeMatchScore, scoreLabel } from '@/lib/matching';
import type { Resume, JobPosting, SavedJob } from '@/types';
import { Spinner, EmptyState, Badge } from '@/components/ui';
import { AutoApplyButton } from '@/components/AutoApplyButton';

export function JobFeedPage() {
  const { profile } = useAuth();
  const [resume, setResume] = useState<Resume | null>(null);
  const [allResumes, setAllResumes] = useState<Resume[]>([]);
  const [jobs, setJobs] = useState<JobPosting[]>([]);
  const [savedJobs, setSavedJobs] = useState<SavedJob[]>([]);
  const [scores, setScores] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'remote' | 'full_time' | 'internship'>('all');
  const [salaryMin, setSalaryMin] = useState(0);
  const [showSalaryFilter, setShowSalaryFilter] = useState(false);
  const [externalJobs, setExternalJobs] = useState<JobPosting[]>([]);
  const [searchingExternal, setSearchingExternal] = useState(false);
  const [extSearchQuery, setExtSearchQuery] = useState('');
  const [extSearchLocation, setExtSearchLocation] = useState('');
  const [showExternalSearch, setShowExternalSearch] = useState(false);

  useEffect(() => {
    if (!profile) return;
    (async () => {
      try {
        const [r, all, j, s] = await Promise.all([
          getCurrentResume(profile.id),
          getResumes(profile.id),
          getJobPostings({ status: 'active' }),
          getSavedJobs(profile.id),
        ]);
        setResume(r);
        setAllResumes(all);
        setJobs(j);
        setSavedJobs(s);

        if (r) {
          recalculateScores(r, j);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, [profile]);

  function recalculateScores(selectedResume: Resume, targetJobs: JobPosting[]) {
    const scoreMap: Record<string, number> = {};
    for (const job of targetJobs) {
      const score = computeMatchScore(selectedResume.raw_text, selectedResume.skills, job.description, job.requirements);
      scoreMap[job.id] = score.overall_score;
    }
    setScores(scoreMap);
  }

  function handleResumeChange(resumeId: string) {
    const selected = allResumes.find((r) => r.id === resumeId);
    if (selected) {
      setResume(selected);
      recalculateScores(selected, jobs);
    }
  }

  async function handleExternalSearch() {
    if (!extSearchQuery.trim()) return;
    setSearchingExternal(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/job-search?query=${encodeURIComponent(extSearchQuery)}&location=${encodeURIComponent(extSearchLocation)}`, {
        headers: {
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
      });
      if (!response.ok) {
        setExternalJobs([]);
        return;
      }
      const data = await response.json();
      if (!data?.jobs) {
        setExternalJobs([]);
        return;
      }
      // Transform to JobPosting shape and compute scores
      const transformed: JobPosting[] = data.jobs.map((j: any) => ({
        id: `ext-${j.external_source}-${j.external_id}`,
        employer_id: '',
        title: j.title,
        description: j.description,
        requirements: j.requirements || [],
        responsibilities: [],
        location: j.location,
        is_remote: j.is_remote,
        salary_min: j.salary_min,
        salary_max: j.salary_max,
        salary_currency: 'USD',
        job_type: j.job_type,
        status: 'active',
        external_source: j.external_source,
        external_id: j.external_id,
        external_url: j.external_url,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        closed_at: null,
      }));

      if (resume) {
        const scoreMap = { ...scores };
        for (const job of transformed) {
          const score = computeMatchScore(resume.raw_text, resume.skills, job.description, job.requirements);
          scoreMap[job.id] = score.overall_score;
        }
        setScores(scoreMap);
      }

      setExternalJobs(transformed);
    } catch (e) {
      console.error(e);
      setExternalJobs([]);
    } finally {
      setSearchingExternal(false);
    }
  }

  const isSaved = (jobId: string) => savedJobs.some((s) => s.job_posting_id === jobId);

  async function handleSave(job: JobPosting) {
    if (!profile) return;
    if (isSaved(job.id)) {
      await unsaveJob(profile.id, job.id);
      setSavedJobs(prev => prev.filter(s => s.job_posting_id !== job.id));
    } else {
      await saveJob(profile.id, job.id, scores[job.id] ?? null);
      const updated = await getSavedJobs(profile.id);
      setSavedJobs(updated);
    }
  }

  async function handleApply(job: JobPosting, via: 'platform' | 'manual_redirect') {
    if (!profile || !resume) return;
    try {
      await createApplication({
        seeker_id: profile.id,
        job_posting_id: job.id,
        resume_id: resume.id,
        status: 'applied',
        match_score: scores[job.id] ?? null,
        applied_via: via,
      });
      if (via === 'manual_redirect' && job.external_url) {
        window.open(job.external_url, '_blank');
      }
      alert('Application submitted successfully!');
    } catch (e: any) {
      if (e.code === '23505') {
        alert("You've already applied to this job.");
      } else {
        alert('Failed to submit application.');
      }
    }
  }

  const filteredJobs = jobs.filter((job) => {
    const matchesSearch = !search || job.title.toLowerCase().includes(search.toLowerCase()) || job.description.toLowerCase().includes(search.toLowerCase());
    const matchesFilter = filter === 'all' || (filter === 'remote' && job.is_remote) || job.job_type === filter;
    const matchesCategory = selectedCategory === 'All' || job.category === selectedCategory;
    const matchesSalary = salaryMin === 0 || (job.salary_min !== null && job.salary_min >= salaryMin);
    return matchesSearch && matchesFilter && matchesCategory && matchesSalary;
  }).sort((a, b) => (scores[b.id] || 0) - (scores[a.id] || 0));

  if (loading) return <div className="flex justify-center py-20"><Spinner size={32} /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Job Feed</h1>
          <p className="text-slate-500">{filteredJobs.length + externalJobs.length} jobs — on-platform and external</p>
        </div>

        {allResumes.length > 0 && (
          <div className="flex items-center gap-2 rounded-xl border border-primary-200 bg-white px-3.5 py-2 shadow-sm">
            <FileText className="h-4 w-4 text-primary-600" />
            <span className="text-xs font-medium text-slate-600">Resume:</span>
            <select
              value={resume?.id || ''}
              onChange={(e) => handleResumeChange(e.target.value)}
              className="bg-transparent text-xs font-semibold text-slate-800 focus:outline-none cursor-pointer"
            >
              {allResumes.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.file_name} (v{r.version}) {r.is_current ? '★ Default' : ''}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* External job search toggle */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setShowExternalSearch(!showExternalSearch)}
          className={`btn ${showExternalSearch ? 'bg-accent-600 text-white' : 'bg-white text-slate-700 border border-slate-300'}`}
        >
          <Globe className="h-4 w-4" /> Search External Jobs
        </button>
        {externalJobs.length > 0 && (
          <span className="badge bg-accent-100 text-accent-700">{externalJobs.length} external results</span>
        )}
      </div>

      {/* External search bar */}
      {showExternalSearch && (
        <div className="card p-4">
          <div className="flex flex-col gap-3 sm:flex-row">
            <input
              value={extSearchQuery}
              onChange={(e) => setExtSearchQuery(e.target.value)}
              placeholder="Job title or keywords (e.g. React Developer)"
              className="input flex-1"
              onKeyDown={(e) => e.key === 'Enter' && handleExternalSearch()}
            />
            <input
              value={extSearchLocation}
              onChange={(e) => setExtSearchLocation(e.target.value)}
              placeholder="Location (optional)"
              className="input sm:w-48"
              onKeyDown={(e) => e.key === 'Enter' && handleExternalSearch()}
            />
            <button onClick={handleExternalSearch} disabled={searchingExternal} className="btn-primary whitespace-nowrap">
              {searchingExternal ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              {searchingExternal ? 'Searching...' : 'Search'}
            </button>
          </div>
          <p className="mt-2 text-xs text-slate-400">Searches Adzuna and JSearch APIs. Results are deduplicated and ranked against your resume.</p>
        </div>
      )}

      {/* Search & filters */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search jobs by title or keyword..."
              className="input pl-10"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowSalaryFilter(!showSalaryFilter)}
              className={`btn ${showSalaryFilter ? 'bg-primary-600 text-white' : 'bg-white text-slate-700 border border-slate-300'}`}
            >
              <SlidersHorizontal className="h-3.5 w-3.5" /> Salary
            </button>
            {(['all', 'remote', 'full_time', 'internship'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`btn ${filter === f ? 'bg-primary-600 text-white' : 'bg-white text-slate-700 border border-slate-300'}`}
              >
                {f === 'all' ? 'All Types' : f === 'full_time' ? 'Full-time' : f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Category / Domain Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1.5 scrollbar-none pt-1">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 whitespace-nowrap mr-1">Domain Feed:</span>
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
                selectedCategory === cat
                  ? 'bg-primary-600 text-white shadow-sm'
                  : 'bg-white text-slate-600 border border-slate-200 hover:border-slate-300 hover:bg-slate-50'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Salary range filter */}
      {showSalaryFilter && (
        <div className="card p-4">
          <div className="flex items-center gap-4">
            <label className="text-sm font-medium text-slate-700 whitespace-nowrap">Min Salary:</label>
            <input
              type="range"
              min={0}
              max={200000}
              step={10000}
              value={salaryMin}
              onChange={(e) => setSalaryMin(Number(e.target.value))}
              className="flex-1 accent-primary-600"
            />
            <span className="text-sm font-medium text-slate-900 whitespace-nowrap min-w-[100px] text-right">
              {salaryMin === 0 ? 'Any' : `${salaryMin.toLocaleString()}+`}
            </span>
          </div>
        </div>
      )}

      {!resume && (
        <div className="card p-4 bg-warning-50 border-warning-200">
          <p className="text-sm text-warning-800">Upload a resume to see personalized match scores for each job.</p>
        </div>
      )}

      {/* External job results */}
      {externalJobs.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
            <Globe className="h-4 w-4 text-accent-600" /> External Job Results
          </h3>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {externalJobs.sort((a, b) => (scores[b.id] || 0) - (scores[a.id] || 0)).map((job) => {
              const score = scores[job.id];
              return (
                <div key={job.id} className="card flex flex-col p-5 border-accent-200 transition-all hover:shadow-md">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="font-semibold text-slate-900 truncate">{job.title}</h3>
                      <div className="mt-1 flex items-center gap-2 text-xs text-slate-500">
                        {job.location && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{job.location}</span>}
                        {job.is_remote && <Badge color="green">Remote</Badge>}
                        <Badge color="teal">{job.external_source}</Badge>
                      </div>
                    </div>
                    {score !== undefined && (
                      <div className="flex-shrink-0 text-right">
                        <div className={`text-lg font-bold ${score >= 75 ? 'text-success-600' : score >= 50 ? 'text-warning-600' : 'text-danger-600'}`}>
                          {score.toFixed(0)}
                        </div>
                        <div className="text-xs text-slate-400">match</div>
                      </div>
                    )}
                  </div>
                  <p className="mt-3 text-sm text-slate-600 line-clamp-3">{job.description}</p>
                  {job.requirements.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {job.requirements.slice(0, 4).map((r, i) => (
                        <span key={i} className="badge bg-slate-100 text-slate-600">{r}</span>
                      ))}
                    </div>
                  )}
                  <div className="mt-4 flex items-center gap-2 border-t border-slate-100 pt-4">
                    {job.external_url && (
                      <a href={job.external_url} target="_blank" rel="noopener noreferrer" className="btn-primary flex-1">
                        <ExternalLink className="h-3.5 w-3.5" /> Apply on Site
                      </a>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* On-platform job cards */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-slate-700">On-Platform Jobs</h3>
      {filteredJobs.length === 0 ? (
        <EmptyState icon={<Briefcase className="h-12 w-12" />} title="No jobs found" description="Try adjusting your search or filters." />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredJobs.map((job) => {
            const score = scores[job.id];
            const saved = isSaved(job.id);
            return (
              <div key={job.id} className="card flex flex-col p-5 transition-all hover:shadow-md">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="font-semibold text-slate-900 truncate">{job.title}</h3>
                    <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-slate-500">
                      {job.category && <Badge color="indigo">{job.category}</Badge>}
                      {job.location && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{job.location}</span>}
                      {job.is_remote && <Badge color="green">Remote</Badge>}
                    </div>
                  </div>
                  {score !== undefined && (
                    <div className="flex-shrink-0 text-right">
                      <div className={`text-lg font-bold ${score >= 75 ? 'text-success-600' : score >= 50 ? 'text-warning-600' : 'text-danger-600'}`}>
                        {score.toFixed(0)}
                      </div>
                      <div className="text-xs text-slate-400">match</div>
                    </div>
                  )}
                </div>

                <p className="mt-3 text-sm text-slate-600 line-clamp-3">{job.description}</p>

                {job.requirements.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {job.requirements.slice(0, 4).map((r, i) => (
                      <span key={i} className="badge bg-slate-100 text-slate-600">{r}</span>
                    ))}
                    {job.requirements.length > 4 && (
                      <span className="badge bg-slate-100 text-slate-500">+{job.requirements.length - 4} more</span>
                    )}
                  </div>
                )}

                {job.salary_min && (
                  <div className="mt-3 flex items-center gap-1 text-xs text-slate-600">
                    <DollarSign className="h-3 w-3" />
                    {job.salary_min.toLocaleString()} - {job.salary_max?.toLocaleString()} {job.salary_currency}
                  </div>
                )}

                <div className="mt-4 flex items-center gap-2 border-t border-slate-100 pt-4">
                  <button
                    onClick={() => handleApply(job, 'platform')}
                    className="btn-primary flex-1"
                  >
                    <Zap className="h-3.5 w-3.5" /> Apply
                  </button>
                  {resume && job.external_url && (
                    <AutoApplyButton
                      job={job}
                      resume={resume}
                      seekerId={profile!.id}
                      matchScore={score ?? null}
                    />
                  )}
                  {job.external_url && (
                    <button
                      onClick={() => handleApply(job, 'manual_redirect')}
                      className="btn-secondary"
                      title="Go to original site"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                    </button>
                  )}
                  <button
                    onClick={() => handleSave(job)}
                    className={`btn ${saved ? 'bg-accent-100 text-accent-700' : 'bg-white text-slate-400 border border-slate-300 hover:bg-slate-50'}`}
                  >
                    <Bookmark className={`h-3.5 w-3.5 ${saved ? 'fill-current' : ''}`} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
      </div>
    </div>
  );
}
