import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

os.environ['DATABASE_URL'] = 'sqlite+aiosqlite:///./test_synapse.db'
os.environ['DATABASE_URL_SYNC'] = 'sqlite:///./test_synapse.db'
os.environ['SECRET_KEY'] = 'test-secret-key-for-pytest-only-32chars!!'
os.environ['GEMINI_API_KEY'] = ''
os.environ['ADZUNA_APP_ID'] = ''
os.environ['ADZUNA_APP_KEY'] = ''
os.environ['JSEARCH_API_KEY'] = ''
os.environ['REDIS_URL'] = 'redis://localhost:6379/0'
os.environ['CORS_ORIGINS'] = '["http://localhost:5173"]'

from httpx import AsyncClient, ASGITransport
from app.models import Base
from app.main import app
from app import database as db_module
from app.middleware.rate_limit import _requests

import pytest


@pytest.fixture(autouse=True)
async def setup_db():
    _requests.clear()
    async with db_module.engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)
    yield
    async with db_module.engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest.fixture
async def client():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url='http://test') as ac:
        yield ac
