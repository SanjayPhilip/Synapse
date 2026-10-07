import smtplib
from email.message import EmailMessage
from app.config import get_settings


def _send_email(to: str, subject: str, html: str, text: str | str = ""):
    settings = get_settings()
    if not settings.SMTP_HOST:
        print(f"[email] {subject} -> {to}\n{text}")
        return

    def _do_send():
        try:
            msg = EmailMessage()
            msg["Subject"] = subject
            msg["From"] = settings.SMTP_FROM
            msg["To"] = to
            msg.set_content(text)
            msg.add_alternative(html, subtype="html")

            with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=5) as server:
                if settings.SMTP_USER and settings.SMTP_PASS:
                    server.starttls()
                    server.login(settings.SMTP_USER, settings.SMTP_PASS)
                server.send_message(msg)
        except Exception as e:
            print(f"[email error] Failed to send email to {to}: {e}")

    import asyncio
    try:
        loop = asyncio.get_running_loop()
        loop.run_in_executor(None, _do_send)
    except RuntimeError:
        _do_send()


send_raw_email = _send_email



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


def send_email_change_verification(new_email: str, verify_url: str):
    _send_email(
        to=new_email,
        subject="Confirm your new Synapse email",
        html=f"""
        <h1>Confirm your new email</h1>
        <p>Click the link below to confirm this email address for your account:</p>
        <p><a href="{verify_url}">{verify_url}</a></p>
        <p>This link expires in 30 minutes.</p>
        """,
        text=f"Confirm your new Synapse email: {verify_url}\nThis link expires in 30 minutes.",
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


def send_interview_invitation_email(
    to: str,
    candidate_name: str,
    job_title: str,
    company_name: str,
    interview_link: str,
    scheduled_time: str | None = None,
):
    """Sends an interview meeting invitation email with direct video link and calendar action."""
    app_url = f"{get_settings().APP_BASE_URL}/app/applications"
    time_info = f"<p><strong>Scheduled Time:</strong> {scheduled_time}</p>" if scheduled_time else ""
    _send_email(
        to=to,
        subject=f"Interview Invitation: {job_title} at {company_name}",
        html=f"""
        <h2>Interview Invitation</h2>
        <p>Dear {candidate_name},</p>
        <p>Congratulations! <strong>{company_name}</strong> has invited you for an interview for the <strong>{job_title}</strong> role.</p>
        {time_info}
        <p><strong>Meeting / Video Link:</strong> <a href="{interview_link}" target="_blank">{interview_link}</a></p>
        <p>You can also access your application details and calendar invite on Synapse:</p>
        <p><a href="{app_url}" style="display:inline-block;padding:10px 18px;background-color:#18bfef;color:#ffffff;text-decoration:none;border-radius:6px;font-weight:bold;">View on Synapse</a></p>
        <p>Best regards,<br/>The {company_name} Hiring Team & Synapse</p>
        """,
        text=f"Interview Invitation: {job_title} at {company_name}\n\nDear {candidate_name},\n{company_name} has invited you for an interview for {job_title}.\nMeeting link: {interview_link}\n{f'Time: {scheduled_time}' if scheduled_time else ''}\n\nView on Synapse: {app_url}",
    )

