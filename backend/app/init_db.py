"""
Initialize the database schema. Run this to create all tables.
Usage: python -m app.init_db
"""
import asyncio
from app.database import engine, Base
from app.models import (
    Profile, Resume, JobPosting, Application, MatchScore,
    ChatSession, ChatMessage, SavedJob, RewriteSuggestion, AutoApplyLog,
)


async def init():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    print("Database tables created successfully.")


if __name__ == "__main__":
    asyncio.run(init())
