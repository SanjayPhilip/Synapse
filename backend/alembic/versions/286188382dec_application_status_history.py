"""application status history

Revision ID: 286188382dec
Revises: e5b522db35f8
Create Date: 2026-08-05

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = '286188382dec'
down_revision: Union[str, None] = 'e5b522db35f8'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table('application_status_history',
    sa.Column('id', sa.CHAR(length=36), nullable=False),
    sa.Column('application_id', sa.CHAR(length=36), nullable=False),
    sa.Column('old_status', sa.VARCHAR(), nullable=True),
    sa.Column('new_status', sa.VARCHAR(), nullable=False),
    sa.Column('changed_by', sa.CHAR(length=36), nullable=True),
    sa.Column('reason', sa.VARCHAR(), nullable=True),
    sa.Column('notes', sa.TEXT(), nullable=True),
    sa.Column('created_at', sa.DATETIME(), nullable=False),
    sa.ForeignKeyConstraint(['application_id'], ['applications.id'], ondelete='CASCADE'),
    sa.ForeignKeyConstraint(['changed_by'], ['profiles.id'], ondelete='SET NULL'),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_application_status_history_application_id', 'application_status_history', ['application_id'], unique=False)


def downgrade() -> None:
    op.drop_index('ix_application_status_history_application_id', table_name='application_status_history')
    op.drop_table('application_status_history')
