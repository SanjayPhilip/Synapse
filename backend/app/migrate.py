"""
Run database migrations.
Usage: python -m app.migrate
"""
import os
import sys

os.environ.setdefault("DATABASE_URL", "sqlite+aiosqlite:///./synapse.db")
os.environ.setdefault("DATABASE_URL_SYNC", "sqlite:///./synapse.db")
os.environ.setdefault("SECRET_KEY", "migrate-session-key-not-for-production")

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from alembic.config import Config
from alembic import command


def run():
    base = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    ini = os.path.join(base, "alembic.ini")
    cfg = Config(ini)
    command.upgrade(cfg, "head")


if __name__ == "__main__":
    run()
