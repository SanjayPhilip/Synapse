"""job alert scheduler columns

Revision ID: a1b2c3d4e5f6
Revises: 3e5f1a7c9b2d
Create Date: 2026-08-05

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, None] = '3e5f1a7c9b2d'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('job_alerts', sa.Column('last_checked', sa.DateTime(), nullable=True))
    op.add_column('job_alerts', sa.Column('frequency', sa.VARCHAR(), nullable=False, server_default='daily'))
    op.add_column('job_alerts', sa.Column('email_enabled', sa.BOOLEAN(), nullable=False, server_default='1'))


def downgrade() -> None:
    op.drop_column('job_alerts', 'email_enabled')
    op.drop_column('job_alerts', 'frequency')
    op.drop_column('job_alerts', 'last_checked')
