# ⚡ SYNAPSE — AI-Driven Resume Optimization, Job Matching & Bidirectional Hiring Platform

**Team No. 05** — *Sanjay Philip · Akshay K R · Devika S*  
**Version**: 2.2.0 (Domain Feeds & High-Volume Application Screening Update)

---

## 📌 Overview

**SYNAPSE** is a two-sided, machine-learning-driven hiring platform that unifies resume optimization, intelligent job discovery, categorized domain feeds, automated applicant screening, and applicant ranking within a single system.

Unlike conventional job portals that act purely as listing funnels, SYNAPSE is built around **one bidirectional matching engine** that serves both job seekers and employers, with centralized oversight for platform administrators:
- **Job Seekers**: Upload resumes, get structured JSON parsing, receive instant fit scores against job descriptions with itemized gap reports, filter jobs by specialized domain feeds (Business & MBA, Data Analytics, Software Engineering, etc.), and receive AI-suggested grounded experience rewrites.
- **Employers**: Post job openings with custom automated screening thresholds, receive automatically ranked candidate shortlists with transparent gap explanations, auto-approve/shortlist top candidates or auto-reject low-fit candidates for high-volume pipelines (1000+ applicants), and query candidate pools conversationally.
- **Administrators**: Monitor platform metrics, manage users, oversee job postings, and audit system activities.

---

## ✨ Key Features

### 👨‍💻 For Job Seekers
- 🏷️ **Categorized Domain Job Feeds**: Interactive domain filter pills (*Software Engineering*, *Business & MBA*, *Data Analytics*, *Data Science & AI*, *Cloud & DevOps*, *Finance & Accounting*, *Marketing & Sales*) to quickly discover listings tailored to specific fields.
- 📄 **Resume Upload & Parsing**: Support for PDF/DOCX file uploads with automatic extraction into structured JSON (skills, experience, education).
- 🎯 **Match Score & Gap Report**: Calculates fit score using **40% Keyword Match + 60% Dense Semantic Similarity**, detailing missing skills and match highlights.
- ✍️ **Grounded Resume Rewrites**: AI-powered experience rewriting suggestions that improve weak bullet points without fabricating experience.
- 🤖 **Context-Aware AI Chat Assistant**: Floating assistant widget that answers questions about job fit, resume recommendations, and application status.
- 🚀 **Opt-In Auto-Apply**: Per-listing opt-in workflow to track automated job applications.

### 🏢 For Employers
- ⚡ **High-Volume Application Auto-Screening (1000+ Requests Handling)**:
  - **Auto-Shortlist / Approve**: Candidates scoring $\ge$ threshold (e.g. 85%) are automatically moved to `"shortlisted"`.
  - **Auto-Reject**: Candidates scoring $<$ threshold (e.g. 50%) are automatically set to `"rejected"`.
  - **Manual Review**: Borderline candidates remain in `"applied"` for recruiter review.
  - **Custom Threshold Controls**: Toggle screening on/off and configure percentage thresholds per job posting.
- 📢 **Job Posting Management**: Full CRUD interface for creating, editing, and closing job postings with domain feed categorization.
- 📊 **Bidirectional Candidate Ranking**: Applicants are automatically ranked per job posting based on true match fit.
- 💬 **Candidate Pool Conversational Query**: Employers can query the AI chat assistant about their applicant pool to find candidates conversationally.

### 🛡️ For Administrators (Admin Module)
- 📊 **Centralized Admin Dashboard**: High-level system overview showing total users, jobs, applications, active users, average match rate, and system health.
- 👥 **User Management**: Inspect and search user accounts, filter by role (Seeker, Employer, Admin), change roles, and oversee account status.
- 💼 **Job Oversight**: View and manage all job postings across the system, including application counts and status toggles.
- 📝 **System Activity Logs**: Audit log tracking logins, file uploads, applications, and other system-wide activities.
- 🔑 **Quick-Login Demo Access**: Red-themed custom sidebar and login shortcut to easily switch to the Administrator context.

---

## 🛠️ Technology Stack

| Layer | Technology |
| :--- | :--- |
| **Web Frontend** | React.js (Vite), TypeScript, Tailwind CSS, Lucide Icons |
| **Backend Framework** | FastAPI (Python 3.12), Pydantic v2, Uvicorn |
| **Database & ORM** | PostgreSQL (AsyncPG / SQLAlchemy 2.0) / SQLite for local dev |
| **Matching & ML** | `sentence-transformers` (Dense Semantic Embeddings) + Token Keyword Scoring |
| **AI Services** | Google Gemini API (Resume Rewrites & AI Assistant Query Routing) |
| **Auth & Security** | JWT (HS256 tokens) + Role-Based Access Control (Admin, Employer, Seeker) + Password Hashing (Bcrypt) + CORS (Supports default Vite port `5173` and fallback `5174`) |

---

## 📂 Project Architecture

```
synapse/
├── backend/
│   ├── app/
│   │   ├── models/          # SQLAlchemy ORM schemas (Users, Resumes, Jobs with Auto-Screening & Domain Feeds)
│   │   ├── routers/         # REST API routes (auth, admin, resumes, jobs, applications, matching, chat)
│   │   ├── services/        # ML matching engine, Gemini AI & resume parsing
│   │   ├── main.py          # FastAPI application entrypoint
│   │   ├── config.py        # Environment settings & CORS config
│   │   ├── init_db.py       # Database schema initialization script
│   │   └── seed.py          # Database seeder script with pre-categorized domain listings
│   └── requirements.txt
├── src/
│   ├── components/          # Reusable UI components, Sidebar/AppShell & Chat Assistant
│   ├── context/             # AuthContext & global state
│   ├── lib/                 # API client & scoring utilities
│   ├── pages/               # Seeker (Job Feed with Domain Filtering), Employer (Posting with Auto-Screening UI) & Admin Dashboard views
│   └── types/               # TypeScript interfaces
├── supabase/
│   └── migrations/          # SQL schema definitions
├── package.json
└── README.md
```

---

## 🚀 Quick Start & Installation

### Prerequisites
- Node.js (v18+)
- Python (v3.10+)

### 1. Configuration
Before starting the servers, configure the environment variables:
- **Backend**: Create `backend/.env` and provide your database configurations and Google Gemini API key:
  ```env
  DATABASE_URL=sqlite+aiosqlite:///./synapse.db
  DATABASE_URL_SYNC=sqlite:///./synapse.db
  SECRET_KEY=your_secret_key_here
  GEMINI_API_KEY=your_gemini_api_key_here
  ```
- **Frontend**: Create `.env` in project root:
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

# Run FastAPI Development Server
python -m uvicorn app.main:app --reload --port 8000
```
- **API Docs (Swagger UI)**: `http://localhost:8000/docs`

---

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

## 🗺️ Project Roadmap (Future Enhancements)

- 🤖 **Headless Playwright Automation**: Live headless browser execution for external site application filling.
- 🗄️ **External Job Aggregation Storage**: Deduplicated persistent storage for Adzuna / JSearch external feeds.
- 🔔 **WebSocket Live Push**: Real-time WebSocket notifications for candidate application status updates.
- 📅 **Interview Scheduler**: Built-in calendar scheduling for short-listed candidates.

---

## 📜 License & Credits

Built with ❤️ by **Team 05** (*Sanjay Philip, Akshay K R, Devika S*) for Department of Computer Applications.
