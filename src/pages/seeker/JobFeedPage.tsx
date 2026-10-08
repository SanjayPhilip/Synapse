import { useEffect, useState, useRef, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Briefcase,
  MapPin,
  DollarSign,
  ExternalLink,
  Bookmark,
  Zap,
  Search,
  SlidersHorizontal,
  Globe,
  Loader2,
  FileText,
  X,
  Sparkles,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  Check,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import {
  getCurrentResume,
  getResumes,
  getJobPostingsPage,
  getJobFacets,
  createApplication,
  saveJob,
  unsaveJob,
  getSavedJobs,
  searchExternalJobs,
  saveExternalJob,
  applyExternalJob,
} from '@/lib/api';
import { computeMatchScore } from '@/lib/matching';
import type { Resume, JobPosting, SavedJob, ExternalJob, JobFacets } from '@/types';
import { Spinner, EmptyState, Badge, Modal } from '@/components/ui';
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
  const [facets, setFacets] = useState<JobFacets | null>(null);

  // Search & Filter State
  const [search, setSearch] = useState(searchParams.get('q') || '');
  const [locationFilter, setLocationFilter] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [workMode, setWorkMode] = useState<'all' | 'remote' | 'on_site'>('all');
  const [jobType, setJobType] = useState<'all' | 'full_time' | 'part_time' | 'contract' | 'internship'>('all');
  const [experienceLevel, setExperienceLevel] = useState<'all' | 'entry' | 'mid' | 'senior' | 'lead'>('all');
  const [salaryMin, setSalaryMin] = useState(0);
  const [salaryMax, setSalaryMax] = useState(0);
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  // External Jobs State
  const [externalJobs, setExternalJobs] = useState<ExternalJob[]>([]);
  const [searchingExternal, setSearchingExternal] = useState(false);
  const [extSearchQuery, setExtSearchQuery] = useState('');
  const [extSearchLocation, setExtSearchLocation] = useState('');
  const [showExternalSearch, setShowExternalSearch] = useState(false);
  const [externalStale, setExternalStale] = useState(false);
  const [savedExt, setSavedExt] = useState<Record<string, string>>({});

  // Pagination & Sorting
  const [selectedJob, setSelectedJob] = useState<JobPosting | ExternalJob | null>(null);
  const [sort, setSort] = useState<'match' | 'newest' | 'salary'>('match');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isInitialMount = useRef(true);

  const CATEGORIES = [
    'All',
    'Software Engineering',
    'Data Science & AI',
    'Data Analytics',
    'Business & MBA',
    'Cloud & DevOps',
    'Finance & Accounting',
    'Marketing & Sales',
  ];

  async function loadJobsPage(pageNum: number, append: boolean, searchQuery: string = search, currentResume?: Resume | null) {
    if (!profile) return;
    const resumeToUse = currentResume !== undefined ? currentResume : resume;
    try {
      if (append) setLoadingMore(true);
      const res = await getJobPostingsPage({
        status: 'active',
        page: pageNum,
        pageSize: JOB_PAGE_SIZE,
        q: searchQuery || undefined,
        category: selectedCategory !== 'All' ? selectedCategory : undefined,
        jobType: jobType !== 'all' ? jobType : undefined,
        isRemote: workMode === 'remote' ? true : workMode === 'on_site' ? false : undefined,
        minSalary: salaryMin > 0 ? salaryMin : undefined,
        maxSalary: salaryMax > 0 ? salaryMax : undefined,
        location: locationFilter || undefined,
        experienceLevel: experienceLevel !== 'all' ? experienceLevel : undefined,
        skill: selectedSkills.length > 0 ? selectedSkills[0] : undefined,
      });
      const items = res.items;
      setJobs((prev) => (append ? [...prev, ...items] : items));
      setHasMore(pageNum < res.total_pages);
      if (resumeToUse) recalculateScores(resumeToUse, items);
    } catch (e) {
      console.error(e);
    } finally {
      if (append) setLoadingMore(false);
    }
  }

  // Initial load
  useEffect(() => {
    if (!profile) return;
    (async () => {
      try {
        const [r, all, s, f] = await Promise.all([
          getCurrentResume(profile.id).catch((err) => {
            console.error('Failed to get current resume:', err);
            return null;
          }),
          getResumes(profile.id).catch((err) => {
            console.error('Failed to get all resumes:', err);
            return [];
          }),
          getSavedJobs(profile.id).catch(() => []),
          getJobFacets().catch(() => null),
        ]);
        
        // If current resume is null but we have resumes in list, fallback to the first current or newest resume
        const activeResume = r || all.find((item) => item.is_current) || all[0] || null;
        setResume(activeResume);
        setAllResumes(all);
        setSavedJobs(s);
        if (f) setFacets(f);

        await loadJobsPage(1, false, search, activeResume);
      } catch (e) {
        console.error('Error during initial JobFeedPage load:', e);
      } finally {
        setLoading(false);
        isInitialMount.current = false;
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile]);

  // Refetch when filters change
  useEffect(() => {
    if (isInitialMount.current) return;
    setPage(1);
    loadJobsPage(1, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    selectedCategory,
    workMode,
    jobType,
    experienceLevel,
    salaryMin,
    salaryMax,
    locationFilter,
    selectedSkills,
  ]);

  // Infinite scroll
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingMore && !loading) {
          setPage((p) => p + 1);
        }
      },
      { rootMargin: '300px' }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [hasMore, loadingMore, loading]);

  useEffect(() => {
    if (page > 1) loadJobsPage(page, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  function recalculateScores(selectedResume: Resume, targetJobs: JobPosting[]) {
    const scoreMap: Record<string, number> = {};
    for (const job of targetJobs) {
      const score = computeMatchScore(
        selectedResume.raw_text,
        selectedResume.skills,
        job.description,
        job.requirements
      );
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
      const response = await searchExternalJobs(extSearchQuery.trim(), extSearchLocation.trim());
      setExternalStale(response.stale);
      if (response.jobs.length === 0) {
        setExternalJobs([]);
        return;
      }
      if (resume) {
        const scoreMap = { ...scores };
        for (const job of response.jobs) {
          const score = computeMatchScore(resume.raw_text, resume.skills, job.description, job.requirements);
          scoreMap[job.id] = score.overall_score;
        }
        setScores(scoreMap);
      }
      setExternalJobs(response.jobs);
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
      setSavedJobs((prev) => prev.filter((s) => s.job_posting_id !== job.id));
    } else {
      await saveJob(profile.id, job.id, scores[job.id] ?? null);
      const updated = await getSavedJobs(profile.id);
      setSavedJobs(updated);
    }
  }

  const [applyingJobId, setApplyingJobId] = useState<string | null>(null);
  const [appliedJobIds, setAppliedJobIds] = useState<Set<string>>(new Set());

  async function handleApply(job: JobPosting, via: 'platform' | 'manual_redirect') {
    if (!profile) return;
    
    // Fallback to active resume or fetch if somehow state was empty
    let currentResume = resume;
    if (!currentResume) {
      try {
        const fetched = await getCurrentResume(profile.id);
        if (fetched) {
          currentResume = fetched;
          setResume(fetched);
        } else if (allResumes.length > 0) {
          currentResume = allResumes[0];
          setResume(allResumes[0]);
        }
      } catch (err) {
        console.error('Failed to resolve resume on apply:', err);
      }
    }

    if (!currentResume) {
      showToast('Please upload a resume first on the Resume page.', 'error');
      return;
    }

    setApplyingJobId(job.id);
    try {
      await createApplication({
        seeker_id: profile.id,
        job_posting_id: job.id,
        resume_id: currentResume.id,
        status: 'applied',
        match_score: scores[job.id] ?? null,
        applied_via: via,
      });
      setAppliedJobIds((prev) => new Set(prev).add(job.id));
      if (via === 'manual_redirect' && job.external_url) window.open(job.external_url, '_blank');
      showToast('Application submitted successfully!');
    } catch (e: any) {
      const msg = e?.message || '';
      if (msg.toLowerCase().includes('already applied')) {
        setAppliedJobIds((prev) => new Set(prev).add(job.id));
        showToast('You have already applied to this job.', 'error');
      } else {
        showToast(msg || 'Failed to submit application.', 'error');
      }
    } finally {
      setApplyingJobId(null);
    }
  }

  async function handleExtSave(job: ExternalJob) {
    if (!profile) return;
    const postingId = savedExt[job.id];
    if (postingId) {
      await unsaveJob(profile.id, postingId);
      setSavedExt((prev) => {
        const next = { ...prev };
        delete next[job.id];
        return next;
      });
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
    if (!resume) {
      showToast('Upload a resume first.', 'error');
      return;
    }
    try {
      const res = await applyExternalJob(job.id);
      showToast('Application queued.');
      if (res.external_url) window.open(res.external_url, '_blank');
    } catch (e: any) {
      showToast(e.message || 'Failed to apply.', 'error');
    }
  }

  function toggleSkill(skill: string) {
    setSelectedSkills((prev) =>
      prev.includes(skill) ? prev.filter((s) => s !== skill) : [...prev, skill]
    );
  }

  function resetAllFilters() {
    setSelectedCategory('All');
    setWorkMode('all');
    setJobType('all');
    setExperienceLevel('all');
    setSalaryMin(0);
    setSalaryMax(0);
    setLocationFilter('');
    setSelectedSkills([]);
    setSearch('');
  }

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (selectedCategory !== 'All') count++;
    if (workMode !== 'all') count++;
    if (jobType !== 'all') count++;
    if (experienceLevel !== 'all') count++;
    if (salaryMin > 0) count++;
    if (salaryMax > 0) count++;
    if (locationFilter) count++;
    if (selectedSkills.length > 0) count += selectedSkills.length;
    return count;
  }, [
    selectedCategory,
    workMode,
    jobType,
    experienceLevel,
    salaryMin,
    salaryMax,
    locationFilter,
    selectedSkills,
  ]);

  // Client-side filtering & sorting
  const filteredJobs = useMemo(() => {
    return jobs
      .filter((job) => {
        if (workMode === 'remote' && !job.is_remote) return false;
        if (workMode === 'on_site' && job.is_remote) return false;

        if (jobType !== 'all') {
          const jt = (job.job_type || '').toLowerCase().replace(/[\s_-]/g, '');
          const target = jobType.toLowerCase().replace(/[\s_-]/g, '');
          if (!jt.includes(target)) return false;
        }

        if (selectedCategory !== 'All' && job.category !== selectedCategory) return false;

        if (salaryMin > 0) {
          const maxVal = job.salary_max || job.salary_min || 0;
          if (maxVal < salaryMin) return false;
        }
        if (salaryMax > 0) {
          const minVal = job.salary_min || job.salary_max || 0;
          if (minVal > salaryMax) return false;
        }

        if (
          locationFilter &&
          (!job.location || !job.location.toLowerCase().includes(locationFilter.toLowerCase()))
        ) {
          return false;
        }

        if (experienceLevel !== 'all') {
          const titleLower = job.title.toLowerCase();
          const descLower = job.description.toLowerCase();
          if (
            experienceLevel === 'entry' &&
            !['entry', 'junior', 'intern', 'associate'].some(
              (w) => titleLower.includes(w) || descLower.includes(w)
            )
          ) {
            return false;
          }
          if (
            experienceLevel === 'senior' &&
            !['senior', 'sr.'].some((w) => titleLower.includes(w))
          ) {
            return false;
          }
          if (
            experienceLevel === 'lead' &&
            !['lead', 'staff', 'principal', 'director', 'head'].some((w) =>
              titleLower.includes(w)
            )
          ) {
            return false;
          }
        }

        if (selectedSkills.length > 0) {
          const reqsText = (job.requirements || []).join(' ').toLowerCase();
          const fullText = `${job.title} ${job.description} ${reqsText}`.toLowerCase();
          const matchesSkill = selectedSkills.some((s) => fullText.includes(s.toLowerCase()));
          if (!matchesSkill) return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (sort === 'match') return (scores[b.id] || 0) - (scores[a.id] || 0);
        if (sort === 'newest') return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        if (sort === 'salary')
          return (b.salary_max || b.salary_min || 0) - (a.salary_max || a.salary_min || 0);
        return 0;
      });
  }, [
    jobs,
    workMode,
    jobType,
    selectedCategory,
    salaryMin,
    salaryMax,
    locationFilter,
    experienceLevel,
    selectedSkills,
    sort,
    scores,
  ]);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Spinner size={32} />
      </div>
    );
  }

  const inputClass =
    'w-full rounded-lg border border-slate-700 bg-slate-800/50 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500';
  const scoreColor = (s: number) =>
    s >= 75 ? 'text-emerald-400' : s >= 50 ? 'text-amber-400' : 'text-red-400';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-mono text-3xl font-bold text-white flex items-center gap-2">
            Job Feed
            {facets && facets.total_jobs > 0 && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                {facets.total_jobs} active postings
              </span>
            )}
          </h1>
          <p className="text-slate-400 text-sm mt-0.5">
            {filteredJobs.length + externalJobs.length} jobs matching your criteria
          </p>
        </div>

        <div className="flex items-center gap-3">
          {allResumes.length > 0 && (
            <div className="flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-800/50 px-3.5 py-2">
              <FileText className="h-4 w-4 text-cyan-400" />
              <span className="text-xs font-medium text-slate-400">Resume:</span>
              <select
                value={resume?.id || ''}
                onChange={(e) => handleResumeChange(e.target.value)}
                className="bg-transparent text-xs font-semibold text-white focus:outline-none cursor-pointer"
              >
                {allResumes.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.file_name} (v{r.version}) {r.is_current ? '★' : ''}
                  </option>
                ))}
              </select>
            </div>
          )}

          <button
            onClick={() => setShowExternalSearch(!showExternalSearch)}
            className={`btn text-xs ${
              showExternalSearch
                ? 'bg-violet-600 text-white'
                : 'bg-slate-800 text-slate-300 border border-slate-700 hover:border-slate-600'
            }`}
          >
            <Globe className="h-3.5 w-3.5" /> External
            {externalJobs.length > 0 && (
              <span className="ml-1 rounded-full bg-violet-400/20 px-1.5 py-0.2 text-[10px] text-violet-300">
                {externalJobs.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* External Search Bar */}
      {showExternalSearch && (
        <GlassmorphicCard className="p-4 border-violet-500/30 bg-violet-950/10">
          <div className="flex flex-col gap-3 sm:flex-row">
            <input
              value={extSearchQuery}
              onChange={(e) => setExtSearchQuery(e.target.value)}
              placeholder="Job title or keywords (e.g. Staff AI Engineer)..."
              className={`${inputClass} flex-1`}
              onKeyDown={(e) => e.key === 'Enter' && handleExternalSearch()}
            />
            <input
              value={extSearchLocation}
              onChange={(e) => setExtSearchLocation(e.target.value)}
              placeholder="Location (e.g. San Francisco, Remote)"
              className={`${inputClass} sm:w-56`}
              onKeyDown={(e) => e.key === 'Enter' && handleExternalSearch()}
            />
            <button
              onClick={handleExternalSearch}
              disabled={searchingExternal}
              className="btn-primary whitespace-nowrap bg-violet-600 hover:bg-violet-500"
            >
              {searchingExternal ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Search className="h-4 w-4" />
              )}
              {searchingExternal ? 'Searching...' : 'Search External'}
            </button>
          </div>
        </GlassmorphicCard>
      )}

      {/* Primary Search & Filter Bar */}
      <div className="space-y-3">
        <div className="flex flex-col gap-3 lg:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
            <input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                if (searchTimer.current) clearTimeout(searchTimer.current);
                searchTimer.current = setTimeout(
                  () => loadJobsPage(1, false, e.target.value),
                  400
                );
              }}
              placeholder="Search jobs by title, keyword, company..."
              className={`${inputClass} pl-10`}
            />
          </div>

          <div className="relative sm:w-48">
            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
            <input
              value={locationFilter}
              onChange={(e) => setLocationFilter(e.target.value)}
              placeholder="Location..."
              className={`${inputClass} pl-9`}
            />
          </div>

          <div className="flex gap-2 flex-wrap items-center">
            {/* Sort Selector */}
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as any)}
              className="btn bg-slate-800 text-slate-300 border border-slate-700 text-xs cursor-pointer"
            >
              <option value="match">Sort: Best Match</option>
              <option value="newest">Sort: Newest</option>
              <option value="salary">Sort: Highest Salary</option>
            </select>

            {/* Quick Work Mode Buttons */}
            <div className="inline-flex rounded-lg border border-slate-700 bg-slate-800/80 p-0.5">
              <button
                onClick={() => setWorkMode('all')}
                className={`px-2.5 py-1 text-xs rounded-md font-medium transition-all ${
                  workMode === 'all'
                    ? 'bg-cyan-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setWorkMode('remote')}
                className={`px-2.5 py-1 text-xs rounded-md font-medium transition-all flex items-center gap-1 ${
                  workMode === 'remote'
                    ? 'bg-cyan-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Remote
                {facets && (
                  <span className="text-[10px] opacity-80">({facets.work_modes.remote})</span>
                )}
              </button>
              <button
                onClick={() => setWorkMode('on_site')}
                className={`px-2.5 py-1 text-xs rounded-md font-medium transition-all flex items-center gap-1 ${
                  workMode === 'on_site'
                    ? 'bg-cyan-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                On-site
                {facets && (
                  <span className="text-[10px] opacity-80">({facets.work_modes.on_site})</span>
                )}
              </button>
            </div>

            {/* Advanced Filters Toggle */}
            <button
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              className={`btn text-xs flex items-center gap-1.5 transition-all ${
                showAdvancedFilters || activeFilterCount > 0
                  ? 'bg-cyan-600/20 text-cyan-300 border border-cyan-500/50'
                  : 'bg-slate-800 text-slate-300 border border-slate-700 hover:border-slate-600'
              }`}
            >
              <SlidersHorizontal className="h-3.5 w-3.5" />
              <span>Filters & Facets</span>
              {activeFilterCount > 0 && (
                <span className="flex h-4 w-4 items-center justify-center rounded-full bg-cyan-500 text-[10px] font-bold text-slate-900">
                  {activeFilterCount}
                </span>
              )}
              {showAdvancedFilters ? (
                <ChevronUp className="h-3 w-3" />
              ) : (
                <ChevronDown className="h-3 w-3" />
              )}
            </button>
          </div>
        </div>

        {/* Domain / Category Pills Carousel */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1.5 scrollbar-none pt-1">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 whitespace-nowrap mr-1">
            Domain:
          </span>
          {CATEGORIES.map((cat) => {
            const count =
              cat === 'All'
                ? facets?.total_jobs
                : facets?.categories[cat];
            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-all flex items-center gap-1.5 ${
                  selectedCategory === cat
                    ? 'bg-cyan-600 text-white shadow-sm ring-1 ring-cyan-400/40'
                    : 'bg-slate-800/80 text-slate-400 border border-slate-700 hover:border-slate-600'
                }`}
              >
                <span>{cat}</span>
                {count !== undefined && (
                  <span
                    className={`text-[10px] rounded-full px-1.5 py-0.2 ${
                      selectedCategory === cat
                        ? 'bg-cyan-700/60 text-cyan-100'
                        : 'bg-slate-700/60 text-slate-400'
                    }`}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Advanced Facets Drawer / Filter Panel */}
      {showAdvancedFilters && (
        <GlassmorphicCard className="p-5 border-cyan-500/30 bg-slate-900/80 shadow-2xl">
          <div className="space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-cyan-400" />
                <h3 className="font-semibold text-sm text-white">Facet Filters & Parameters</h3>
              </div>
              {activeFilterCount > 0 && (
                <button
                  onClick={resetAllFilters}
                  className="flex items-center gap-1 text-xs text-slate-400 hover:text-cyan-400 transition-colors"
                >
                  <RotateCcw className="h-3 w-3" /> Reset all
                </button>
              )}
            </div>

            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {/* Job Type Facet */}
              <div className="space-y-2">
                <label className="text-xs font-medium text-slate-300 uppercase tracking-wider">
                  Job Type
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {(
                    [
                      { id: 'all', label: 'All' },
                      { id: 'full_time', label: 'Full-time' },
                      { id: 'part_time', label: 'Part-time' },
                      { id: 'contract', label: 'Contract' },
                      { id: 'internship', label: 'Internship' },
                    ] as const
                  ).map((jt) => {
                    const count =
                      jt.id === 'all'
                        ? facets?.total_jobs
                        : facets?.job_types[jt.label] ??
                          facets?.job_types[jt.label.toLowerCase()] ??
                          facets?.job_types[jt.id];
                    return (
                      <button
                        key={jt.id}
                        onClick={() => setJobType(jt.id)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
                          jobType === jt.id
                            ? 'bg-cyan-600 text-white'
                            : 'bg-slate-800 text-slate-400 border border-slate-700 hover:border-slate-600'
                        }`}
                      >
                        <span>{jt.label}</span>
                        {count !== undefined && (
                          <span className="text-[10px] opacity-75">({count})</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Experience Level Facet */}
              <div className="space-y-2">
                <label className="text-xs font-medium text-slate-300 uppercase tracking-wider">
                  Experience Level
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {(
                    [
                      { id: 'all', label: 'All Levels', facetKey: null },
                      { id: 'entry', label: 'Entry Level', facetKey: 'Entry Level' },
                      { id: 'mid', label: 'Mid Level', facetKey: 'Mid Level' },
                      { id: 'senior', label: 'Senior Level', facetKey: 'Senior Level' },
                      { id: 'lead', label: 'Lead / Staff', facetKey: 'Lead / Staff' },
                    ] as const
                  ).map((exp) => {
                    const count =
                      exp.facetKey && facets ? facets.experience_levels[exp.facetKey] : undefined;
                    return (
                      <button
                        key={exp.id}
                        onClick={() => setExperienceLevel(exp.id)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
                          experienceLevel === exp.id
                            ? 'bg-cyan-600 text-white'
                            : 'bg-slate-800 text-slate-400 border border-slate-700 hover:border-slate-600'
                        }`}
                      >
                        <span>{exp.label}</span>
                        {count !== undefined && (
                          <span className="text-[10px] opacity-75">({count})</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Salary Range & Presets */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-slate-300 uppercase tracking-wider">
                    Minimum Salary
                  </label>
                  <span className="text-xs font-semibold text-cyan-400">
                    {salaryMin === 0 ? 'Any' : `$${salaryMin.toLocaleString()}+`}
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={200000}
                  step={10000}
                  value={salaryMin}
                  onChange={(e) => setSalaryMin(Number(e.target.value))}
                  className="w-full accent-cyan-500 cursor-pointer"
                />
                <div className="flex flex-wrap gap-1 pt-1">
                  {[
                    { label: 'Any', min: 0 },
                    { label: '$60k+', min: 60000 },
                    { label: '$100k+', min: 100000 },
                    { label: '$140k+', min: 140000 },
                  ].map((p) => (
                    <button
                      key={p.label}
                      onClick={() => setSalaryMin(p.min)}
                      className={`px-2 py-0.5 text-[11px] rounded ${
                        salaryMin === p.min
                          ? 'bg-cyan-600 text-white'
                          : 'bg-slate-800/80 text-slate-400 border border-slate-700 hover:bg-slate-700'
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Top In-Demand Tech Stack / Skills Facets */}
            {facets && facets.top_skills.length > 0 && (
              <div className="border-t border-slate-800/80 pt-4 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                    <Zap className="h-3.5 w-3.5 text-amber-400" /> Top Tech Stack & Skills Facets
                  </label>
                  <span className="text-[11px] text-slate-500">Click to filter by tech skill</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {facets.top_skills.map((skill) => {
                    const isSelected = selectedSkills.includes(skill.name);
                    return (
                      <button
                        key={skill.name}
                        onClick={() => toggleSkill(skill.name)}
                        className={`px-2.5 py-1 rounded-full text-xs font-medium transition-all flex items-center gap-1.5 ${
                          isSelected
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                            : 'bg-slate-800 text-slate-400 border border-slate-700/80 hover:border-slate-600 hover:text-slate-300'
                        }`}
                      >
                        {isSelected && <Check className="h-3 w-3 text-amber-400" />}
                        <span>{skill.name}</span>
                        <span
                          className={`text-[10px] rounded-full px-1.5 py-0.2 ${
                            isSelected
                              ? 'bg-amber-500/30 text-amber-200'
                              : 'bg-slate-700 text-slate-400'
                          }`}
                        >
                          {skill.count}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </GlassmorphicCard>
      )}

      {/* Active Filter Chips Bar */}
      {activeFilterCount > 0 && (
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Active filters:
          </span>
          {selectedCategory !== 'All' && (
            <span className="badge bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 gap-1.5">
              Domain: {selectedCategory}
              <button onClick={() => setSelectedCategory('All')} className="hover:text-white">
                <X className="h-3 w-3" />
              </button>
            </span>
          )}
          {workMode !== 'all' && (
            <span className="badge bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 gap-1.5">
              Mode: {workMode === 'remote' ? 'Remote' : 'On-site'}
              <button onClick={() => setWorkMode('all')} className="hover:text-white">
                <X className="h-3 w-3" />
              </button>
            </span>
          )}
          {jobType !== 'all' && (
            <span className="badge bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 gap-1.5">
              Type: {jobType.replace('_', ' ')}
              <button onClick={() => setJobType('all')} className="hover:text-white">
                <X className="h-3 w-3" />
              </button>
            </span>
          )}
          {experienceLevel !== 'all' && (
            <span className="badge bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 gap-1.5">
              Level: {experienceLevel}
              <button onClick={() => setExperienceLevel('all')} className="hover:text-white">
                <X className="h-3 w-3" />
              </button>
            </span>
          )}
          {salaryMin > 0 && (
            <span className="badge bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 gap-1.5">
              Min: ${salaryMin.toLocaleString()}
              <button onClick={() => setSalaryMin(0)} className="hover:text-white">
                <X className="h-3 w-3" />
              </button>
            </span>
          )}
          {locationFilter && (
            <span className="badge bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 gap-1.5">
              Loc: {locationFilter}
              <button onClick={() => setLocationFilter('')} className="hover:text-white">
                <X className="h-3 w-3" />
              </button>
            </span>
          )}
          {selectedSkills.map((skill) => (
            <span
              key={skill}
              className="badge bg-amber-500/10 text-amber-300 border border-amber-500/30 gap-1.5"
            >
              Skill: {skill}
              <button onClick={() => toggleSkill(skill)} className="hover:text-white">
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
          <button
            onClick={resetAllFilters}
            className="text-xs text-slate-400 hover:text-cyan-400 underline ml-1"
          >
            Clear all
          </button>
        </div>
      )}

      {!loading && !resume && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
          <p className="text-sm text-amber-400">
            <a href="/app/resume" className="underline font-semibold hover:text-amber-300">Upload a resume</a> to unlock personalized match scores and apply to jobs.
          </p>
        </div>
      )}

      {/* External Search Results */}
      {externalJobs.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
            <Globe className="h-4 w-4 text-violet-400" /> External Results
            {externalStale && (
              <span className="badge bg-amber-500/20 text-amber-400 border border-amber-500/30">
                cached — sources unavailable
              </span>
            )}
          </h3>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {externalJobs
              .sort((a, b) => (scores[b.id] || 0) - (scores[a.id] || 0))
              .map((job) => {
                const score = scores[job.id];
                const saved = Boolean(savedExt[job.id]);
                return (
                  <GlassmorphicCard key={job.id} className="p-5 flex flex-col">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h3 className="font-semibold text-white truncate">{job.title}</h3>
                        <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-slate-500">
                          {job.company && <span className="truncate">{job.company}</span>}
                          {job.location && (
                            <span className="flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {job.location}
                            </span>
                          )}
                          {job.is_remote && <Badge color="green">Remote</Badge>}
                          <Badge color="teal">{job.external_source}</Badge>
                        </div>
                      </div>
                      {score !== undefined && (
                        <div className="text-right">
                          <div className={`text-lg font-bold ${scoreColor(score)}`}>
                            {score.toFixed(0)}
                          </div>
                          <div className="text-xs text-slate-500">match</div>
                        </div>
                      )}
                    </div>
                    <p className="mt-3 text-sm text-slate-400 line-clamp-3">{job.description}</p>
                    {job.requirements.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {job.requirements.slice(0, 4).map((r, i) => (
                          <span
                            key={i}
                            className="badge bg-slate-800 text-slate-300 border border-slate-700"
                          >
                            {r}
                          </span>
                        ))}
                      </div>
                    )}
                    {job.salary_min != null && (
                      <div className="mt-3 flex items-center gap-1 text-xs text-slate-400">
                        <DollarSign className="h-3 w-3" />
                        {job.salary_min.toLocaleString()} - {job.salary_max?.toLocaleString()}{' '}
                        {job.salary_currency}
                      </div>
                    )}
                    <div className="mt-4 flex items-center gap-2 border-t border-slate-700/50 pt-4">
                      <button onClick={() => setSelectedJob(job)} className="btn-secondary text-xs">
                        View
                      </button>
                      <button
                        onClick={() => handleExtApply(job)}
                        disabled={!resume}
                        className="btn-primary flex-1 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <Zap className="h-3.5 w-3.5" /> Apply
                      </button>
                      {job.external_url && (
                        <a
                          href={job.external_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn-secondary"
                          title="Go to original site"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      )}
                      <button
                        onClick={() => handleExtSave(job)}
                        className={`btn ${
                          saved
                            ? 'bg-violet-500/20 text-violet-400 border border-violet-500/30'
                            : 'bg-slate-800 text-slate-400 border border-slate-700 hover:bg-slate-700'
                        }`}
                      >
                        <Bookmark className={`h-3.5 w-3.5 ${saved ? 'fill-current' : ''}`} />
                      </button>
                    </div>
                  </GlassmorphicCard>
                );
              })}
          </div>
        </div>
      )}

      {/* On-Platform Job Postings */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-slate-300">On-Platform Jobs</h3>
        {filteredJobs.length === 0 ? (
          <EmptyState
            icon={<Briefcase className="h-12 w-12" />}
            title="No matching jobs found"
            description="Try loosening your search filters, adjusting salary sliders, or exploring different tech skills."
          />
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
                        {job.location && (
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {job.location}
                          </span>
                        )}
                        {job.is_remote && <Badge color="green">Remote</Badge>}
                        {job.job_type && (
                          <Badge color="slate">
                            {job.job_type.replace('_', ' ')}
                          </Badge>
                        )}
                      </div>
                    </div>
                    {score !== undefined && (
                      <div className="text-right">
                        <div className={`text-lg font-bold ${scoreColor(score)}`}>
                          {score.toFixed(0)}
                        </div>
                        <div className="text-xs text-slate-500">match</div>
                      </div>
                    )}
                  </div>
                  <p className="mt-3 text-sm text-slate-400 line-clamp-3">{job.description}</p>
                  {job.requirements.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {job.requirements.slice(0, 4).map((r, i) => (
                        <span
                          key={i}
                          className="badge bg-slate-800 text-slate-300 border border-slate-700"
                        >
                          {r}
                        </span>
                      ))}
                      {job.requirements.length > 4 && (
                        <span className="badge bg-slate-800 text-slate-500 border border-slate-700">
                          +{job.requirements.length - 4} more
                        </span>
                      )}
                    </div>
                  )}
                  {job.salary_min && (
                    <div className="mt-3 flex items-center gap-1 text-xs text-slate-400">
                      <DollarSign className="h-3 w-3" />
                      {job.salary_min.toLocaleString()} - {job.salary_max?.toLocaleString()}{' '}
                      {job.salary_currency}
                    </div>
                  )}
                  <div className="mt-4 flex items-center gap-2 border-t border-slate-700/50 pt-4">
                    <button onClick={() => setSelectedJob(job)} className="btn-secondary text-xs">
                      View
                    </button>
                    <button
                      onClick={() => handleApply(job, 'platform')}
                      disabled={!resume || applyingJobId === job.id || appliedJobIds.has(job.id)}
                      className={`btn-primary flex-1 disabled:cursor-not-allowed disabled:opacity-50 ${appliedJobIds.has(job.id) ? '!bg-emerald-600/30 !text-emerald-300 border border-emerald-500/30' : ''}`}
                    >
                      {applyingJobId === job.id ? (
                        <>
                          <Loader2 className="h-3.5 w-3.5 animate-spin" /> Submitting...
                        </>
                      ) : appliedJobIds.has(job.id) ? (
                        <>
                          <Check className="h-3.5 w-3.5 text-emerald-400" /> Applied
                        </>
                      ) : (
                        <>
                          <Zap className="h-3.5 w-3.5" /> Apply
                        </>
                      )}
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
                      className={`btn ${
                        saved
                          ? 'bg-violet-500/20 text-violet-400 border border-violet-500/30'
                          : 'bg-slate-800 text-slate-400 border border-slate-700 hover:bg-slate-700'
                      }`}
                    >
                      <Bookmark className={`h-3.5 w-3.5 ${saved ? 'fill-current' : ''}`} />
                    </button>
                  </div>
                </GlassmorphicCard>
              );
            })}
          </div>
        )}
        {hasMore && (
          <div ref={sentinelRef} className="flex justify-center py-6">
            {loadingMore ? (
              <Spinner />
            ) : (
              <span className="text-xs text-slate-500">Scroll for more jobs</span>
            )}
          </div>
        )}
        {!hasMore && jobs.length > 0 && (
          <p className="text-center text-xs text-slate-600 pt-2">
            All jobs loaded — {filteredJobs.length} shown
          </p>
        )}
      </div>

      {/* Job Details Modal */}
      {selectedJob && (
        <Modal
          open={!!selectedJob}
          onClose={() => setSelectedJob(null)}
          title={selectedJob.title}
          maxWidth="max-w-2xl"
        >
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
              {'company' in selectedJob && selectedJob.company && (
                <span>{selectedJob.company}</span>
              )}
              {'location' in selectedJob && selectedJob.location && (
                <span className="flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {selectedJob.location}
                </span>
              )}
              {'is_remote' in selectedJob && selectedJob.is_remote && (
                <Badge color="green">Remote</Badge>
              )}
              {'job_type' in selectedJob && selectedJob.job_type && (
                <Badge color="slate">{selectedJob.job_type.replace('_', ' ')}</Badge>
              )}
              {'external_source' in selectedJob && selectedJob.external_source && (
                <Badge color="teal">{selectedJob.external_source}</Badge>
              )}
            </div>
            {'salary_min' in selectedJob && selectedJob.salary_min && (
              <div className="flex items-center gap-1 text-sm text-slate-400">
                <DollarSign className="h-4 w-4" />
                {selectedJob.salary_min.toLocaleString()} -{' '}
                {selectedJob.salary_max?.toLocaleString()} {selectedJob.salary_currency}
              </div>
            )}
            <div>
              <h4 className="text-sm font-semibold text-slate-300">Description</h4>
              <p className="mt-1 whitespace-pre-line text-sm text-slate-400">
                {selectedJob.description}
              </p>
            </div>
            {'requirements' in selectedJob && selectedJob.requirements.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-slate-300">Requirements</h4>
                <div className="mt-2 flex flex-wrap gap-2">
                  {selectedJob.requirements.map((r, i) => (
                    <span
                      key={i}
                      className="badge bg-slate-800 text-slate-300 border border-slate-700"
                    >
                      {r}
                    </span>
                  ))}
                </div>
              </div>
            )}
            <div className="flex flex-wrap items-center gap-2 pt-4 border-t border-slate-700/50">
              {'id' in selectedJob && !('external_source' in selectedJob && selectedJob.external_source) && (
                <>
                  <button
                    onClick={() => {
                      handleApply(selectedJob as JobPosting, 'platform');
                      setSelectedJob(null);
                    }}
                    disabled={!resume}
                    className="btn-primary flex-1 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Zap className="h-3.5 w-3.5 mr-1.5" /> Apply
                  </button>
                  <button
                    onClick={() => handleSave(selectedJob as JobPosting)}
                    className={`btn ${
                      isSaved(selectedJob.id)
                        ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                        : 'btn-secondary'
                    }`}
                  >
                    <Bookmark className="h-3.5 w-3.5 mr-1.5" />
                    {isSaved(selectedJob.id) ? 'Saved' : 'Save'}
                  </button>
                </>
              )}
              {'external_url' in selectedJob && selectedJob.external_url && (
                <a
                  href={selectedJob.external_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-secondary inline-flex items-center gap-2"
                >
                  <ExternalLink className="h-4 w-4" /> Go to original posting
                </a>
              )}
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
