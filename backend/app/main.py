from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import get_settings
from app.routers import auth, resumes, jobs, applications, matching, chat, saved_jobs, rewrites, auto_apply, external_jobs, admin

settings = get_settings()

app = FastAPI(
    title="Synapse API",
    description="AI-Driven Resume Optimization, Job Matching & Bidirectional Hiring Platform",
    version="2.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(resumes.router)
app.include_router(jobs.router)
app.include_router(applications.router)
app.include_router(matching.router)
app.include_router(chat.router)
app.include_router(saved_jobs.router)
app.include_router(rewrites.router)
app.include_router(auto_apply.router)
app.include_router(external_jobs.router)
app.include_router(admin.router)


@app.get("/health")
async def health():
    return {"status": "ok", "service": "synapse-api"}
