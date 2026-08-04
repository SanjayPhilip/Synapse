"""initial schema

Revision ID: e5b522db35f8
Revises: 
Create Date: 2026-08-04 16:24:47.512200

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import sqlite

# revision identifiers, used by Alembic.
revision: str = 'e5b522db35f8'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table('rewrite_suggestions',
    sa.Column('id', sa.CHAR(length=36), nullable=False),
    sa.Column('resume_id', sa.CHAR(length=36), nullable=False),
    sa.Column('job_posting_id', sa.CHAR(length=36), nullable=False),
    sa.Column('section_type', sa.VARCHAR(), nullable=False),
    sa.Column('original_text', sa.TEXT(), nullable=False),
    sa.Column('suggested_text', sa.TEXT(), nullable=False),
    sa.Column('reasoning', sa.TEXT(), nullable=False),
    sa.Column('status', sa.VARCHAR(), nullable=False),
    sa.Column('user_edited_text', sa.TEXT(), nullable=True),
    sa.Column('created_at', sa.DATETIME(), nullable=False),
    sa.Column('resolved_at', sa.DATETIME(), nullable=True),
    sa.ForeignKeyConstraint(['job_posting_id'], ['job_postings.id'], ondelete='CASCADE'),
    sa.ForeignKeyConstraint(['resume_id'], ['resumes.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_rewrite_suggestions_resume_id', 'rewrite_suggestions', ['resume_id'], unique=False)
    op.create_table('auto_apply_logs',
    sa.Column('id', sa.CHAR(length=36), nullable=False),
    sa.Column('seeker_id', sa.CHAR(length=36), nullable=False),
    sa.Column('job_posting_id', sa.CHAR(length=36), nullable=False),
    sa.Column('resume_id', sa.CHAR(length=36), nullable=True),
    sa.Column('status', sa.VARCHAR(), nullable=False),
    sa.Column('attempt_count', sa.INTEGER(), nullable=False),
    sa.Column('error_message', sa.TEXT(), nullable=True),
    sa.Column('screenshot_url', sa.VARCHAR(), nullable=True),
    sa.Column('submitted_at', sa.DATETIME(), nullable=True),
    sa.Column('created_at', sa.DATETIME(), nullable=False),
    sa.Column('updated_at', sa.DATETIME(), nullable=False),
    sa.ForeignKeyConstraint(['job_posting_id'], ['job_postings.id'], ondelete='CASCADE'),
    sa.ForeignKeyConstraint(['resume_id'], ['resumes.id'], ondelete='SET NULL'),
    sa.ForeignKeyConstraint(['seeker_id'], ['profiles.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_auto_apply_logs_seeker_id', 'auto_apply_logs', ['seeker_id'], unique=False)
    op.create_table('profiles',
    sa.Column('id', sa.CHAR(length=36), nullable=False),
    sa.Column('email', sa.VARCHAR(), nullable=False),
    sa.Column('full_name', sa.VARCHAR(), nullable=False),
    sa.Column('role', sa.VARCHAR(), nullable=False),
    sa.Column('company_name', sa.VARCHAR(), nullable=True),
    sa.Column('avatar_url', sa.VARCHAR(), nullable=True),
    sa.Column('password_hash', sa.VARCHAR(), nullable=False),
    sa.Column('is_active', sa.BOOLEAN(), nullable=False),
    sa.Column('is_verified', sa.BOOLEAN(), nullable=False),
    sa.Column('created_at', sa.DATETIME(), nullable=False),
    sa.Column('updated_at', sa.DATETIME(), nullable=False),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_table('notifications',
    sa.Column('id', sa.CHAR(length=36), nullable=False),
    sa.Column('user_id', sa.CHAR(length=36), nullable=False),
    sa.Column('title', sa.VARCHAR(), nullable=False),
    sa.Column('message', sa.TEXT(), nullable=False),
    sa.Column('notification_type', sa.VARCHAR(), nullable=False),
    sa.Column('link', sa.VARCHAR(), nullable=True),
    sa.Column('is_read', sa.BOOLEAN(), nullable=False),
    sa.Column('created_at', sa.DATETIME(), nullable=False),
    sa.ForeignKeyConstraint(['user_id'], ['profiles.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_notifications_user_id', 'notifications', ['user_id'], unique=False)
    op.create_table('job_postings',
    sa.Column('id', sa.CHAR(length=36), nullable=False),
    sa.Column('employer_id', sa.CHAR(length=36), nullable=False),
    sa.Column('title', sa.VARCHAR(), nullable=False),
    sa.Column('description', sa.TEXT(), nullable=False),
    sa.Column('requirements', sqlite.JSON(), nullable=False),
    sa.Column('responsibilities', sqlite.JSON(), nullable=False),
    sa.Column('location', sa.VARCHAR(), nullable=True),
    sa.Column('is_remote', sa.BOOLEAN(), nullable=False),
    sa.Column('salary_min', sa.INTEGER(), nullable=True),
    sa.Column('salary_max', sa.INTEGER(), nullable=True),
    sa.Column('salary_currency', sa.VARCHAR(), nullable=False),
    sa.Column('job_type', sa.VARCHAR(), nullable=True),
    sa.Column('category', sa.VARCHAR(), nullable=False),
    sa.Column('auto_screening_enabled', sa.BOOLEAN(), nullable=False),
    sa.Column('auto_approve_threshold', sa.INTEGER(), nullable=False),
    sa.Column('auto_reject_threshold', sa.INTEGER(), nullable=False),
    sa.Column('status', sa.VARCHAR(), nullable=False),
    sa.Column('external_source', sa.VARCHAR(), nullable=True),
    sa.Column('external_id', sa.VARCHAR(), nullable=True),
    sa.Column('external_url', sa.VARCHAR(), nullable=True),
    sa.Column('created_at', sa.DATETIME(), nullable=False),
    sa.Column('updated_at', sa.DATETIME(), nullable=False),
    sa.Column('closed_at', sa.DATETIME(), nullable=True),
    sa.ForeignKeyConstraint(['employer_id'], ['profiles.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_job_postings_status', 'job_postings', ['status'], unique=False)
    op.create_index('ix_job_postings_employer_id', 'job_postings', ['employer_id'], unique=False)
    op.create_index('ix_job_postings_category', 'job_postings', ['category'], unique=False)
    op.create_table('job_alerts',
    sa.Column('id', sa.CHAR(length=36), nullable=False),
    sa.Column('seeker_id', sa.CHAR(length=36), nullable=False),
    sa.Column('keywords', sqlite.JSON(), nullable=False),
    sa.Column('category', sa.VARCHAR(), nullable=True),
    sa.Column('location', sa.VARCHAR(), nullable=True),
    sa.Column('is_active', sa.BOOLEAN(), nullable=False),
    sa.Column('created_at', sa.DATETIME(), nullable=False),
    sa.ForeignKeyConstraint(['seeker_id'], ['profiles.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_job_alerts_seeker_id', 'job_alerts', ['seeker_id'], unique=False)
    op.create_table('match_scores',
    sa.Column('id', sa.CHAR(length=36), nullable=False),
    sa.Column('resume_id', sa.CHAR(length=36), nullable=False),
    sa.Column('job_posting_id', sa.CHAR(length=36), nullable=False),
    sa.Column('direction', sa.VARCHAR(), nullable=False),
    sa.Column('overall_score', sa.NUMERIC(precision=5, scale=2), nullable=False),
    sa.Column('keyword_score', sa.NUMERIC(precision=5, scale=2), nullable=False),
    sa.Column('semantic_score', sa.NUMERIC(precision=5, scale=2), nullable=False),
    sa.Column('gap_report', sqlite.JSON(), nullable=False),
    sa.Column('created_at', sa.DATETIME(), nullable=False),
    sa.Column('updated_at', sa.DATETIME(), nullable=False),
    sa.ForeignKeyConstraint(['job_posting_id'], ['job_postings.id'], ondelete='CASCADE'),
    sa.ForeignKeyConstraint(['resume_id'], ['resumes.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_match_scores_resume_id', 'match_scores', ['resume_id'], unique=False)
    op.create_index('ix_match_scores_job_posting_id', 'match_scores', ['job_posting_id'], unique=False)
    op.create_index('ix_match_scores_direction', 'match_scores', ['direction'], unique=False)
    op.create_table('chat_sessions',
    sa.Column('id', sa.CHAR(length=36), nullable=False),
    sa.Column('user_id', sa.CHAR(length=36), nullable=False),
    sa.Column('role_context', sa.VARCHAR(), nullable=False),
    sa.Column('module_context', sa.VARCHAR(), nullable=True),
    sa.Column('created_at', sa.DATETIME(), nullable=False),
    sa.Column('updated_at', sa.DATETIME(), nullable=False),
    sa.ForeignKeyConstraint(['user_id'], ['profiles.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_chat_sessions_user_id', 'chat_sessions', ['user_id'], unique=False)
    op.create_table('chat_messages',
    sa.Column('id', sa.CHAR(length=36), nullable=False),
    sa.Column('session_id', sa.CHAR(length=36), nullable=False),
    sa.Column('role', sa.VARCHAR(), nullable=False),
    sa.Column('content', sa.TEXT(), nullable=False),
    sa.Column('module_routed', sa.VARCHAR(), nullable=True),
    sa.Column('created_at', sa.DATETIME(), nullable=False),
    sa.ForeignKeyConstraint(['session_id'], ['chat_sessions.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_chat_messages_session_id', 'chat_messages', ['session_id'], unique=False)
    op.create_table('saved_jobs',
    sa.Column('id', sa.CHAR(length=36), nullable=False),
    sa.Column('seeker_id', sa.CHAR(length=36), nullable=False),
    sa.Column('job_posting_id', sa.CHAR(length=36), nullable=False),
    sa.Column('match_score_at_save', sa.NUMERIC(precision=5, scale=2), nullable=True),
    sa.Column('created_at', sa.DATETIME(), nullable=False),
    sa.ForeignKeyConstraint(['job_posting_id'], ['job_postings.id'], ondelete='CASCADE'),
    sa.ForeignKeyConstraint(['seeker_id'], ['profiles.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_saved_jobs_seeker_id', 'saved_jobs', ['seeker_id'], unique=False)
    op.create_table('resumes',
    sa.Column('id', sa.CHAR(length=36), nullable=False),
    sa.Column('user_id', sa.CHAR(length=36), nullable=False),
    sa.Column('file_name', sa.VARCHAR(), nullable=False),
    sa.Column('file_type', sa.VARCHAR(), nullable=True),
    sa.Column('parsed_data', sqlite.JSON(), nullable=False),
    sa.Column('raw_text', sa.TEXT(), nullable=False),
    sa.Column('skills', sqlite.JSON(), nullable=False),
    sa.Column('version', sa.INTEGER(), nullable=False),
    sa.Column('is_current', sa.BOOLEAN(), nullable=False),
    sa.Column('created_at', sa.DATETIME(), nullable=False),
    sa.Column('updated_at', sa.DATETIME(), nullable=False),
    sa.ForeignKeyConstraint(['user_id'], ['profiles.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_resumes_user_id', 'resumes', ['user_id'], unique=False)
    op.create_index('ix_resumes_is_current', 'resumes', ['is_current'], unique=False)
    op.create_table('applications',
    sa.Column('id', sa.CHAR(length=36), nullable=False),
    sa.Column('seeker_id', sa.CHAR(length=36), nullable=False),
    sa.Column('job_posting_id', sa.CHAR(length=36), nullable=False),
    sa.Column('resume_id', sa.CHAR(length=36), nullable=True),
    sa.Column('status', sa.VARCHAR(), nullable=False),
    sa.Column('match_score', sa.NUMERIC(precision=5, scale=2), nullable=True),
    sa.Column('applied_via', sa.VARCHAR(), nullable=False),
    sa.Column('employer_notes', sa.TEXT(), nullable=True),
    sa.Column('created_at', sa.DATETIME(), nullable=False),
    sa.Column('updated_at', sa.DATETIME(), nullable=False),
    sa.ForeignKeyConstraint(['job_posting_id'], ['job_postings.id'], ondelete='CASCADE'),
    sa.ForeignKeyConstraint(['resume_id'], ['resumes.id'], ondelete='SET NULL'),
    sa.ForeignKeyConstraint(['seeker_id'], ['profiles.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_applications_status', 'applications', ['status'], unique=False)
    op.create_index('ix_applications_seeker_id', 'applications', ['seeker_id'], unique=False)
    op.create_index('ix_applications_job_posting_id', 'applications', ['job_posting_id'], unique=False)


def downgrade() -> None:
    op.drop_index('ix_applications_job_posting_id', table_name='applications')
    op.drop_index('ix_applications_seeker_id', table_name='applications')
    op.drop_index('ix_applications_status', table_name='applications')
    op.drop_table('applications')
    op.drop_index('ix_resumes_is_current', table_name='resumes')
    op.drop_index('ix_resumes_user_id', table_name='resumes')
    op.drop_table('resumes')
    op.drop_index('ix_saved_jobs_seeker_id', table_name='saved_jobs')
    op.drop_table('saved_jobs')
    op.drop_index('ix_chat_messages_session_id', table_name='chat_messages')
    op.drop_table('chat_messages')
    op.drop_index('ix_chat_sessions_user_id', table_name='chat_sessions')
    op.drop_table('chat_sessions')
    op.drop_index('ix_match_scores_direction', table_name='match_scores')
    op.drop_index('ix_match_scores_job_posting_id', table_name='match_scores')
    op.drop_index('ix_match_scores_resume_id', table_name='match_scores')
    op.drop_table('match_scores')
    op.drop_index('ix_job_alerts_seeker_id', table_name='job_alerts')
    op.drop_table('job_alerts')
    op.drop_index('ix_job_postings_category', table_name='job_postings')
    op.drop_index('ix_job_postings_employer_id', table_name='job_postings')
    op.drop_index('ix_job_postings_status', table_name='job_postings')
    op.drop_table('job_postings')
    op.drop_index('ix_notifications_user_id', table_name='notifications')
    op.drop_table('notifications')
    op.drop_table('profiles')
    op.drop_index('ix_auto_apply_logs_seeker_id', table_name='auto_apply_logs')
    op.drop_table('auto_apply_logs')
    op.drop_index('ix_rewrite_suggestions_resume_id', table_name='rewrite_suggestions')
    op.drop_table('rewrite_suggestions')
