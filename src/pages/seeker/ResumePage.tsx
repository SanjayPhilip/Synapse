import { useState, useEffect, type ChangeEvent } from 'react';
import { Upload, FileText, Save, Trash2, Plus, Download, History, RotateCcw, ChevronDown, ChevronRight } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { getCurrentResume, getResumes, createResume, updateResume, deleteResume, uploadResume } from '@/lib/api';
import { parseResumeText, extractSkillsFromData } from '@/lib/resume-parser';
import type { ResumeData, Resume } from '@/types';
import { Spinner, EmptyState } from '@/components/ui';

export function ResumePage() {
  const { profile } = useAuth();
  const [resume, setResume] = useState<Resume | null>(null);
  const [allResumes, setAllResumes] = useState<Resume[]>([]);
  const [parsedData, setParsedData] = useState<ResumeData>({});
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [rawText, setRawText] = useState('');
  const [manualText, setManualText] = useState('');
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    if (!profile) return;
    (async () => {
      const [r, all] = await Promise.all([
        getCurrentResume(profile.id),
        getResumes(profile.id),
      ]);
      setResume(r);
      setAllResumes(all);
      if (r) {
        setParsedData(r.parsed_data);
        setRawText(r.raw_text);
      }
      setLoading(false);
    })();
  }, [profile]);

  async function handleFileUpload(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !profile) return;

    const MAX_SIZE = 5 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      alert('File too large. Maximum size is 5MB.');
      e.target.value = '';
      return;
    }

    const allowedTypes = ['.pdf', '.docx', '.txt'];
    const ext = file.name.slice(file.name.lastIndexOf('.')).toLowerCase();
    if (!allowedTypes.includes(ext)) {
      alert('Invalid file type. Please upload a PDF, DOCX, or TXT file.');
      e.target.value = '';
      return;
    }

    setUploading(true);
    try {
      // Upload to backend — it handles PDF/DOCX parsing with PyMuPDF/python-docx
      // and uses Gemini AI for structured extraction (contact, skills, experience, etc.)
      const newResume = await uploadResume(file);
      setResume(newResume);
      setParsedData(newResume.parsed_data);
      setRawText(newResume.raw_text);
    } catch (err) {
      console.error(err);
      alert('Failed to parse resume. Please try a different file or paste your text manually.');
    } finally {
      setUploading(false);
    }
  }

  async function handleManualSubmit() {
    if (!profile || !manualText.trim()) return;
    setUploading(true);
    try {
      const parsed = parseResumeText(manualText);
      setParsedData(parsed);
      setRawText(manualText);
      const skills = extractSkillsFromData(parsed);

      const newResume = await createResume({
        user_id: profile.id,
        file_name: 'Manual Entry',
        file_type: 'manual',
        parsed_data: parsed,
        raw_text: manualText,
        skills,
        version: (resume?.version || 0) + 1,
        is_current: true,
      });
      setResume(newResume);
      setManualText('');
    } catch (err) {
      console.error(err);
    } finally {
      setUploading(false);
    }
  }

  async function handleSave() {
    if (!resume || !profile) return;
    setSaving(true);
    try {
      const skills = extractSkillsFromData(parsedData);
      const updated = await updateResume(resume.id, {
        parsed_data: parsedData,
        skills,
        raw_text: rawText,
      });
      setResume(updated);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!resume) return;
    if (!confirm('Delete this resume? This cannot be undone.')) return;
    await deleteResume(resume.id);
    setResume(null);
    setParsedData({});
    setRawText('');
    if (profile) setAllResumes(await getResumes(profile.id));
  }

  async function handleRestoreVersion(oldResume: Resume) {
    if (!profile || !resume) return;
    if (!confirm(`Restore version ${oldResume.version} as a new current version? This creates a new resume entry.`)) return;
    try {
      const newResume = await createResume({
        user_id: profile.id,
        file_name: oldResume.file_name,
        file_type: oldResume.file_type || 'manual',
        parsed_data: oldResume.parsed_data,
        raw_text: oldResume.raw_text,
        skills: oldResume.skills,
        version: (resume.version || 0) + 1,
        is_current: true,
      });
      setResume(newResume);
      setParsedData(newResume.parsed_data);
      setRawText(newResume.raw_text);
      setAllResumes(await getResumes(profile.id));
    } catch (err) {
      console.error(err);
      alert('Failed to restore version.');
    }
  }

  function handleExportPDF() {
    window.print();
  }

  function handleExportMarkdown() {
    if (!resume) return;
    const name = parsedData.contact?.name || profile?.full_name || 'Resume';
    let md = `# ${name}\n`;
    if (parsedData.contact?.email) md += `Email: ${parsedData.contact.email} | `;
    if (parsedData.contact?.phone) md += `Phone: ${parsedData.contact.phone} | `;
    if (parsedData.contact?.location) md += `Location: ${parsedData.contact.location}`;
    md += `\n\n`;

    if (parsedData.summary) {
      md += `## Professional Summary\n${parsedData.summary}\n\n`;
    }

    if (parsedData.skills && parsedData.skills.length > 0) {
      md += `## Skills\n${parsedData.skills.join(', ')}\n\n`;
    }

    if (parsedData.experience && parsedData.experience.length > 0) {
      md += `## Work Experience\n`;
      parsedData.experience.forEach((exp) => {
        md += `### ${exp.title} - ${exp.company}\n`;
        md += `*${exp.start_date || ''} - ${exp.end_date || 'Present'}*\n`;
        if (exp.description) md += `${exp.description}\n`;
        md += `\n`;
      });
    }

    if (parsedData.education && parsedData.education.length > 0) {
      md += `## Education\n`;
      parsedData.education.forEach((edu) => {
        md += `### ${edu.degree} in ${edu.field}\n`;
        md += `*${edu.institution} (${edu.start_date || ''} - ${edu.end_date || ''})*\n\n`;
      });
    }

    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${name.toLowerCase().replace(/\s+/g, '_')}_resume.md`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  if (loading) return <div className="flex justify-center py-20"><Spinner size={32} /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">My Resume</h1>
          <p className="text-slate-500">Upload, optimize, and export your professional resume</p>
        </div>
        {resume && (
          <div className="flex items-center gap-2">
            <button onClick={handleExportMarkdown} className="btn-secondary flex items-center gap-2 text-xs">
              <Download className="h-4 w-4" />
              Download (.MD)
            </button>
            <button onClick={handleExportPDF} className="btn-primary flex items-center gap-2 text-xs">
              <Download className="h-4 w-4" />
              Export to PDF
            </button>
          </div>
        )}
      </div>

      {!resume ? (
        <div className="card p-6">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Upload */}
            <div>
              <h3 className="text-base font-semibold text-slate-900">Upload Resume</h3>
              <p className="mt-1 text-sm text-slate-500">PDF or DOCX file (max 5MB)</p>
              <label className="mt-4 flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 p-8 transition-colors hover:border-primary-400 hover:bg-primary-50">
                {uploading ? (
                  <Spinner size={32} />
                ) : (
                  <>
                    <Upload className="h-10 w-10 text-slate-400" />
                    <span className="mt-2 text-sm font-medium text-slate-600">Click to upload</span>
                    <span className="text-xs text-slate-400">PDF or DOCX</span>
                  </>
                )}
                <input type="file" accept=".pdf,.docx,.txt" onChange={handleFileUpload} className="hidden" />
              </label>
            </div>

            {/* Manual entry */}
            <div>
              <h3 className="text-base font-semibold text-slate-900">Paste Resume Text</h3>
              <p className="mt-1 text-sm text-slate-500">Or manually paste your resume content</p>
              <textarea
                value={manualText}
                onChange={(e) => setManualText(e.target.value)}
                placeholder="Paste your full resume text here..."
                className="input mt-4 h-32 resize-none"
              />
              <button onClick={handleManualSubmit} disabled={uploading || !manualText.trim()} className="btn-primary mt-3 w-full">
                {uploading ? <Spinner size={16} /> : <FileText className="h-4 w-4" />}
                Parse & Save
              </button>
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* Resume info */}
          <div className="card p-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-success-100">
                  <FileText className="h-5 w-5 text-success-600" />
                </div>
                <div>
                  <div className="font-semibold text-slate-900">{resume.file_name}</div>
                  <div className="text-sm text-slate-500">Version {resume.version} · {resume.skills.length} skills · Uploaded {new Date(resume.created_at).toLocaleDateString()}</div>
                </div>
              </div>
              <button onClick={handleDelete} className="btn-ghost text-danger-600 hover:bg-danger-50">
                <Trash2 className="h-4 w-4" /> Delete
              </button>
            </div>
          </div>

          {/* Version History */}
          {allResumes.length > 1 && (
            <div className="card p-5">
              <button
                onClick={() => setShowHistory(!showHistory)}
                className="flex w-full items-center justify-between"
              >
                <div className="flex items-center gap-2">
                  <History className="h-4 w-4 text-slate-500" />
                  <h3 className="text-sm font-semibold text-slate-700">Version History</h3>
                  <span className="badge bg-slate-100 text-slate-500">{allResumes.length} versions</span>
                </div>
                {showHistory ? <ChevronDown className="h-4 w-4 text-slate-400" /> : <ChevronRight className="h-4 w-4 text-slate-400" />}
              </button>
              {showHistory && (
                <div className="mt-4 space-y-2">
                  {allResumes.map((r) => (
                    <div
                      key={r.id}
                      className={`flex items-center justify-between rounded-lg border p-3 ${r.is_current ? 'border-primary-200 bg-primary-50' : 'border-slate-200 bg-white'}`}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-slate-800">Version {r.version}</span>
                          {r.is_current && <span className="badge bg-primary-100 text-primary-700">Current</span>}
                        </div>
                        <div className="text-xs text-slate-500">
                          {r.file_name} · {r.skills.length} skills · {new Date(r.created_at).toLocaleDateString()}
                        </div>
                      </div>
                      {!r.is_current && (
                        <button
                          onClick={() => handleRestoreVersion(r)}
                          className="btn-ghost text-xs text-primary-600 hover:bg-primary-50"
                        >
                          <RotateCcw className="h-3 w-3" /> Restore
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Parsed data editor */}
          <div className="card p-6">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-slate-900">Parsed Resume Data</h3>
              <button onClick={handleSave} disabled={saving} className="btn-primary">
                {saving ? <Spinner size={16} /> : <Save className="h-4 w-4" />}
                Save Changes
              </button>
            </div>

            <div className="mt-6 space-y-6">
              {/* Contact */}
              <section>
                <h4 className="text-sm font-semibold text-slate-700 mb-3">Contact Information</h4>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="label">Name</label>
                    <input
                      className="input"
                      value={parsedData.contact?.name || ''}
                      onChange={(e) => setParsedData(prev => ({ ...prev, contact: { ...prev.contact, name: e.target.value } }))}
                    />
                  </div>
                  <div>
                    <label className="label">Email</label>
                    <input
                      className="input"
                      value={parsedData.contact?.email || ''}
                      onChange={(e) => setParsedData(prev => ({ ...prev, contact: { ...prev.contact, email: e.target.value } }))}
                    />
                  </div>
                  <div>
                    <label className="label">Phone</label>
                    <input
                      className="input"
                      value={parsedData.contact?.phone || ''}
                      onChange={(e) => setParsedData(prev => ({ ...prev, contact: { ...prev.contact, phone: e.target.value } }))}
                    />
                  </div>
                  <div>
                    <label className="label">Location</label>
                    <input
                      className="input"
                      value={parsedData.contact?.location || ''}
                      onChange={(e) => setParsedData(prev => ({ ...prev, contact: { ...prev.contact, location: e.target.value } }))}
                    />
                  </div>
                </div>
              </section>

              {/* Summary */}
              <section>
                <h4 className="text-sm font-semibold text-slate-700 mb-3">Professional Summary</h4>
                <textarea
                  className="input h-24 resize-none"
                  value={parsedData.summary || ''}
                  onChange={(e) => setParsedData(prev => ({ ...prev, summary: e.target.value }))}
                />
              </section>

              {/* Skills */}
              <section>
                <h4 className="text-sm font-semibold text-slate-700 mb-3">Skills</h4>
                <div className="flex flex-wrap gap-2">
                  {(parsedData.skills || []).map((skill, i) => (
                    <span key={i} className="inline-flex items-center gap-1 rounded-full bg-primary-100 px-3 py-1 text-sm text-primary-700">
                      {skill}
                      <button onClick={() => setParsedData(prev => ({ ...prev, skills: prev.skills?.filter((_, idx) => idx !== i) }))} className="text-primary-400 hover:text-primary-600">
                        &times;
                      </button>
                    </span>
                  ))}
                </div>
                <div className="mt-3 flex gap-2">
                  <input
                    id="new-skill"
                    className="input flex-1"
                    placeholder="Add a skill..."
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        const val = (e.target as HTMLInputElement).value.trim();
                        if (val) {
                          setParsedData(prev => ({ ...prev, skills: [...(prev.skills || []), val] }));
                          (e.target as HTMLInputElement).value = '';
                        }
                      }
                    }}
                  />
                </div>
              </section>

              {/* Experience */}
              <section>
                <h4 className="text-sm font-semibold text-slate-700 mb-3">Work Experience</h4>
                <div className="space-y-3">
                  {(parsedData.experience || []).map((exp, i) => (
                    <div key={i} className="rounded-lg border border-slate-200 p-4">
                      <div className="grid gap-3 sm:grid-cols-2">
                        <input className="input" placeholder="Title" value={exp.title || ''} onChange={(e) => {
                          const next = [...(parsedData.experience || [])];
                          next[i] = { ...exp, title: e.target.value };
                          setParsedData(prev => ({ ...prev, experience: next }));
                        }} />
                        <input className="input" placeholder="Company" value={exp.company || ''} onChange={(e) => {
                          const next = [...(parsedData.experience || [])];
                          next[i] = { ...exp, company: e.target.value };
                          setParsedData(prev => ({ ...prev, experience: next }));
                        }} />
                      </div>
                      <textarea className="input mt-3" placeholder="Description" value={exp.description || ''} onChange={(e) => {
                        const next = [...(parsedData.experience || [])];
                        next[i] = { ...exp, description: e.target.value };
                        setParsedData(prev => ({ ...prev, experience: next }));
                      }} />
                    </div>
                  ))}
                </div>
              </section>

              {/* Education */}
              <section>
                <h4 className="text-sm font-semibold text-slate-700 mb-3">Education</h4>
                <div className="space-y-3">
                  {(parsedData.education || []).map((edu, i) => (
                    <div key={i} className="grid gap-3 rounded-lg border border-slate-200 p-4 sm:grid-cols-2">
                      <input className="input" placeholder="Institution" value={edu.institution || ''} onChange={(e) => {
                        const next = [...(parsedData.education || [])];
                        next[i] = { ...edu, institution: e.target.value };
                        setParsedData(prev => ({ ...prev, education: next }));
                      }} />
                      <input className="input" placeholder="Degree" value={edu.degree || ''} onChange={(e) => {
                        const next = [...(parsedData.education || [])];
                        next[i] = { ...edu, degree: e.target.value };
                        setParsedData(prev => ({ ...prev, education: next }));
                      }} />
                    </div>
                  ))}
                </div>
              </section>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
