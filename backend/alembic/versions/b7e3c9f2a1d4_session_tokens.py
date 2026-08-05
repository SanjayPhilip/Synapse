"""session tokens and soft delete

Revision ID: b7e3c9f2a1d4
Revises: f7a2b9c3d4e5
Create Date: 2026-08-06

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = 'b7e3c9f2a1d4'
down_revision: Union[str, None] = 'f7a2b9c3d4e5'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('profiles', sa.Column('is_deleted', sa.BOOLEAN(), nullable=False, server_default=sa.text('0')))
    op.create_table('session_tokens',
    sa.Column('id', sa.CHAR(length=36), nullable=False),
    sa.Column('user_id', sa.CHAR(length=36), nullable=False),
    sa.Column('token_hash', sa.VARCHAR(), nullable=False),
    sa.Column('user_agent', sa.VARCHAR(), nullable=True),
    sa.Column('ip_address', sa.VARCHAR(), nullable=True),
    sa.Column('created_at', sa.DATETIME(), nullable=False),
    sa.Column('last_used_at', sa.DATETIME(), nullable=True),
    sa.Column('expires_at', sa.DATETIME(), nullable=False),
    sa.Column('revoked_at', sa.DATETIME(), nullable=True),
    sa.ForeignKeyConstraint(['user_id'], ['profiles.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_session_tokens_user_id', 'session_tokens', ['user_id'], unique=False)


def downgrade() -> None:
    op.drop_index('ix_session_tokens_user_id', table_name='session_tokens')
    op.drop_table('session_tokens')
    op.drop_column('profiles', 'is_deleted')
