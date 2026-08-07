#!/usr/bin/env python
"""
Worker runner for Celery + APScheduler.
Runs as a separate process from the main FastAPI app.
"""
import os
import signal
import sys
import asyncio
import threading
import time
from contextlib import asynccontextmanager
from typing import Optional

# Ensure the backend directory is in the path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from celery import Celery
from app.config import get_settings
from app.workers import celery_app
from app.services.job_alert_scheduler import start_scheduler, stop_scheduler
from app.init_db import init as init_db


settings = get_settings()


class WorkerRunner:
    """Manages Celery worker + APScheduler in a single process with graceful shutdown."""

    def __init__(self):
        self.celery_app = celery_app
        self.scheduler = None
        self._shutdown_event = asyncio.Event()
        self._worker_thread: Optional[threading.Thread] = None
        self._worker_stopped = threading.Event()
        self._shutdown_timeout = 30  # seconds to wait for in-flight tasks

    async def initialize(self):
        """Initialize database and scheduler."""
        await init_db()
        self.scheduler = start_scheduler()
        print("[WorkerRunner] Scheduler started")

    def run_celery_worker(self, concurrency: int = 4, loglevel: str = "info"):
        """Run the Celery worker in a thread."""
        print(f"[WorkerRunner] Starting Celery worker (concurrency={concurrency})")
        try:
            self.celery_app.worker_main([
                "worker",
                f"--concurrency={concurrency}",
                f"--loglevel={loglevel}",
                "--pool=prefork",
                "--without-gossip",
                "--without-mingle",
                "--without-heartbeat",
            ])
        finally:
            self._worker_stopped.set()

    def stop_celery_worker(self):
        """Signal the Celery worker to shut down gracefully."""
        print("[WorkerRunner] Signaling Celery worker to stop...")
        # Send shutdown signal to the worker process
        self.celery_app.control.shutdown()
        # Wait for worker thread to finish
        if self._worker_thread and self._worker_thread.is_alive():
            self._worker_thread.join(timeout=self._shutdown_timeout)
            if self._worker_thread.is_alive():
                print(f"[WorkerRunner] WARNING: Worker thread did not stop within {self._shutdown_timeout}s")

    async def shutdown(self):
        """Graceful shutdown with in-flight task completion wait."""
        print("[WorkerRunner] Initiating graceful shutdown...")
        
        # 1. Stop accepting new tasks - stop the scheduler first
        stop_scheduler()
        print("[WorkerRunner] Scheduler stopped (no new scheduled jobs)")

        # 2. Signal Celery worker to stop accepting new tasks
        self.stop_celery_worker()
        
        # 3. Wait for in-flight tasks to complete (with timeout)
        print(f"[WorkerRunner] Waiting up to {self._shutdown_timeout}s for in-flight tasks...")
        try:
            await asyncio.wait_for(self._worker_stopped.wait(), timeout=self._shutdown_timeout)
            print("[WorkerRunner] All worker tasks completed")
        except asyncio.TimeoutError:
            print(f"[WorkerRunner] WARNING: Shutdown timeout reached, {self._shutdown_timeout}s elapsed")
        
        # 4. Final cleanup
        print("[WorkerRunner] Shutdown complete")


async def main():
    runner = WorkerRunner()

    # Handle signals
    loop = asyncio.get_event_loop()
    for sig in (signal.SIGTERM, signal.SIGINT):
        loop.add_signal_handler(sig, lambda: runner._shutdown_event.set())

    await runner.initialize()

    # Run Celery worker in a thread
    runner._worker_thread = threading.Thread(
        target=runner.run_celery_worker,
        kwargs={"concurrency": int(os.getenv("WORKER_CONCURRENCY", "4"))},
        daemon=False,  # Non-daemon so we can join properly
    )
    runner._worker_thread.start()

    # Wait for shutdown signal
    await runner._shutdown_event.wait()
    
    await runner.shutdown()
    print("[WorkerRunner] Process exiting")


if __name__ == "__main__":
    asyncio.run(main())