import smtplib
from email.message import EmailMessage
from app.config import get_settings


def _send_email(to: str, subject: str, html: str, text: str | str = ""):
    settings = get_settings()
    if not settings.SMTP_HOST:
        print(f"[email] {subject} -> {to}\n{text}")
        return

    msg = EmailMessage()
    msg["Subject"] = subject
    msg["From"] = settings.SMTP_FROM
    msg["To"] = to
    msg.set_content(text)
    msg.add_alternative(html, subtype="html")

    with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT) as server:
        if settings.SMTP_USER and settings.SMTP_PASS:
            server.starttls()
            server.login(settings.SMTP_USER, settings.SMTP_PASS)
        server.send_message(msg)


def send_verification_email(to: str, verify_url: str):
    _send_email(
        to=to,
        subject="Verify your Synapse account",
        html=f"""
        <h1>Welcome to Synapse</h1>
        <p>Click the link below to verify your email address:</p>
        <p><a href="{verify_url}">{verify_url}</a></p>
        <p>This link expires in 30 minutes.</p>
        """,
        text=f"Verify your Synapse account: {verify_url}\nThis link expires in 30 minutes.",
    )


def send_password_reset_email(to: str, reset_url: str):
    _send_email(
        to=to,
        subject="Reset your Synapse password",
        html=f"""
        <h1>Password Reset</h1>
        <p>Click the link below to reset your password:</p>
        <p><a href="{reset_url}">{reset_url}</a></p>
        <p>This link expires in 30 minutes.</p>
        """,
        text=f"Reset your Synapse password: {reset_url}\nThis link expires in 30 minutes.",
    )


def send_application_status_email(to: str, job_title: str, status: str, notes: str | None = None):
    _send_email(
        to=to,
        subject=f"Application status update: {job_title}",
        html=f"""
        <h1>Application status update</h1>
        <p>Your application for <strong>{job_title}</strong> is now <strong>{status}</strong>.</p>
        {"<p>" + notes + "</p>" if notes else ""}
        <p><a href="{get_settings().APP_BASE_URL}/app/applications">View your applications</a></p>
        """,
        text=f"Your application for {job_title} is now {status}.\n{notes or ''}",
    )


def send_job_alert_email(seeker_email: str, seeker_name: str, matches: list[dict], alert_frequency: str = "daily"):
    """Email a seeker a digest of new jobs matching their alert.

    Each item in ``matches`` is a dict with keys: title, company, location,
    match_score, link. Unsubscribe link points to the job-alerts management page.
    """
    count = len(matches)
    rows = "".join(
        f'<li><a href="{job.get("link", "#")}">{job.get("title", "Job")}</a>'
        f' &mdash; {job.get("company") or "Unknown company"}'
        f' &mdash; {job.get("location") or "Remote"}'
        f' &mdash; {job.get("match_score") or 0:.0f}% match</li>'
        for job in matches
    )
    unsubscribe_url = f"{get_settings().APP_BASE_URL}/app/job-alerts"
    _send_email(
        to=seeker_email,
        subject=f"{count} new job{'s' if count != 1 else ''} matching your alerts",
        html=f"""
        <h1>New job matches</h1>
        <p>Hi {seeker_name}, here {'are' if count != 1 else 'is'} {count} new job{'s' if count != 1 else ''} matching your alert ({alert_frequency} digest):</p>
        <ul>{rows}</ul>
        <p><a href="{unsubscribe_url}">Manage or unsubscribe from alerts</a></p>
        """,
        text=f"Hi {seeker_name}, new jobs matching your alerts ({alert_frequency} digest):\n" + "\n".join(
            f"- {job.get('title')} ({job.get('company') or 'Unknown'}, {job.get('location') or 'Remote'})"
            for job in matches
        ),
    )
