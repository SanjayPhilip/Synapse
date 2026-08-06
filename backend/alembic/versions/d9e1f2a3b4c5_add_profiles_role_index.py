"""add profiles.role index

Revision ID: d9e1f2a3b4c5
Revises: c8d4e6f0a2b4
Create Date: 2026-08-06

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = 'd9e1f2a3b4c5'
down_revision: Union[str, None] = 'c8d4e6f0a2b4'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_index('ix_profiles_role', 'profiles', ['role'], unique=False)


def downgrade() -> None:
    op.drop_index('ix_profiles_role', table_name='profiles')
