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


class Profile(Base):
    __tablename__ = "profiles"

    id = Column(GUID, primary_key=True, default=uuid.uuid4)
    email = Column(String, nullable=False)
    full_name = Column(String, nullable=False)
    role = Column(String, nullable=False, default="seeker")
    company_name = Column(String, nullable=True)
    avatar_url = Column(String, nullable=True)
    password_hash = Column(String, nullable=False)
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    resumes = relationship("Resume", back_populates="user", cascade="all, delete-orphan")
    job_postings = relationship("JobPosting", back_populates="employer", cascade="all, delete-orphan")
    applications = relationship("Application", back_populates="seeker", cascade="all, delete-orphan")
    chat_sessions = relationship("ChatSession", back_populates="user", cascade="all, delete-orphan")
    saved_jobs = relationship("SavedJob", back_populates="seeker", cascade="all, delete-orphan")
    auto_apply_logs = relationship("AutoApplyLog", back_populates="seeker", cascade="all, delete-orphan")


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
    status = Column(String, nullable=False, default="active", index=True)
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
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    seeker = relationship("Profile", back_populates="applications")
    job_posting = relationship("JobPosting", back_populates="applications")
    resume = relationship("Resume", back_populates="applications")


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
