import os
import asyncio
import signal
from contextlib import asynccontextmanager
from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession
from app.config import get_settings
from app.middleware.observability import RequestContextMiddleware, register_error_handlers
from app.middleware.rate_limit import RateLimitMiddleware
from app.routers import auth, resumes, jobs, applications, matching, chat, saved_jobs, rewrites, auto_apply, admin, notifications, ws, job_alerts, external_jobs, profile, security, analytics
from app.database import get_db, engine
from app.workers import celery_app

settings = get_settings()

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
STORAGE_DIR = os.path.join(BASE_DIR, "storage")
STATIC_DIR = os.path.join(BASE_DIR, "static")
os.makedirs(os.path.join(STORAGE_DIR, "avatars"), exist_ok=True)
os.makedirs(STATIC_DIR, exist_ok=True)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup - scheduler runs in worker process (python -m app.workers.worker_runner)
    print("[FastAPI] Application startup complete (scheduler runs in worker process)")
    
    # Signal handlers for graceful shutdown (SIGTERM from Docker, SIGINT from Ctrl+C)
    shutdown_event = asyncio.Event()
    
    def _signal_handler(sig: int, frame):
        print(f"[FastAPI] Received signal {sig}, initiating shutdown...")
        shutdown_event.set()
    
    loop = asyncio.get_running_loop()
    for sig in (signal.SIGTERM, signal.SIGINT):
        try:
            loop.add_signal_handler(sig, _signal_handler, sig, None)
        except NotImplementedError:
            # Windows doesn't support add_signal_handler
            pass
    
    try:
        yield
    finally:
        # Shutdown
        print("[FastAPI] Initiating graceful shutdown...")
        
        # Close database connection pool
        await engine.dispose()
        print("[FastAPI] Database connection pool closed")
        
        # Give Celery a moment to flush any pending results
        await asyncio.sleep(0.5)
        print("[FastAPI] Shutdown complete")


app = FastAPI(
    title="Synapse API",
    description="AI-Driven Resume Optimization, Job Matching & Bidirectional Hiring Platform",
    version="2.0.0",
    lifespan=lifespan,
)

app.state.celery = celery_app

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
# Last added = outermost: rate limit + request context wrap everything.
app.add_middleware(RateLimitMiddleware, max_requests=300, window_seconds=60)
app.add_middleware(RequestContextMiddleware)

register_error_handlers(app)

# Mount static files for uploads (avatars, screenshots, etc.)
app.mount("/storage", StaticFiles(directory=STORAGE_DIR), name="storage")

# Mount built frontend static assets (JS, CSS, images) - only if directory exists
assets_dir = os.path.join(STATIC_DIR, "assets")
if os.path.exists(assets_dir):
    app.mount("/assets", StaticFiles(directory=assets_dir), name="assets")

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
app.include_router(analytics.router)

app.include_router(security.router)


# SPA fallback: serve index.html for all non-API routes
@app.get("/{full_path:path}")
async def spa_fallback(full_path: str):
    # Skip API routes
    if full_path.startswith("api/") or full_path.startswith("health") or full_path.startswith("storage/") or full_path.startswith("assets/"):
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Not found")
    
    index_path = os.path.join(STATIC_DIR, "index.html")
    if os.path.exists(index_path):
        return FileResponse(index_path)
    from fastapi import HTTPException
    raise HTTPException(status_code=404, detail="Frontend not built. Run 'npm run build' first.")


@app.get("/health")
async def health():
    return {"status": "ok", "service": "synapse-api"}
