import { useEffect, useState } from 'react';
import { Plus, Briefcase, Edit2, Trash2, Eye, EyeOff, Users } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { getJobPostings, createJobPosting, updateJobPosting, deleteJobPosting, getApplicationsForJob } from '@/lib/api';
import { seedSampleJobs } from '@/lib/seed';
import type { JobPosting } from '@/types';
import { Spinner, EmptyState, Badge, Modal } from '@/components/ui';
import { GlassmorphicCard } from '@/components/GlassmorphicCard';

const CATEGORIES = ['Software Engineering', 'Business & MBA', 'Data Analytics', 'Data Science & AI', 'Cloud & DevOps', 'Finance & Accounting', 'Marketing & Sales'];

export function PostingsPage() {
  const { profile } = useAuth();
  const [jobs, setJobs] = useState<JobPosting[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingJob, setEditingJob] = useState<JobPosting | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [requirements, setRequirements] = useState('');
  const [responsibilities, setResponsibilities] = useState('');
  const [location, setLocation] = useState('');
  const [isRemote, setIsRemote] = useState(false);
  const [salaryMin, setSalaryMin] = useState('');
  const [salaryMax, setSalaryMax] = useState('');
  const [jobType, setJobType] = useState('full_time');
  const [category, setCategory] = useState('Software Engineering');
  const [autoScreeningEnabled, setAutoScreeningEnabled] = useState(true);
  const [autoApproveThreshold, setAutoApproveThreshold] = useState('85');
  const [autoRejectThreshold, setAutoRejectThreshold] = useState('50');
  const [status, setStatus] = useState('active');
  const [saving, setSaving] = useState(false);
  const [appCounts, setAppCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    if (!profile) return;
    (async () => {
      try {
        try { await seedSampleJobs(); } catch (se) { console.warn('Seed skipped:', se); }
        const j = await getJobPostings({ employerId: profile.id });
        setJobs(j);
        const counts: Record<string, number> = {};
        const appResults = await Promise.allSettled(j.map((job) => getApplicationsForJob(job.id)));
        j.forEach((job, idx) => { counts[job.id] = appResults[idx].status === 'fulfilled' ? appResults[idx].value.length : 0; });
        setAppCounts(counts);
      } catch (e) { console.error('Failed to load jobs:', e); } finally { setLoading(false); }
    })();
  }, [profile]);

  function openCreate() {
    setEditingJob(null); setTitle(''); setDescription(''); setRequirements(''); setResponsibilities('');
    setLocation(''); setIsRemote(false); setSalaryMin(''); setSalaryMax('');
    setJobType('full_time'); setCategory('Software Engineering');
    setAutoScreeningEnabled(true); setAutoApproveThreshold('85'); setAutoRejectThreshold('50');
    setStatus('active'); setShowForm(true);
  }

  function openEdit(job: JobPosting) {
    setEditingJob(job); setTitle(job.title); setDescription(job.description);
    setRequirements(job.requirements.join('\n')); setResponsibilities(job.responsibilities.join('\n'));
    setLocation(job.location || ''); setIsRemote(job.is_remote);
    setSalaryMin(job.salary_min?.toString() || ''); setSalaryMax(job.salary_max?.toString() || '');
    setJobType(job.job_type || 'full_time'); setCategory(job.category || 'Software Engineering');
    setAutoScreeningEnabled(job.auto_screening_enabled ?? true);
    setAutoApproveThreshold(job.auto_approve_threshold?.toString() || '85');
    setAutoRejectThreshold(job.auto_reject_threshold?.toString() || '50');
    setStatus(job.status); setShowForm(true);
  }

  async function handleSave() {
    if (!profile || !title.trim() || !description.trim()) return;
    setSaving(true);
    try {
      const jobData = {
        employer_id: profile.id, title, description,
        requirements: requirements.split('\n').map(r => r.trim()).filter(Boolean),
        responsibilities: responsibilities.split('\n').map(r => r.trim()).filter(Boolean),
        location: location || null, is_remote: isRemote,
        salary_min: salaryMin ? parseInt(salaryMin) : null, salary_max: salaryMax ? parseInt(salaryMax) : null,
        salary_currency: 'USD', job_type: jobType, category,
        auto_screening_enabled: autoScreeningEnabled,
        auto_approve_threshold: autoApproveThreshold ? parseInt(autoApproveThreshold) : 85,
        auto_reject_threshold: autoRejectThreshold ? parseInt(autoRejectThreshold) : 50, status,
      };
      if (editingJob) { const updated = await updateJobPosting(editingJob.id, jobData); setJobs(prev => prev.map(j => j.id === updated.id ? updated : j)); }
      else { const created = await createJobPosting(jobData as any); setJobs(prev => [created, ...prev]); }
      setShowForm(false);
    } catch (e) { console.error(e); } finally { setSaving(false); }
  }

  async function handleClose(job: JobPosting) {
    const updated = await updateJobPosting(job.id, { status: job.status === 'active' ? 'closed' : 'active' });
    setJobs(prev => prev.map(j => j.id === updated.id ? updated : j));
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this job posting?')) return;
    await deleteJobPosting(id); setJobs(prev => prev.filter(j => j.id !== id));
  }

  if (loading) return <div className="flex justify-center py-20"><Spinner size={32} /></div>;

  const inputClass = "w-full rounded-lg border border-slate-700 bg-slate-800/50 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-mono text-3xl font-bold text-white">My Postings</h1>
          <p className="text-slate-400">{jobs.length} job postings</p>
        </div>
        <button onClick={openCreate} className="btn-primary"><Plus className="h-4 w-4" /> New Posting</button>
      </div>

      {jobs.length === 0 ? (
        <EmptyState icon={<Briefcase className="h-12 w-12" />} title="No job postings yet" description="Create your first job posting to start receiving applications."
          action={<button onClick={openCreate} className="btn-primary"><Plus className="h-4 w-4" /> Create Posting</button>} />
      ) : (
        <div className="space-y-3">
          {jobs.map((job) => (
            <GlassmorphicCard key={job.id} className="p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-white">{job.title}</h3>
                    <Badge color={job.status === 'active' ? 'green' : job.status === 'draft' ? 'amber' : 'slate'}>{job.status}</Badge>
                  </div>
                  <p className="mt-1 text-sm text-slate-400 line-clamp-2">{job.description}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-slate-500">
                    {job.location && <span>{job.location}</span>}
                    {job.is_remote && <Badge color="teal">Remote</Badge>}
                    {job.salary_min && <span>${job.salary_min.toLocaleString()} - ${job.salary_max?.toLocaleString()}</span>}
                    <span className="capitalize">{job.job_type?.replace('_', ' ')}</span>
                    <span>{job.requirements.length} requirements</span>
                    {appCounts[job.id] !== undefined && <span className="flex items-center gap-1"><Users className="h-3 w-3" />{appCounts[job.id]} apps</span>}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => openEdit(job)} className="btn-ghost p-2 text-slate-400 hover:text-white" title="Edit"><Edit2 className="h-4 w-4" /></button>
                  <button onClick={() => handleClose(job)} className="btn-ghost p-2 text-slate-400 hover:text-white" title={job.status === 'active' ? 'Close' : 'Reopen'}>
                    {job.status === 'active' ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                  <button onClick={() => handleDelete(job.id)} className="btn-ghost p-2 text-red-400 hover:text-red-300" title="Delete"><Trash2 className="h-4 w-4" /></button>
                </div>
              </div>
            </GlassmorphicCard>
          ))}
        </div>
      )}

      <Modal open={showForm} onClose={() => setShowForm(false)} title={editingJob ? 'Edit Job Posting' : 'Create Job Posting'} maxWidth="max-w-2xl">
        <div className="space-y-4">
          <div><label className="label text-slate-300">Job Title *</label><input className={inputClass} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Senior Frontend Engineer" /></div>
          <div><label className="label text-slate-300">Description *</label><textarea className={`${inputClass} h-32 resize-none`} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Full job description..." /></div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div><label className="label text-slate-300">Requirements (one per line)</label><textarea className={`${inputClass} h-28 resize-none`} value={requirements} onChange={(e) => setRequirements(e.target.value)} placeholder="React&#10;TypeScript&#10;5+ years" /></div>
            <div><label className="label text-slate-300">Responsibilities (one per line)</label><textarea className={`${inputClass} h-28 resize-none`} value={responsibilities} onChange={(e) => setResponsibilities(e.target.value)} placeholder="Lead frontend&#10;Mentor devs" /></div>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <div><label className="label text-slate-300">Location</label><input className={inputClass} value={location} onChange={(e) => setLocation(e.target.value)} placeholder="San Francisco, CA" /></div>
            <div><label className="label text-slate-300">Category</label><select className={inputClass} value={category} onChange={(e) => setCategory(e.target.value)}>{CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}</select></div>
            <div><label className="label text-slate-300">Job Type</label><select className={inputClass} value={jobType} onChange={(e) => setJobType(e.target.value)}>
              <option value="full_time">Full-time</option><option value="part_time">Part-time</option><option value="contract">Contract</option><option value="internship">Internship</option>
            </select></div>
          </div>
          <div className="rounded-xl border border-slate-700/50 bg-slate-800/30 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-semibold text-white">AI Auto-Screening</h4>
                <p className="text-xs text-slate-500">Auto shortlist/reject by match score</p>
              </div>
              <input type="checkbox" className="w-4 h-4 rounded" checked={autoScreeningEnabled} onChange={(e) => setAutoScreeningEnabled(e.target.checked)} />
            </div>
            {autoScreeningEnabled && (
              <div className="grid gap-4 sm:grid-cols-2 pt-2 border-t border-slate-700/50">
                <div><label className="label text-xs text-slate-400">Auto-Shortlist (%)</label><input type="number" className={inputClass} value={autoApproveThreshold} onChange={(e) => setAutoApproveThreshold(e.target.value)} min="0" max="100" /></div>
                <div><label className="label text-xs text-slate-400">Auto-Reject (%)</label><input type="number" className={inputClass} value={autoRejectThreshold} onChange={(e) => setAutoRejectThreshold(e.target.value)} min="0" max="100" /></div>
              </div>
            )}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div><label className="label text-slate-300">Salary Min ($)</label><input type="number" className={inputClass} value={salaryMin} onChange={(e) => setSalaryMin(e.target.value)} placeholder="100000" /></div>
            <div><label className="label text-slate-300">Salary Max ($)</label><input type="number" className={inputClass} value={salaryMax} onChange={(e) => setSalaryMax(e.target.value)} placeholder="150000" /></div>
          </div>
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-sm text-slate-300"><input type="checkbox" checked={isRemote} onChange={(e) => setIsRemote(e.target.checked)} className="rounded" /> Remote</label>
            <label className="flex items-center gap-2 text-sm text-slate-300">Status:
              <select value={status} onChange={(e) => setStatus(e.target.value)} className="rounded-lg border border-slate-700 bg-slate-800/50 px-2 py-1 text-sm text-white">
                <option value="active">Active</option><option value="draft">Draft</option><option value="closed">Closed</option>
              </select>
            </label>
          </div>
          <div className="flex justify-end gap-2 border-t border-slate-700/50 pt-4">
            <button onClick={() => setShowForm(false)} className="btn-secondary">Cancel</button>
            <button onClick={handleSave} disabled={saving || !title.trim() || !description.trim()} className="btn-primary">
              {saving ? <Spinner size={16} /> : null} {editingJob ? 'Save Changes' : 'Create Posting'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
