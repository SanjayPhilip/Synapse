import os
from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy.ext.asyncio import AsyncSession
from app.config import get_settings
from app.routers import auth, resumes, jobs, applications, matching, chat, saved_jobs, rewrites, auto_apply, admin, notifications, ws, job_alerts, external_jobs, profile, security
from app.database import get_db
from app.workers import celery_app
from app.services.job_alert_scheduler import start_scheduler, stop_scheduler

settings = get_settings()

STORAGE_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "storage")
os.makedirs(os.path.join(STORAGE_DIR, "avatars"), exist_ok=True)

app = FastAPI(
    title="Synapse API",
    description="AI-Driven Resume Optimization, Job Matching & Bidirectional Hiring Platform",
    version="2.0.0",
)

app.state.celery = celery_app


@app.on_event("startup")
async def startup_event():
    start_scheduler()


@app.on_event("shutdown")
async def shutdown_event():
    stop_scheduler()

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/storage", StaticFiles(directory=STORAGE_DIR), name="storage")

app.include_router(auth.router)
app.include_router(resumes.router)
app.include_router(jobs.router)
app.include_router(applications.router)
app.include_router(matching.router)
app.include_router(chat.router)
app.include_router(saved_jobs.router)
app.include_router(rewrites.router)
app.include_router(auto_apply.router)
app.include_router(admin.router)
app.include_router(notifications.router)
app.include_router(ws.router)
app.include_router(job_alerts.router)
app.include_router(external_jobs.router)
app.include_router(profile.router)

app.include_router(security.router)


@app.get("/health")
async def health():
    return {"status": "ok", "service": "synapse-api"}
