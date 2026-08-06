import { api } from '@/lib/api-client';
import type { Resume, JobPosting, Application, MatchScore, SavedJob, RewriteSuggestion, AutoApplyLog, Notification, JobAlert, ExternalJob, ExternalJobSearchResponse, ResumeData } from '@/types';

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

export async function parseResumeText(rawText: string): Promise<{ parsed_data: ResumeData; skills: string[] }> {
  return api.post('/api/v1/resumes/parse', { raw_text: rawText });
}

// ============ JOB POSTINGS ============
export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

function unwrapItems<T>(res: Paginated<T> | T[]): T[] {
  return Array.isArray(res) ? res : res.items;
}

export async function getJobPostings(filters?: { status?: string; employerId?: string; limit?: number; page?: number; pageSize?: number; q?: string }): Promise<JobPosting[]> {
  const params = new URLSearchParams();
  if (filters?.status) params.set('status', filters.status);
  if (filters?.employerId) params.set('employer_id', filters.employerId);
  if (filters?.limit) params.set('limit', String(filters.limit));
  if (filters?.page) params.set('page', String(filters.page));
  if (filters?.pageSize) params.set('page_size', String(filters.pageSize));
  if (filters?.q) params.set('q', filters.q);
  const qs = params.toString();
  const res = await api.get<Paginated<JobPosting> | JobPosting[]>(`/api/v1/jobs${qs ? `?${qs}` : ''}`);
  return unwrapItems(res);
}

export async function getJobPostingsPage(filters?: { status?: string; employerId?: string; page?: number; pageSize?: number; q?: string }): Promise<Paginated<JobPosting>> {
  const params = new URLSearchParams();
  if (filters?.status) params.set('status', filters.status);
  if (filters?.employerId) params.set('employer_id', filters.employerId);
  if (filters?.page) params.set('page', String(filters.page));
  if (filters?.pageSize) params.set('page_size', String(filters.pageSize));
  if (filters?.q) params.set('q', filters.q);
  const qs = params.toString();
  return api.get<Paginated<JobPosting>>(`/api/v1/jobs${qs ? `?${qs}` : ''}`);
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

export async function repostJobPosting(id: string): Promise<JobPosting> {
  return api.post<JobPosting>(`/api/v1/jobs/${id}/repost`);
}

// ============ APPLICATIONS ============
export async function getApplications(_seekerId: string, page = 1, pageSize = 20): Promise<Application[]> {
  const res = await api.get<Paginated<Application> | Application[]>(`/api/v1/applications?page=${page}&page_size=${pageSize}`);
  return unwrapItems(res);
}

export async function getApplicationsPage(_seekerId: string, page = 1, pageSize = 20): Promise<Paginated<Application>> {
  return api.get<Paginated<Application>>(`/api/v1/applications?page=${page}&page_size=${pageSize}`);
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

export async function getApplicationHistory(id: string): Promise<ApplicationStatusHistory[]> {
  return api.get<ApplicationStatusHistory[]>(`/api/v1/applications/${id}/history`);
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

export async function getGapExplanation(data: { resume_id?: string; job_posting_id?: string; job_description?: string; job_requirements?: string[] }): Promise<{ explanation: string }> {
  return api.post<{ explanation: string }>('/api/v1/matching/gap-explanation', data);
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

// ============ EXTERNAL JOBS ============
export async function searchExternalJobs(q: string, location: string, limit = 20): Promise<ExternalJobSearchResponse> {
  const params = new URLSearchParams({ q });
  if (location) params.set('location', location);
  params.set('limit', String(limit));
  return api.get<ExternalJobSearchResponse>(`/api/v1/external-jobs/search?${params.toString()}`);
}

export async function saveExternalJob(jobId: string): Promise<{ detail: string; saved: boolean; job_posting_id: string }> {
  return api.post(`/api/v1/external-jobs/${jobId}/save`);
}

export async function applyExternalJob(jobId: string): Promise<{ detail: string; job_posting_id: string; log_id: string; external_url: string | null }> {
  return api.post(`/api/v1/external-jobs/${jobId}/apply`);
}

// ============ JOB ALERTS ============
export async function getJobAlerts(): Promise<JobAlert[]> {
  return api.get<JobAlert[]>('/api/v1/job-alerts');
}

export async function createJobAlert(data: { keywords: string[]; category?: string | null; location?: string | null }): Promise<JobAlert> {
  return api.post<JobAlert>('/api/v1/job-alerts', data);
}

export async function updateJobAlert(id: string, updates: Partial<JobAlert>): Promise<JobAlert> {
  return api.put<JobAlert>(`/api/v1/job-alerts/${id}`, updates);
}

export async function deleteJobAlert(id: string): Promise<void> {
  return api.delete(`/api/v1/job-alerts/${id}`);
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

// ============ ANALYTICS ============
export interface AnalyticsSeriesPoint { date: string; count: number }
export interface EmployerAnalytics {
  volume_over_time: AnalyticsSeriesPoint[];
  funnel: Record<string, number>;
  score_distribution: { bucket: string; count: number }[];
  time_to_fill_days: number | null;
  avg_applicants_per_posting: number;
  per_posting: { title: string; count: number; status: string }[];
}
export interface SeekerAnalytics {
  volume_over_time: AnalyticsSeriesPoint[];
  outcomes: Record<string, number>;
}
export interface AdminAnalytics {
  growth: { week: string; users: number; jobs: number; applications: number }[];
}

export function getEmployerAnalytics(days = 30): Promise<EmployerAnalytics> {
  return api.get<EmployerAnalytics>(`/api/v1/analytics/employer?days=${days}`);
}

export function getSeekerAnalytics(days = 30): Promise<SeekerAnalytics> {
  return api.get<SeekerAnalytics>(`/api/v1/analytics/seeker?days=${days}`);
}

export function getAdminAnalytics(weeks = 8): Promise<AdminAnalytics> {
  return api.get(`/api/v1/analytics/admin?weeks=${weeks}`);
}

// ============ ADMIN ============
export interface AdminHealth {
  healthy: boolean;
  checks: {
    database: boolean;
    storage_writable: boolean;
    secret_key_configured: boolean;
    gemini_api_key_configured: boolean;
  };
}

export async function getAdminHealth(): Promise<AdminHealth> {
  return api.get('/api/v1/admin/health');
}

export async function broadcastNotification(title: string, message: string, link?: string): Promise<{ message: string }> {
  const q = new URLSearchParams({ title, message });
  if (link) q.set('link', link);
  return api.post(`/api/v1/admin/notifications/broadcast?${q.toString()}`, {});
}

export async function moderateJob(id: string, moderationStatus: string): Promise<{ message: string }> {
  return api.put(`/api/v1/admin/jobs/${id}/moderation?moderation_status=${encodeURIComponent(moderationStatus)}`, {});
}

// ============ NOTIFICATIONS ============
export async function getNotifications(page = 1, pageSize = 20): Promise<Notification[]> {
  const res = await api.get<Paginated<Notification> | Notification[]>(`/api/v1/notifications?page=${page}&page_size=${pageSize}`);
  return unwrapItems(res);
}

export async function getUnreadNotificationCount(): Promise<number> {
  const r = await api.get<{ count: number }>('/api/v1/notifications/unread-count');
  return r.count;
}

export async function markNotificationRead(id: string): Promise<Notification> {
  return api.post<Notification>(`/api/v1/notifications/${id}/read`);
}

export async function markAllNotificationsRead(): Promise<void> {
  await api.post('/api/v1/notifications/read-all');
}

// ============ AUTH & RECOVERY ============
export async function forgotPassword(email: string): Promise<{ message: string; reset_token: string | null; email_found: boolean }> {
  return api.post<{ message: string; reset_token: string | null; email_found: boolean }>('/api/v1/auth/forgot-password', { email });
}

export async function verifyEmail(token: string): Promise<{ message: string }> {
  return api.post<{ message: string }>('/api/v1/auth/verify-email', { token });
}

export async function resendVerification(email: string): Promise<{ message: string }> {
  return api.post<{ message: string }>('/api/v1/auth/resend-verification', { email });
}

export async function resetPassword(token: string, new_password: string): Promise<{ message: string }> {
  return api.post<{ message: string }>('/api/v1/auth/reset-password', { token, new_password });
}
