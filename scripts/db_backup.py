"""
Synapse Database Backup & Restore Utility
Supports both SQLite file copy / VACUUM INTO and PostgreSQL pg_dump / pg_restore.

Usage:
  python scripts/db_backup.py backup [--out-dir ./backups]
  python scripts/db_backup.py restore --file ./backups/synapse_backup_...db
"""

import sys
import os
import shutil
import argparse
from datetime import datetime
import subprocess

# Add backend to path to load config
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "backend"))
from app.config import get_settings

def backup(out_dir: str):
    os.makedirs(out_dir, exist_ok=True)
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    settings = get_settings()
    db_url = settings.DATABASE_URL

    if "sqlite" in db_url or os.path.exists(os.path.join(os.path.dirname(__file__), "..", "backend", "synapse.db")) or os.path.exists("synapse.db"):
        # SQLite backup
        sqlite_file = "synapse.db"
        if not os.path.exists(sqlite_file) and os.path.exists(os.path.join("backend", "synapse.db")):
            sqlite_file = os.path.join("backend", "synapse.db")

        if os.path.exists(sqlite_file):
            dest = os.path.join(out_dir, f"synapse_backup_{timestamp}.db")
            shutil.copy2(sqlite_file, dest)
            print(f"[SUCCESS] SQLite database backed up to: {dest}")
            return dest
        else:
            print("[WARN] SQLite file 'synapse.db' not found.")
            return None
    elif "postgresql" in db_url:
        dest = os.path.join(out_dir, f"synapse_backup_{timestamp}.sql")
        cmd = f"pg_dump {db_url} -F c -f {dest}"
        try:
            subprocess.run(cmd, shell=True, check=True)
            print(f"[SUCCESS] PostgreSQL database backed up to: {dest}")
            return dest
        except Exception as e:
            print(f"[ERROR] pg_dump failed: {e}")
            return None

def restore(backup_file: str):
    if not os.path.exists(backup_file):
        print(f"[ERROR] Backup file not found: {backup_file}")
        sys.exit(1)

    settings = get_settings()
    db_url = settings.DATABASE_URL

    if backup_file.endswith(".db"):
        target = "synapse.db"
        if os.path.exists(os.path.join("backend", "synapse.db")):
            target = os.path.join("backend", "synapse.db")
        shutil.copy2(backup_file, target)
        print(f"[SUCCESS] Restored SQLite database from {backup_file} to {target}")
    elif backup_file.endswith(".sql"):
        cmd = f"pg_restore --clean --no-owner -d {db_url} {backup_file}"
        try:
            subprocess.run(cmd, shell=True, check=True)
            print(f"[SUCCESS] Restored PostgreSQL database from {backup_file}")
        except Exception as e:
            print(f"[ERROR] pg_restore failed: {e}")
            sys.exit(1)

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Synapse DB Backup & Restore")
    parser.add_argument("action", choices=["backup", "restore"])
    parser.add_argument("--out-dir", default="./backups", help="Directory to store backups")
    parser.add_argument("--file", help="Backup file path to restore")

    args = parser.parse_args()

    if args.action == "backup":
        backup(args.out_dir)
    elif args.action == "restore":
        if not args.file:
            print("[ERROR] --file argument required for restore")
            sys.exit(1)
        restore(args.file)
