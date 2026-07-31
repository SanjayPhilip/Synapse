# SYNAPSE — Complete Project Documentation

**AI-Driven Resume Optimization, Job Matching & Bidirectional Hiring Platform**

**Team No: 05**
- Sanjay Philip — Backend Lead, Frontend Core, DevOps
- Akshay K R — ML/AI Lead
- Devika S — Integration & Automation Lead

**Submitted to:** Ms. Avani S, Department of Computer Applications
**Document Version:** 3.0 (Reconciled — Proposal + Implementation)
**Date:** July 2026

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [System Overview & Vision](#2-system-overview--vision)
3. [Technology Stack](#3-technology-stack)
4. [System Architecture](#4-system-architecture)
5. [Requirements Specification](#5-requirements-specification)
6. [User Stories](#6-user-stories)
7. [Database Schema](#7-database-schema)
8. [API Reference](#8-api-reference)
9. [Module Ownership & Sprint Plan](#9-module-ownership--sprint-plan)
10. [Workflows](#10-workflows)
11. [UI/UX Specifications](#11-uiux-specifications)
12. [Implementation Status & Roadmap](#12-implementation-status--roadmap)
13. [Deployment & DevOps](#13-deployment--devops)
14. [Appendices](#14-appendices)

---

## 1. Executive Summary

Synapse is a two-sided, machine-learning-driven platform that unifies resume optimization, intelligent job discovery, and applicant hiring within a single system. Unlike conventional job portals that operate purely as listing-and-apply funnels, this platform is built around **one bidirectional matching engine** that serves both job seekers and employers — the name reflects its core design principle: a single connecting point across which signal passes in both directions, seeker to employer and employer to seeker, much like a neural synapse.

**Core Value Propositions**

| For Job Seekers | For Employers |
| :--- | :--- |
| Upload resume → structured JSON | Post jobs directly on the platform |
| Match Score + itemized gap report | Receive ranked, explainable applicant shortlists |
| AI-suggested, evidence-grounded resume rewrites (no fabrication) | Custom auto-screening thresholds (shortlist/reject) |
| Ranked job feed + saved jobs | Context-aware AI chat assistant for pool queries |
| External job search (Adzuna/JSearch) | Single scoring core — no separate ATS needed |

**What Makes Synapse Different**

- One shared embedding model (`all-MiniLM-L6-v2`) for both directions (seeker→job and job→applicant), ensuring consistent, auditable scoring
- Transparent diagnostics — every match comes with an explainable gap report, not just a number
- Grounded AI rewriting — suggestions improve weak sections using the candidate's real experience only (explicit no-fabrication prompt)
- Opt-in automation — Auto-Apply is strictly per-listing, never automatic, with full logging
- Admin oversight module — platform stats, user/job management, activity audit

---

## 2. System Overview & Vision

### 2.1 Problem Statement

Traditional job platforms suffer from three disconnects:

- Seekers blast applications without knowing fit, and lack actionable feedback on why they were rejected
- Employers maintain expensive, disconnected ATS systems that don't explain why candidates rank where they do
- Both sides operate in black boxes — there is no transparent diagnostic layer explaining match strength

### 2.2 Solution Approach

Synapse acts as a transparent diagnostic and matching layer that sits alongside established job boards, not as a competitor to them. It makes explicit, on both sides of the hiring process, why a match is strong or weak, and gives each side concrete, actionable ways to close that gap.

### 2.3 Scope

**In Scope (Implemented)**

- Dual-role platform (Seeker + Employer) plus Admin oversight
- Resume parsing (PDF/DOCX/TXT) into structured JSON — regex + Gemini AI enhancement
- Bidirectional match scoring (40% keyword Jaccard + 60% semantic cosine)
- AI-powered rewrite suggestions grounded in real experience (Gemini)
- External job search (Adzuna, JSearch) with in-memory deduplication
- Per-job opt-in Auto-Apply with attempt logging
- Persistent, context-aware AI chat assistant
- Employer applicant ranking, auto-screening thresholds, shortlisting
- Saved jobs, password reset, admin dashboard

**Planned (Roadmap)**

- Headless-browser auto-apply (Playwright + Celery)
- Persisted, deduplicated external job storage
- WebSocket live notifications
- Interview scheduling

---

## 3. Technology Stack

### 3.1 Core Components

| Component | Technology | Purpose |
| :--- | :--- | :--- |
| Web Frontend | React.js (Vite) + TypeScript + Tailwind CSS + Lucide | Single web app serving all roles |
| Backend Framework | FastAPI (Python 3.12), Pydantic v2, Uvicorn | RESTful API, auth, scoring orchestration |
| Database & ORM | PostgreSQL (AsyncPG) / SQLite (dev) + SQLAlchemy 2.0 | Users, resumes, postings, applications |
| Matching Engine | sentence-transformers (`all-MiniLM-L6-v2`) | Dense embeddings + cosine similarity |
| Keyword Scoring | Jaccard similarity over filtered token sets | Transparent lexical match component |
| Generative AI | Google Gemini API (`gemini-2.5-flash` family) | Resume parse enhancement, rewrites, gap explanations, chat |
| Job Aggregation | Adzuna API, JSearch (RapidAPI) | External job search + dedup |
| Auto-Apply | Log-based workflow (frontend-simulated) | Per-listing opt-in, tracked attempts |
| Authentication | JWT (HS256) + RBAC, bcrypt, CORS | Secured API access |
| Deployment | Vercel (frontend, SPA config); Railway (backend+DB, documented) | Production hosting |

### 3.2 Notable Intentional Choices

- **No external UI library** — components are hand-built on Tailwind primitives (`src/components`)
- **Embedding model `all-MiniLM-L6-v2`** chosen for quality/speed tradeoff: runs CPU-only, no GPU needed
- **Frontend fallback scorer** — `src/lib/matching.ts` ships a TF-vector cosine fallback so in-browser scoring still works if the model service is unavailable; the backend is the source of truth

---

## 4. System Architecture

### 4.1 High-Level Design

The platform is built around a single sentence-embedding model that performs relevance scoring in both directions:

- **Seeker Side:** Candidate's resume is the fixed reference; job descriptions are ranked against it
- **Employer Side:** Job posting is the fixed reference; every applicant's resume is ranked against it

Both directions reuse the same scoring logic (40% keyword + 60% semantic embedding similarity) in `backend/app/services/matching.py`.

### 4.2 Module Architecture

> `[Fig 4.1 — three-tier architecture diagram: Frontend (React) → REST API (FastAPI) → Database. Add diagram.]`
>
> `[Fig 4.2 — bidirectional matching flow: resume ↔ embedding model ↔ job description → score + gap report. Add diagram.]`

---

## 5. Requirements Specification

### 5.1 Functional Requirements

**FR-1: User Authentication & Role Management**

| ID | Requirement | Priority | Status |
| :--- | :--- | :--- | :--- |
| FR-1.1 | Multi-role registration (Seeker / Employer) | Must Have | Implemented |
| FR-1.2 | JWT-based authentication, bcrypt hashing | Must Have | Implemented |
| FR-1.3 | RBAC (admin endpoints via `require_role`) | Must Have | Implemented |
| FR-1.4 | Profile management (`GET`/`PUT /auth/me`) | Must Have | Implemented |
| FR-1.5 | Password reset by emailed link (`POST /auth/forgot-password` → 30-min token → `POST /auth/reset-password`) | Must Have | Implemented |

**FR-2: Resume Parsing & Processing**

| ID | Requirement | Priority | Status |
| :--- | :--- | :--- | :--- |
| FR-2.1 | Accept PDF/DOCX/TXT uploads (≤5MB) | Must Have | Implemented |
| FR-2.2 | Regex pattern parse + Gemini AI enhancement | Must Have | Implemented |
| FR-2.3 | Structured parsed data stored as JSON | Must Have | Implemented |
| FR-2.4 | Resume versioning + current flag | Should Have | Implemented |

**FR-3: Matching & Ranking**

| ID | Requirement | Priority | Status |
| :--- | :--- | :--- | :--- |
| FR-3.1 | Match Score (40% keyword + 60% semantic) | Must Have | Implemented |
| FR-3.2 | Itemized gap report with every match | Must Have | Implemented |
| FR-3.3 | Ranked candidates per job (employer) | Must Have | Implemented |
| FR-3.4 | Ranked opportunities for seeker | Must Have | Implemented |

**FR-4: Hiring Workflow**

| ID | Requirement | Priority | Status |
| :--- | :--- | :--- | :--- |
| FR-4.1 | Job posting CRUD with category/screening fields | Must Have | Implemented |
| FR-4.2 | Application submission with auto-screening | Must Have | Implemented |
| FR-4.3 | Auto-shortlist ≥ threshold / auto-reject < threshold | Must Have | Implemented |
| FR-4.4 | Saved jobs (save/unsave/list) | Should Have | Implemented |

**FR-5: AI Features**

| ID | Requirement | Priority | Status |
| :--- | :--- | :--- | :--- |
| FR-5.1 | Grounded rewrite suggestions (Gemini) | Must Have | Implemented |
| FR-5.2 | Accept/reject/edit rewrite suggestions | Should Have | Implemented |
| FR-5.3 | Context-aware chat with module routing | Must Have | Implemented |
| FR-5.4 | External job search (Adzuna/JSearch + dedup) | Should Have | Implemented |
| FR-5.5 | Auto-apply attempt logging | Should Have | Implemented (simulated) |

**FR-6: Admin Oversight**

| ID | Requirement | Priority | Status |
| :--- | :--- | :--- | :--- |
| FR-6.1 | Platform statistics dashboard | Must Have | Implemented |
| FR-6.2 | User management (list/toggle/delete) | Must Have | Implemented |
| FR-6.3 | Job oversight (list/delete all jobs) | Should Have | Implemented |
| FR-6.4 | Recent activity audit | Should Have | Implemented |

---

## 6. User Stories

### 6.1 Epic 1: Authentication & Onboarding

| ID | User Story | Status |
| :--- | :--- | :--- |
| US-1.1 | As a job seeker, I want to register with email/password so I can create an account. | Implemented |
| US-1.2 | As an employer, I want to register with company details so I can post jobs. | Implemented |
| US-1.3 | As a user, I want to log in so I can access my dashboard. | Implemented |
| US-1.4 | As a user, I want to reset my password so I can recover access. | Implemented |

### 6.2 Epic 2: Resume & Match

| ID | User Story | Status |
| :--- | :--- | :--- |
| US-2.1 | As a seeker, I want to upload my resume so it is parsed into structured data. | Implemented |
| US-2.2 | As a seeker, I want a match score and gap report per job so I know my fit. | Implemented |
| US-2.3 | As a seeker, I want grounded rewrite suggestions so I improve without fabricating experience. | Implemented |

### 6.3 Epic 3: Jobs & Applications

| ID | User Story | Status |
| :--- | :--- | :--- |
| US-3.1 | As an employer, I want to post and manage jobs so my openings stay current. | Implemented |
| US-3.2 | As an employer, I want applicants auto-ranked and screened so I focus on the best. | Implemented |
| US-3.3 | As a seeker, I want to apply and track status so I can manage my search. | Implemented |
| US-3.4 | As a seeker, I want to save jobs so I can return to them later. | Implemented |

### 6.4 Epic 4: AI & Admin

| ID | User Story | Status |
| :--- | :--- | :--- |
| US-4.1 | As a user, I want to query the AI assistant so I get guidance in place. | Implemented |
| US-4.2 | As a seeker, I want to auto-apply to an external listing and track the attempt. | Implemented (simulated) |
| US-4.3 | As an admin, I want stats and user/job management so I can oversee the platform. | Implemented |

---

## 7. Database Schema

### 7.1 Entity Relationships

> `[Fig 7.1 — ER diagram over the 10 tables listed below. Add diagram.]`

### 7.2 Tables

| Table | Key Columns | Notes |
| :--- | :--- | :--- |
| `profiles` | id, email, full_name, role, company_name, avatar_url, password_hash, is_active, timestamps | single table for all roles |
| `resumes` | id, user_id FK, file_name, file_type, parsed_data JSON, raw_text, skills JSON, version, is_current | versioned; one current per user |
| `job_postings` | id, employer_id FK, title, description, requirements JSON, responsibilities JSON, category, auto_screening_enabled, auto_approve_threshold (85), auto_reject_threshold (50), status, external_* | per-job screening thresholds |
| `applications` | id, seeker_id FK, job_posting_id FK, resume_id FK, status, match_score, applied_via, employer_notes | |
| `match_scores` | id, resume_id FK, job_posting_id FK, direction, overall_score, keyword_score, semantic_score, gap_report JSON | |
| `chat_sessions` | id, user_id FK, role_context, module_context | |
| `chat_messages` | id, session_id FK, role, content, module_routed | |
| `saved_jobs` | id, seeker_id FK, job_posting_id FK, match_score_at_save | |
| `rewrite_suggestions` | id, resume_id FK, job_posting_id FK, section_type, original_text, suggested_text, reasoning, status, user_edited_text, resolved_at | |
| `auto_apply_logs` | id, seeker_id FK, job_posting_id FK, resume_id FK, status, attempt_count, error_message, screenshot_url, submitted_at | |

---

## 8. API Reference

Bearer token required on all endpoints except register, login, forgot-password, reset-password. Full spec at `/docs` (Swagger).

| Section | Endpoints |
| :--- | :--- |
| **Auth** — `/api/v1/auth` | `POST /register`, `POST /login`, `POST /forgot-password`, `POST /reset-password`, `GET /me`, `PUT /me` |
| **Resumes** — `/api/v1/resumes` | `GET ""`, `GET /current`, `GET /{id}`, `POST /upload`, `POST ""`, `PUT /{id}`, `DELETE /{id}` |
| **Jobs** — `/api/v1/jobs` | `GET ""` (filters: status, category, employer_id, limit), `GET /{id}`, `POST ""`, `PUT /{id}`, `DELETE /{id}` |
| **Matching** — `/api/v1/matching` | `POST /match-resume/{rid}/{jid}`, `POST /compute`, `GET /job/{jid}/candidates`, `GET /user/opportunities` |
| **Applications** — `/api/v1/applications` | `GET ""`, `GET /job/{jid}`, `POST ""` (auto-screening), `PUT /{id}` |
| **Saved Jobs** — `/api/v1/saved-jobs` | `GET ""`, `POST ""`, `DELETE /{job_id}` |
| **Rewrites** — `/api/v1/rewrites` | `GET /{rid}/{jid}`, `POST /generate/{rid}/{jid}`, `PUT /{id}` |
| **Auto-Apply** — `/api/v1/auto-apply` | `GET ""`, `GET /{seeker_id}/{job_id}`, `POST ""`, `PUT /{log_id}` |
| **External Jobs** — `/api/v1/external-jobs` | `GET /search?query=&location=&page=` |
| **Chat** — `/api/v1/chat` | `GET /sessions`, `POST /sessions`, `GET /sessions/{id}/messages`, `POST /sessions/{id}/messages` |
| **Admin** — `/api/v1/admin` (role=admin only) | `GET /stats`, `GET /users`, `PUT /users/{id}/status`, `DELETE /users/{id}`, `GET /jobs`, `DELETE /jobs/{id}`, `GET /activity` |

---

## 9. Module Ownership & Sprint Plan

### 9.1 Backend Modules

| Module | Owner | Tech Stack |
| :--- | :--- | :--- |
| `auth.py` | Devika S | FastAPI, JWT, bcrypt, Pydantic |
| `resumes.py` | Devika S | FastAPI, resume_parser, Gemini |
| `resume_parser.py` | Devika S | Python regex |
| `admin.py` | Devika S | FastAPI, SQLAlchemy aggregates |
| `matching.py` | Sanjay Philip | sentence-transformers, FastAPI |
| `gemini.py` | Sanjay Philip | Gemini API, httpx |
| `rewrites.py` | Sanjay Philip | FastAPI, Gemini |
| `chat.py` | Sanjay Philip | FastAPI, Gemini |
| `jobs.py` | Akshay K R | FastAPI |
| `external_jobs.py` | Akshay K R | Adzuna, JSearch, httpx |
| `applications.py` | Akshay K R | FastAPI, auto-screening |
| `auto_apply.py` | Akshay K R | FastAPI |
| `saved_jobs.py` | Akshay K R | FastAPI |

### 9.2 Sprint Timeline

- **Sprint 1 (Weeks 1-2)** — Foundation: Auth + DB Schema + Resume Parser
- **Sprint 2 (Weeks 3-4)** — Core ML: Match Score + Applicant Screening + Rewrites
- **Sprint 3 (Weeks 5-6)** — Integration: Frontend APIs + Chat Assistant + Admin Module + E2E demo

---

## 10. Workflows

### 10.1 Seeker Workflow

Register/Login → Upload resume (parsed to JSON) → Browse domain job feed → View match score + gap report per job → Accept/edit grounded rewrite suggestions → Apply (or save / auto-apply opt-in) → Track application status.

### 10.2 Employer Workflow

Register/Login → Post job with category + screening thresholds → Receive auto-ranked applicants (shortlisted/rejected/applied) → Review gap explanations → Chat with candidate pool → Update statuses.

### 10.3 Admin Workflow

Login → Stats dashboard → Manage users (status/delete) → Oversee jobs → Review recent activity.

### 10.4 AI Chat Assistant Placement

Position: floating widget accessible from every screen. Context switches with active role (seeker/employer). Replies generated by Gemini; responses routed to module context (resume/jobs/matching/applications) by keyword.

---

## 11. UI/UX Specifications

### 11.1 Design System

- **Color Palette:** Primary `#3B82F6`, Accent `#0D9488`, Success `#22C55E`, Warning `#F59E0B`, Danger `#EF4444` (Tailwind extended theme)
- **Typography:** Inter, system fallback, responsive scaling
- **Components:** hand-built Tailwind primitives + Lucide icons (no third-party UI kit)
- **Motion:** fade-in, slide-up, slide-in-right, scale-in keyframes

### 11.2 Key Screens

> `[Fig 11.1 — screenshots from running app: Resume Upload, Match Score + Gap Report, Job Feed, Employer Applicants, Admin Dashboard, Chat Widget.]`

### 11.3 Responsive Design

- **Mobile (< 768px):** sidebar → bottom nav, chat full-screen
- **Tablet (768-1024px):** collapsible sidebar, 2-column layouts
- **Desktop (> 1024px):** full sidebar, 3-column layouts, persistent chat

---

## 12. Implementation Status & Roadmap

### 12.1 Implemented (Demo-Ready)

- User registration, login, JWT auth, password reset
- Resume upload with regex + Gemini parsing, versioning
- Match Score (40% keyword + 60% semantic, `all-MiniLM-L6-v2`) + gap report
- Bidirectional ranking (candidates + opportunities)
- Job posting CRUD with domain categories
- Application submission with auto-screening thresholds
- Grounded Gemini rewrite suggestions (accept/reject/edit)
- Saved jobs; external job search (Adzuna/JSearch)
- AI chat assistant with role context + module routing
- Auto-apply logging workflow (simulated browser step)
- Admin dashboard: stats, users, jobs, activity

### 12.2 Planned / In Development

- Real headless-browser auto-apply (Playwright + Celery) — replaces simulation
- Persisted, deduplicated external job aggregation
- WebSocket live status notifications
- Interview scheduling
- Automated test suite + containerized deployment (see 13.3)

---

## 13. Deployment & DevOps

### 13.1 Environment Setup

| Environment | Frontend | Backend | Database |
| :--- | :--- | :--- | :--- |
| Production | Vercel (SPA) | Railway (Uvicorn) | Railway-managed PostgreSQL |
| Development | Local Vite (5173/5174) | Local Uvicorn (8000) | SQLite (zero-config) |

### 13.2 Environment Variables (`backend/.env`)

| Variable | Purpose | Required |
| :--- | :--- | :--- |
| `DATABASE_URL` | Async SQLAlchemy connection string | Yes |
| `DATABASE_URL_SYNC` | Sync connection string for seeding/tools | Yes |
| `SECRET_KEY` | JWT signing key (HS256) | Yes |
| `GEMINI_API_KEY` | Gemini for parsing/rewrites/chat | Yes (core AI features) |
| `ADZUNA_APP_ID` | Adzuna external job search | Optional |
| `ADZUNA_APP_KEY` | Adzuna external job search | Optional |
| `JSEARCH_API_KEY` | RapidAPI JSearch | Optional |

### 13.3 Known Gaps (to close before final submission)

- No automated test suite (backend pytest / frontend vitest) — tests to be added
- No `Dockerfile` / `docker-compose.yml` yet — dev/container builds to be added
- Auto-apply is frontend-simulated; document it as such in the demo script

---

## 14. Appendices

### Appendix A: Scoring Algorithm (`backend/app/services/matching.py`)

```
Match Score = (keyword_score × 0.40) + (semantic_score × 0.60)
keyword_score = Jaccard similarity between stop-word-filtered token sets of resume and job (× 100)
semantic_score = cosine similarity of all-MiniLM-L6-v2 sentence embeddings of
                 resume text and (job description + requirements) (× 100)
```

Gap report: `missing_skills`, `matched_skills`, `keyword_mismatches` (top 15), `strengths` (= matched_skills); `experience_gaps` reserved.
Auto-screening: existing `MatchScore` ≥ `auto_approve_threshold` → `"shortlisted"`; < `auto_reject_threshold` → `"rejected"`; else `"applied"`.

### Appendix B: Security Measures

- Bcrypt password hashing; JWT (HS256) with configurable expiry (default 60 min)
- Role-based access control via `require_role` on admin endpoints; ownership checks on job/application/resume mutations
- SQL injection mitigation via SQLAlchemy ORM; request validation via Pydantic
- File upload validation (type PDF/DOCX/TXT, size ≤5MB)
- CORS restricted to configured origins (5173/5174/3000)
- Resume raw text capped (8000 chars) before Gemini parsing to bound token cost

---

*Document prepared by Team 05 — Sanjay Philip, Akshay K R, Devika S*
*Department of Computer Applications — Version 3.0 | Reconciled Implementation Documentation | July 2026*
