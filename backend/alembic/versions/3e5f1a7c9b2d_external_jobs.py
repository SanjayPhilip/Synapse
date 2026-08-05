"""external jobs

Revision ID: 3e5f1a7c9b2d
Revises: 286188382dec
Create Date: 2026-08-05

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = '3e5f1a7c9b2d'
down_revision: Union[str, None] = '286188382dec'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table('external_jobs',
    sa.Column('id', sa.CHAR(length=36), nullable=False),
    sa.Column('external_source', sa.VARCHAR(), nullable=False),
    sa.Column('external_id', sa.VARCHAR(), nullable=False),
    sa.Column('title', sa.VARCHAR(), nullable=False),
    sa.Column('company', sa.VARCHAR(), nullable=True),
    sa.Column('description', sa.TEXT(), nullable=False),
    sa.Column('requirements', sa.JSON(), nullable=False),
    sa.Column('location', sa.VARCHAR(), nullable=True),
    sa.Column('is_remote', sa.BOOLEAN(), nullable=False),
    sa.Column('salary_min', sa.INTEGER(), nullable=True),
    sa.Column('salary_max', sa.INTEGER(), nullable=True),
    sa.Column('salary_currency', sa.VARCHAR(), nullable=False),
    sa.Column('job_type', sa.VARCHAR(), nullable=True),
    sa.Column('category', sa.VARCHAR(), nullable=True),
    sa.Column('external_url', sa.VARCHAR(), nullable=True),
    sa.Column('posted_at', sa.DATETIME(), nullable=True),
    sa.Column('fetched_at', sa.DATETIME(), nullable=False),
    sa.Column('is_active', sa.BOOLEAN(), nullable=False),
    sa.Column('created_at', sa.DATETIME(), nullable=False),
    sa.Column('updated_at', sa.DATETIME(), nullable=False),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('external_source', 'external_id')
    )


def downgrade() -> None:
    op.drop_table('external_jobs')