export type UserRole = 'seeker' | 'employer' | 'both' | 'admin';

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  company_name: string | null;
  avatar_url: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ResumeData {
  contact?: {
    name?: string;
    email?: string;
    phone?: string;
    location?: string;
    linkedin?: string;
    website?: string;
  };
  summary?: string;
  skills?: string[];
  experience?: Array<{
    company?: string;
    title?: string;
    start_date?: string;
    end_date?: string;
    description?: string;
  }>;
  education?: Array<{
    institution?: string;
    degree?: string;
    field?: string;
    start_date?: string;
    end_date?: string;
  }>;
  certifications?: string[];
}

export interface Resume {
  id: string;
  user_id: string;
  file_name: string;
  file_type: string | null;
  parsed_data: ResumeData;
  raw_text: string;
  skills: string[];
  version: number;
  is_current: boolean;
  created_at: string;
  updated_at: string;
}

export interface JobPosting {
  id: string;
  employer_id: string;
  title: string;
  description: string;
  requirements: string[];
  responsibilities: string[];
  location: string | null;
  is_remote: boolean;
  salary_min: number | null;
  salary_max: number | null;
  salary_currency: string;
  job_type: string | null;
  category?: string;
  status: string;
  external_source: string | null;
  external_id: string | null;
  external_url: string | null;
  created_at: string;
  updated_at: string;
  closed_at: string | null;
}

export type ApplicationStatus = 'applied' | 'shortlisted' | 'rejected' | 'hired';
export type AppliedVia = 'auto_apply' | 'manual_redirect' | 'platform';

export interface Application {
  id: string;
  seeker_id: string;
  job_posting_id: string;
  resume_id: string | null;
  status: ApplicationStatus;
  match_score: number | null;
  applied_via: AppliedVia;
  employer_notes?: string | null;
  created_at: string;
  updated_at: string;
  job_posting?: JobPosting;
}

export interface GapReport {
  missing_skills: string[];
  matched_skills: string[];
  experience_gaps: string[];
  keyword_mismatches: string[];
  strengths: string[];
}

export interface MatchScore {
  id: string;
  resume_id: string;
  job_posting_id: string;
  direction: 'seeker' | 'employer';
  overall_score: number;
  keyword_score: number;
  semantic_score: number;
  gap_report: GapReport;
  created_at: string;
  updated_at: string;
}

export interface ChatSession {
  id: string;
  user_id: string;
  role_context: 'seeker' | 'employer';
  module_context: string | null;
  created_at: string;
  updated_at: string;
}

export interface ChatMessage {
  id: string;
  session_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  module_routed: string | null;
  created_at: string;
}

export interface SavedJob {
  id: string;
  seeker_id: string;
  job_posting_id: string;
  match_score_at_save: number | null;
  created_at: string;
  job_posting?: JobPosting;
}

export type RewriteSectionType = 'summary' | 'experience' | 'skills' | 'education';
export type RewriteStatus = 'pending' | 'accepted' | 'rejected' | 'edited';

export interface RewriteSuggestion {
  id: string;
  resume_id: string;
  job_posting_id: string;
  section_type: RewriteSectionType;
  original_text: string;
  suggested_text: string;
  reasoning: string;
  status: RewriteStatus;
  user_edited_text: string | null;
  created_at: string;
  resolved_at: string | null;
}

export type AutoApplyStatus = 'pending' | 'in_progress' | 'success' | 'failed' | 'cancelled';

export interface AutoApplyLog {
  id: string;
  seeker_id: string;
  job_posting_id: string;
  resume_id: string | null;
  status: AutoApplyStatus;
  attempt_count: number;
  error_message: string | null;
  screenshot_url: string | null;
  submitted_at: string | null;
  created_at: string;
  updated_at: string;
}
