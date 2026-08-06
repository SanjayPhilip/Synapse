import copy
import uuid
from datetime import datetime
from sqlalchemy import Column, String, Boolean, Integer, Numeric, Text, ForeignKey, DateTime, Index, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.types import TypeDecorator, CHAR
from app.database import Base


class GUID(TypeDecorator):
    impl = CHAR(36)
    cache_ok = True

    def process_bind_param(self, value, dialect):
        if value is None:
            return None
        return str(value)

    def process_result_value(self, value, dialect):
        if value is None:
            return None
        if isinstance(value, uuid.UUID):
            return value
        return uuid.UUID(str(value))


DEFAULT_NOTIFICATION_PREFS: dict = {
    "application_received": {"email": True, "in_app": True},
    "application_status_changed": {"email": True, "in_app": True},
    "auto_screened": {"email": True, "in_app": True},
    "auto_apply_complete": {"email": True, "in_app": True},
    "high_match": {"email": True, "in_app": True},
    "job_alert": {"email": True, "in_app": True},
}


def default_notification_prefs() -> dict:
    """Fresh copy per row so the mutable default is never shared across instances."""
    return copy.deepcopy(DEFAULT_NOTIFICATION_PREFS)


class Profile(Base):
    __tablename__ = "profiles"

    id = Column(GUID, primary_key=True, default=uuid.uuid4)
    email = Column(String, nullable=False)
    full_name = Column(String, nullable=False)
    role = Column(String, nullable=False, default="seeker")
    company_name = Column(String, nullable=True)
    avatar_url = Column(String, nullable=True)
    bio = Column(Text, nullable=True)
    headline = Column(String, nullable=True)
    phone = Column(String, nullable=True)
    location = Column(String, nullable=True)
    linkedin = Column(String, nullable=True)
    website = Column(String, nullable=True)
    theme = Column(String, nullable=False, default="dark")
    locale = Column(String, nullable=False, default="en")
    notification_prefs = Column(JSON, nullable=False, default=default_notification_prefs)
    password_hash = Column(String, nullable=False)
    is_active = Column(Boolean, nullable=False, default=True)
    is_deleted = Column(Boolean, nullable=False, default=False)
    is_verified = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    resumes = relationship("Resume", back_populates="user", cascade="all, delete-orphan")
    session_tokens = relationship("SessionToken", back_populates="user", cascade="all, delete-orphan")
    job_postings = relationship("JobPosting", back_populates="employer", cascade="all, delete-orphan")
    applications = relationship("Application", back_populates="seeker", cascade="all, delete-orphan")
    chat_sessions = relationship("ChatSession", back_populates="user", cascade="all, delete-orphan")
    saved_jobs = relationship("SavedJob", back_populates="seeker", cascade="all, delete-orphan")
    auto_apply_logs = relationship("AutoApplyLog", back_populates="seeker", cascade="all, delete-orphan")
    notifications = relationship("Notification", back_populates="user", cascade="all, delete-orphan")
    job_alerts = relationship("JobAlert", back_populates="seeker", cascade="all, delete-orphan")


class SessionToken(Base):
    __tablename__ = "session_tokens"

    id = Column(GUID, primary_key=True, default=uuid.uuid4)
    user_id = Column(GUID, ForeignKey("profiles.id", ondelete="CASCADE"), nullable=False, index=True)
    token_hash = Column(String, nullable=False)
    user_agent = Column(String, nullable=True)
    ip_address = Column(String, nullable=True)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    last_used_at = Column(DateTime, nullable=True)
    expires_at = Column(DateTime, nullable=False)
    revoked_at = Column(DateTime, nullable=True)

    user = relationship("Profile", back_populates="session_tokens")


class Resume(Base):
    __tablename__ = "resumes"

    id = Column(GUID, primary_key=True, default=uuid.uuid4)
    user_id = Column(GUID, ForeignKey("profiles.id", ondelete="CASCADE"), nullable=False, index=True)
    file_name = Column(String, nullable=False)
    file_type = Column(String, nullable=True)
    parsed_data = Column(JSON, nullable=False, default={})
    raw_text = Column(Text, nullable=False, default="")
    skills = Column(JSON, nullable=False, default=[])
    version = Column(Integer, nullable=False, default=1)
    is_current = Column(Boolean, nullable=False, default=True, index=True)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = relationship("Profile", back_populates="resumes")
    match_scores = relationship("MatchScore", back_populates="resume", cascade="all, delete-orphan")
    applications = relationship("Application", back_populates="resume")
    rewrite_suggestions = relationship("RewriteSuggestion", back_populates="resume", cascade="all, delete-orphan")


class JobPosting(Base):
    __tablename__ = "job_postings"

    id = Column(GUID, primary_key=True, default=uuid.uuid4)
    employer_id = Column(GUID, ForeignKey("profiles.id", ondelete="CASCADE"), nullable=False, index=True)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=False)
    requirements = Column(JSON, nullable=False, default=[])
    responsibilities = Column(JSON, nullable=False, default=[])
    location = Column(String, nullable=True)
    is_remote = Column(Boolean, nullable=False, default=False)
    salary_min = Column(Integer, nullable=True)
    salary_max = Column(Integer, nullable=True)
    salary_currency = Column(String, nullable=False, default="USD")
    job_type = Column(String, nullable=True)
    category = Column(String, nullable=False, default="Software Engineering", index=True)
    auto_screening_enabled = Column(Boolean, nullable=False, default=True)
    auto_approve_threshold = Column(Integer, nullable=False, default=85)
    auto_reject_threshold = Column(Integer, nullable=False, default=50)
    status = Column(String, nullable=False, default="active", index=True)
    moderation_status = Column(String, nullable=False, default="approved", index=True)
    external_source = Column(String, nullable=True)
    external_id = Column(String, nullable=True)
    external_url = Column(String, nullable=True)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)
    closed_at = Column(DateTime, nullable=True)

    employer = relationship("Profile", back_populates="job_postings")
    applications = relationship("Application", back_populates="job_posting", cascade="all, delete-orphan")
    match_scores = relationship("MatchScore", back_populates="job_posting", cascade="all, delete-orphan")
    saved_jobs = relationship("SavedJob", back_populates="job_posting", cascade="all, delete-orphan")
    rewrite_suggestions = relationship("RewriteSuggestion", back_populates="job_posting", cascade="all, delete-orphan")
    auto_apply_logs = relationship("AutoApplyLog", back_populates="job_posting", cascade="all, delete-orphan")


class Application(Base):
    __tablename__ = "applications"

    id = Column(GUID, primary_key=True, default=uuid.uuid4)
    seeker_id = Column(GUID, ForeignKey("profiles.id", ondelete="CASCADE"), nullable=False, index=True)
    job_posting_id = Column(GUID, ForeignKey("job_postings.id", ondelete="CASCADE"), nullable=False, index=True)
    resume_id = Column(GUID, ForeignKey("resumes.id", ondelete="SET NULL"), nullable=True)
    status = Column(String, nullable=False, default="applied", index=True)
    match_score = Column(Numeric(5, 2), nullable=True)
    applied_via = Column(String, nullable=False, default="platform")
    employer_notes = Column(Text, nullable=True)
    interview_link = Column(String, nullable=True)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    seeker = relationship("Profile", back_populates="applications")
    job_posting = relationship("JobPosting", back_populates="applications")
    resume = relationship("Resume", back_populates="applications")
    status_history = relationship("ApplicationStatusHistory", back_populates="application", cascade="all, delete-orphan")


class ApplicationStatusHistory(Base):
    __tablename__ = "application_status_history"

    id = Column(GUID, primary_key=True, default=uuid.uuid4)
    application_id = Column(GUID, ForeignKey("applications.id", ondelete="CASCADE"), nullable=False, index=True)
    old_status = Column(String, nullable=True)
    new_status = Column(String, nullable=False)
    changed_by = Column(GUID, ForeignKey("profiles.id", ondelete="SET NULL"), nullable=True)
    reason = Column(String, nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)

    application = relationship("Application", back_populates="status_history")


class MatchScore(Base):
    __tablename__ = "match_scores"

    id = Column(GUID, primary_key=True, default=uuid.uuid4)
    resume_id = Column(GUID, ForeignKey("resumes.id", ondelete="CASCADE"), nullable=False, index=True)
    job_posting_id = Column(GUID, ForeignKey("job_postings.id", ondelete="CASCADE"), nullable=False, index=True)
    direction = Column(String, nullable=False, index=True)
    overall_score = Column(Numeric(5, 2), nullable=False)
    keyword_score = Column(Numeric(5, 2), nullable=False)
    semantic_score = Column(Numeric(5, 2), nullable=False)
    gap_report = Column(JSON, nullable=False, default={})
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    resume = relationship("Resume", back_populates="match_scores")
    job_posting = relationship("JobPosting", back_populates="match_scores")


class ChatSession(Base):
    __tablename__ = "chat_sessions"

    id = Column(GUID, primary_key=True, default=uuid.uuid4)
    user_id = Column(GUID, ForeignKey("profiles.id", ondelete="CASCADE"), nullable=False, index=True)
    role_context = Column(String, nullable=False)
    module_context = Column(String, nullable=True)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = relationship("Profile", back_populates="chat_sessions")
    messages = relationship("ChatMessage", back_populates="session", cascade="all, delete-orphan")


class ChatMessage(Base):
    __tablename__ = "chat_messages"

    id = Column(GUID, primary_key=True, default=uuid.uuid4)
    session_id = Column(GUID, ForeignKey("chat_sessions.id", ondelete="CASCADE"), nullable=False, index=True)
    role = Column(String, nullable=False)
    content = Column(Text, nullable=False)
    module_routed = Column(String, nullable=True)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)

    session = relationship("ChatSession", back_populates="messages")


class SavedJob(Base):
    __tablename__ = "saved_jobs"

    id = Column(GUID, primary_key=True, default=uuid.uuid4)
    seeker_id = Column(GUID, ForeignKey("profiles.id", ondelete="CASCADE"), nullable=False, index=True)
    job_posting_id = Column(GUID, ForeignKey("job_postings.id", ondelete="CASCADE"), nullable=False)
    match_score_at_save = Column(Numeric(5, 2), nullable=True)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)

    seeker = relationship("Profile", back_populates="saved_jobs")
    job_posting = relationship("JobPosting", back_populates="saved_jobs")


class JobAlert(Base):
    __tablename__ = "job_alerts"

    id = Column(GUID, primary_key=True, default=uuid.uuid4)
    seeker_id = Column(GUID, ForeignKey("profiles.id", ondelete="CASCADE"), nullable=False, index=True)
    keywords = Column(JSON, nullable=False, default=[])
    category = Column(String, nullable=True)
    location = Column(String, nullable=True)
    is_active = Column(Boolean, nullable=False, default=True)
    frequency = Column(String, nullable=False, default="daily")
    email_enabled = Column(Boolean, nullable=False, default=True)
    last_checked = Column(DateTime, nullable=True)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)

    seeker = relationship("Profile", back_populates="job_alerts")


class RewriteSuggestion(Base):
    __tablename__ = "rewrite_suggestions"

    id = Column(GUID, primary_key=True, default=uuid.uuid4)
    resume_id = Column(GUID, ForeignKey("resumes.id", ondelete="CASCADE"), nullable=False, index=True)
    job_posting_id = Column(GUID, ForeignKey("job_postings.id", ondelete="CASCADE"), nullable=False)
    section_type = Column(String, nullable=False)
    original_text = Column(Text, nullable=False)
    suggested_text = Column(Text, nullable=False)
    reasoning = Column(Text, nullable=False)
    status = Column(String, nullable=False, default="pending")
    user_edited_text = Column(Text, nullable=True)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    resolved_at = Column(DateTime, nullable=True)

    resume = relationship("Resume", back_populates="rewrite_suggestions")
    job_posting = relationship("JobPosting", back_populates="rewrite_suggestions")


class Notification(Base):
    __tablename__ = "notifications"

    id = Column(GUID, primary_key=True, default=uuid.uuid4)
    user_id = Column(GUID, ForeignKey("profiles.id", ondelete="CASCADE"), nullable=False, index=True)
    title = Column(String, nullable=False)
    message = Column(Text, nullable=False, default="")
    notification_type = Column(String, nullable=False, default="info")
    link = Column(String, nullable=True)
    is_read = Column(Boolean, nullable=False, default=False)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)

    user = relationship("Profile", back_populates="notifications")


class AutoApplyLog(Base):
    __tablename__ = "auto_apply_logs"

    id = Column(GUID, primary_key=True, default=uuid.uuid4)
    seeker_id = Column(GUID, ForeignKey("profiles.id", ondelete="CASCADE"), nullable=False, index=True)
    job_posting_id = Column(GUID, ForeignKey("job_postings.id", ondelete="CASCADE"), nullable=False)
    resume_id = Column(GUID, ForeignKey("resumes.id", ondelete="SET NULL"), nullable=True)
    status = Column(String, nullable=False, default="pending")
    attempt_count = Column(Integer, nullable=False, default=0)
    error_message = Column(Text, nullable=True)
    screenshot_url = Column(String, nullable=True)
    submitted_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    seeker = relationship("Profile", back_populates="auto_apply_logs")
    job_posting = relationship("JobPosting", back_populates="auto_apply_logs")


class ExternalJob(Base):
    __tablename__ = "external_jobs"

    id = Column(GUID, primary_key=True, default=uuid.uuid4)
    external_source = Column(String, nullable=False)
    external_id = Column(String, nullable=False)
    title = Column(String, nullable=False)
    company = Column(String, nullable=True)
    description = Column(Text, nullable=False, default="")
    requirements = Column(JSON, nullable=False, default=[])
    location = Column(String, nullable=True)
    is_remote = Column(Boolean, nullable=False, default=False)
    salary_min = Column(Integer, nullable=True)
    salary_max = Column(Integer, nullable=True)
    salary_currency = Column(String, nullable=False, default="USD")
    job_type = Column(String, nullable=True)
    category = Column(String, nullable=True)
    external_url = Column(String, nullable=True)
    posted_at = Column(DateTime, nullable=True)
    fetched_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    __table_args__ = (Index("uq_external_jobs_source_id", "external_source", "external_id", unique=True),)
