import { useEffect, useState } from 'react';
import { Plus, Briefcase, Edit2, Trash2, X, Eye, EyeOff, Users } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { getJobPostings, createJobPosting, updateJobPosting, deleteJobPosting, getApplicationsForJob } from '@/lib/api';
import { seedSampleJobs } from '@/lib/seed';
import type { JobPosting } from '@/types';
import { Spinner, EmptyState, Badge, Modal } from '@/components/ui';

export function PostingsPage() {
  const { profile } = useAuth();
  const [jobs, setJobs] = useState<JobPosting[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingJob, setEditingJob] = useState<JobPosting | null>(null);

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [requirements, setRequirements] = useState('');
  const [responsibilities, setResponsibilities] = useState('');
  const [location, setLocation] = useState('');
  const [isRemote, setIsRemote] = useState(false);
  const [salaryMin, setSalaryMin] = useState('');
  const [salaryMax, setSalaryMax] = useState('');
  const [jobType, setJobType] = useState('full_time');
  const [status, setStatus] = useState('active');
  const [saving, setSaving] = useState(false);
  const [appCounts, setAppCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    if (!profile) return;
    (async () => {
      try {
        await seedSampleJobs();
        const j = await getJobPostings({ employerId: profile.id });
        setJobs(j);

        // Fetch application counts for each job
        const counts: Record<string, number> = {};
        for (const job of j) {
          const apps = await getApplicationsForJob(job.id);
          counts[job.id] = apps.length;
        }
        setAppCounts(counts);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, [profile]);

  function openCreate() {
    setEditingJob(null);
    setTitle(''); setDescription(''); setRequirements(''); setResponsibilities('');
    setLocation(''); setIsRemote(false); setSalaryMin(''); setSalaryMax('');
    setJobType('full_time'); setCategory('Software Engineering'); setStatus('active');
    setShowForm(true);
  }

  function openEdit(job: JobPosting) {
    setEditingJob(job);
    setTitle(job.title);
    setDescription(job.description);
    setRequirements(job.requirements.join('\n'));
    setResponsibilities(job.responsibilities.join('\n'));
    setLocation(job.location || '');
    setIsRemote(job.is_remote);
    setSalaryMin(job.salary_min?.toString() || '');
    setSalaryMax(job.salary_max?.toString() || '');
    setJobType(job.job_type || 'full_time');
    setCategory(job.category || 'Software Engineering');
    setStatus(job.status);
    setShowForm(true);
  }

  async function handleSave() {
    if (!profile || !title.trim() || !description.trim()) return;
    setSaving(true);
    try {
      const jobData = {
        employer_id: profile.id,
        title,
        description,
        requirements: requirements.split('\n').map(r => r.trim()).filter(Boolean),
        responsibilities: responsibilities.split('\n').map(r => r.trim()).filter(Boolean),
        location: location || null,
        is_remote: isRemote,
        salary_min: salaryMin ? parseInt(salaryMin) : null,
        salary_max: salaryMax ? parseInt(salaryMax) : null,
        salary_currency: 'USD',
        job_type: jobType,
        category,
        status,
      };

      if (editingJob) {
        const updated = await updateJobPosting(editingJob.id, jobData);
        setJobs(prev => prev.map(j => j.id === updated.id ? updated : j));
      } else {
        const created = await createJobPosting(jobData as any);
        setJobs(prev => [created, ...prev]);
      }
      setShowForm(false);
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  }

  async function handleClose(job: JobPosting) {
    const updated = await updateJobPosting(job.id, { status: job.status === 'active' ? 'closed' : 'active' });
    setJobs(prev => prev.map(j => j.id === updated.id ? updated : j));
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this job posting? This cannot be undone.')) return;
    await deleteJobPosting(id);
    setJobs(prev => prev.filter(j => j.id !== id));
  }

  if (loading) return <div className="flex justify-center py-20"><Spinner size={32} /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">My Postings</h1>
          <p className="text-slate-500">{jobs.length} job postings</p>
        </div>
        <button onClick={openCreate} className="btn-primary">
          <Plus className="h-4 w-4" /> New Posting
        </button>
      </div>

      {jobs.length === 0 ? (
        <EmptyState
          icon={<Briefcase className="h-12 w-12" />}
          title="No job postings yet"
          description="Create your first job posting to start receiving applications from qualified candidates."
          action={<button onClick={openCreate} className="btn-primary"><Plus className="h-4 w-4" /> Create Posting</button>}
        />
      ) : (
        <div className="space-y-3">
          {jobs.map((job) => (
            <div key={job.id} className="card p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-slate-900">{job.title}</h3>
                    <Badge color={job.status === 'active' ? 'green' : job.status === 'draft' ? 'amber' : 'slate'}>
                      {job.status}
                    </Badge>
                  </div>
                  <p className="mt-1 text-sm text-slate-600 line-clamp-2">{job.description}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-slate-500">
                    {job.location && <span>{job.location}</span>}
                    {job.is_remote && <Badge color="teal">Remote</Badge>}
                    {job.salary_min && <span>${job.salary_min.toLocaleString()} - ${job.salary_max?.toLocaleString()}</span>}
                    <span className="capitalize">{job.job_type?.replace('_', ' ')}</span>
                    <span>{job.requirements.length} requirements</span>
                    {appCounts[job.id] !== undefined && (
                      <span className="flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        {appCounts[job.id]} application{appCounts[job.id] !== 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => openEdit(job)} className="btn-ghost p-2" title="Edit">
                    <Edit2 className="h-4 w-4" />
                  </button>
                  <button onClick={() => handleClose(job)} className="btn-ghost p-2" title={job.status === 'active' ? 'Close' : 'Reopen'}>
                    {job.status === 'active' ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                  <button onClick={() => handleDelete(job.id)} className="btn-ghost p-2 text-danger-600" title="Delete">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      <Modal open={showForm} onClose={() => setShowForm(false)} title={editingJob ? 'Edit Job Posting' : 'Create Job Posting'} maxWidth="max-w-2xl">
        <div className="space-y-4">
          <div>
            <label className="label">Job Title *</label>
            <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Senior Frontend Engineer" />
          </div>
          <div>
            <label className="label">Description *</label>
            <textarea className="input h-32 resize-none" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Full job description..." />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label">Requirements (one per line)</label>
              <textarea className="input h-28 resize-none" value={requirements} onChange={(e) => setRequirements(e.target.value)} placeholder="React&#10;TypeScript&#10;5+ years experience" />
            </div>
            <div>
              <label className="label">Responsibilities (one per line)</label>
              <textarea className="input h-28 resize-none" value={responsibilities} onChange={(e) => setResponsibilities(e.target.value)} placeholder="Lead frontend architecture&#10;Mentor junior devs" />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className="label">Location</label>
              <input className="input" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="San Francisco, CA" />
            </div>
            <div>
              <label className="label">Job Category / Domain</label>
              <select className="input" value={category} onChange={(e) => setCategory(e.target.value)}>
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Job Type</label>
              <select className="input" value={jobType} onChange={(e) => setJobType(e.target.value)}>
                <option value="full_time">Full-time</option>
                <option value="part_time">Part-time</option>
                <option value="contract">Contract</option>
                <option value="internship">Internship</option>
              </select>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label">Salary Min ($)</label>
              <input type="number" className="input" value={salaryMin} onChange={(e) => setSalaryMin(e.target.value)} placeholder="100000" />
            </div>
            <div>
              <label className="label">Salary Max ($)</label>
              <input type="number" className="input" value={salaryMax} onChange={(e) => setSalaryMax(e.target.value)} placeholder="150000" />
            </div>
          </div>
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={isRemote} onChange={(e) => setIsRemote(e.target.checked)} className="rounded" />
              Remote friendly
            </label>
            <label className="flex items-center gap-2 text-sm">
              <span className="text-slate-600">Status:</span>
              <select value={status} onChange={(e) => setStatus(e.target.value)} className="rounded border border-slate-300 px-2 py-1 text-sm">
                <option value="active">Active</option>
                <option value="draft">Draft</option>
                <option value="closed">Closed</option>
              </select>
            </label>
          </div>
          <div className="flex justify-end gap-2 border-t border-slate-200 pt-4">
            <button onClick={() => setShowForm(false)} className="btn-secondary">Cancel</button>
            <button onClick={handleSave} disabled={saving || !title.trim() || !description.trim()} className="btn-primary">
              {saving ? <Spinner size={16} /> : null}
              {editingJob ? 'Save Changes' : 'Create Posting'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
