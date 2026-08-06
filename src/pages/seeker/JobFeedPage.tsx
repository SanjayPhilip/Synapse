import { useEffect, useState, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Briefcase, MapPin, DollarSign, ExternalLink, Bookmark, Zap, Search, SlidersHorizontal, Globe, Loader2, FileText } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { getCurrentResume, getResumes, getJobPostingsPage, createApplication, saveJob, unsaveJob, getSavedJobs, searchExternalJobs, saveExternalJob, applyExternalJob } from '@/lib/api';
import { computeMatchScore } from '@/lib/matching';
import type { Resume, JobPosting, SavedJob, ExternalJob } from '@/types';
import { Spinner, EmptyState, Badge, Modal, SkeletonList } from '@/components/ui';
import { AutoApplyButton } from '@/components/AutoApplyButton';
import { GlassmorphicCard } from '@/components/GlassmorphicCard';

const JOB_PAGE_SIZE = 20;

export function JobFeedPage() {
  const { profile } = useAuth();
  const { showToast } = useToast();
  const [searchParams] = useSearchParams();
  const [resume, setResume] = useState<Resume | null>(null);
  const [allResumes, setAllResumes] = useState<Resume[]>([]);
  const [jobs, setJobs] = useState<JobPosting[]>([]);
  const [savedJobs, setSavedJobs] = useState<SavedJob[]>([]);
  const [scores, setScores] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(searchParams.get('q') || '');
  const [filter, setFilter] = useState<'all' | 'remote' | 'full_time' | 'internship'>('all');
  const [salaryMin, setSalaryMin] = useState(0);
  const [showSalaryFilter, setShowSalaryFilter] = useState(false);
  const [locationFilter, setLocationFilter] = useState('');
  const [externalJobs, setExternalJobs] = useState<ExternalJob[]>([]);
  const [searchingExternal, setSearchingExternal] = useState(false);
  const [extSearchQuery, setExtSearchQuery] = useState('');
  const [extSearchLocation, setExtSearchLocation] = useState('');
  const [showExternalSearch, setShowExternalSearch] = useState(false);
  const [externalStale, setExternalStale] = useState(false);
  const [savedExt, setSavedExt] = useState<Record<string, string>>({});
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedJob, setSelectedJob] = useState<JobPosting | ExternalJob | null>(null);
  const [sort, setSort] = useState<'match' | 'newest' | 'salary'>('match');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const CATEGORIES = ['All', 'Software Engineering', 'Data Science & AI', 'Data Analytics', 'Business & MBA', 'Cloud & DevOps', 'Finance & Accounting', 'Marketing & Sales'];

  async function loadJobsPage(pageNum: number, append: boolean) {
    if (!profile) return;
    try {
      if (append) setLoadingMore(true);
      const res = await getJobPostingsPage({ status: 'active', page: pageNum, pageSize: JOB_PAGE_SIZE });
      const items = res.items.filter((job) => job.employer_id !== profile.id);
      setJobs(prev => append ? [...prev, ...items] : items);
      setHasMore(pageNum < res.total_pages);
      if (resume) recalculateScores(resume, items);
    } catch (e) { console.error(e); } finally { if (append) setLoadingMore(false); }
  }

  useEffect(() => {
    if (!profile) return;
    (async () => {
      try {
        const [r, all, s] = await Promise.all([getCurrentResume(profile.id), getResumes(profile.id), getSavedJobs(profile.id)]);
        setResume(r); setAllResumes(all); setSavedJobs(s);
        await loadJobsPage(1, false);
      } catch (e) { console.error(e); } finally { setLoading(false); }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile]);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const obs = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && hasMore && !loadingMore && !loading) {
        setPage(p => p + 1);
      }
    }, { rootMargin: '300px' });
    obs.observe(el);
    return () => obs.disconnect();
  }, [hasMore, loadingMore, loading]);

  useEffect(() => {
    if (page > 1) loadJobsPage(page, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  function recalculateScores(selectedResume: Resume, targetJobs: JobPosting[]) {
    const scoreMap: Record<string, number> = {};
    for (const job of targetJobs) { const score = computeMatchScore(selectedResume.raw_text, selectedResume.skills, job.description, job.requirements); scoreMap[job.id] = score.overall_score; }
    setScores(scoreMap);
  }

  function handleResumeChange(resumeId: string) {
    const selected = allResumes.find((r) => r.id === resumeId);
    if (selected) { setResume(selected); recalculateScores(selected, jobs); }
  }

  async function handleExternalSearch() {
    if (!extSearchQuery.trim()) return;
    setSearchingExternal(true);
    try {
      const response = await searchExternalJobs(extSearchQuery.trim(), extSearchLocation.trim());
      setExternalStale(response.stale);
      if (response.jobs.length === 0) { setExternalJobs([]); return; }
      if (resume) {
        const scoreMap = { ...scores };
        for (const job of response.jobs) {
          const score = computeMatchScore(resume.raw_text, resume.skills, job.description, job.requirements);
          scoreMap[job.id] = score.overall_score;
        }
        setScores(scoreMap);
      }
      setExternalJobs(response.jobs);
    } catch (e) { console.error(e); setExternalJobs([]); } finally { setSearchingExternal(false); }
  }

  const isSaved = (jobId: string) => savedJobs.some((s) => s.job_posting_id === jobId);

  async function handleSave(job: JobPosting) {
    if (!profile) return;
    if (isSaved(job.id)) { await unsaveJob(profile.id, job.id); setSavedJobs(prev => prev.filter(s => s.job_posting_id !== job.id)); }
    else { await saveJob(profile.id, job.id, scores[job.id] ?? null); const updated = await getSavedJobs(profile.id); setSavedJobs(updated); }
  }

  async function handleApply(job: JobPosting, via: 'platform' | 'manual_redirect') {
    if (!profile) return;
    if (!resume) { showToast('Upload a resume first.', 'error'); return; }
    try {
      await createApplication({ seeker_id: profile.id, job_posting_id: job.id, resume_id: resume.id, status: 'applied', match_score: scores[job.id] ?? null, applied_via: via });
      if (via === 'manual_redirect' && job.external_url) window.open(job.external_url, '_blank');
      showToast('Application submitted!');
    } catch (e: any) { showToast(e.code === '23505' ? "Already applied." : 'Failed to submit.', 'error'); }
  }

  async function handleExtSave(job: ExternalJob) {
    if (!profile) return;
    const postingId = savedExt[job.id];
    if (postingId) {
      await unsaveJob(profile.id, postingId);
      setSavedExt((prev) => { const next = { ...prev }; delete next[job.id]; return next; });
      setSavedJobs((prev) => prev.filter((s) => s.job_posting_id !== postingId));
      showToast('Removed from saved.');
    } else {
      const res = await saveExternalJob(job.id);
      setSavedExt((prev) => ({ ...prev, [job.id]: res.job_posting_id }));
      const updated = await getSavedJobs(profile.id);
      setSavedJobs(updated);
      showToast('Job saved!');
    }
  }

  async function handleExtApply(job: ExternalJob) {
    if (!profile) return;
    if (!resume) { showToast('Upload a resume first.', 'error'); return; }
    try {
      const res = await applyExternalJob(job.id);
      showToast('Application queued.');
      if (res.external_url) window.open(res.external_url, '_blank');
    } catch (e: any) { showToast(e.message || 'Failed to apply.', 'error'); }
  }

  const filteredJobs = jobs.filter((job) => {
    const matchesSearch = !search || job.title.toLowerCase().includes(search.toLowerCase()) || job.description.toLowerCase().includes(search.toLowerCase());
    const matchesFilter = filter === 'all' || (filter === 'remote' && job.is_remote) || job.job_type === filter;
    const matchesCategory = selectedCategory === 'All' || job.category === selectedCategory;
    const matchesSalary = salaryMin === 0 || (job.salary_min !== null && job.salary_min >= salaryMin);
    const matchesLocation = !locationFilter || (job.location && job.location.toLowerCase().includes(locationFilter.toLowerCase()));
    return matchesSearch && matchesFilter && matchesCategory && matchesSalary && matchesLocation;
  }).sort((a, b) => {
    if (sort === 'match') return (scores[b.id] || 0) - (scores[a.id] || 0);
    if (sort === 'newest') return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    if (sort === 'salary') return ((b.salary_max || b.salary_min || 0) - (a.salary_max || a.salary_min || 0));
    return 0;
  });

  if (loading) return <div className="flex justify-center py-20"><Spinner size={32} /></div>;

  const inputClass = "w-full rounded-lg border border-slate-700 bg-slate-800/50 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500";
  const scoreColor = (s: number) => s >= 75 ? 'text-emerald-400' : s >= 50 ? 'text-amber-400' : 'text-red-400';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-mono text-3xl font-bold text-white">Job Feed</h1>
          <p className="text-slate-400">{filteredJobs.length + externalJobs.length} jobs — on-platform and external</p>
        </div>
        {allResumes.length > 0 && (
          <div className="flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-800/50 px-3.5 py-2">
            <FileText className="h-4 w-4 text-cyan-400" />
            <span className="text-xs font-medium text-slate-400">Resume:</span>
            <select value={resume?.id || ''} onChange={(e) => handleResumeChange(e.target.value)} className="bg-transparent text-xs font-semibold text-white focus:outline-none cursor-pointer">
              {allResumes.map((r) => <option key={r.id} value={r.id}>{r.file_name} (v{r.version}) {r.is_current ? '★' : ''}</option>)}
            </select>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2">
        <button onClick={() => setShowExternalSearch(!showExternalSearch)} className={`btn ${showExternalSearch ? 'bg-violet-600 text-white' : 'bg-slate-800 text-slate-300 border border-slate-700'}`}>
          <Globe className="h-4 w-4" /> External Jobs
        </button>
        {externalJobs.length > 0 && <span className="badge bg-violet-500/20 text-violet-400 border border-violet-500/30">{externalJobs.length} external</span>}
      </div>

      {showExternalSearch && (
        <GlassmorphicCard className="p-4">
          <div className="flex flex-col gap-3 sm:flex-row">
            <input value={extSearchQuery} onChange={(e) => setExtSearchQuery(e.target.value)} placeholder="Job title or keywords..." className={`${inputClass} flex-1`} onKeyDown={(e) => e.key === 'Enter' && handleExternalSearch()} />
            <input value={extSearchLocation} onChange={(e) => setExtSearchLocation(e.target.value)} placeholder="Location (optional)" className={`${inputClass} sm:w-48`} onKeyDown={(e) => e.key === 'Enter' && handleExternalSearch()} />
            <button onClick={handleExternalSearch} disabled={searchingExternal} className="btn-primary whitespace-nowrap">
              {searchingExternal ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />} {searchingExternal ? 'Searching...' : 'Search'}
            </button>
          </div>
        </GlassmorphicCard>
      )}

      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search jobs by title or keyword..." className={`${inputClass} pl-10`} />
          </div>
          <div className="relative sm:w-48">
            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
            <input value={locationFilter} onChange={(e) => setLocationFilter(e.target.value)} placeholder="Location..." className={`${inputClass} pl-9`} />
          </div>
          <div className="flex gap-2 flex-wrap">
            <select value={sort} onChange={(e) => setSort(e.target.value as any)} className="btn bg-slate-800 text-slate-300 border border-slate-700 text-xs">
              <option value="match">Sort: Match</option>
              <option value="newest">Sort: Newest</option>
              <option value="salary">Sort: Salary</option>
            </select>
            <button onClick={() => setShowSalaryFilter(!showSalaryFilter)} className={`btn ${showSalaryFilter ? 'bg-cyan-600 text-white' : 'bg-slate-800 text-slate-300 border border-slate-700'}`}><SlidersHorizontal className="h-3.5 w-3.5" /> Salary</button>
            {(['all', 'remote', 'full_time', 'internship'] as const).map((f) => (
              <button key={f} onClick={() => setFilter(f)} className={`btn ${filter === f ? 'bg-cyan-600 text-white' : 'bg-slate-800 text-slate-300 border border-slate-700'}`}>
                {f === 'all' ? 'All' : f === 'full_time' ? 'Full-time' : f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1.5 scrollbar-none pt-1">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 whitespace-nowrap mr-1">Domain:</span>
          {CATEGORIES.map((cat) => (
            <button key={cat} onClick={() => setSelectedCategory(cat)} className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-all ${selectedCategory === cat ? 'bg-cyan-600 text-white' : 'bg-slate-800 text-slate-400 border border-slate-700 hover:border-slate-600'}`}>{cat}</button>
          ))}
        </div>
      </div>

      {showSalaryFilter && (
        <GlassmorphicCard className="p-4">
          <div className="flex items-center gap-4">
            <label className="text-sm font-medium text-slate-300 whitespace-nowrap">Min Salary:</label>
            <input type="range" min={0} max={200000} step={10000} value={salaryMin} onChange={(e) => setSalaryMin(Number(e.target.value))} className="flex-1 accent-cyan-500" />
            <span className="text-sm font-medium text-white whitespace-nowrap min-w-[100px] text-right">{salaryMin === 0 ? 'Any' : `${salaryMin.toLocaleString()}+`}</span>
          </div>
        </GlassmorphicCard>
      )}

      {!resume && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
          <p className="text-sm text-amber-400">Upload a resume to see personalized match scores.</p>
        </div>
      )}

      {externalJobs.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
            <Globe className="h-4 w-4 text-violet-400" /> External Results
            {externalStale && <span className="badge bg-amber-500/20 text-amber-400 border border-amber-500/30">cached — sources unavailable</span>}
          </h3>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {externalJobs.sort((a, b) => (scores[b.id] || 0) - (scores[a.id] || 0)).map((job) => {
              const score = scores[job.id];
              const saved = Boolean(savedExt[job.id]);
              return (
                <GlassmorphicCard key={job.id} className="p-5 flex flex-col">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="font-semibold text-white truncate">{job.title}</h3>
                      <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-slate-500">
                        {job.company && <span className="truncate">{job.company}</span>}
                        {job.location && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{job.location}</span>}
                        {job.is_remote && <Badge color="green">Remote</Badge>}
                        <Badge color="teal">{job.external_source}</Badge>
                      </div>
                    </div>
                    {score !== undefined && <div className="text-right"><div className={`text-lg font-bold ${scoreColor(score)}`}>{score.toFixed(0)}</div><div className="text-xs text-slate-500">match</div></div>}
                  </div>
                  <p className="mt-3 text-sm text-slate-400 line-clamp-3">{job.description}</p>
                  {job.requirements.length > 0 && <div className="mt-3 flex flex-wrap gap-1.5">{job.requirements.slice(0, 4).map((r, i) => <span key={i} className="badge bg-slate-800 text-slate-300 border border-slate-700">{r}</span>)}</div>}
                  {job.salary_min != null && <div className="mt-3 flex items-center gap-1 text-xs text-slate-400"><DollarSign className="h-3 w-3" />{job.salary_min.toLocaleString()} - {job.salary_max?.toLocaleString()} {job.salary_currency}</div>}
                  <div className="mt-4 flex items-center gap-2 border-t border-slate-700/50 pt-4">
                    <button onClick={() => setSelectedJob(job)} className="btn-secondary text-xs">View</button>
                    <button onClick={() => handleExtApply(job)} disabled={!resume} className="btn-primary flex-1 disabled:cursor-not-allowed disabled:opacity-50"><Zap className="h-3.5 w-3.5" /> Apply</button>
                    {job.external_url && <a href={job.external_url} target="_blank" rel="noopener noreferrer" className="btn-secondary" title="Go to original site"><ExternalLink className="h-3.5 w-3.5" /></a>}
                    <button onClick={() => handleExtSave(job)} className={`btn ${saved ? 'bg-violet-500/20 text-violet-400 border border-violet-500/30' : 'bg-slate-800 text-slate-400 border border-slate-700 hover:bg-slate-700'}`}><Bookmark className={`h-3.5 w-3.5 ${saved ? 'fill-current' : ''}`} /></button>
                  </div>
                </GlassmorphicCard>
              );
            })}
          </div>
        </div>
      )}

      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-slate-300">On-Platform Jobs</h3>
        {filteredJobs.length === 0 ? (
          <EmptyState icon={<Briefcase className="h-12 w-12" />} title="No jobs found" description="Try adjusting your search or filters." />
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredJobs.map((job) => {
              const score = scores[job.id];
              const saved = isSaved(job.id);
              return (
                <GlassmorphicCard key={job.id} className="p-5 flex flex-col">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="font-semibold text-white truncate">{job.title}</h3>
                      <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-slate-500">
                        {job.category && <Badge color="indigo">{job.category}</Badge>}
                        {job.location && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{job.location}</span>}
                        {job.is_remote && <Badge color="green">Remote</Badge>}
                      </div>
                    </div>
                    {score !== undefined && <div className="text-right"><div className={`text-lg font-bold ${scoreColor(score)}`}>{score.toFixed(0)}</div><div className="text-xs text-slate-500">match</div></div>}
                  </div>
                  <p className="mt-3 text-sm text-slate-400 line-clamp-3">{job.description}</p>
                  {job.requirements.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {job.requirements.slice(0, 4).map((r, i) => <span key={i} className="badge bg-slate-800 text-slate-300 border border-slate-700">{r}</span>)}
                      {job.requirements.length > 4 && <span className="badge bg-slate-800 text-slate-500 border border-slate-700">+{job.requirements.length - 4} more</span>}
                    </div>
                  )}
                  {job.salary_min && <div className="mt-3 flex items-center gap-1 text-xs text-slate-400"><DollarSign className="h-3 w-3" />{job.salary_min.toLocaleString()} - {job.salary_max?.toLocaleString()} {job.salary_currency}</div>}
                  <div className="mt-4 flex items-center gap-2 border-t border-slate-700/50 pt-4">
                    <button onClick={() => setSelectedJob(job)} className="btn-secondary text-xs">View</button>
                    <button onClick={() => handleApply(job, 'platform')} disabled={!resume} className="btn-primary flex-1 disabled:cursor-not-allowed disabled:opacity-50"><Zap className="h-3.5 w-3.5" /> Apply</button>
                    {resume && job.external_url && <AutoApplyButton job={job} resume={resume} seekerId={profile!.id} matchScore={score ?? null} />}
                    {job.external_url && <button onClick={() => handleApply(job, 'manual_redirect')} className="btn-secondary" title="Go to original site"><ExternalLink className="h-3.5 w-3.5" /></button>}
                    <button onClick={() => handleSave(job)} className={`btn ${saved ? 'bg-violet-500/20 text-violet-400 border border-violet-500/30' : 'bg-slate-800 text-slate-400 border border-slate-700 hover:bg-slate-700'}`}><Bookmark className={`h-3.5 w-3.5 ${saved ? 'fill-current' : ''}`} /></button>
                  </div>
                </GlassmorphicCard>
              );
            })}
          </div>
        )}
        {hasMore && (
          <div ref={sentinelRef} className="flex justify-center py-6">
            {loadingMore ? <Spinner /> : <span className="text-xs text-slate-500">Scroll for more jobs</span>}
          </div>
        )}
        {!hasMore && jobs.length > 0 && (
          <p className="text-center text-xs text-slate-600 pt-2">All jobs loaded — {filteredJobs.length} shown</p>
        )}
      </div>

      {selectedJob && (
        <Modal open={!!selectedJob} onClose={() => setSelectedJob(null)} title={selectedJob.title} maxWidth="max-w-2xl">
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
              {'company' in selectedJob && selectedJob.company && <span>{selectedJob.company}</span>}
              {'location' in selectedJob && selectedJob.location && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{selectedJob.location}</span>}
              {'is_remote' in selectedJob && selectedJob.is_remote && <Badge color="green">Remote</Badge>}
              {'job_type' in selectedJob && selectedJob.job_type && <Badge color="slate">{selectedJob.job_type}</Badge>}
              {'external_source' in selectedJob && selectedJob.external_source && <Badge color="teal">{selectedJob.external_source}</Badge>}
            </div>
            {'salary_min' in selectedJob && selectedJob.salary_min && (
              <div className="flex items-center gap-1 text-sm text-slate-400">
                <DollarSign className="h-4 w-4" />
                {selectedJob.salary_min.toLocaleString()} - {selectedJob.salary_max?.toLocaleString()} {selectedJob.salary_currency}
              </div>
            )}
            <div>
              <h4 className="text-sm font-semibold text-slate-300">Description</h4>
              <p className="mt-1 whitespace-pre-line text-sm text-slate-400">{selectedJob.description}</p>
            </div>
            {'requirements' in selectedJob && selectedJob.requirements.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-slate-300">Requirements</h4>
                <div className="mt-2 flex flex-wrap gap-2">
                  {selectedJob.requirements.map((r, i) => <span key={i} className="badge bg-slate-800 text-slate-300 border border-slate-700">{r}</span>)}
                </div>
              </div>
            )}
            {'external_url' in selectedJob && selectedJob.external_url && (
              <a href={selectedJob.external_url} target="_blank" rel="noopener noreferrer" className="btn-secondary inline-flex items-center gap-2">
                <ExternalLink className="h-4 w-4" /> Go to original posting
              </a>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}
