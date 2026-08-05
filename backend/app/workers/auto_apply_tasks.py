import asyncio
import logging
import os
import tempfile
from datetime import datetime

from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app import database as db_module
from app.models import AutoApplyLog, Application, Resume
from app.services.auto_apply import apply_to_external_job
from app.workers import celery_app

logger = logging.getLogger(__name__)


def _materialize_resume_file(resume: Resume) -> str | None:
    """Write resume raw text to a temp file so it can be uploaded by Playwright."""
    if not resume or not resume.raw_text:
        return None
    fd, path = tempfile.mkstemp(suffix=".txt", prefix="synapse_resume_")
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as fh:
            fh.write(resume.raw_text)
        return path
    except Exception:
        logger.exception("failed to materialize resume upload")
        try:
            os.unlink(path)
        except OSError:
            pass
        return None


async def _create_application(db, log: AutoApplyLog) -> bool:
    existing = await db.execute(
        select(Application).where(
            Application.seeker_id == log.seeker_id,
            Application.job_posting_id == log.job_posting_id,
        )
    )
    if existing.scalar_one_or_none() is not None:
        logger.info("application already exists for log %s, skipping", log.id)
        return False
    db.add(Application(
        seeker_id=log.seeker_id,
        job_posting_id=log.job_posting_id,
        resume_id=log.resume_id,
        status="applied",
        applied_via="auto_apply",
        employer_notes="Auto-apply (headless) submitted externally",
    ))
    await db.flush()
    logger.info("created Application for log %s", log.id)
    return True


async def _fail_and_commit(db, log: AutoApplyLog, error_message: str) -> None:
    log.status = "failed"
    log.error_message = error_message
    await db.commit()


async def _run(log_id: str) -> None:
    async with db_module.async_session() as db:
        result = await db.execute(
            select(AutoApplyLog)
            .options(
                selectinload(AutoApplyLog.job_posting),
                selectinload(AutoApplyLog.seeker),
            )
            .where(AutoApplyLog.id == log_id)
        )
        log = result.scalar_one_or_none()
        if log is None:
            logger.error("auto-apply log %s not found", log_id)
            return

        job = log.job_posting
        seeker = log.seeker
        if job is None:
            await _fail_and_commit(db, log, "job_posting not found")
            return
        if not job.external_url:
            await _fail_and_commit(db, log, "No external URL available for auto-apply")
            return

        resume: Resume | None = None
        if log.resume_id:
            rres = await db.execute(select(Resume).where(Resume.id == log.resume_id))
            resume = rres.scalar_one_or_none()

        resume_data = dict(resume.parsed_data or {}) if resume else {}
        seeker_data = {
            "full_name": seeker.full_name if seeker else "",
            "email": seeker.email if seeker else "",
        }

        file_path = _materialize_resume_file(resume)
        if file_path:
            resume_data["file_path"] = file_path

        try:
            outcome = await asyncio.to_thread(
                apply_to_external_job, log_id, job.external_url, resume_data, seeker_data
            )
        finally:
            if file_path:
                try:
                    os.unlink(file_path)
                except OSError:
                    pass

        log.status = outcome["status"]
        log.screenshot_url = outcome.get("screenshot_path") or log.screenshot_url
        log.error_message = outcome.get("error_message")
        if outcome["status"] == "success":
            log.submitted_at = datetime.utcnow()
            await _create_application(db, log)
            message = "Auto-apply submitted successfully to the external site."
        else:
            log.error_message = outcome.get("error_message") or "Auto-apply failed"
            message = f"Auto-apply failed: {log.error_message}"

        await db.flush()

        from app.routers.applications import _notify
        await _notify(
            db,
            log.seeker_id,
            "Auto-apply complete",
            message,
            "application",
            link="/app/applications",
        )

        await db.commit()
        logger.info("auto-apply log %s -> %s", log.id, log.status)


@celery_app.task(name="auto_apply.process_auto_apply")
def process_auto_apply(log_id: str) -> None:
    """Celery task: run the Playwright auto-apply and persist the result."""
    try:
        asyncio.run(_run(log_id))
    except Exception as exc:
        logger.exception("auto-apply task failed for log %s", log_id)
        try:
            asyncio.run(_mark_failed(log_id, str(exc)[:500]))
        except Exception:
            logger.exception("could not persist failure for log %s", log_id)


async def _mark_failed(log_id: str, error_message: str) -> None:
    async with db_module.async_session() as db:
        result = await db.execute(
            select(AutoApplyLog).where(AutoApplyLog.id == log_id)
        )
        log = result.scalar_one_or_none()
        if log is not None:
            log.status = "failed"
            log.error_message = error_message
            await db.commit()
