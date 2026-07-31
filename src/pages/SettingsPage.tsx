import { useState } from 'react';
import { User2, Building2, Save } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { updateProfile } from '@/lib/auth';
import { Spinner } from '@/components/ui';

export function SettingsPage() {
  const { profile, activeRole } = useAuth();
  const [fullName, setFullName] = useState(profile?.full_name || '');
  const [companyName, setCompanyName] = useState(profile?.company_name || '');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function handleSave() {
    if (!profile) return;
    setSaving(true);
    const updates: any = { full_name: fullName };
    if (activeRole === 'employer') updates.company_name = companyName;
    await updateProfile(profile.id, updates);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
        <p className="text-slate-500">Manage your account and profile</p>
      </div>

      <div className="card p-6">
        <h3 className="text-base font-semibold text-slate-900">Profile Information</h3>
        <div className="mt-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-100">
              <User2 className="h-6 w-6 text-primary-600" />
            </div>
            <div>
              <div className="text-sm text-slate-500">Email</div>
              <div className="font-medium text-slate-900">{profile?.email}</div>
            </div>
          </div>

          <div>
            <label className="label">Full Name</label>
            <input className="input" value={fullName} onChange={(e) => setFullName(e.target.value)} />
          </div>

          {activeRole === 'employer' && (
            <div>
              <label className="label">Company Name</label>
              <input className="input" value={companyName} onChange={(e) => setCompanyName(e.target.value)} />
            </div>
          )}

          <div>
            <label className="label">Role</label>
            <div className="flex items-center gap-2">
              <span className="badge bg-primary-100 text-primary-700 capitalize">{activeRole}</span>
              <span className="text-sm text-slate-500">Role cannot be changed after registration</span>
            </div>
          </div>

          <div className="flex items-center gap-3 border-t border-slate-200 pt-4">
            <button onClick={handleSave} disabled={saving} className="btn-primary">
              {saving ? <Spinner size={16} /> : <Save className="h-4 w-4" />}
              Save Changes
            </button>
            {saved && <span className="text-sm text-success-600">Saved successfully!</span>}
          </div>
        </div>
      </div>

      <div className="card p-6">
        <h3 className="text-base font-semibold text-slate-900">Account</h3>
        <div className="mt-4 space-y-3">
          <div className="flex items-center justify-between rounded-lg border border-slate-200 p-3">
            <div className="flex items-center gap-3">
              <Building2 className="h-5 w-5 text-slate-400" />
              <div>
                <div className="text-sm font-medium text-slate-900">Account Status</div>
                <div className="text-xs text-slate-500">Active</div>
              </div>
            </div>
            <span className="badge bg-success-100 text-success-700">Active</span>
          </div>
          <div className="flex items-center justify-between rounded-lg border border-slate-200 p-3">
            <div className="flex items-center gap-3">
              <User2 className="h-5 w-5 text-slate-400" />
              <div>
                <div className="text-sm font-medium text-slate-900">Member Since</div>
                <div className="text-xs text-slate-500">{profile ? new Date(profile.created_at).toLocaleDateString() : ''}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
