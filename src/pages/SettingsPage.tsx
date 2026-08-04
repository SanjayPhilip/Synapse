import { useState } from 'react';
import { User2, Building2, Save, Sun, Moon } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { updateProfile } from '@/lib/auth';
import { useTheme } from '@/lib/theme';
import { Spinner } from '@/components/ui';
import { GlassmorphicCard } from '@/components/GlassmorphicCard';

export function SettingsPage() {
  const { profile, activeRole } = useAuth();
  const [fullName, setFullName] = useState(profile?.full_name || '');
  const [companyName, setCompanyName] = useState(profile?.company_name || '');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const { theme, toggleTheme } = useTheme();

  async function handleSave() {
    if (!profile) return;
    setSaving(true);
    const updates: any = { full_name: fullName };
    if (activeRole === 'employer') updates.company_name = companyName;
    await updateProfile(profile.id, updates);
    setSaving(false); setSaved(true); setTimeout(() => setSaved(false), 2000);
  }

  const inputClass = "w-full rounded-lg border border-slate-700 bg-slate-800/50 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-mono text-3xl font-bold text-white">Settings</h1>
        <p className="text-slate-400">Manage your account and profile</p>
      </div>

      <GlassmorphicCard className="p-6">
        <h3 className="text-base font-semibold text-white">Profile Information</h3>
        <div className="mt-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-cyan-500/20 border border-cyan-500/30">
              <User2 className="h-6 w-6 text-cyan-400" />
            </div>
            <div>
              <div className="text-sm text-slate-500">Email</div>
              <div className="font-medium text-white">{profile?.email}</div>
            </div>
          </div>
          <div>
            <label className="label text-slate-300">Full Name</label>
            <input className={inputClass} value={fullName} onChange={(e) => setFullName(e.target.value)} />
          </div>
          {activeRole === 'employer' && (
            <div>
              <label className="label text-slate-300">Company Name</label>
              <input className={inputClass} value={companyName} onChange={(e) => setCompanyName(e.target.value)} />
            </div>
          )}
          <div>
            <label className="label text-slate-300">Role</label>
            <div className="flex items-center gap-2">
              <span className="badge bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 capitalize">{activeRole}</span>
              <span className="text-sm text-slate-500">Role cannot be changed after registration</span>
            </div>
          </div>
          <div className="flex items-center gap-3 border-t border-slate-700/50 pt-4">
            <button onClick={handleSave} disabled={saving} className="btn-primary">
              {saving ? <Spinner size={16} /> : <Save className="h-4 w-4" />} Save Changes
            </button>
            {saved && <span className="text-sm text-emerald-400">Saved successfully!</span>}
          </div>
        </div>
      </GlassmorphicCard>

      <GlassmorphicCard className="p-6">
        <h3 className="text-base font-semibold text-white">Appearance</h3>
        <div className="mt-4 flex items-center justify-between rounded-xl border border-slate-700/50 bg-slate-800/30 p-3">
          <div className="flex items-center gap-3">
            <Sun className="h-5 w-5 text-cyan-400" />
            <div>
              <div className="text-sm font-medium text-white">Theme</div>
              <div className="text-xs text-slate-500">{theme === 'dark' ? 'Dark mode active' : 'Light mode active'}</div>
            </div>
          </div>
          <button onClick={toggleTheme} className="btn-secondary">
            {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            {theme === 'dark' ? 'Switch to Light' : 'Switch to Dark'}
          </button>
        </div>
      </GlassmorphicCard>

      <GlassmorphicCard className="p-6">
        <h3 className="text-base font-semibold text-white">Account</h3>
        <div className="mt-4 space-y-3">
          <div className="flex items-center justify-between rounded-xl border border-slate-700/50 bg-slate-800/30 p-3">
            <div className="flex items-center gap-3">
              <Building2 className="h-5 w-5 text-slate-500" />
              <div>
                <div className="text-sm font-medium text-white">Account Status</div>
                <div className="text-xs text-slate-500">Active</div>
              </div>
            </div>
            <span className="badge bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">Active</span>
          </div>
          <div className="flex items-center justify-between rounded-xl border border-slate-700/50 bg-slate-800/30 p-3">
            <div className="flex items-center gap-3">
              <User2 className="h-5 w-5 text-slate-500" />
              <div>
                <div className="text-sm font-medium text-white">Member Since</div>
                <div className="text-xs text-slate-500">{profile ? new Date(profile.created_at).toLocaleDateString() : ''}</div>
              </div>
            </div>
          </div>
        </div>
      </GlassmorphicCard>
    </div>
  );
}
