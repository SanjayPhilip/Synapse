import { useEffect, useState } from 'react';
import { BellRing, Plus, Trash2, MapPin, Tag, Loader2 } from 'lucide-react';
import { getJobAlerts, createJobAlert, updateJobAlert, deleteJobAlert } from '@/lib/api';
import type { JobAlert } from '@/types';
import { Spinner, EmptyState } from '@/components/ui';
import { GlassmorphicCard } from '@/components/GlassmorphicCard';

const CATEGORIES = ['Software Engineering', 'Data Science & AI', 'Data Analytics', 'Business & MBA', 'Cloud & DevOps', 'Finance & Accounting', 'Marketing & Sales'];

export function JobAlertsPage() {
  const [alerts, setAlerts] = useState<JobAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [keywords, setKeywords] = useState('');
  const [category, setCategory] = useState('');
  const [location, setLocation] = useState('');
  const [saving, setSaving] = useState(false);

  async function load() { const data = await getJobAlerts(); setAlerts(data); setLoading(false); }
  useEffect(() => { load(); }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    const kw = keywords.split(',').map((s) => s.trim()).filter(Boolean);
    if (kw.length === 0 && !category) return;
    setSaving(true);
    try { await createJobAlert({ keywords: kw, category: category || null, location: location || null }); setKeywords(''); setCategory(''); setLocation(''); await load(); } finally { setSaving(false); }
  }

  async function toggle(alert: JobAlert) { await updateJobAlert(alert.id, { is_active: !alert.is_active }); await load(); }
  async function remove(id: string) { await deleteJobAlert(id); await load(); }

  if (loading) return <div className="flex justify-center py-20"><Spinner size={32} /></div>;

  const inputClass = "w-full rounded-lg border border-slate-700 bg-slate-800/50 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-mono text-3xl font-bold text-white">Job Alerts</h1>
        <p className="text-slate-400">Get notified when a new job matches your keywords, category, or location.</p>
      </div>

      <GlassmorphicCard className="p-4">
        <form onSubmit={handleCreate} className="space-y-3">
          <div className="grid gap-3 md:grid-cols-3">
            <div className="md:col-span-3">
              <label className="mb-1 block text-xs font-medium text-slate-400">Keywords (comma-separated)</label>
              <div className="relative">
                <Tag className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                <input value={keywords} onChange={(e) => setKeywords(e.target.value)} placeholder="react, typescript, python" className={`${inputClass} pl-9`} />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-400">Category</label>
              <select value={category} onChange={(e) => setCategory(e.target.value)} className={inputClass}>
                <option value="">Any category</option>
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-400">Location</label>
              <div className="relative">
                <MapPin className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                <input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="San Francisco" className={`${inputClass} pl-9`} />
              </div>
            </div>
            <div className="flex items-end">
              <button type="submit" disabled={saving} className="btn-primary w-full">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Create Alert
              </button>
            </div>
          </div>
        </form>
      </GlassmorphicCard>

      {alerts.length === 0 ? (
        <EmptyState icon={<BellRing className="h-12 w-12" />} title="No job alerts" description="Create your first alert to be notified when matching jobs are posted." />
      ) : (
        <div className="space-y-3">
          {alerts.map((alert) => (
            <GlassmorphicCard key={alert.id} className="flex items-center justify-between gap-4 p-4">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  {alert.keywords.length > 0 ? alert.keywords.map((k, i) => <span key={i} className="badge bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">{k}</span>) : <span className="badge bg-slate-800 text-slate-400 border border-slate-700">Any keyword</span>}
                  {alert.category && <span className="badge bg-violet-500/10 text-violet-400 border border-violet-500/20">{alert.category}</span>}
                  {alert.location && <span className="flex items-center gap-1 text-xs text-slate-500"><MapPin className="h-3 w-3" /> {alert.location}</span>}
                </div>
                <div className="mt-1 text-xs text-slate-500">Created {new Date(alert.created_at).toLocaleDateString()}</div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => toggle(alert)} className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${alert.is_active ? 'bg-cyan-600' : 'bg-slate-700'}`} title={alert.is_active ? 'Active' : 'Paused'}>
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${alert.is_active ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
                <button onClick={() => remove(alert.id)} className="btn-ghost p-2 text-slate-500 hover:text-red-400"><Trash2 className="h-4 w-4" /></button>
              </div>
            </GlassmorphicCard>
          ))}
        </div>
      )}
    </div>
  );
}
