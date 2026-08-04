# ⚡ SYNAPSE — AI-Driven Resume Optimization, Job Matching & Bidirectional Hiring Platform

**Team No. 05** — *Sanjay Philip · Akshay K R · Devika S*
**Version**: 2.3.1 (Rate Limiting & Email Verification)

---

## 📌 Overview

**SYNAPSE** is a two-sided, machine-learning-driven hiring platform that unifies resume optimization, intelligent job discovery, categorized domain feeds, automated applicant screening, and applicant ranking within a single system.

Unlike conventional job portals that act purely as listing funnels, SYNAPSE is built around **one bidirectional matching engine** that serves both job seekers and employers, with centralized oversight for platform administrators:

- **Job Seekers**: Upload resumes, get structured JSON parsing, receive instant fit scores against job descriptions with itemized gap reports, filter jobs by specialized domain feeds, receive AI-suggested grounded experience rewrites, and manage account credentials with password reset capabilities.
- **Employers**: Post job openings with custom automated screening thresholds, receive automatically ranked candidate shortlists with transparent gap explanations, auto-approve/shortlist top candidates or auto-reject low-fit candidates for high-volume pipelines, and query candidate pools conversationally.
- **Administrators**: Monitor platform metrics, manage users, oversee job postings, and audit system activities.

---

## ✔️ Feature Status

| Status | Meaning |
| :--- | :--- |
| ✔️ **Implemented** | Fully built and demoable end-to-end |
| 🧪 **Demo** | Workflow exists but uses a simulated backend (no external side effects) |
| 🗺️ **Planned** | Roadmap / future enhancement, not yet built |

---

## ✨ Key Features

### 👨‍💻 For Job Seekers
- ✔️ **Categorized Domain Job Feeds** — Interactive domain filter pills (*Software Engineering*, *Business & MBA*, *Data Analytics*, *Data Science & AI*, *Cloud & DevOps*, *Finance & Accounting*, *Marketing & Sales*) to quickly discover listings tailored to specific fields.
- ✔️ **Resume Upload & Parsing** — Support for PDF/DOCX/TXT uploads with automatic extraction into structured JSON (skills, experience, education).
- ✔️ **Match Score & Gap Report** — Calculates fit score using **40% Keyword Match + 60% Dense Semantic Similarity** (`all-MiniLM-L6-v2` embeddings), detailing missing skills and match highlights.
- ✔️ **Grounded Resume Rewrites** — AI-powered experience rewriting suggestions that improve weak bullet points without fabricating experience (Gemini API).
- ✔️ **Context-Aware AI Chat Assistant** — Floating assistant widget that answers questions about job fit, resume recommendations, and application status.
- ✔️ **External Job Search** — Live search across Adzuna + JSearch APIs with cross-source deduplication.
- 🧪 **Opt-In Auto-Apply** — Per-listing workflow that logs and tracks an automated application attempt against external listings. *Note: the current build simulates the headless-browser step client-side; the real automation engine is on the roadmap.*
- ✔️ **Account Recovery & Password Reset** — Forgot-password flow emails a time-limited reset link (30-min JWT token); demo mode surfaces the link in the UI.
- ✔️ **Email Verification on Registration** — New accounts require email verification before login; demo mode returns a `verify_token` in the registration response for immediate verification.
- ✔️ **Rate Limiting** — In-memory rate limiter on auth endpoints (register: 5/60s, login: 10/60s, forgot-password: 3/60s) to mitigate brute-force attacks.

### 🏢 For Employers
- ✔️ **High-Volume Application Auto-Screening**:
  - **Auto-Shortlist / Approve**: Candidates scoring ≥ threshold (e.g. 85%) are automatically moved to `"shortlisted"`.
  - **Auto-Reject**: Candidates scoring < threshold (e.g. 50%) are automatically set to `"rejected"`.
  - **Manual Review**: Borderline candidates remain in `"applied"` for recruiter review.
  - **Custom Threshold Controls**: Toggle screening on/off and configure percentage thresholds per job posting.
- ✔️ **Job Posting Management** — Full CRUD interface for creating, editing, and closing job postings with domain feed categorization.
- ✔️ **Bidirectional Candidate Ranking** — Applicants are automatically ranked per job posting based on true match fit.
- ✔️ **Candidate Pool Conversational Query** — Employers can query the AI chat assistant about their applicant pool to find candidates conversationally.

### 🛡️ For Administrators (Admin Module)
- ✔️ **Centralized Admin Dashboard** — High-level system overview showing total users, jobs, applications, active users, average match rate, and system health.
- ✔️ **User Management** — Inspect and search user accounts, filter by role (Seeker, Employer, Admin), change roles, and oversee account status.
- ✔️ **Job Oversight** — View and manage all job postings across the system, including application counts and status toggles.
- ✔️ **System Activity Logs** — Audit log tracking logins, file uploads, applications, and other system-wide activities.
- ✔️ **Quick-Login Demo Access** — Red-themed custom sidebar and login shortcut to easily switch to the Administrator context.

---

## 🛠️ Technology Stack

| Layer | Technology |
| :--- | :--- |
| **Web Frontend** | React.js (Vite), TypeScript, Tailwind CSS, Lucide Icons |
| **Backend Framework** | FastAPI (Python 3.12), Pydantic v2, Uvicorn |
| **Database & ORM** | PostgreSQL (AsyncPG / SQLAlchemy 2.0) for production · SQLite for local dev |
| **Matching & ML** | `sentence-transformers` (`all-MiniLM-L6-v2`) for dense semantic embeddings + token keyword scoring |
| **AI Services** | Google Gemini API (resume rewrites & AI assistant query routing) |
| **External Job Feeds** | Adzuna API + JSearch (RapidAPI) via Supabase edge function with in-memory deduplication |
| **Auth & Security** | JWT (HS256 tokens) + Role-Based Access Control (Admin, Employer, Seeker) + Password Hashing (Bcrypt) + CORS (supports Vite ports `5173`/`5174`) |

---

## 📂 Project Architecture

```
synapse/
├── backend/
│   ├── app/
│   │   ├── models/          # SQLAlchemy ORM schemas (Users, Resumes, Jobs with Auto-Screening & Domain Feeds)
│   │   ├── routers/         # REST API routes (auth, admin, resumes, jobs, applications, matching, chat, external-jobs, auto-apply)
│   │   ├── services/        # ML matching engine, Gemini AI & resume parsing
│   │   ├── main.py          # FastAPI application entrypoint
│   │   ├── config.py        # Environment settings & CORS config
│   │   ├── init_db.py       # Database schema initialization script
│   │   └── seed.py          # Database seeder script with pre-categorized domain listings
│   └── requirements.txt
├── src/
│   ├── components/          # Reusable UI components, Sidebar/AppShell, AutoApply & Chat Assistant
│   ├── context/             # AuthContext & global state
│   ├── lib/                 # API client & scoring utilities
│   ├── pages/               # Seeker (Job Feed with Domain Filtering), Employer (Posting with Auto-Screening UI) & Admin Dashboard views
│   └── types/               # TypeScript interfaces
├── supabase/
│   └── functions/         # Edge functions (job-search: Adzuna + JSearch aggregation)
├── package.json
└── README.md
```

---

## 🚀 Quick Start & Installation

### Prerequisites
- Node.js (v18+)
- Python (v3.10+)

### 1. Configuration
Before starting the servers, configure the environment variables. Two example files are provided — copy them and fill in your keys:

```bash
# Backend
cp backend/.env.example backend/.env

# Frontend (project root)
cp .env.example .env
```

**Backend** — `backend/.env`:

```env
# SQLite is the zero-config default for local development.
DATABASE_URL=sqlite+aiosqlite:///./synapse.db
DATABASE_URL_SYNC=sqlite:///./synapse.db
# For PostgreSQL, use instead:
# DATABASE_URL=postgresql+asyncpg://user:pass@host:5432/synapse
# DATABASE_URL_SYNC=postgresql+psycopg2://user:pass@host:5432/synapse

SECRET_KEY=your_secret_key_here
GEMINI_API_KEY=your_gemini_api_key_here
```

> 💡 The backend starts without the optional keys — matching, rewrites, and chat need `GEMINI_API_KEY`. External job search runs from the Supabase edge function (`supabase/functions/job-search`) using Adzuna/JSearch secrets configured in Supabase.

**Frontend** — create `.env` in project root:

```env
VITE_API_URL=http://localhost:8000
```

### 2. Backend Setup

```bash
# Navigate to backend folder
cd backend

# Install Python dependencies
pip install -r requirements.txt

# Initialize & Seed Database Schema
python -m app.init_db
python -m app.seed
# Or, from the project root in one step:
npm run setup:db

# Run FastAPI Development Server
python -m uvicorn app.main:app --reload --port 8000
```
- **API Docs (Swagger UI)**: `http://localhost:8000/docs`

### 3. Frontend Setup

In a new terminal window:

```bash
# From project root directory
npm install

# Run Vite Development Server
npm run dev
```
- **Web App**: `http://localhost:5173` (Fallback port: `5174` if `5173` is in use)

---

## 🔐 Pre-Seeded Demo Credentials

To test the application immediately:

| Role | Email | Password | Description |
| :--- | :--- | :--- | :--- |
| **Admin** | `admin@synapse.demo` | `Demo1234!` | View platform statistics, manage users, monitor jobs, and view activity logs. |
| **Employer** | `employer@synapse.demo` | `Demo1234!` | Pre-populated with job postings across domains & auto-screening workflows. |
| **Seeker** | `seeker@synapse.demo` | `Demo1234!` | Test domain job feeds, match scoring, and automatic shortlist/rejection flows. |

---

## 🗺️ Project Roadmap (Planned Enhancements)

The following are **not yet implemented** — see [Feature Status](#-feature-status):

- 🤖 **Headless Playwright Automation** — Replace the simulated auto-apply step with real headless-browser execution for external site application filling (Celery worker + Playwright).
- 🗄️ **External Job Aggregation Storage** — Persist and continuously refresh deduplicated Adzuna / JSearch listings in the database (currently searched live on request).
- 📅 **Interview Scheduler** — Built-in calendar scheduling for short-listed candidates.

---

## ✔️ Everything To Be Done

Current status of all outstanding work, tracked here until done. Legend: `[ ]` = open, `[x]` = done.

### 📱 Functionality

- [x] **In-app notifications** — notification table + bell UI: seeker notified on application status change (auto-shortlist / auto-reject / employer decision); employer notified on new application.
- [x] **Job alerts** — "notify me when a new job matches my resume" (subscribe to a domain feed / saved job; alert on new matching posting).
- [ ] **Background / scheduled matching** — recompute match scores when a job posting or resume changes (currently computed on-demand per request).
- [ ] **Employer ↔ seeker messaging** — the chat assistant is an AI bot; no direct two-way contact between employer and candidate.
- [ ] **Real email delivery (SMTP)** — reset links and future status/job emails currently surface in the UI and server log (demo mode), not via an SMTP provider.
- [x] **Email verification on registration** — new accounts are inactive until email verification; demo mode returns a `verify_token` for immediate verification.
- [ ] **Real auto-apply** — replace the client-side simulation (`AutoApplyButton.tsx`) with a Celery + Playwright worker (FR-30).
- [ ] **Persisted external-job aggregation** — store deduplicated Adzuna / JSearch listings in the database with a scheduled refresh (FR-31).
- [x] **WebSocket live push** — push the in-app notifications above in real time instead of on page load (FR-32).
- [ ] **Interview scheduling** — calendar flow for shortlisted candidates (FR-33).
- [ ] **Mobile app** — React Native companion (FR-34).

### 🔐 Security

- [x] **Enforce a real `SECRET_KEY`** — startup fails if `SECRET_KEY` is still the default (`.env` override required).
- [x] **Rate limiting** — in-memory rate limiter on auth endpoints (register 5/60s, login 10/60s, forgot-password 3/60s).
- [x] **Email verification** — bind account ownership to a verified address (also listed under Functionality).

### 🧪 Testing & Deployment

- [ ] **Test suite (NFR-08)** — pytest harness: auth, reset-token, auto-screening, and match-score smoke tests (runtime smoke test for the reset flow exists but is not committed as a suite).
- [ ] **Docker (NFR-09)** — `Dockerfile` + `docker-compose` for backend, frontend, and Postgres.
- [ ] **CI pipeline** — lint + typecheck + test on push (GitHub Actions).
- [ ] **Prod DB migrations** — schema management for PostgreSQL (currently `init_db` creates tables directly).

### 📄 Docs

- [ ] **Test / deploy instructions** — once the suite and Docker land, add a `Testing` and `Deployment` section here.

---

## 📜 License & Credits

Built with ❤️ by **Team 05** (*Sanjay Philip, Akshay K R, Devika S*) for Department of Computer Applications.
