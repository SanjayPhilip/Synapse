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
