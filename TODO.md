# Synapse — Complete Build Plan

> AI-Driven Resume Optimization, Job Matching & Bidirectional Hiring Platform
> Goal: when every item below is checked, the app is 100% production-complete.
> Last updated: 2026-08-05

---

## 🔑 SESSION NOTES (read first)

### Runbook
- Backend start (MUST set PYTHONPATH): `cd C:\Personal\Synapse\backend` → `$env:PYTHONPATH="C:\Personal\Synapse\backend"; python -m uvicorn app.main:app --host 127.0.0.1 --port 8000`. Plain `uvicorn backend.app.main:app` from repo root FAILS. Kill old port-8000 listener before restart or new routes 404/405. Boot ~6s.
- Frontend dev: `npm run dev` → `http://localhost:5173`. Backend: `http://localhost:8000`.
- Build check: `npm run build` (vite, ~6s) then `npx tsc --noEmit` (must be clean).
- Backend log capture: `Start-Process -RedirectStandardError "C:\Users\Sanjay\AppData\Local\Temp\opencode\uvicorn_err.log"`.

### Demo accounts (all password `Demo1234!`)
- `seeker@synapse.demo`, `employer@synapse.demo`, `admin@synapse.demo`
- localStorage keys: `synapse_token`, `synapse_user`, `synapse_active_role`, `synapse_theme`, `synapse_remember_email`.
- PowerShell login helper: `Invoke-RestMethod -Uri "$base/auth/login" -ContentType "application/json" -Body '{"email":"seeker@synapse.demo","password":"Demo1234!"}'`. Python f-string escaping inside `powershell python -c` fails — write a temp `.py` file instead.

### Codebase gotchas
- `GlassmorphicCard` is a NAMED export — `import { GlassmorphicCard }`.
- Theme hook: `src/lib/theme.ts` (`Theme = 'dark' | 'light'`, key `synapse_theme`, default dark, `data-theme` on `<html>`).
- Massively palette via CSS vars: dark bg `#1e252d` / surface `#212931` / white text / muted `#8f979c`; light bg `#fff` / ink `#212931` / borders `#dcdcdc`; accent `#18bfef`. Fonts: Playfair Display (headings) + Karla (body) — defined in `src/index.css` + `tailwind.config.js`.
- Backend `_notify` shared source: `backend/app/routers/applications.py` (imported lazily inside functions elsewhere). It creates `Notification` + flush + WS push via `send_to_user` (ws.py silent if no connection).
- Auto-apply endpoints return `_to_response()` (was raw ORM → `MissingGreenlet` 500). `AutoApplyLogResponse.job_posting` is `Optional[dict]`.
- Job schemas in `backend/app/schemas/job.py` (`JobPostingCreate/Update/Response`, incl. `external_url`).
- Email: `send_*_email` fns in `backend/app/services/email.py`; prints to stdout when `SMTP_HOST` unset (dev fallback). `POST /auth/resend-verification` exists; register emails the link too. Status-change emails fire on auto-screen + manual override.
- Auto-screen: computed on submit (falls back to on-the-fly `compute_match` if no `MatchScore`). Audit trail: `ApplicationStatusHistory` table (reasons: submitted/auto_screen/manual) + `GET /applications/{id}/history`. New table needs `python -m app.migrate` (Alembic rev `286188382dec`).
- External jobs (item 5, rev `3e5f1a7c9b2d`): `ExternalJob` table dedups by `(external_source, external_id)`. `app/services/external_jobs.py` fetches Adzuna+JSearch (skipped when API keys unset); DB is the cache — search returns `stale=true` + cached rows when providers fail. Search endpoint commits after serializing (service does NOT commit — rows stay un-expired for `model_validate`). Save/apply materialize into `JobPosting` under a system employer profile `external-jobs@synapse.local` (password_hash `!`), then reuse `SavedJob`/`AutoApplyLog` (apply = pending queue, worker in item 1). Frontend: `searchExternalJobs/saveExternalJob/applyExternalJob` in `src/lib/api.ts`; JobFeedPage replaced the Supabase edge fn.
- `.env` holds real secrets (API keys) — never commit. `README` + API reference still unwritten (Docs section).

### How to run tomorrow
```
opencode   # in C:\Personal\Synapse
→ "Complete the phases in TODO.md in order"
```
This file is self-contained; start with PHASE 1.

---

## ✅ DONE — Core Platform (working end-to-end)

### Auth & Accounts
- [x] Register (seeker/employer), login, JWT, RBAC, role switching
- [x] Email verification flow + verify-email endpoint
- [x] Forgot / reset password
- [x] Password change endpoint (`POST /auth/change-password`)
- [x] Demo accounts + seed data

### Resume
- [x] Upload (PDF/DOCX/TXT), regex parser, Gemini AI parser
- [x] Version history (`version`, `is_current`), restore version
- [x] Manual paste + drag-drop dropzone
- [x] CRUD + current-resume selection

### Matching & Rewrites
- [x] Match score: 40% keyword + 60% semantic
- [x] Ranked opportunities (seeker) + ranked candidates (employer)
- [x] Gap-report JSON (matched/missing skills, strengths, concerns)
- [x] AI gap explanation (Gemini)
- [x] AI rewrite suggestions + accept/reject/edit flow

### Jobs & Applications
- [x] Job CRUD + auto-screening threshold fields
- [x] Application submit / status tracking / auto-screen on submit
- [x] Saved jobs / bookmarks

### Communications
- [x] Chat assistant (role/module routing, WS)
- [x] Job alerts CRUD + match-on-post notification hook
- [x] Notifications CRUD + WebSocket + badge
- [x] Notification hooks: application received, status changed, auto-screened, auto-apply done, high match, new job alert

### Admin & Analytics
- [x] Admin panel: users table (search/filter/suspend), jobs, activity, stats
- [x] Employer analytics dashboard (stat cards + status distribution)
- [x] Seed/demo accounts

### UI / Theming
- [x] Massively palette (dark #1e252d / light #fff / accent #18bfef)
- [x] Fonts: Playfair Display (headings) + Karla (body)
- [x] Light/dark toggle persisted
- [x] Landing rebuilt on Massively photos, flat editorial layout
- [x] GlassmorphicCard / ChatAssistant / NotificationBell / ErrorBoundary
- [x] Homepage links on auth pages
- [x] Password strength meter + terms checkbox (register)
- [x] Remember-me (login, persists email)
- [x] 404 page
- [x] Verify Email page (`/verify-email?token=`)
- [x] Toast system (`ToastContext`, replaces alert())
- [x] Topbar search (seeker) → `/app/jobs?q=`

### Backend fixes
- [x] `POST /resumes/parse` AI paste-parser endpoint
- [x] Auto-apply `MissingGreenlet` 500 fix (`_to_response` + `selectinload`)
- [x] `external_url` on `JobPostingUpdate` (was dropped silently)

---

## PHASE 1 — Finish Missing Features (HIGH)

### 1. Real Auto-Apply
- [x] Playwright/Puppeteer headless worker that fills external job forms
- [x] Replace `setTimeout` + `Math.random()` in `AutoApplyButton.tsx`
- [x] `auto_apply.py` runs real worker, stores result/screenshot, retries
- [x] Auto-apply queue + per-user concurrency cap

### 2. Job Alert Delivery Scheduler
- [x] Background worker (APScheduler) polling for new jobs
- [x] Match new jobs against active alerts
- [x] Email delivery via real SMTP (not just in-app notification)
- [x] Digest (daily/weekly) option per alert
- [x] Scheduler lifecycle: start/stop with app, no duplicate workers

### 3. Auto-Screening Processing (complete)
- [x] Confirm backend processes every new application against thresholds (on-the-fly score compute when no MatchScore exists)
- [x] Employer-side screening summary view per job (ApplicantsPage: counts by status + avg match)
- [x] Seeker notification on auto-approve/reject (in-app `_notify` + status email — verified end-to-end)
- [x] Manual override of auto-screened status keeps audit trail (`ApplicationStatusHistory` table + timeline in candidate drawer + migration)

### 4. Email Service (real, replace demo)
- [x] SMTP config in `.env` (host/user/pass/from)
- [x] Template emails: verify, reset, job alert, application status
- [x] Email verification RESEND endpoint (`POST /auth/resend-verification`) — wired to Register page; register now emails the link too
- [x] Unsubscribe link in alert emails (template param; scheduler passes `/app/job-alerts`)

### 5. External Job Search Persistence
- [x] `ExternalJobs` table (dedup by external_source+external_id; migration `3e5f1a7c9b2d`)
- [x] Adzuna (`ADZUNA_APP_ID/KEY`) + JSearch (`JSEARCH_API_KEY`) fetchers (`app/services/external_jobs.py`)
- [x] Store/aggregate listings; fallback cache when APIs down (`stale` flag in search response)
- [x] External job → save/apply flow via `external_url` (materialize → JobPosting → SavedJob/AutoApplyLog)
- [x] Backend rate limiting (15/60 on search) + DB-as-cache
- [ ] (deferred) external-job alert emails + AI form mapping — ships with items 1/2

---

## PHASE 2 — Settings, Account & Security (MEDIUM)

### 6. Settings — Profile
- [ ] Avatar upload (backend file storage + endpoint, frontend crop/upload)
- [ ] Bio / headline fields
- [ ] Phone, location, linkedin, website fields

### 7. Settings — Security
- [x] Password change FORM in Settings UI (backend endpoint exists)
- [ ] Email change (new email → re-verify before switch)
- [ ] Active sessions list + revoke-session (session tokens table)
- [ ] Delete-account danger zone (confirm modal, soft-delete + admin flag)

### 8. Settings — Appearance & Data
- [ ] Theme toggle in Settings (exists — link to persisted value)
- [ ] Language/locale select
- [ ] Export my data (resume + applications JSON)
- [ ] Notification preferences (which events email vs in-app)

---

## PHASE 3 — Analytics, Charts & Insights (MEDIUM)

### 9. Charts (recharts or similar)
- [ ] Employer: applicant volume over time (line/area)
- [ ] Employer: match-score distribution (histogram)
- [ ] Employer: funnel applied → shortlisted → hired
- [ ] Employer: time-to-fill + avg applicants per posting
- [ ] Seeker: application outcomes over time
- [ ] Admin: platform growth (users/jobs/applications per week)

### 10. Analytics backend endpoints
- [ ] Aggregated stats endpoints (volume, distribution, funnel)
- [ ] Date-range filters
- [ ] Export CSV/PDF of analytics

---

## PHASE 4 — Component Library Gaps (MEDIUM)

### 11. Shared inputs (build into `src/components/ui/`)
- [ ] Multi-select / tag input (with Enter-to-add)
- [ ] Accordion (collapsible sections)
- [ ] Tooltip
- [ ] Breadcrumb
- [ ] Date picker
- [ ] Toggle switch (generic — JobAlerts has inline one)
- [ ] Select/dropdown (accessible, styled)
- [ ] Radio group
- [ ] Slider (auto-screening thresholds)
- [ ] File upload component (reuse ResumePage dropzone pattern)
- [ ] Tabs (admin panel has inline tabs — extract reusable)
- [ ] Avatar component

### 12. Feedback & states
- [ ] Skeleton loading cards (dashboards, feed, lists)
- [ ] Progress bar for uploads (exists — wire into ResumePage upload)
- [ ] Error boundary retry button (exists in ErrorBoundary — add retry)
- [ ] 500 error page
- [ ] Toast variants: info + custom duration (exists — extend)
- [ ] Confirm-action modal variant (exists as Modal — add confirm/danger style)
- [ ] Form modal variant

### 13. Application detail
- [ ] Application detail drawer/modal (job info + status timeline + actions)
- [ ] Status timeline visual (applied → screened → shortlisted → hired)

---

## PHASE 5 — UX / Product Polish (MEDIUM)

### 14. Pagination / Infinite scroll
- [ ] Backend: `page`/`page_size` on jobs, applications, admin lists, notifications
- [ ] Frontend: infinite scroll on job feed; pagination on tables

### 15. Job feed upgrades
- [x] Sort dropdown (score, date, salary)
- [x] Location filter + salary filter UI (salary exists hidden)
- [ ] Remote toggle (exists as filter)
- [x] Job detail view/modal
- [ ] Employer topbar search

### 16. Resume PDF export
- [ ] html2pdf.js/jsPDF generation (replace `window.print()`)
- [ ] Choose version to export + template styling
- [ ] `.md` export (exists — polish)

### 17. Onboarding
- [ ] First-login onboarding (upload resume / post first job CTA)
- [ ] Empty states everywhere (icon + heading + CTA — exists, standardize)
- [ ] Guided tour tooltips

---

## PHASE 6 — Admin & Employer Hardening (MEDIUM)

### 18. Admin panel
- [ ] Job moderation table (approve/reject/flag)
- [ ] User suspend/delete (exists partially — complete)
- [ ] Activity log with filters
- [ ] Announcement/broadcast notification to all users
- [ ] System health view (API keys configured, worker status)

### 19. Employer tools
- [ ] Posting status toggle active/closed (exists — verify)
- [ ] Duplicate/repost posting
- [ ] Team member invites (employer org)
- [ ] Interview scheduling link per candidate
- [ ] Export applicants CSV (exists — verify)

---

## PHASE 7 — Search & Parser Quality (MEDIUM)

### 20. Job search backend
- [ ] Full-text search endpoint (title/description/category/location)
- [ ] Search across on-platform + external jobs
- [ ] Saved searches + save filters

### 21. Resume parser quality
- [ ] Frontend manual paste → backend `/resumes/parse` (exists) — wire in
- [ ] LinkedIn profile URL import/parse
- [ ] Parser test corpus (fixtures + golden outputs)
- [ ] Skills normalization (synonyms, aliases)

---

## PHASE 8 — Hardening & Production Readiness (MEDIUM/HIGH)

### 22. Backend hardening
- [ ] Rate limiting across all endpoints (exists on auth — extend)
- [ ] Input validation + payload size caps
- [ ] CORS restrict to production domain
- [ ] SECRET_KEY / JWT env-driven, no defaults
- [ ] HTTPS-only + secure cookie option
- [ ] Structured logging + request IDs
- [ ] Error responses sanitized (no stack traces)
- [ ] SQLAlchemy: query N+1 audit, indexes on hot columns

### 23. Background workers & infra
- [ ] Worker runner for scheduler + auto-apply (separate process)
- [ ] Job queue with retries + dead-letter
- [ ] Graceful shutdown

### 24. Database & storage
- [x] Migration tool (Alembic) replacing ad-hoc `migrate.py`
- [ ] Backups + restore procedure
- [ ] Avatar/file storage directory (local, then S3-compatible)

### 25. Deployment
- [x] Dockerfile(s) for frontend + backend (worker pending)
- [x] docker-compose (app + db; worker service pending)
- [x] CI/CD pipeline (lint, typecheck, py_compile, pytest)
- [x] Environment config template (`.env.example`)
- [ ] Production build of frontend served by backend/CDN

---

## PHASE 9 — Testing & QA (MEDIUM/HIGH)

### 26. Backend tests (pytest)
- [ ] Auth: register/login/verify/reset/change-password/roles (partial: register/login, forgot-password, resend)
- [ ] Resumes: upload/parse/version
- [ ] Matching: score math + gap report (partial: match score)
- [ ] Applications: submit, duplicate, auto-screen, status (partial: auto-screen shortlist, on-the-fly score compute, manual-override audit trail)
- [ ] External jobs: search/dedup/cache-fallback, save/apply materialization (partial: 5 tests)
- [ ] Notifications + job alerts + scheduler logic
- [ ] Admin endpoints + permissions
- [x] CI runs them (12 tests, see above)

### 27. Frontend tests (vitest)
- [ ] resume-parser unit tests
- [ ] matching / gap-summary unit tests
- [ ] Component tests: modal, toast, badge, ring, password strength
- [ ] Routing/redirect tests (protected routes, 404)

### 28. E2E (Playwright)
- [ ] Full seeker journey: register → upload → match → rewrite → apply
- [ ] Full employer journey: post job → view applicants → shortlist/hire
- [ ] Admin journey: moderate, suspend
- [ ] Light/dark theme, mobile viewport pass

### 29. Manual QA checklist
- [ ] All forms validate + show errors
- [ ] All empty/loading/error states
- [ ] Keyboard navigation + focus states (a11y)
- [ ] Contrast + font sizes (a11y)

---

## PHASE 10 — Post-MVP Features (LOW)

- [ ] LinkedIn profile parsing (deeper: positions, education, endorsements)
- [ ] Interview scheduling integration (calendar links)
- [ ] Salary negotiation assistant
- [ ] Mobile app (React Native / PWA offline)
- [ ] Advanced search filters + facets
- [ ] Embedding caching for sentence-transformers
- [ ] Social login (Google/LinkedIn OAuth)
- [ ] Referral / invite program
- [ ] Employer branding (company page)
- [ ] Multi-language UI
- [ ] Real-time collaboration (employer notes shared)
- [ ] Notification email digests
- [ ] Performance budget (bundle size, Lighthouse)

---

## ✅ DOCUMENTATION

- [x] `Synapse_Implementation_Documentation.docx` regenerated — 13 tables, real API list
- [x] `Synapse_Report.docx` regenerated — v3.0, Gemini, SQLite/PostgreSQL note
- [x] README with setup, env vars, demo accounts (updated v2.4.0: Alembic, SMTP, scheduler, toasts, new features)
- [ ] API reference (auto-generated from FastAPI)
- [ ] Deploy runbook

## Reference Templates
- `C:\Users\Sanjay\Downloads\html5up-massively` — landing + theme reference
- `C:\Users\Sanjay\Downloads\synapse-web-complete\synapse-web\client\src\` — dark cyberpunk theme reference
