# Synapse — Deploy Runbook

Production deployment checklist for Synapse.

## Prerequisites

- Docker Engine 24+ and Docker Compose v2+
- A host with ports `80` and `8000` available (or adjust in `docker-compose.yml`)
- A secure `SECRET_KEY` (generate with `openssl rand -hex 32`)
- Optional: `GEMINI_API_KEY`, `ADZUNA_APP_ID`, `ADZUNA_APP_KEY`, `JSEARCH_API_KEY`

## 1. Clone

```bash
git clone https://github.com/SanjayPhilip/Synapse.git
cd Synapse
```

## 2. Environment

Create `backend/.env`:

```env
SECRET_KEY=your_secret_key_here
GEMINI_API_KEY=your_gemini_api_key_here
ADZUNA_APP_ID=your_adzuna_app_id
ADZUNA_APP_KEY=your_adzuna_app_key
JSEARCH_API_KEY=your_jsearch_api_key
```

Optional: `.env` at project root if frontend needs a custom API URL (default `/api` proxies to backend via nginx).

## 3. Build & Start

```bash
docker compose up --build -d
```

## 4. Initialize Database

```bash
docker compose exec backend python -m app.init_db
docker compose exec backend python -m app.seed
```

## 5. Verify

- Frontend: `http://localhost` (or `http://localhost:80`)
- Backend health: `http://localhost:8000/health`
- API docs: `http://localhost:8000/docs`

## 6. Logs

```bash
docker compose logs -f backend
docker compose logs -f frontend
docker compose logs -f db
```

## 7. Stop / Reset

```bash
docker compose down
docker compose down -v  # removes DB volume too
```

## Notes

- Frontend is served by nginx on port `80` and proxies `/api` to the backend.
- Backend runs Uvicorn on port `8000`.
- Database is PostgreSQL 16 with persistent `pgdata` volume.
- Alembic migrations are included; for version-controlled schema changes, run `python -m app.migrate` inside the backend container.
