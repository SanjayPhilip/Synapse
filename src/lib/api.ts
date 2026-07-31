import { api } from '@/lib/api-client';
import type { Resume, JobPosting, Application, MatchScore, SavedJob, RewriteSuggestion, AutoApplyLog } from '@/types';

// ============ RESUMES ============
export async function getResumes(_userId: string): Promise<Resume[]> {
  return api.get<Resume[]>('/api/v1/resumes');
}

export async function getCurrentResume(_userId: string): Promise<Resume | null> {
  try {
    return await api.get<Resume>('/api/v1/resumes/current');
  } catch {
    return null;
  }
}

export async function createResume(resume: Omit<Resume, 'id' | 'created_at' | 'updated_at'>): Promise<Resume> {
  return api.post<Resume>('/api/v1/resumes', resume);
}

export async function updateResume(id: string, updates: Partial<Resume>): Promise<Resume> {
  return api.put<Resume>(`/api/v1/resumes/${id}`, updates);
}

export async function deleteResume(id: string): Promise<void> {
  return api.delete(`/api/v1/resumes/${id}`);
}

export async function uploadResume(file: File): Promise<Resume> {
  return api.upload<Resume>('/api/v1/resumes/upload', file);
}

// ============ JOB POSTINGS ============
export async function getJobPostings(filters?: { status?: string; employerId?: string; limit?: number }): Promise<JobPosting[]> {
  const params = new URLSearchParams();
  if (filters?.status) params.set('status', filters.status);
  if (filters?.employerId) params.set('employer_id', filters.employerId);
  if (filters?.limit) params.set('limit', String(filters.limit));
  const qs = params.toString();
  return api.get<JobPosting[]>(`/api/v1/jobs${qs ? `?${qs}` : ''}`);
}

export async function getJobPosting(id: string): Promise<JobPosting | null> {
  try {
    return await api.get<JobPosting>(`/api/v1/jobs/${id}`);
  } catch {
    return null;
  }
}

export async function createJobPosting(job: Omit<JobPosting, 'id' | 'created_at' | 'updated_at' | 'closed_at'>): Promise<JobPosting> {
  return api.post<JobPosting>('/api/v1/jobs', job);
}

export async function updateJobPosting(id: string, updates: Partial<JobPosting>): Promise<JobPosting> {
  return api.put<JobPosting>(`/api/v1/jobs/${id}`, updates);
}

export async function deleteJobPosting(id: string): Promise<void> {
  return api.delete(`/api/v1/jobs/${id}`);
}

// ============ APPLICATIONS ============
export async function getApplications(_seekerId: string): Promise<Application[]> {
  return api.get<Application[]>('/api/v1/applications');
}

export async function getApplicationsForJob(jobPostingId: string): Promise<Application[]> {
  return api.get<Application[]>(`/api/v1/applications/job/${jobPostingId}`);
}

export async function createApplication(app: Omit<Application, 'id' | 'created_at' | 'updated_at'>): Promise<Application> {
  return api.post<Application>('/api/v1/applications', {
    job_posting_id: app.job_posting_id,
    resume_id: app.resume_id,
    applied_via: app.applied_via,
  });
}

export async function updateApplication(id: string, updates: Partial<Application>): Promise<Application> {
  return api.put<Application>(`/api/v1/applications/${id}`, updates);
}

// ============ MATCH SCORES ============
export async function getMatchScore(resumeId: string, jobPostingId: string, _direction: string): Promise<MatchScore | null> {
  try {
    return await api.post<MatchScore>(`/api/v1/matching/match-resume/${resumeId}/${jobPostingId}`);
  } catch {
    return null;
  }
}

export async function saveMatchScore(score: Omit<MatchScore, 'id' | 'created_at' | 'updated_at'>): Promise<MatchScore> {
  return api.post<MatchScore>(`/api/v1/matching/match-resume/${score.resume_id}/${score.job_posting_id}`);
}

export async function computeMatchScore(data: { resume_id?: string; job_description?: string; job_requirements?: string[]; job_posting_id?: string; direction?: string }): Promise<MatchScore> {
  return api.post<MatchScore>('/api/v1/matching/compute', data);
}

// ============ SAVED JOBS ============
export async function getSavedJobs(_seekerId: string): Promise<SavedJob[]> {
  return api.get<SavedJob[]>('/api/v1/saved-jobs');
}

export async function saveJob(seekerId: string, jobPostingId: string, matchScore: number | null): Promise<void> {
  await api.post('/api/v1/saved-jobs', {
    job_posting_id: jobPostingId,
    match_score_at_save: matchScore,
  });
}

export async function unsaveJob(seekerId: string, jobPostingId: string): Promise<void> {
  await api.delete(`/api/v1/saved-jobs/${jobPostingId}`);
}

// ============ REWRITE SUGGESTIONS ============
export async function getRewriteSuggestions(resumeId: string, jobPostingId: string): Promise<RewriteSuggestion[]> {
  return api.get<RewriteSuggestion[]>(`/api/v1/rewrites/${resumeId}/${jobPostingId}`);
}

export async function generateRewriteSuggestions(resumeId: string, jobPostingId: string): Promise<RewriteSuggestion[]> {
  return api.post<RewriteSuggestion[]>(`/api/v1/rewrites/generate/${resumeId}/${jobPostingId}`);
}

export const createRewriteSuggestions = generateRewriteSuggestions;

export async function updateRewriteSuggestion(id: string, updates: Partial<RewriteSuggestion>): Promise<RewriteSuggestion> {
  return api.put<RewriteSuggestion>(`/api/v1/rewrites/${id}`, updates);
}

// ============ AUTO-APPLY LOGS ============
export async function getAutoApplyLogs(_seekerId: string): Promise<AutoApplyLog[]> {
  return api.get<AutoApplyLog[]>('/api/v1/auto-apply');
}

export async function createAutoApplyLog(log: Omit<AutoApplyLog, 'id' | 'created_at' | 'updated_at'>): Promise<AutoApplyLog> {
  return api.post<AutoApplyLog>('/api/v1/auto-apply', {
    job_posting_id: log.job_posting_id,
    resume_id: log.resume_id,
  });
}

export async function updateAutoApplyLog(id: string, updates: Partial<AutoApplyLog>): Promise<AutoApplyLog> {
  return api.put<AutoApplyLog>(`/api/v1/auto-apply/${id}`, updates);
}

export async function getAutoApplyLog(seekerId: string, jobPostingId: string): Promise<AutoApplyLog | null> {
  try {
    return await api.get<AutoApplyLog>(`/api/v1/auto-apply/${seekerId}/${jobPostingId}`);
  } catch {
    return null;
  }
}

// ============ CHAT ============
export async function createChatSession(roleContext: string): Promise<{ id: string }> {
  return api.post<{ id: string }>('/api/v1/chat/sessions', { role_context: roleContext });
}

export async function getChatSessions(): Promise<{ id: string; role_context: string }[]> {
  return api.get('/api/v1/chat/sessions');
}

export async function sendChatMessage(sessionId: string, content: string): Promise<{ content: string; module_routed: string | null }> {
  return api.post(`/api/v1/chat/sessions/${sessionId}/messages`, { content });
}

export async function getChatMessages(sessionId: string): Promise<{ role: string; content: string; module_routed: string | null }[]> {
  return api.get(`/api/v1/chat/sessions/${sessionId}/messages`);
}

// ============ EXTERNAL JOBS ============
export async function searchExternalJobs(query: string, location?: string): Promise<any[]> {
  const params = new URLSearchParams({ query });
  if (location) params.set('location', location);
  return api.get(`/api/v1/external-jobs/search?${params.toString()}`);
}
