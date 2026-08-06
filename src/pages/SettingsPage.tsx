import { useState } from 'react';
import { User2, Building2, Save, Sun, Moon, Lock, Download } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { updateProfile, changePassword } from '@/lib/auth';
import { useTheme } from '@/lib/theme';
import { getResumes, getApplications } from '@/lib/api';
import { Spinner } from '@/components/ui';
import { GlassmorphicCard } from '@/components/GlassmorphicCard';
import { useToast } from '@/context/ToastContext';

export function SettingsPage() {
  const { profile, activeRole } = useAuth();
  const [fullName, setFullName] = useState(profile?.full_name || '');
  const [companyName, setCompanyName] = useState(profile?.company_name || '');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changing, setChanging] = useState(false);
  const [changed, setChanged] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const { theme, toggleTheme } = useTheme();
  const { showToast: toast } = useToast();
  const [exporting, setExporting] = useState(false);

  async function handleExportData() {
    if (!profile) return;
    setExporting(true);
    try {
      const [resumes, applications] = await Promise.all([
        getResumes(profile.id),
        getApplications(profile.id),
      ]);

      const exportData = {
        exportedAt: new Date().toISOString(),
        profile: {
          id: profile.id,
          email: profile.email,
          full_name: profile.full_name,
          role: profile.role,
          company_name: profile.company_name,
          avatar_url: profile.avatar_url,
          created_at: profile.created_at,
        },
        resumes,
        applications,
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `synapse-export-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({ title: 'Export complete', message: 'Your data has been downloaded as JSON.', type: 'success' });
    } catch (err) {
      toast({ title: 'Export failed', message: err instanceof Error ? err.message : 'Unknown error', type: 'error' });
    } finally {
      setExporting(false);
    }
  }

  async function handleSave() {
    if (!profile) return;
    setSaving(true);
    const updates: any = { full_name: fullName };
    if (activeRole === 'employer') updates.company_name = companyName;
    await updateProfile(profile.id, updates);
    setSaving(false); setSaved(true); setTimeout(() => setSaved(false), 2000);
  }

  async function handleChangePassword() {
    setPasswordError('');
    if (!currentPassword || !newPassword || !confirmPassword) { setPasswordError('All fields are required.'); return; }
    if (newPassword.length < 8) { setPasswordError('New password must be at least 8 characters.'); return; }
    if (newPassword !== confirmPassword) { setPasswordError('New passwords do not match.'); return; }
    setChanging(true);
    const res = await changePassword(currentPassword, newPassword);
    setChanging(false);
    if (res.error) { setPasswordError(res.error); }
    else { setChanged(true); setCurrentPassword(''); setNewPassword(''); setConfirmPassword(''); setTimeout(() => setChanged(false), 2000); }
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
        <h3 className="text-base font-semibold text-white">Security</h3>
        <div className="mt-6 space-y-4 max-w-md">
          <div>
            <label className="label text-slate-300">Current Password</label>
            <input type="password" className={inputClass} value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} placeholder="Enter current password" />
          </div>
          <div>
            <label className="label text-slate-300">New Password</label>
            <input type="password" className={inputClass} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="At least 8 characters" />
          </div>
          <div>
            <label className="label text-slate-300">Confirm New Password</label>
            <input type="password" className={inputClass} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Re-enter new password" />
          </div>
          {passwordError && <p className="text-sm text-red-400">{passwordError}</p>}
          <div className="flex items-center gap-3">
            <button onClick={handleChangePassword} disabled={changing} className="btn-primary">
              {changing ? <Spinner size={16} /> : <Lock className="h-4 w-4" />} Update Password
            </button>
            {changed && <span className="text-sm text-emerald-400">Password updated successfully.</span>}
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
              <Download className="h-5 w-5 text-cyan-400" />
              <div>
                <div className="text-sm font-medium text-white">Export My Data</div>
                <div className="text-xs text-slate-500">Download resume + applications as JSON</div>
              </div>
            </div>
            <button onClick={handleExportData} disabled={exporting} className="btn-secondary">
              {exporting ? <Spinner size={16} /> : <Download className="h-4 w-4" />} Export
            </button>
          </div>
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
