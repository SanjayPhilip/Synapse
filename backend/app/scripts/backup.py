#!/usr/bin/env python
"""
Database backup and restore utility for Synapse.
Supports PostgreSQL (production) and SQLite (development).
"""
import os
import sys
import asyncio
import subprocess
import gzip
import shutil
from datetime import datetime
from pathlib import Path
from typing import Optional

# Add backend to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.config import get_settings
from app.database import engine


settings = get_settings()

BACKUP_DIR = Path(__file__).resolve().parents[2] / "backups"
BACKUP_DIR.mkdir(exist_ok=True)


def is_postgres() -> bool:
    """Check if using PostgreSQL."""
    return settings.DATABASE_URL.startswith("postgresql")


def get_pg_config() -> dict:
    """Extract PostgreSQL connection parameters from DATABASE_URL."""
    # postgresql+asyncpg://user:pass@host:port/db
    url = settings.DATABASE_URL_SYNC  # Use sync URL for pg_dump
    if not url.startswith("postgresql"):
        raise ValueError("Not a PostgreSQL URL")
    
    # Remove prefix
    url = url.replace("postgresql+psycopg2://", "").replace("postgresql://", "")
    
    # Parse user:pass@host:port/db
    auth, rest = url.split("@", 1)
    user, password = auth.split(":", 1)
    host_port, database = rest.split("/", 1)
    host, port = host_port.split(":", 1) if ":" in host_port else (host_port, "5432")
    
    return {
        "user": user,
        "password": password,
        "host": host,
        "port": port,
        "database": database,
    }


async def backup_postgres(output_path: Path) -> bool:
    """Create a PostgreSQL backup using pg_dump."""
    config = get_pg_config()
    env = os.environ.copy()
    env["PGPASSWORD"] = config["password"]
    
    cmd = [
        "pg_dump",
        "-h", config["host"],
        "-p", config["port"],
        "-U", config["user"],
        "-d", config["database"],
        "--no-owner",
        "--no-privileges",
        "--clean",
        "--if-exists",
        "-F", "c",  # Custom format (compressed)
    ]
    
    try:
        with open(output_path, "wb") as f:
            result = subprocess.run(cmd, env=env, stdout=f, stderr=subprocess.PIPE, timeout=300)
        if result.returncode != 0:
            print(f"pg_dump failed: {result.stderr.decode()}")
            return False
        print(f"PostgreSQL backup created: {output_path}")
        return True
    except subprocess.TimeoutExpired:
        print("pg_dump timed out after 5 minutes")
        return False
    except FileNotFoundError:
        print("pg_dump not found. Install postgresql-client.")
        return False
    except Exception as e:
        print(f"Backup failed: {e}")
        return False


async def backup_sqlite(output_path: Path) -> bool:
    """Create a SQLite backup using vacuum into."""
    db_path = settings.DATABASE_URL.replace("sqlite+aiosqlite:///", "").replace("sqlite:///", "")
    src = Path(db_path)
    
    if not src.exists():
        print(f"Database file not found: {src}")
        return False
    
    try:
        # Use SQLite's backup API for consistent backup
        import sqlite3
        dest_conn = sqlite3.connect(str(output_path))
        src_conn = sqlite3.connect(str(src))
        src_conn.backup(dest_conn)
        dest_conn.close()
        src_conn.close()
        print(f"SQLite backup created: {output_path}")
        return True
    except Exception as e:
        print(f"SQLite backup failed: {e}")
        return False


async def create_backup() -> Optional[Path]:
    """Create a timestamped backup."""
    timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
    db_type = "postgres" if is_postgres() else "sqlite"
    filename = f"synapse_{db_type}_{timestamp}.backup"
    output_path = BACKUP_DIR / filename
    
    print(f"Creating {db_type} backup...")
    
    if is_postgres():
        success = await backup_postgres(output_path)
    else:
        success = await backup_sqlite(output_path)
    
    if success:
        # Also create a compressed version
        gz_path = output_path.with_suffix(output_path.suffix + ".gz")
        with open(output_path, "rb") as f_in:
            with gzip.open(gz_path, "wb") as f_out:
                shutil.copyfileobj(f_in, f_out)
        output_path.unlink()  # Remove uncompressed
        print(f"Compressed backup: {gz_path}")
        return gz_path
    return None


def list_backups() -> list[Path]:
    """List available backups, newest first."""
    return sorted(BACKUP_DIR.glob("synapse_*.backup.gz"), key=lambda p: p.stat().st_mtime, reverse=True)


async def restore_postgres(backup_path: Path) -> bool:
    """Restore PostgreSQL from backup."""
    config = get_pg_config()
    env = os.environ.copy()
    env["PGPASSWORD"] = config["password"]
    
    # Decompress if needed
    if backup_path.suffix == ".gz":
        import tempfile
        with tempfile.NamedTemporaryFile(suffix=".backup", delete=False) as tmp:
            with gzip.open(backup_path, "rb") as f_in:
                shutil.copyfileobj(f_in, tmp)
            backup_file = Path(tmp.name)
    else:
        backup_file = backup_path
    
    try:
        cmd = [
            "pg_restore",
            "-h", config["host"],
            "-p", config["port"],
            "-U", config["user"],
            "-d", config["database"],
            "--clean",
            "--if-exists",
            "--no-owner",
            "--no-privileges",
            str(backup_file),
        ]
        result = subprocess.run(cmd, env=env, capture_output=True, timeout=300)
        if result.returncode != 0:
            print(f"pg_restore failed: {result.stderr.decode()}")
            return False
        print("PostgreSQL restore completed")
        return True
    except Exception as e:
        print(f"Restore failed: {e}")
        return False
    finally:
        if backup_file != backup_path:
            backup_file.unlink(missing_ok=True)


async def restore_sqlite(backup_path: Path) -> bool:
    """Restore SQLite from backup."""
    db_path = settings.DATABASE_URL.replace("sqlite+aiosqlite:///", "").replace("sqlite:///", "")
    dest = Path(db_path)
    
    # Decompress if needed
    if backup_path.suffix == ".gz":
        import tempfile
        with tempfile.NamedTemporaryFile(suffix=".backup", delete=False) as tmp:
            with gzip.open(backup_path, "rb") as f_in:
                shutil.copyfileobj(f_in, tmp)
            backup_file = Path(tmp.name)
    else:
        backup_file = backup_path
    
    try:
        # Close any existing connections
        await engine.dispose()
        
        # Copy backup to database location
        shutil.copy2(backup_file, dest)
        print("SQLite restore completed")
        return True
    except Exception as e:
        print(f"Restore failed: {e}")
        return False
    finally:
        if backup_file != backup_path:
            backup_file.unlink(missing_ok=True)


async def restore_backup(backup_path: Path) -> bool:
    """Restore from a backup file."""
    if not backup_path.exists():
        print(f"Backup file not found: {backup_path}")
        return False
    
    print(f"Restoring from {backup_path}...")
    
    if is_postgres():
        return await restore_postgres(backup_path)
    else:
        return await restore_sqlite(backup_path)


async def main():
    import argparse
    parser = argparse.ArgumentParser(description="Synapse database backup/restore")
    subparsers = parser.add_subparsers(dest="command", required=True)
    
    # Backup command
    backup_parser = subparsers.add_parser("backup", help="Create a new backup")
    
    # Restore command
    restore_parser = subparsers.add_parser("restore", help="Restore from backup")
    restore_parser.add_argument("backup_file", nargs="?", help="Backup file to restore (latest if omitted)")
    
    # List command
    list_parser = subparsers.add_parser("list", help="List available backups")
    
    args = parser.parse_args()
    
    if args.command == "backup":
        result = await create_backup()
        if result:
            print(f"SUCCESS: Backup saved to {result}")
            sys.exit(0)
        else:
            print("FAILED: Backup creation failed")
            sys.exit(1)
    
    elif args.command == "restore":
        if args.backup_file:
            backup_path = Path(args.backup_file)
            if not backup_path.is_absolute():
                backup_path = BACKUP_DIR / backup_path
        else:
            backups = list_backups()
            if not backups:
                print("No backups available")
                sys.exit(1)
            backup_path = backups[0]
            print(f"Using latest backup: {backup_path.name}")
        
        success = await restore_backup(backup_path)
        sys.exit(0 if success else 1)
    
    elif args.command == "list":
        backups = list_backups()
        if not backups:
            print("No backups found")
        else:
            print(f"Available backups in {BACKUP_DIR}:")
            for b in backups:
                size = b.stat().st_size / (1024 * 1024)
                mtime = datetime.fromtimestamp(b.stat().st_mtime).strftime("%Y-%m-%d %H:%M:%S")
                print(f"  {b.name}  ({size:.1f} MB, {mtime})")


if __name__ == "__main__":
    asyncio.run(main())