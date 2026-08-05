"""profile settings fields

Revision ID: f7a2b9c3d4e5
Revises: a1b2c3d4e5f6
Create Date: 2026-08-06

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = 'f7a2b9c3d4e5'
down_revision: Union[str, None] = 'a1b2c3d4e5f6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('profiles', sa.Column('bio', sa.TEXT(), nullable=True))
    op.add_column('profiles', sa.Column('headline', sa.VARCHAR(), nullable=True))
    op.add_column('profiles', sa.Column('phone', sa.VARCHAR(), nullable=True))
    op.add_column('profiles', sa.Column('location', sa.VARCHAR(), nullable=True))
    op.add_column('profiles', sa.Column('linkedin', sa.VARCHAR(), nullable=True))
    op.add_column('profiles', sa.Column('website', sa.VARCHAR(), nullable=True))
    op.add_column('profiles', sa.Column('theme', sa.VARCHAR(), nullable=False, server_default='dark'))
    op.add_column('profiles', sa.Column('locale', sa.VARCHAR(), nullable=False, server_default='en'))
    op.add_column('profiles', sa.Column('notification_prefs', sa.JSON(), nullable=False, server_default=sa.text("'{}'")))


def downgrade() -> None:
    op.drop_column('profiles', 'notification_prefs')
    op.drop_column('profiles', 'locale')
    op.drop_column('profiles', 'theme')
    op.drop_column('profiles', 'website')
    op.drop_column('profiles', 'linkedin')
    op.drop_column('profiles', 'location')
    op.drop_column('profiles', 'phone')
    op.drop_column('profiles', 'headline')
    op.drop_column('profiles', 'bio')
