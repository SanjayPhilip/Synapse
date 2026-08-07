from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    DATABASE_URL: str = "sqlite+aiosqlite:///./synapse.db"
    DATABASE_URL_SYNC: str = "sqlite:///./synapse.db"
    SECRET_KEY: str = "change-me-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60

    GEMINI_API_KEY: str = ""
    ADZUNA_APP_ID: str = ""
    ADZUNA_APP_KEY: str = ""
    JSEARCH_API_KEY: str = ""

    REDIS_URL: str = "redis://localhost:6379/0"

    SMTP_HOST: str = ""
    SMTP_PORT: int = 1025
    SMTP_USER: str = ""
    SMTP_PASS: str = ""
    SMTP_FROM: str = "Synapse <noreply@synapse.local>"
    APP_BASE_URL: str = "http://localhost:5173"

    CORS_ORIGINS: list[str] = [
        "http://localhost:5173",
        "http://localhost:5174",
        "http://localhost:3000",
    ]

    # Storage (S3-compatible: AWS S3, MinIO, DigitalOcean Spaces, etc.)
    STORAGE_BACKEND: str = "local"  # "local" or "s3"
    S3_ENDPOINT_URL: str = ""  # e.g., https://s3.amazonaws.com or http://minio:9000
    S3_ACCESS_KEY: str = ""
    S3_SECRET_KEY: str = ""
    S3_BUCKET: str = "synapse"
    S3_REGION: str = "us-east-1"
    S3_PUBLIC_URL: str = ""  # Optional CDN/public URL (e.g., https://cdn.example.com)

    class Config:
        env_file = ".env"


@lru_cache
def get_settings() -> Settings:
    settings = Settings()
    if settings.SECRET_KEY == "change-me-in-production":
        raise ValueError(
            "SECRET_KEY is still the default 'change-me-in-production'. "
            "Set a real secret in backend/.env — e.g. openssl rand -hex 32"
        )
    return settings