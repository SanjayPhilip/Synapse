# SYNAPSE — Implementation-Aligned Project Documentation

Reconciled against the current codebase (backend routers, models, services, and frontend)
**Team No. 05** — Sanjay Philip · Akshay K R · Devika S

---

## 0. Reconciliation Summary

This document is written directly against the current codebase, not the README alone. Every requirement, story, and schema entry below is tagged as **Implemented** (backed by a router, table, or service) or **Planned** (roadmap item with no code backing yet).

| Area | Original Proposal | Current Implementation |
| :--- | :--- | :--- |
| Resume Parsing | Claude API (LLM) structures resume text into JSON | Regex pattern parser first, then Google Gemini AI parse as enhancement; AI result used only if it returns valid contact data (`resumes.py`, `resume_parser.py`, `gemini.py`) |
| Resume Rewriting | Grounded, evidence-based rewrite suggestions | **Implemented** — `rewrites.py` + `RewriteSuggestion` table, Gemini `generate_rewrite_suggestions` (no-fabrication prompt) |
| Match Scoring | Keyword + semantic, weighting unspecified | **Implemented** — 40% keyword (Jaccard) + 60% semantic (`all-MiniLM-L6-v2` cosine), `services/matching.py` |
| Auto-Apply | Per-listing opt-in via Playwright automation | **Implemented as a logged workflow** — `AutoApplyLog` table + `auto_apply.py`. No real headless browser: backend marks success when `external_url` exists; frontend simulates the browser step (`AutoApplyButton.tsx`). Real Playwright = Planned |
| External Jobs | Aggregated, deduplicated, ranked into the feed | **Implemented as live search** — `external_jobs.py` queries Adzuna + JSearch and dedups in-memory. Persisted aggregation storage = Planned |
| Gap Report | Separate, structured entity linked to a match score | **Implemented** as JSON column on `MatchScores`, filled by `matching.py` (`missing_skills`, `matched_skills`, `keyword_mismatches`, `strengths`) |
| Admin Module | (not in original proposal) | **Implemented** — `admin.py` (stats, users, jobs, activity) |
| Chat Assistant | Context-aware assistant | **Implemented** — `chat.py` sessions/messages, Gemini `chat_with_assistant`, keyword-based module routing |
| Password Reset | (v2.2.1 feature) | **Implemented** — `POST /auth/forgot-password` issues a 30-minute JWT reset link; `POST /auth/reset-password` consumes it. Link surfaces in UI (demo mode, no SMTP) |
| Saved Jobs | (not in original proposal) | **Implemented** — `saved_jobs.py` + `SavedJob` table |
| LLM provider | Claude API (Anthropic) | **Google Gemini API** (`config.py`: `GEMINI_API_KEY`) |

---

## 1. Requirement Collection

### 1.1 Implemented Functional Requirements

| ID | Requirement | Status |
| :--- | :--- | :--- |
| FR-01 | User can register a new account (`POST /api/v1/auth/register`). | Implemented |
| FR-02 | User can log in and receive a JWT (`POST /api/v1/auth/login`). | Implemented |
| FR-03 | User can fetch their own profile (`GET /api/v1/auth/me`). | Implemented |
| FR-04 | User can update their own profile (`PUT /api/v1/auth/me`). | Implemented |
| FR-05 | User can reset their password via a link emailed to them (token: `POST /api/v1/auth/forgot-password` + `POST /api/v1/auth/reset-password`). | Implemented |
| FR-06 | Seeker can upload a resume (PDF/DOCX/TXT, max 5MB) (`POST /api/v1/resumes/upload`). | Implemented |
| FR-07 | System parses resume text: regex pattern parse + Gemini AI enhancement. | Implemented |
| FR-08 | Seeker can list, view, update, delete their resumes and fetch the current one. | Implemented |
| FR-09 | Seeker can create a manual resume (`POST /api/v1/resumes`). | Implemented |
| FR-10 | Employer can create, list, view, update, delete job postings (`jobs.py`). | Implemented |
| FR-11 | Jobs support domain categories, remote flag, salary, auto-screening thresholds. | Implemented |
| FR-12 | System computes a Match Score (40% Jaccard keyword + 60% semantic cosine, all-MiniLM-L6-v2). | Implemented |
| FR-13 | Match results are persisted/refreshed in `MatchScores` (`POST /matching/match-resume/{rid}/{jid}`). | Implemented |
| FR-14 | Ad-hoc match computation (`POST /matching/compute`). | Implemented |
| FR-15 | Employer can retrieve ranked candidates per job (`GET /matching/job/{jid}/candidates`). | Implemented |
| FR-16 | Seeker can retrieve ranked job opportunities (`GET /matching/user/opportunities`). | Implemented |
| FR-17 | Seeker can submit an application; auto-screening sets status (shortlisted/rejected/applied) by thresholds. | Implemented |
| FR-18 | Seeker can list their applications; employer can list a job's applications. | Implemented |
| FR-19 | Application status can be updated by seeker or job owner. | Implemented |
| FR-20 | Seeker can save/unsave jobs (`saved_jobs.py`). | Implemented |
| FR-21 | Gemini generates grounded rewrite suggestions (`rewrites.py` `/generate`). | Implemented |
| FR-22 | Seeker can review, accept/reject/edit rewrite suggestions (`PUT /rewrites/{id}`). | Implemented |
| FR-23 | Chat sessions and message history per user (`chat.py`). | Implemented |
| FR-24 | Chat replies generated by Gemini with role context + module routing. | Implemented |
| FR-25 | External job search across Adzuna + JSearch with in-memory dedup (`external_jobs.py`). | Implemented |
| FR-26 | Auto-apply log lifecycle per job/resume (`auto_apply.py`). | Implemented |
| FR-27 | Admin can view platform stats (`admin.py` `/stats`). | Implemented |
| FR-28 | Admin can list users, toggle active status, delete users. | Implemented |
| FR-29 | Admin can list and delete job postings, view recent activity. | Implemented |

### 1.2 Planned / Not Yet Implemented

| ID | Requirement | Status |
| :--- | :--- | :--- |
| FR-30 | Real headless-browser auto-apply (Playwright + Celery worker). | Planned |
| FR-31 | Persisted, deduplicated external job aggregation storage. | Planned |
| FR-32 | Real-time WebSocket notifications. | Planned |
| FR-33 | Interview scheduling. | Planned |
| FR-34 | Mobile app (React Native). | Planned |

### 1.3 Non-Functional Requirements

| ID | Category | Requirement | Status |
| :--- | :--- | :--- | :--- |
| NFR-01 | Security | JWT (HS256) auth, bcrypt hashing, role checks (`require_role` on admin). | Implemented |
| NFR-02 | Security | SQLAlchemy ORM prevents SQL injection; Pydantic validates requests. | Implemented |
| NFR-03 | Security | CORS restricted to configured origins (5173/5174/3000). | Implemented |
| NFR-04 | Security | Upload size/type validation (5MB cap, PDF/DOCX/TXT). | Implemented |
| NFR-05 | Config | Environment-driven config (`config.py`): DB, secret, token expiry, API keys. | Implemented |
| NFR-06 | Performance | Embedding model loaded once and cached in-process (`get_model`). | Implemented |
| NFR-07 | Performance | DB indexes on `user_id` / `job_posting_id` / `resume_id` / `status` / `category`. | Implemented |
| NFR-08 | Testability | Automated test suite (pytest backend, vitest frontend). | **Not present** |
| NFR-09 | Deployment | Docker Compose / Dockerfile. | **Not present** |
| NFR-10 | Deployment | Frontend Vercel (`vercel.json` present); backend+DB on Railway (README-documented). | Partial |

---

## 2. User Stories

### 2.1 Seeker Stories

| ID | User Story | Status |
| :--- | :--- | :--- |
| US-01 | As a seeker, I want to register and log in so that I have a secure account. | Implemented |
| US-02 | As a seeker, I want to upload my resume so that the system parses it into structured data. | Implemented |
| US-03 | As a seeker, I want a Match Score and gap report against a job so that I know how strong my fit is. | Implemented |
| US-04 | As a seeker, I want AI-suggested, grounded resume rewrites so I can improve weak sections without fabricating experience. | Implemented |
| US-05 | As a seeker, I want a ranked list of job opportunities so I can prioritize where to apply. | Implemented |
| US-06 | As a seeker, I want to save jobs I like so I can return to them later. | Implemented |
| US-07 | As a seeker, I want to submit an application so employers can review me. | Implemented |
| US-08 | As a seeker, I want to opt in to auto-apply on an external listing and track its outcome. | Implemented (simulated) |
| US-09 | As a seeker, I want to see my application statuses and history so I can track my search. | Implemented |
| US-10 | As a seeker, I want to ask the AI chat assistant about my score or resume so I get help in place. | Implemented |

### 2.2 Employer Stories

| ID | User Story | Status |
| :--- | :--- | :--- |
| US-11 | As an employer, I want to create, edit, and close job postings so my openings stay current. | Implemented |
| US-12 | As an employer, I want applicants ranked by true match fit so I focus on the strongest first. | Implemented |
| US-13 | As an employer, I want automatic shortlist/reject by configurable thresholds to handle high volume. | Implemented |
| US-14 | As an employer, I want to query the AI chat assistant about my applicant pool conversationally. | Implemented |

### 2.3 Admin Stories

| ID | User Story | Status |
| :--- | :--- | :--- |
| US-15 | As an admin, I want platform statistics so I can monitor system health. | Implemented |
| US-16 | As an admin, I want to manage users and jobs and audit recent activity. | Implemented |

### 2.4 Shared Stories

| ID | User Story | Status |
| :--- | :--- | :--- |
| US-17 | As a user, I want role-based access enforced across the API so I only see relevant actions. | Implemented |
| US-18 | As a seeker, I want external job listings persisted and deduplicated so I don't see the same job twice. | Planned |

---

## 3. Module Identification & Team Ownership

Backend files and frontend areas, mapped to the current routers/services.

### 3.1 Backend Modules (FastAPI) — `app/`

| File | Responsibility | Owner |
| :--- | :--- | :--- |
| `auth.py` | Registration, login, JWT issuance, profile update, password reset. | Devika S |
| `resumes.py` | Resume upload, parse orchestration, CRUD, versioning, current flag. | Devika S |
| `resume_parser.py` | Regex pattern parser (contact, skills, experience, education). | Devika S |
| `jobs.py` | Job posting CRUD with category/screening fields. | Akshay K R |
| `external_jobs.py` | Adzuna + JSearch live search with in-memory dedup. | Akshay K R |
| `applications.py` | Application submission, auto-screening status, tracking, updates. | Akshay K R |
| `auto_apply.py` | Auto-apply log lifecycle (success only when `external_url` present). | Akshay K R |
| `saved_jobs.py` | Save / unsave / list saved jobs. | Akshay K R |
| `matching.py` | Match computation, ranked candidates & opportunities. | Sanjay Philip |
| `gemini.py` | Gemini: AI parse, rewrite suggestions, gap explanations, chat. | Sanjay Philip |
| `rewrites.py` | Rewrite suggestion list/generate/update (accept/reject/edit). | Sanjay Philip |
| `chat.py` | Chat sessions, message history, Gemini reply + module routing. | Sanjay Philip |
| `admin.py` | Admin stats, user/job management, recent activity (`require_role`). | Devika S |

### 3.2 Frontend Areas (React + Vite) — `src/`

| Area | Responsibility | Owner |
| :--- | :--- | :--- |
| Seeker Portal | Resume upload, job feed + domain filters, match score, applications, saved jobs, auto-apply UI. | Devika S / Akshay K R |
| Employer Dashboard | Job posting management, auto-screening controls, applicant ranking. | Akshay K R |
| Admin Dashboard | Stats, user management, job oversight, activity. | Devika S |
| Chat Assistant UI | Persistent context-aware widget for all roles. | Sanjay Philip |
| Scoring & Rewrites | `lib/matching.ts` (in-browser TF-vector scoring), RewriteSuggestions, projected-score. | Sanjay Philip |

### 3.3 Ownership Summary

| Team Member | Owns | Currently Missing From Their Area |
| :--- | :--- | :--- |
| Sanjay Philip | `matching.py`, `gemini.py`, `rewrites.py`, `chat.py`, scoring lib | Nothing critical; rewrite UX polish |
| Akshay K R | `jobs.py`, `external_jobs.py`, `applications.py`, `auto_apply.py`, `saved_jobs.py`, Employer UI | Real headless auto-apply (FR-30), job persistence (FR-31) |
| Devika S | `auth.py`, `resumes.py`, `resume_parser.py`, `admin.py`, schema/seed | Test suite (NFR-08), container build (NFR-09) |

---

## 4. Database Schema (as implemented)

SQLAlchemy models in `app/models/__init__.py` — **10 tables**, gap report stored inline as JSON.

| Table | Key Columns | Notes |
| :--- | :--- | :--- |
| `profiles` | id, email, full_name, role, company_name, avatar_url, password_hash, is_active | single table for all roles (seeker/employer/admin) |
| `resumes` | id, user_id FK, file_name, file_type, parsed_data JSON, raw_text, skills JSON, version, is_current | versioned; one current per user |
| `job_postings` | id, employer_id FK, title, description, requirements JSON, responsibilities JSON, category, auto_screening_enabled, auto_approve_threshold (85), auto_reject_threshold (50), status, external_source/id/url | screening thresholds per job |
| `applications` | id, seeker_id FK, job_posting_id FK, resume_id FK, status, match_score, applied_via (platform/auto_apply/manual_redirect), employer_notes | |
| `match_scores` | id, resume_id FK, job_posting_id FK, direction, overall_score, keyword_score, semantic_score, gap_report JSON | |
| `chat_sessions` | id, user_id FK, role_context, module_context | |
| `chat_messages` | id, session_id FK, role, content, module_routed | |
| `saved_jobs` | id, seeker_id FK, job_posting_id FK, match_score_at_save | |
| `rewrite_suggestions` | id, resume_id FK, job_posting_id FK, section_type, original_text, suggested_text, reasoning, status (pending/accepted/rejected/edited), user_edited_text, resolved_at | |
| `auto_apply_logs` | id, seeker_id FK, job_posting_id FK, resume_id FK, status, attempt_count, error_message, screenshot_url, submitted_at | |

---

## 5. API Reference

All endpoints require a Bearer token (`Authorization: Bearer <jwt>`) except register, login, forgot-password, reset-password.

### 5.1 Authentication — `/api/v1/auth`

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| POST | `/register` | Register; returns `{access_token, user}` |
| POST | `/login` | Login; returns `{access_token, user}` |
| POST | `/forgot-password` | Email a 30-minute reset link (demo mode: returns token, no SMTP) |
| POST | `/reset-password` | Set new password using a valid reset token |
| GET | `/me` | Get current profile |
| PUT | `/me` | Update profile (full_name, company_name, avatar_url, role...) |

### 5.2 Resumes — `/api/v1/resumes`

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| GET | `` | List my resumes |
| GET | `/current` | Get current resume |
| GET | `/{id}` | Get resume detail |
| POST | `/upload` | Upload file (PDF/DOCX/TXT ≤5MB); pattern + AI parse |
| POST | `` | Create manual resume |
| PUT | `/{id}` | Update resume |
| DELETE | `/{id}` | Delete resume |

### 5.3 Jobs — `/api/v1/jobs`

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| GET | `` | List jobs (filters: status, category, employer_id, limit≤100) |
| GET | `/{id}` | Get job detail |
| POST | `` | Create job posting |
| PUT | `/{id}` | Update job (owner only) |
| DELETE | `/{id}` | Delete job (owner only) |

### 5.4 Matching — `/api/v1/matching`

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| POST | `/match-resume/{rid}/{jid}` | Compute/refresh match score for resume vs job |
| POST | `/compute` | Ad-hoc match from resume/job text or ids |
| GET | `/job/{jid}/candidates` | Ranked candidates for a job (owner only, 403 otherwise) |
| GET | `/user/opportunities` | Ranked active jobs for current user's current resume |

### 5.5 Applications — `/api/v1/applications`

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| GET | `` | My applications (with job_posting) |
| GET | `/job/{jid}` | Applications for a job (owner only) |
| POST | `` | Apply; auto-screening sets shortlisted/rejected/applied by thresholds |
| PUT | `/{id}` | Update status (seeker or job owner) |

### 5.6 Saved Jobs — `/api/v1/saved-jobs`

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| GET | `` | List saved jobs (with job_posting) |
| POST | `` | Save a job (idempotent) |
| DELETE | `/{job_id}` | Unsave |

### 5.7 Rewrites — `/api/v1/rewrites`

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| GET | `/{rid}/{jid}` | List suggestions for resume+job |
| POST | `/generate/{rid}/{jid}` | Generate 2-4 grounded suggestions via Gemini |
| PUT | `/{id}` | Update suggestion / set status (accepted/rejected/edited) |

### 5.8 Auto-Apply — `/api/v1/auto-apply`

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| GET | `` | List my auto-apply logs |
| GET | `/{seeker_id}/{job_id}` | Get log for a job |
| POST | `` | Create log; sets success if job has external_url else failed |
| PUT | `/{log_id}` | Update log (status, error, submitted_at, screenshot) |

### 5.9 External Jobs — `/api/v1/external-jobs`

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| GET | `/search?query=&location=&page=` | Search Adzuna + JSearch, dedup by title+company in memory |

### 5.10 Chat — `/api/v1/chat`

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| GET | `/sessions` | List my sessions |
| POST | `/sessions` | Create session (role_context, module_context) |
| GET | `/sessions/{id}/messages` | List session messages |
| POST | `/sessions/{id}/messages` | Send message; Gemini reply stored with module_routed |

### 5.11 Admin — `/api/v1/admin` (requires role=admin)

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| GET | `/stats` | Platform counters + average match score |
| GET | `/users` | List all users |
| PUT | `/users/{id}/status?is_active=` | Toggle user active status |
| DELETE | `/users/{id}` | Delete user (not self) |
| GET | `/jobs` | List all jobs with employer + application counts |
| DELETE | `/jobs/{id}` | Delete any job |
| GET | `/activity` | Recent 15 applications with seeker/job/status/score |

---

## 6. Scoring Algorithm (as implemented)

`backend/app/services/matching.py` — identical math mirrored for in-browser scoring in `src/lib/matching.ts` (frontend substitutes TF-vector cosine for the semantic term when no backend is available).

```
keyword_score = jaccard(resume_tokens, job_tokens) × 100      # Jaccard over stop-word-filtered token sets
semantic_score = cosine(embed(resume_text), embed(job_full)) × 100   # all-MiniLM-L6-v2 sentence embeddings
overall = keyword_score × 0.40 + semantic_score × 0.60
gap_report = { missing_skills, matched_skills, experience_gaps: [], keyword_mismatches (top 15), strengths: matched_skills }
```

**Application auto-screening** (`applications.py`): on apply, reads existing `MatchScore`; score ≥ `auto_approve_threshold` → `"shortlisted"`; score < `auto_reject_threshold` → `"rejected"`; else stays `"applied"`.

---

## 7. UI Sketches

The app is fully built and browsable at `http://localhost:5173` (see root README). Screenshots for the write-up are to be captured from the running app:

1. **7.1** Seeker — Resume upload → Match Score + gap report → Rewrite suggestions panel.
2. **7.2** Seeker — Job feed with domain filter pills, saved jobs, auto-apply modal.
3. **7.3** Employer — Posting form with auto-screening thresholds; ranked applicant list.
4. **7.4** Admin — Stats dashboard, user/job management, activity log.
5. **7.5** Chat — Floating assistant widget in seeker and employer contexts.
