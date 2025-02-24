"""merge branches

Revision ID: da6a2dfe9a63
Revises: 913aad517986, 20250224_remove_subnet
Create Date: 2025-02-24 22:57:38.781900

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
import sqlmodel


# revision identifiers, used by Alembic.
revision: str = 'da6a2dfe9a63'
down_revision: Union[str, None] = ('913aad517986', '20250224_remove_subnet')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
