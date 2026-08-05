"""
Headless auto-apply engine.

Drives a Playwright Chromium instance against external job application
forms (Greenhouse, Lever, Workday, generic) and fills them with the
seeker's resume data. Pure orchestration — returns a plain dict and never
touches the database.
"""

import logging
import os
import time
from datetime import datetime
from pathlib import Path
from typing import Optional

from playwright.sync_api import sync_playwright

logger = logging.getLogger(__name__)

BASE_DIR = Path(__file__).resolve().parents[2]
SCREENSHOT_DIR = BASE_DIR / "storage" / "screenshots"

NAV_TIMEOUT_MS = 30_000
FIELD_TIMEOUT_MS = 5_000

# Success indicators shown by common ATS after a completed submission.
_SUCCESS_PATTERNS = (
    "application has been submitted",
    "application submitted",
    "thanks for applying",
    "thank you for applying",
    "we've received your application",
    "we have received your application",
)


def _detect_ats(url: str) -> str:
    u = url.lower()
    if "greenhouse" in u:
        return "greenhouse"
    if "lever" in u:
        return "lever"
    if "workday" in u or "myworkdayjobs" in u:
        return "workday"
    return "generic"


def _gather(data: dict, *keys: str) -> Optional[str]:
    """First non-empty value among keys, from a nested contact dict or flat dict."""
    for key in keys:
        if not key:
            continue
        value = data.get(key)
        if value:
            return str(value).strip()
    return None


def _contact(resume_data: dict, seeker_data: dict, *keys: str) -> Optional[str]:
    for source in (resume_data.get("contact") or {}, resume_data, seeker_data):
        if not isinstance(source, dict):
            continue
        value = _gather(source, *keys)
        if value:
            return value
    return None


def _split_name(full_name: Optional[str]) -> tuple[str, str]:
    if not full_name:
        return "", ""
    parts = full_name.split()
    if len(parts) == 1:
        return parts[0], ""
    return parts[0], " ".join(parts[1:])


def _fill(root, selectors: list[str], value: Optional[str]) -> bool:
    """Fill the first visible, empty input matching any selector."""
    if not value:
        return False
    for selector in selectors:
        try:
            locator = root.locator(selector).first
            if locator.count() == 0 or not locator.is_visible():
                continue
            current = locator.input_value()
            if current.strip():
                continue
            locator.fill(value, timeout=FIELD_TIMEOUT_MS)
            logger.info("filled %s with %s", selector, value)
            return True
        except Exception:
            continue
    return False


def _upload_resume(root, file_path: Optional[str]) -> bool:
    if not file_path or not os.path.exists(file_path):
        logger.info("no resume file available, skipping upload")
        return False
    selectors = ["input[type='file']", "#resume", "#job_application_resume"]
    for selector in selectors:
        try:
            locator = root.locator(selector).first
            if locator.count() == 0 or not locator.is_visible():
                continue
            locator.set_input_files(file_path)
            logger.info("uploaded resume %s", file_path)
            return True
        except Exception:
            continue
    logger.warning("resume file present but no file input found")
    return False


def _click_submit(root) -> bool:
    selectors = [
        "button[type='submit']",
        "input[type='submit']",
        "button:has-text('submit application')",
        "button:has-text('submit')",
        "button:has-text('apply')",
        "button:has-text('continue')",
    ]
    for selector in selectors:
        try:
            locator = root.locator(selector).first
            if locator.count() == 0 or not locator.is_visible():
                continue
            locator.click(timeout=FIELD_TIMEOUT_MS)
            logger.info("clicked submit via %s", selector)
            return True
        except Exception:
            continue
    return False


def _submit_success(root) -> bool:
    for selector in (
        ".application--success",
        ".applications-success",
        ".success-message",
        ".application-form__success",
        "[class*='success']",
    ):
        try:
            if root.locator(selector).first.is_visible(timeout=2_000):
                return True
        except Exception:
            continue
    try:
        body = root.locator("body").inner_text(timeout=2_000).lower()
    except Exception:
        return False
    return any(pattern in body for pattern in _SUCCESS_PATTERNS)


def _screenshot(page, log_id: str, kind: str) -> str:
    SCREENSHOT_DIR.mkdir(parents=True, exist_ok=True)
    stamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
    name = f"{log_id}_{kind}_{stamp}.png"
    path = SCREENSHOT_DIR / name
    try:
        page.screenshot(path=str(path), full_page=True)
    except Exception:
        logger.exception("screenshot failed for %s", log_id)
        return ""
    return str(path.relative_to(BASE_DIR)).replace("\\", "/")


def _fill_greenhouse(root, profile: dict, file_path: Optional[str]) -> None:
    _fill(root, ["input[name='job_application[first_name]']", "input[name='first_name']"], profile["first_name"])
    _fill(root, ["input[name='job_application[last_name]']", "input[name='last_name']"], profile["last_name"])
    _fill(root, ["input[name='job_application[email]']", "input[type='email']"], profile["email"])
    _fill(root, ["input[name='job_application[phone]']", "input[type='tel']"], profile["phone"])
    _fill(root, ["input[name='job_application[linkedin_url]']", "input[name='linkedin']", "input[placeholder*='linkedin' i]"], profile["linkedin"])
    _fill(root, ["input[name='job_application[website_url]']", "input[placeholder*='website' i]"], profile["website"])
    _fill(root, ["input[name='job_application[location]']", "input[placeholder*='location' i]"], profile["location"])
    _upload_resume(root, file_path)


def _fill_lever(root, profile: dict, file_path: Optional[str]) -> None:
    _fill(root, ["input[name='name']", "input[placeholder*='full name' i]", "input[placeholder*='first' i]"], profile["full_name"])
    _fill(root, ["input[name='email']", "input[type='email']"], profile["email"])
    _fill(root, ["input[name='phone']", "input[type='tel']"], profile["phone"])
    _fill(root, ["input[name='urls[LinkedIn]']", "input[name='linkedin']", "input[placeholder*='linkedin' i]"], profile["linkedin"])
    _fill(root, ["input[name='urls[Website]']", "input[placeholder*='website' i]"], profile["website"])
    _upload_resume(root, file_path)


def _fill_generic(root, profile: dict, file_path: Optional[str]) -> None:
    _fill(root, ["input[type='email']", "input[name*='email' i]", "input[placeholder*='email' i]"], profile["email"])
    _fill(root, ["input[type='tel']", "input[name*='phone' i]", "input[placeholder*='phone' i]"], profile["phone"])
    _fill(root, ["input[name*='linkedin' i]", "input[placeholder*='linkedin' i]"], profile["linkedin"])
    _fill(root, ["input[name*='name' i]", "input[placeholder*='full name' i]"], profile["full_name"])
    _fill(root, ["input[name*='website' i]", "input[placeholder*='website' i]"], profile["website"])
    _fill(root, ["input[name*='location' i]", "input[placeholder*='location' i]"], profile["location"])
    _fill(root, ["textarea[name*='summary' i]", "textarea[placeholder*='summary' i]"], profile["summary"])
    _upload_resume(root, file_path)


def _fill_form(ats: str, root, profile: dict, file_path: Optional[str]) -> None:
    if ats == "greenhouse":
        _fill_greenhouse(root, profile, file_path)
    elif ats == "lever":
        _fill_lever(root, profile, file_path)
    else:
        _fill_generic(root, profile, file_path)


def apply_to_external_job(log_id: str, external_url: str, resume_data: dict, seeker_data: dict) -> dict:
    """Attempt to submit an application at external_url with Playwright.

    Returns {"status": "success"|"failed", "screenshot_path": str,
             "error_message": str|None, "verified": bool}
    """
    ats = _detect_ats(external_url)
    logger.info("auto-apply %s -> %s (%s)", log_id, external_url, ats)

    contact = resume_data.get("contact") or {}
    profile = {
        "email": _contact(resume_data, seeker_data, "email"),
        "phone": _contact(resume_data, seeker_data, "phone"),
        "linkedin": _contact(resume_data, seeker_data, "linkedin", "linkedin_url"),
        "website": _contact(resume_data, seeker_data, "website"),
        "location": _contact(resume_data, seeker_data, "location", "city"),
        "summary": resume_data.get("summary") or seeker_data.get("summary"),
        "full_name": _contact(resume_data, seeker_data, "name", "full_name"),
    }
    profile["first_name"], profile["last_name"] = _split_name(profile["full_name"])
    file_path = resume_data.get("file_path") or seeker_data.get("file_path")

    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            try:
                page = browser.new_page()
                page.goto(external_url, wait_until="domcontentloaded", timeout=NAV_TIMEOUT_MS)
                page.wait_for_selector("input, textarea", timeout=NAV_TIMEOUT_MS)

                root = page
                if ats == "greenhouse":
                    for iframe_sel in ("#grnhse_iframe", "#grnhse_app"):
                        try:
                            if page.locator(iframe_sel).first.is_visible(timeout=2_000):
                                root = page.frame_locator(iframe_sel)
                                page.wait_for_timeout(1_500)
                                break
                        except Exception:
                            continue

                _fill_form(ats, root, profile, file_path)
                submitted = _click_submit(root)

                if submitted:
                    time.sleep(2)
                    verified = _submit_success(root)
                else:
                    verified = False

                screenshot_path = _screenshot(page, log_id, "success" if submitted else "failure")

                if not submitted:
                    return {
                        "status": "failed",
                        "screenshot_path": screenshot_path,
                        "error_message": f"No submit button found on {ats} form",
                        "verified": False,
                    }
                if verified:
                    logger.info("auto-apply %s submitted successfully", log_id)
                    return {
                        "status": "success",
                        "screenshot_path": screenshot_path,
                        "error_message": None,
                        "verified": True,
                    }
                return {
                    "status": "success",
                    "screenshot_path": screenshot_path,
                    "error_message": None,
                    "verified": False,
                }
            finally:
                browser.close()
    except Exception as exc:
        logger.exception("auto-apply %s failed", log_id)
        return {
            "status": "failed",
            "screenshot_path": "",
            "error_message": str(exc)[:500],
            "verified": False,
        }
