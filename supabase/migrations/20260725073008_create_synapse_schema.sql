/*
# Synapse Platform Schema — Initial Migration

## Overview
Creates the complete database schema for Synapse, a bidirectional AI-driven hiring platform
serving both job seekers and employers. Multi-user app with Supabase Auth (email/password),
all tables owner-scoped with RLS policies using auth.uid().

## Tables Created
1. `profiles` — Extends auth.users with role, full_name, company_name
2. `resumes` — Parsed resume data (JSONB), raw text, skills array, versioning
3. `job_postings` — Employer job listings with requirements, salary, location
4. `applications` — Seeker applications with status tracking
5. `match_scores` — Bidirectional scores (40% keyword + 60% semantic) with gap reports
6. `chat_sessions` — Chat sessions scoped to user + role context
7. `chat_messages` — Messages within chat sessions
8. `saved_jobs` — Seeker bookmarks

## Security
- RLS enabled on ALL tables, owner-scoped CRUD via auth.uid()
- Job_postings: employer CRUD own; any authenticated user reads active postings
- Applications: seeker sees own; employer sees applications to their postings
- Match_scores: owner of resume OR owner of job posting can read/insert
*/

-- 1. PROFILES
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  full_name text NOT NULL,
  role text NOT NULL DEFAULT 'seeker' CHECK (role IN ('seeker','employer','both')),
  company_name text,
  avatar_url text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_own_profile" ON profiles;
CREATE POLICY "select_own_profile" ON profiles FOR SELECT TO authenticated USING (auth.uid() = id);
DROP POLICY IF EXISTS "insert_own_profile" ON profiles;
CREATE POLICY "insert_own_profile" ON profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
DROP POLICY IF EXISTS "update_own_profile" ON profiles;
CREATE POLICY "update_own_profile" ON profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- 2. RESUMES
CREATE TABLE IF NOT EXISTS resumes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  file_name text NOT NULL,
  file_type text CHECK (file_type IN ('pdf','docx','txt','manual')),
  parsed_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  raw_text text NOT NULL DEFAULT '',
  skills text[] NOT NULL DEFAULT '{}',
  version integer NOT NULL DEFAULT 1,
  is_current boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_resumes_user_id ON resumes(user_id);
CREATE INDEX IF NOT EXISTS idx_resumes_is_current ON resumes(is_current);
CREATE INDEX IF NOT EXISTS idx_resumes_skills_gin ON resumes USING gin (skills);
ALTER TABLE resumes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_own_resumes" ON resumes;
CREATE POLICY "select_own_resumes" ON resumes FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_resumes" ON resumes;
CREATE POLICY "insert_own_resumes" ON resumes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_resumes" ON resumes;
CREATE POLICY "update_own_resumes" ON resumes FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_resumes" ON resumes;
CREATE POLICY "delete_own_resumes" ON resumes FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- 3. JOB_POSTINGS
CREATE TABLE IF NOT EXISTS job_postings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employer_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text NOT NULL,
  requirements text[] NOT NULL DEFAULT '{}',
  responsibilities text[] NOT NULL DEFAULT '{}',
  location text,
  is_remote boolean NOT NULL DEFAULT false,
  salary_min integer,
  salary_max integer,
  salary_currency text NOT NULL DEFAULT 'USD',
  job_type text CHECK (job_type IN ('full_time','part_time','contract','internship')),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('draft','active','closed')),
  external_source text,
  external_id text,
  external_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  closed_at timestamptz
);
CREATE INDEX IF NOT EXISTS idx_job_postings_employer_id ON job_postings(employer_id);
CREATE INDEX IF NOT EXISTS idx_job_postings_status ON job_postings(status);
CREATE INDEX IF NOT EXISTS idx_job_postings_job_type ON job_postings(job_type);
CREATE INDEX IF NOT EXISTS idx_job_postings_location ON job_postings(location);
CREATE INDEX IF NOT EXISTS idx_job_postings_created_at ON job_postings(created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS idx_job_postings_external_unique ON job_postings(external_source, external_id) WHERE external_source IS NOT NULL;
ALTER TABLE job_postings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_job_postings" ON job_postings;
CREATE POLICY "select_job_postings" ON job_postings FOR SELECT TO authenticated USING (employer_id = auth.uid() OR status = 'active');
DROP POLICY IF EXISTS "insert_job_postings" ON job_postings;
CREATE POLICY "insert_job_postings" ON job_postings FOR INSERT TO authenticated WITH CHECK (auth.uid() = employer_id);
DROP POLICY IF EXISTS "update_job_postings" ON job_postings;
CREATE POLICY "update_job_postings" ON job_postings FOR UPDATE TO authenticated USING (auth.uid() = employer_id) WITH CHECK (auth.uid() = employer_id);
DROP POLICY IF EXISTS "delete_job_postings" ON job_postings;
CREATE POLICY "delete_job_postings" ON job_postings FOR DELETE TO authenticated USING (auth.uid() = employer_id);

-- 4. APPLICATIONS
CREATE TABLE IF NOT EXISTS applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seeker_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  job_posting_id uuid NOT NULL REFERENCES job_postings(id) ON DELETE CASCADE,
  resume_id uuid REFERENCES resumes(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'applied' CHECK (status IN ('applied','shortlisted','rejected','hired')),
  match_score numeric(5,2),
  applied_via text NOT NULL DEFAULT 'platform' CHECK (applied_via IN ('auto_apply','manual_redirect','platform')),
  employer_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_applications_seeker_id ON applications(seeker_id);
CREATE INDEX IF NOT EXISTS idx_applications_job_posting_id ON applications(job_posting_id);
CREATE INDEX IF NOT EXISTS idx_applications_status ON applications(status);
CREATE UNIQUE INDEX IF NOT EXISTS idx_applications_unique ON applications(seeker_id, job_posting_id);
ALTER TABLE applications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_applications" ON applications;
CREATE POLICY "select_applications" ON applications FOR SELECT TO authenticated USING (
  seeker_id = auth.uid() OR EXISTS (SELECT 1 FROM job_postings WHERE job_postings.id = applications.job_posting_id AND job_postings.employer_id = auth.uid())
);
DROP POLICY IF EXISTS "insert_applications" ON applications;
CREATE POLICY "insert_applications" ON applications FOR INSERT TO authenticated WITH CHECK (auth.uid() = seeker_id);
DROP POLICY IF EXISTS "update_applications" ON applications;
CREATE POLICY "update_applications" ON applications FOR UPDATE TO authenticated
  USING (seeker_id = auth.uid() OR EXISTS (SELECT 1 FROM job_postings WHERE job_postings.id = applications.job_posting_id AND job_postings.employer_id = auth.uid()))
  WITH CHECK (seeker_id = auth.uid() OR EXISTS (SELECT 1 FROM job_postings WHERE job_postings.id = applications.job_posting_id AND job_postings.employer_id = auth.uid()));
DROP POLICY IF EXISTS "delete_applications" ON applications;
CREATE POLICY "delete_applications" ON applications FOR DELETE TO authenticated USING (auth.uid() = seeker_id);

-- 5. MATCH_SCORES
CREATE TABLE IF NOT EXISTS match_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  resume_id uuid NOT NULL REFERENCES resumes(id) ON DELETE CASCADE,
  job_posting_id uuid NOT NULL REFERENCES job_postings(id) ON DELETE CASCADE,
  direction text NOT NULL CHECK (direction IN ('seeker','employer')),
  overall_score numeric(5,2) NOT NULL CHECK (overall_score >= 0 AND overall_score <= 100),
  keyword_score numeric(5,2) NOT NULL CHECK (keyword_score >= 0 AND keyword_score <= 100),
  semantic_score numeric(5,2) NOT NULL CHECK (semantic_score >= 0 AND semantic_score <= 100),
  gap_report jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_match_scores_resume_id ON match_scores(resume_id);
CREATE INDEX IF NOT EXISTS idx_match_scores_job_posting_id ON match_scores(job_posting_id);
CREATE INDEX IF NOT EXISTS idx_match_scores_direction ON match_scores(direction);
CREATE INDEX IF NOT EXISTS idx_match_scores_overall_score ON match_scores(overall_score DESC);
CREATE UNIQUE INDEX IF NOT EXISTS idx_match_scores_unique ON match_scores(resume_id, job_posting_id, direction);
ALTER TABLE match_scores ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_match_scores" ON match_scores;
CREATE POLICY "select_match_scores" ON match_scores FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM resumes WHERE resumes.id = match_scores.resume_id AND resumes.user_id = auth.uid())
  OR EXISTS (SELECT 1 FROM job_postings WHERE job_postings.id = match_scores.job_posting_id AND job_postings.employer_id = auth.uid())
);
DROP POLICY IF EXISTS "insert_match_scores" ON match_scores;
CREATE POLICY "insert_match_scores" ON match_scores FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM resumes WHERE resumes.id = match_scores.resume_id AND resumes.user_id = auth.uid())
  OR EXISTS (SELECT 1 FROM job_postings WHERE job_postings.id = match_scores.job_posting_id AND job_postings.employer_id = auth.uid())
);
DROP POLICY IF EXISTS "update_match_scores" ON match_scores;
CREATE POLICY "update_match_scores" ON match_scores FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM resumes WHERE resumes.id = match_scores.resume_id AND resumes.user_id = auth.uid()) OR EXISTS (SELECT 1 FROM job_postings WHERE job_postings.id = match_scores.job_posting_id AND job_postings.employer_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM resumes WHERE resumes.id = match_scores.resume_id AND resumes.user_id = auth.uid()) OR EXISTS (SELECT 1 FROM job_postings WHERE job_postings.id = match_scores.job_posting_id AND job_postings.employer_id = auth.uid()));

-- 6. CHAT_SESSIONS
CREATE TABLE IF NOT EXISTS chat_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  role_context text NOT NULL CHECK (role_context IN ('seeker','employer')),
  module_context text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_user_id ON chat_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_created_at ON chat_sessions(created_at DESC);
ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_own_chat_sessions" ON chat_sessions;
CREATE POLICY "select_own_chat_sessions" ON chat_sessions FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_chat_sessions" ON chat_sessions;
CREATE POLICY "insert_own_chat_sessions" ON chat_sessions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_chat_sessions" ON chat_sessions;
CREATE POLICY "update_own_chat_sessions" ON chat_sessions FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_chat_sessions" ON chat_sessions;
CREATE POLICY "delete_own_chat_sessions" ON chat_sessions FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- 7. CHAT_MESSAGES
CREATE TABLE IF NOT EXISTS chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('user','assistant','system')),
  content text NOT NULL,
  module_routed text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_chat_messages_session_id ON chat_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON chat_messages(created_at);
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_own_chat_messages" ON chat_messages;
CREATE POLICY "select_own_chat_messages" ON chat_messages FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM chat_sessions WHERE chat_sessions.id = chat_messages.session_id AND chat_sessions.user_id = auth.uid())
);
DROP POLICY IF EXISTS "insert_own_chat_messages" ON chat_messages;
CREATE POLICY "insert_own_chat_messages" ON chat_messages FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM chat_sessions WHERE chat_sessions.id = chat_messages.session_id AND chat_sessions.user_id = auth.uid())
);
DROP POLICY IF EXISTS "delete_own_chat_messages" ON chat_messages;
CREATE POLICY "delete_own_chat_messages" ON chat_messages FOR DELETE TO authenticated USING (
  EXISTS (SELECT 1 FROM chat_sessions WHERE chat_sessions.id = chat_messages.session_id AND chat_sessions.user_id = auth.uid())
);

-- 8. SAVED_JOBS
CREATE TABLE IF NOT EXISTS saved_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seeker_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  job_posting_id uuid NOT NULL REFERENCES job_postings(id) ON DELETE CASCADE,
  match_score_at_save numeric(5,2),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_saved_jobs_seeker_id ON saved_jobs(seeker_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_saved_jobs_unique ON saved_jobs(seeker_id, job_posting_id);
ALTER TABLE saved_jobs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_own_saved_jobs" ON saved_jobs;
CREATE POLICY "select_own_saved_jobs" ON saved_jobs FOR SELECT TO authenticated USING (auth.uid() = seeker_id);
DROP POLICY IF EXISTS "insert_own_saved_jobs" ON saved_jobs;
CREATE POLICY "insert_own_saved_jobs" ON saved_jobs FOR INSERT TO authenticated WITH CHECK (auth.uid() = seeker_id);
DROP POLICY IF EXISTS "delete_own_saved_jobs" ON saved_jobs;
CREATE POLICY "delete_own_saved_jobs" ON saved_jobs FOR DELETE TO authenticated USING (auth.uid() = seeker_id);

-- Helper: updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column() RETURNS trigger AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS trg_profiles_updated_at ON profiles;
CREATE TRIGGER trg_profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS trg_resumes_updated_at ON resumes;
CREATE TRIGGER trg_resumes_updated_at BEFORE UPDATE ON resumes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS trg_job_postings_updated_at ON job_postings;
CREATE TRIGGER trg_job_postings_updated_at BEFORE UPDATE ON job_postings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS trg_applications_updated_at ON applications;
CREATE TRIGGER trg_applications_updated_at BEFORE UPDATE ON applications FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS trg_match_scores_updated_at ON match_scores;
CREATE TRIGGER trg_match_scores_updated_at BEFORE UPDATE ON match_scores FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS trg_chat_sessions_updated_at ON chat_sessions;
CREATE TRIGGER trg_chat_sessions_updated_at BEFORE UPDATE ON chat_sessions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();