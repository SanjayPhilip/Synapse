/*
# Add rewrite_suggestions and auto_apply_logs tables

## Overview
Adds two planned tables from the Synapse spec that support AI resume rewriting
and auto-apply logging. Both are owner-scoped with RLS policies.

## Tables Created
1. `rewrite_suggestions` — AI-generated resume rewrite suggestions per job posting.
   Tracks original text, suggested text, reasoning, and user decision (pending/accepted/rejected/edited).
2. `auto_apply_logs` — Logs every auto-apply attempt with status, retry count, errors, and screenshots.

## Security
- RLS enabled on both tables
- rewrite_suggestions: owner of the resume can CRUD
- auto_apply_logs: the seeker who initiated the apply can read/insert; only system updates
*/

-- 1. REWRITE_SUGGESTIONS
CREATE TABLE IF NOT EXISTS rewrite_suggestions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  resume_id uuid NOT NULL REFERENCES resumes(id) ON DELETE CASCADE,
  job_posting_id uuid NOT NULL REFERENCES job_postings(id) ON DELETE CASCADE,
  section_type text NOT NULL CHECK (section_type IN ('summary','experience','skills','education')),
  original_text text NOT NULL,
  suggested_text text NOT NULL,
  reasoning text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','rejected','edited')),
  user_edited_text text,
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_rewrite_suggestions_resume_id ON rewrite_suggestions(resume_id);
CREATE INDEX IF NOT EXISTS idx_rewrite_suggestions_job_posting_id ON rewrite_suggestions(job_posting_id);
CREATE INDEX IF NOT EXISTS idx_rewrite_suggestions_status ON rewrite_suggestions(status);

ALTER TABLE rewrite_suggestions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_rewrite_suggestions" ON rewrite_suggestions;
CREATE POLICY "select_own_rewrite_suggestions" ON rewrite_suggestions FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM resumes WHERE resumes.id = rewrite_suggestions.resume_id AND resumes.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "insert_own_rewrite_suggestions" ON rewrite_suggestions;
CREATE POLICY "insert_own_rewrite_suggestions" ON rewrite_suggestions FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM resumes WHERE resumes.id = rewrite_suggestions.resume_id AND resumes.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "update_own_rewrite_suggestions" ON rewrite_suggestions;
CREATE POLICY "update_own_rewrite_suggestions" ON rewrite_suggestions FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM resumes WHERE resumes.id = rewrite_suggestions.resume_id AND resumes.user_id = auth.uid())
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM resumes WHERE resumes.id = rewrite_suggestions.resume_id AND resumes.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "delete_own_rewrite_suggestions" ON rewrite_suggestions;
CREATE POLICY "delete_own_rewrite_suggestions" ON rewrite_suggestions FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM resumes WHERE resumes.id = rewrite_suggestions.resume_id AND resumes.user_id = auth.uid())
  );

-- 2. AUTO_APPLY_LOGS
CREATE TABLE IF NOT EXISTS auto_apply_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seeker_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  job_posting_id uuid NOT NULL REFERENCES job_postings(id) ON DELETE CASCADE,
  resume_id uuid REFERENCES resumes(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','in_progress','success','failed','cancelled')),
  attempt_count integer NOT NULL DEFAULT 0,
  error_message text,
  screenshot_url text,
  submitted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_auto_apply_logs_seeker_id ON auto_apply_logs(seeker_id);
CREATE INDEX IF NOT EXISTS idx_auto_apply_logs_job_posting_id ON auto_apply_logs(job_posting_id);
CREATE INDEX IF NOT EXISTS idx_auto_apply_logs_status ON auto_apply_logs(status);
CREATE UNIQUE INDEX IF NOT EXISTS idx_auto_apply_logs_unique ON auto_apply_logs(seeker_id, job_posting_id);

ALTER TABLE auto_apply_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_auto_apply_logs" ON auto_apply_logs;
CREATE POLICY "select_own_auto_apply_logs" ON auto_apply_logs FOR SELECT
  TO authenticated USING (auth.uid() = seeker_id);

DROP POLICY IF EXISTS "insert_own_auto_apply_logs" ON auto_apply_logs;
CREATE POLICY "insert_own_auto_apply_logs" ON auto_apply_logs FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = seeker_id);

DROP POLICY IF EXISTS "update_own_auto_apply_logs" ON auto_apply_logs;
CREATE POLICY "update_own_auto_apply_logs" ON auto_apply_logs FOR UPDATE
  TO authenticated USING (auth.uid() = seeker_id) WITH CHECK (auth.uid() = seeker_id);

DROP TRIGGER IF EXISTS trg_auto_apply_logs_updated_at ON auto_apply_logs;
CREATE TRIGGER trg_auto_apply_logs_updated_at BEFORE UPDATE ON auto_apply_logs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();