"""job moderation + interview link

Revision ID: c8d4e6f0a2b4
Revises: b7e3c9f2a1d4
Create Date: 2026-08-06

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = 'c8d4e6f0a2b4'
down_revision: Union[str, None] = 'b7e3c9f2a1d4'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('job_postings', sa.Column('moderation_status', sa.VARCHAR(), nullable=False, server_default='approved'))
    op.create_index('ix_job_postings_moderation_status', 'job_postings', ['moderation_status'], unique=False)
    op.add_column('applications', sa.Column('interview_link', sa.VARCHAR(), nullable=True))


def downgrade() -> None:
    op.drop_column('applications', 'interview_link')
    op.drop_index('ix_job_postings_moderation_status', table_name='job_postings')
    op.drop_column('job_postings', 'moderation_status')
