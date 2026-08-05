# Synapse Backend (FastAPI)

AI-Driven Resume Optimization, Job Matching & Bidirectional Hiring Platform — Backend API.

> **Setup & configuration**: See the [root README](../README.md#-quick-start--installation) — it covers `.env`, SQLite/PostgreSQL options, DB init/seed, and running the server. This file documents the API surface.

## Tech Stack

- **FastAPI** — async Python web framework
- **SQLAlchemy 2.0** — async ORM with PostgreSQL / SQLite
- **sentence-transformers** — real ML embeddings (`all-MiniLM-L6-v2`)
- **Gemini API** — resume parsing, rewrite suggestions, chat assistant
- **JWT + bcrypt** — authentication

## API Endpoints

Base path: `/api/v1`

### Auth

- `POST /auth/register` — Register seeker/employer
- `POST /auth/login` — Login, get JWT
- `POST /auth/change-password` — Change password (authenticated)
- `POST /auth/forgot-password` — Request password reset email
- `POST /auth/reset-password` — Reset password with token
- `POST /auth/resend-verification` — Resend email verification
- `POST /auth/verify-email` — Verify email with token
- `GET /auth/me` — Get current profile
- `PUT /auth/me` — Update profile
- `GET /auth/users/{user_id}` — Get user profile by ID

### Resumes

- `GET /resumes` — List resumes
- `GET /resumes/current` — Get current resume
- `POST /resumes/upload` — Upload file (PDF/DOCX/TXT)
- `POST /resumes` — Create manual resume
- `POST /resumes/parse` — Parse raw resume text into structured JSON
- `PUT /resumes/{id}` — Update resume
- `DELETE /resumes/{id}` — Delete resume

### Jobs

- `GET /jobs` — List job postings
- `POST /jobs` — Create job posting
- `PUT /jobs/{id}` — Update job posting
- `DELETE /jobs/{id}` — Delete job posting

### Applications

- `GET /applications` — My applications
- `POST /applications` — Apply to job
- `GET /applications/{id}` — Get application detail
- `GET /applications/{id}/history` — Get application status history
- `PUT /applications/{id}` — Update application status

### Matching

- `POST /matching/match-resume/{rid}/{jid}` — Score resume vs job
- `POST /matching/compute` — Ad-hoc match computation
- `GET /matching/job/{jid}/candidates` — Ranked candidates
- `GET /matching/user/opportunities` — Ranked opportunities

### Chat

- `GET /chat/sessions` — List sessions
- `POST /chat/sessions` — Create session
- `POST /chat/sessions/{id}/messages` — Send message

### Saved Jobs

- `GET /saved-jobs` — List saved jobs
- `POST /saved-jobs` — Save job
- `DELETE /saved-jobs/{id}` — Unsave job

### Rewrites

- `GET /rewrites` — List rewrite suggestions
- `POST /rewrites` — Create rewrite suggestion
- `PUT /rewrites/{id}` — Update rewrite status

### Auto-Apply

- `GET /auto-apply/logs` — List auto-apply logs
- `POST /auto-apply/apply` — Queue external job application

### Job Alerts

- `GET /job-alerts` — List job alerts
- `POST /job-alerts` — Create job alert
- `PUT /job-alerts/{id}` — Update job alert
- `DELETE /job-alerts/{id}` — Delete job alert

### External Jobs

- `GET /external-jobs/search` — Search external jobs (Adzuna + JSearch)
- `POST /external-jobs/{id}/save` — Save external job
- `POST /external-jobs/{id}/apply` — Apply to external job

### Notifications

- `GET /notifications` — List notifications
- `POST /notifications` — Create notification
- `PUT /notifications/{id}/read` — Mark notification as read
- `DELETE /notifications/{id}` — Delete notification

### Admin

- `GET /admin/stats` — Platform statistics
- `GET /admin/users` — List all users
- `PUT /admin/users/{id}` — Update user (role, status)
- `GET /admin/jobs` — List all jobs
- `GET /admin/activity` — Activity log

### WebSocket

- `WS /ws/notifications` — Real-time notification push

### Health

- `GET /health` — Health check

## Interactive Docs

When the backend is running, visit:

- **Swagger UI**: `http://localhost:8000/docs`
- **ReDoc**: `http://localhost:8000/redoc`

These are auto-generated from the FastAPI route definitions and include request/response schemas.
