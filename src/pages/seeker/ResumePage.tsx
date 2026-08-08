import { useState, useEffect, type ChangeEvent, type DragEvent } from 'react';
import { Upload, FileText, Save, Trash2, Download, History, RotateCcw, ChevronDown, ChevronRight } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { getCurrentResume, getResumes, createResume, updateResume, deleteResume, uploadResume } from '@/lib/api';
import { parseResumeText, extractSkillsFromData } from '@/lib/resume-parser';
import type { ResumeData, Resume } from '@/types';
import { Spinner, ProgressBar } from '@/components/ui';
import { GlassmorphicCard } from '@/components/GlassmorphicCard';

export function ResumePage() {
  const { profile } = useAuth();
  const { showToast } = useToast();
  const [resume, setResume] = useState<Resume | null>(null);
  const [allResumes, setAllResumes] = useState<Resume[]>([]);
  const [parsedData, setParsedData] = useState<ResumeData>({});
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [saving, setSaving] = useState(false);
  const [rawText, setRawText] = useState('');
  const [manualText, setManualText] = useState('');
  const [showHistory, setShowHistory] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  useEffect(() => {
    if (!profile) return;
    (async () => {
      const [r, all] = await Promise.all([getCurrentResume(profile.id), getResumes(profile.id)]);
      setResume(r);
      setAllResumes(all);
      if (r) { setParsedData(r.parsed_data); setRawText(r.raw_text); }
      setLoading(false);
    })();
  }, [profile]);

  async function handleFile(file: File | undefined) {
    if (!file || !profile) return;
    const MAX_SIZE = 5 * 1024 * 1024;
    if (file.size > MAX_SIZE) { showToast('File too large. Max 5MB.', 'error'); return; }
    const allowedTypes = ['.pdf', '.docx', '.txt'];
    const ext = file.name.slice(file.name.lastIndexOf('.')).toLowerCase();
    if (!allowedTypes.includes(ext)) { showToast('Invalid file type. Upload PDF, DOCX, or TXT.', 'error'); return; }
    setUploading(true);
    setUploadProgress(0);
    const progressInterval = setInterval(() => {
      setUploadProgress(prev => Math.min(prev + 10, 90));
    }, 100);
    try {
      const newResume = await uploadResume(file);
      clearInterval(progressInterval);
      setUploadProgress(100);
      setResume(newResume); setParsedData(newResume.parsed_data); setRawText(newResume.raw_text);
      showToast('Resume uploaded and parsed.');
    } catch (err) { console.error(err); clearInterval(progressInterval); setUploadProgress(0); showToast('Failed to parse resume.', 'error'); } finally { setTimeout(() => { setUploading(false); setUploadProgress(0); }, 500); }
  }

  async function handleFileUpload(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    await handleFile(file);
    e.target.value = '';
  }

  function handleDragOver(e: DragEvent) {
    e.preventDefault();
    setDragOver(true);
  }

  function handleDragLeave() {
    setDragOver(false);
  }

  function handleDrop(e: DragEvent) {
    e.preventDefault();
    setDragOver(false);
    handleFile(e.dataTransfer.files?.[0]);
  }

  async function handleManualSubmit() {
    if (!profile || !manualText.trim()) return;
    setUploading(true);
    try {
      let parsed: ResumeData;
      let skills: string[];
      try {
        parsed = await parseResumeText(manualText);
        skills = (parsed.skills || []) as string[];
      } catch {
        parsed = parseResumeText(manualText);
        skills = extractSkillsFromData(parsed);
      }
      setParsedData(parsed); setRawText(manualText);
      const newResume = await createResume({
        user_id: profile.id, file_name: 'Manual Entry', file_type: 'manual',
        parsed_data: parsed, raw_text: manualText, skills,
        version: (resume?.version || 0) + 1, is_current: true,
      });
      setResume(newResume); setManualText('');
    } catch (err) { console.error(err); } finally { setUploading(false); }
  }

  async function handleSave() {
    if (!resume || !profile) return;
    setSaving(true);
    try {
      const skills = extractSkillsFromData(parsedData);
      const updated = await updateResume(resume.id, { parsed_data: parsedData, skills, raw_text: rawText });
      setResume(updated);
    } catch (err) { console.error(err); } finally { setSaving(false); }
  }

  async function handleDelete() {
    if (!resume) return;
    if (!confirm('Delete this resume? This cannot be undone.')) return;
    await deleteResume(resume.id);
    setResume(null); setParsedData({}); setRawText('');
    if (profile) setAllResumes(await getResumes(profile.id));
  }

  async function handleRestoreVersion(oldResume: Resume) {
    if (!profile || !resume) return;
    if (!confirm(`Restore version ${oldResume.version} as a new current version?`)) return;
    try {
      const newResume = await createResume({
        user_id: profile.id, file_name: oldResume.file_name, file_type: oldResume.file_type || 'manual',
        parsed_data: oldResume.parsed_data, raw_text: oldResume.raw_text, skills: oldResume.skills,
        version: (resume.version || 0) + 1, is_current: true,
      });
      setResume(newResume); setParsedData(newResume.parsed_data); setRawText(newResume.raw_text);
      setAllResumes(await getResumes(profile.id));
      showToast('Version restored.');
    } catch (err) { console.error(err); showToast('Failed to restore version.', 'error'); }
  }

  async function handleExportPDF() {
    if (!resume) return;
    const name = parsedData.contact?.name || profile?.full_name || 'Resume';
    const { exportResumePdf } = await import('@/lib/resume-pdf');
    exportResumePdf(`${name}_resume_v${resume.version}`, name, parsedData);
    showToast('PDF downloaded.');
  }

  async function handleExportVersionPdf(r: Resume) {
    const name = r.parsed_data.contact?.name || profile?.full_name || 'Resume';
    const { exportResumePdf } = await import('@/lib/resume-pdf');
    exportResumePdf(`${name}_resume_v${r.version}`, name, r.parsed_data);
    showToast(`Version ${r.version} PDF downloaded.`);
  }

  function handleExportMarkdown() {
    if (!resume) return;
    const name = parsedData.contact?.name || profile?.full_name || 'Resume';
    let md = `# ${name}\n`;
    if (parsedData.contact?.email) md += `Email: ${parsedData.contact.email} | `;
    if (parsedData.contact?.phone) md += `Phone: ${parsedData.contact.phone} | `;
    if (parsedData.contact?.location) md += `Location: ${parsedData.contact.location}`;
    md += `\n\n`;
    if (parsedData.summary) md += `## Professional Summary\n${parsedData.summary}\n\n`;
    if (parsedData.skills && parsedData.skills.length > 0) md += `## Skills\n${parsedData.skills.join(', ')}\n\n`;
    if (parsedData.experience && parsedData.experience.length > 0) {
      md += `## Work Experience\n`;
      parsedData.experience.forEach((exp) => { md += `### ${exp.title} - ${exp.company}\n*${exp.start_date || ''} - ${exp.end_date || 'Present'}*\n${exp.description || ''}\n\n`; });
    }
    if (parsedData.education && parsedData.education.length > 0) {
      md += `## Education\n`;
      parsedData.education.forEach((edu) => { md += `### ${edu.degree} in ${edu.field}\n*${edu.institution} (${edu.start_date || ''} - ${edu.end_date || ''})*\n\n`; });
    }
    if (parsedData.certifications && parsedData.certifications.length > 0) {
      md += `## Certifications\n`; parsedData.certifications.forEach((cert) => { md += `- ${cert}\n`; }); md += `\n`;
    }
    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a'); link.href = url; link.download = `${name.toLowerCase().replace(/\s+/g, '_')}_resume.md`;
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
  }

  if (loading) return <div className="flex justify-center py-20"><Spinner size={32} /></div>;

  const inputClass = "w-full rounded-lg border border-slate-700 bg-slate-800/50 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-mono text-3xl font-bold text-white">My Resume</h1>
          <p className="text-slate-400">Upload, optimize, and export your professional resume</p>
        </div>
        {resume && (
          <div className="flex items-center gap-2">
            <button onClick={handleExportMarkdown} className="btn-secondary flex items-center gap-2 text-xs">
              <Download className="h-4 w-4" /> .MD
            </button>
            <button onClick={handleExportPDF} className="btn-primary flex items-center gap-2 text-xs">
              <Download className="h-4 w-4" /> PDF
            </button>
          </div>
        )}
      </div>

      {!resume ? (
        <GlassmorphicCard className="p-6">
          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <h3 className="text-base font-semibold text-white">Upload Resume</h3>
              <p className="mt-1 text-sm text-slate-400">PDF or DOCX file (max 5MB)</p>
              <label
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`mt-4 flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 transition-colors ${
                  dragOver
                    ? 'border-cyan-400 bg-cyan-500/10'
                    : 'border-slate-700 hover:border-cyan-500/50 hover:bg-cyan-500/5'
                }`}
              >
                {uploading ? (
                  <div className="w-full max-w-xs">
                    <div className="flex items-center gap-2 mb-2">
                      <Spinner size={20} />
                      <span className="text-sm font-medium text-slate-300">Uploading...</span>
                      <span className="text-sm text-slate-500 ml-auto">{uploadProgress}%</span>
                    </div>
                    <ProgressBar value={uploadProgress} color="primary" />
                  </div>
                ) : (
                  <>
                    <Upload className="h-10 w-10 text-slate-500" />
                    <span className="mt-2 text-sm font-medium text-slate-300">
                      {dragOver ? 'Drop your resume here' : 'Click to upload or drag & drop'}
                    </span>
                    <span className="text-xs text-slate-500">PDF, DOCX, or TXT · max 5MB</span>
                  </>
                )}
                <input type="file" accept=".pdf,.docx,.txt" onChange={handleFileUpload} className="hidden" />
              </label>
            </div>
            <div>
              <h3 className="text-base font-semibold text-white">Paste Resume Text</h3>
              <p className="mt-1 text-sm text-slate-400">Or manually paste your resume content</p>
              <textarea value={manualText} onChange={(e) => setManualText(e.target.value)} placeholder="Paste your full resume text here..." className={`${inputClass} mt-4 h-32 resize-none`} />
              <button onClick={handleManualSubmit} disabled={uploading || !manualText.trim()} className="btn-primary mt-3 w-full">
                {uploading ? <Spinner size={16} /> : <FileText className="h-4 w-4" />} Parse & Save
              </button>
            </div>
          </div>
        </GlassmorphicCard>
      ) : (
        <>
          <GlassmorphicCard className="p-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500/20">
                  <FileText className="h-5 w-5 text-emerald-400" />
                </div>
                <div>
                  <div className="font-semibold text-white">{resume.file_name}</div>
                  <div className="text-sm text-slate-500">Version {resume.version} · {resume.skills.length} skills · {new Date(resume.created_at).toLocaleDateString()}</div>
                </div>
              </div>
              <button onClick={handleDelete} className="btn-ghost text-red-400 hover:bg-red-500/10">
                <Trash2 className="h-4 w-4" /> Delete
              </button>
            </div>
          </GlassmorphicCard>

          {allResumes.length > 1 && (
            <GlassmorphicCard className="p-5">
              <button onClick={() => setShowHistory(!showHistory)} className="flex w-full items-center justify-between">
                <div className="flex items-center gap-2">
                  <History className="h-4 w-4 text-slate-400" />
                  <h3 className="text-sm font-semibold text-slate-300">Version History</h3>
                  <span className="badge bg-slate-800 text-slate-400 border border-slate-700">{allResumes.length} versions</span>
                </div>
                {showHistory ? <ChevronDown className="h-4 w-4 text-slate-500" /> : <ChevronRight className="h-4 w-4 text-slate-500" />}
              </button>
              {showHistory && (
                <div className="mt-4 space-y-2">
                  {allResumes.map((r) => (
                    <div key={r.id} className={`flex items-center justify-between rounded-xl border p-3 ${r.is_current ? 'border-cyan-500/30 bg-cyan-500/5' : 'border-slate-700/50 bg-slate-800/30'}`}>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-white">Version {r.version}</span>
                          {r.is_current && <span className="badge bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">Current</span>}
                        </div>
                        <div className="text-xs text-slate-500">{r.file_name} · {r.skills.length} skills · {new Date(r.created_at).toLocaleDateString()}</div>
                      </div>
                      {!r.is_current && (
                        <>
                          <button onClick={() => handleExportVersionPdf(r)} className="btn-ghost text-xs text-slate-400 hover:bg-slate-800/50">
                            <Download className="h-3 w-3" /> Export
                          </button>
                          <button onClick={() => handleRestoreVersion(r)} className="btn-ghost text-xs text-cyan-400 hover:bg-cyan-500/10">
                            <RotateCcw className="h-3 w-3" /> Restore
                          </button>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </GlassmorphicCard>
          )}

          <GlassmorphicCard className="p-6">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-white">Parsed Resume Data</h3>
              <button onClick={handleSave} disabled={saving} className="btn-primary">
                {saving ? <Spinner size={16} /> : <Save className="h-4 w-4" />} Save Changes
              </button>
            </div>
            <div className="mt-6 space-y-6">
              <section>
                <h4 className="text-sm font-semibold text-slate-300 mb-3">Contact Information</h4>
                <div className="grid gap-3 sm:grid-cols-2">
                  {[{ label: 'Name', key: 'name' }, { label: 'Email', key: 'email' }, { label: 'Phone', key: 'phone' }, { label: 'Location', key: 'location' }].map(f => (
                    <div key={f.key}>
                      <label className="label">{f.label}</label>
                      <input className={inputClass} value={(parsedData.contact as any)?.[f.key] || ''} onChange={(e) => setParsedData(prev => ({ ...prev, contact: { ...prev.contact, [f.key]: e.target.value } }))} />
                    </div>
                  ))}
                </div>
              </section>

              <section>
                <h4 className="text-sm font-semibold text-slate-300 mb-3">Professional Summary</h4>
                <textarea className={`${inputClass} h-24 resize-none`} value={parsedData.summary || ''} onChange={(e) => setParsedData(prev => ({ ...prev, summary: e.target.value }))} />
              </section>

              <section>
                <h4 className="text-sm font-semibold text-slate-300 mb-3">Skills</h4>
                <div className="flex flex-wrap gap-2">
                  {(parsedData.skills || []).map((skill, i) => (
                    <span key={i} className="inline-flex items-center gap-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 px-3 py-1 text-sm text-cyan-400">
                      {skill}
                      <button onClick={() => setParsedData(prev => ({ ...prev, skills: prev.skills?.filter((_, idx) => idx !== i) }))} className="text-cyan-500 hover:text-cyan-300">&times;</button>
                    </span>
                  ))}
                </div>
                <div className="mt-3 flex gap-2">
                  <input id="new-skill" className={inputClass + " flex-1"} placeholder="Add a skill..." onKeyDown={(e) => {
                    if (e.key === 'Enter') { const val = (e.target as HTMLInputElement).value.trim(); if (val) { setParsedData(prev => ({ ...prev, skills: [...(prev.skills || []), val] })); (e.target as HTMLInputElement).value = ''; } }
                  }} />
                </div>
              </section>

              <section>
                <h4 className="text-sm font-semibold text-slate-300 mb-3">Work Experience</h4>
                <div className="space-y-3">
                  {(parsedData.experience || []).map((exp, i) => (
                    <div key={i} className="rounded-xl border border-slate-700/50 bg-slate-800/30 p-4">
                      <div className="grid gap-3 sm:grid-cols-2">
                        <input className={inputClass} placeholder="Title" value={exp.title || ''} onChange={(e) => { const next = [...(parsedData.experience || [])]; next[i] = { ...exp, title: e.target.value }; setParsedData(prev => ({ ...prev, experience: next })); }} />
                        <input className={inputClass} placeholder="Company" value={exp.company || ''} onChange={(e) => { const next = [...(parsedData.experience || [])]; next[i] = { ...exp, company: e.target.value }; setParsedData(prev => ({ ...prev, experience: next })); }} />
                      </div>
                      <textarea className={`${inputClass} mt-3`} placeholder="Description" value={exp.description || ''} onChange={(e) => { const next = [...(parsedData.experience || [])]; next[i] = { ...exp, description: e.target.value }; setParsedData(prev => ({ ...prev, experience: next })); }} />
                    </div>
                  ))}
                </div>
              </section>

              <section>
                <h4 className="text-sm font-semibold text-slate-300 mb-3">Education</h4>
                <div className="space-y-3">
                  {(parsedData.education || []).map((edu, i) => (
                    <div key={i} className="grid gap-3 rounded-xl border border-slate-700/50 bg-slate-800/30 p-4 sm:grid-cols-2">
                      <input className={inputClass} placeholder="Institution" value={edu.institution || ''} onChange={(e) => { const next = [...(parsedData.education || [])]; next[i] = { ...edu, institution: e.target.value }; setParsedData(prev => ({ ...prev, education: next })); }} />
                      <input className={inputClass} placeholder="Degree" value={edu.degree || ''} onChange={(e) => { const next = [...(parsedData.education || [])]; next[i] = { ...edu, degree: e.target.value }; setParsedData(prev => ({ ...prev, education: next })); }} />
                    </div>
                  ))}
                </div>
              </section>

              <section>
                <h4 className="text-sm font-semibold text-slate-300 mb-3">Certifications</h4>
                <div className="space-y-2">
                  {(parsedData.certifications || []).map((cert, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <input className={inputClass + " flex-1"} placeholder="Certification name" value={cert} onChange={(e) => { const next = [...(parsedData.certifications || [])]; next[i] = e.target.value; setParsedData(prev => ({ ...prev, certifications: next })); }} />
                      <button type="button" onClick={() => { const next = (parsedData.certifications || []).filter((_, j) => j !== i); setParsedData(prev => ({ ...prev, certifications: next })); }} className="text-slate-500 hover:text-red-400"><Trash2 className="h-4 w-4" /></button>
                    </div>
                  ))}
                  <button type="button" onClick={() => setParsedData(prev => ({ ...prev, certifications: [...(prev.certifications || []), ''] }))} className="text-sm text-cyan-400 hover:text-cyan-300">+ Add certification</button>
                </div>
              </section>
            </div>
          </GlassmorphicCard>
        </>
      )}
    </div>
  );
}
