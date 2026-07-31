# Synapse Backend (FastAPI)

AI-Driven Resume Optimization, Job Matching & Bidirectional Hiring Platform — Backend API.

## Setup

### Prerequisites
- Python 3.12+
- PostgreSQL (local or Railway)
- Gemini API key (Google AI Studio)

### Install Dependencies
```bash
cd backend
pip install -r requirements.txt
playwright install chromium
```

### Configure Environment
Edit `.env` with your settings:
```
DATABASE_URL=postgresql+asyncpg://user:pass@host:5432/synapse
SECRET_KEY=your-jwt-secret-key
GEMINI_API_KEY=your-gemini-api-key
```

For Railway PostgreSQL:
```
DATABASE_URL=postgresql+asyncpg://postgres:password@autorack.proxy.rlwy.net:port/railway
```

### Initialize Database
```bash
python -m app.init_db
```

### Seed Sample Data
```bash
python -m app.seed
```

### Run Server
```bash
uvicorn app.main:app --reload --port 8000
```

API docs at: http://localhost:8000/docs

## API Endpoints

### Auth
- `POST /api/v1/auth/register` — Register user
- `POST /api/v1/auth/login` — Login, get JWT
- `GET /api/v1/auth/me` — Get current profile
- `PUT /api/v1/auth/me` — Update profile

### Resumes
- `GET /api/v1/resumes` — List resumes
- `GET /api/v1/resumes/current` — Get current resume
- `POST /api/v1/resumes/upload` — Upload file (PDF/DOCX/TXT)
- `POST /api/v1/resumes` — Create manual resume
- `PUT /api/v1/resumes/{id}` — Update resume
- `DELETE /api/v1/resumes/{id}` — Delete resume

### Jobs
- `GET /api/v1/jobs` — List jobs
- `POST /api/v1/jobs` — Create job posting
- `PUT /api/v1/jobs/{id}` — Update job
- `DELETE /api/v1/jobs/{id}` — Delete job

### Applications
- `GET /api/v1/applications` — My applications
- `POST /api/v1/applications` — Apply to job
- `PUT /api/v1/applications/{id}` — Update status

### Matching
- `POST /api/v1/matching/match-resume/{rid}/{jid}` — Score resume vs job
- `POST /api/v1/matching/compute` — Ad-hoc match computation
- `GET /api/v1/matching/job/{jid}/candidates` — Ranked candidates
- `GET /api/v1/matching/user/opportunities` — Ranked opportunities

### Chat
- `GET /api/v1/chat/sessions` — List sessions
- `POST /api/v1/chat/sessions` — Create session
- `POST /api/v1/chat/sessions/{id}/messages` — Send message

### Saved Jobs, Rewrites, Auto-Apply, External Search
See `/docs` for full OpenAPI spec.

## Tech Stack
- **FastAPI** — async Python web framework
- **SQLAlchemy 2.0** — async ORM with PostgreSQL
- **sentence-transformers** — real ML embeddings (all-MiniLM-L6-v2)
- **Gemini API** — resume parsing, rewrite suggestions, chat assistant
- **JWT + bcrypt** — authentication
