from sqlalchemy import text
from sqlalchemy.engine import Connection
from typing import Optional

def create_hypertable(
    connection: Connection,
    table_name: str,
    time_column: str,
    chunk_time_interval: str = "7 days",
    if_not_exists: bool = True
) -> None:
    """
    Convert a regular PostgreSQL table to a TimescaleDB hypertable.
    
    Args:
        connection: SQLAlchemy connection object
        table_name: Name of the table to convert
        time_column: Name of the column to use as time dimension
        chunk_time_interval: Time interval for chunks (default: 7 days)
        if_not_exists: Whether to use IF NOT EXISTS clause
    
    Example usage in an Alembic migration:
    
    ```python
    from app.utils.timescale_helpers import create_hypertable
    
    def upgrade() -> None:
        # Create the regular table first using normal Alembic operations
        op.create_table(...)
        
        # Then convert it to a hypertable
        with op.get_bind().connect() as conn:
            create_hypertable(
                connection=conn,
                table_name="device_metrics",
                time_column="timestamp",
                chunk_time_interval="1 day"
            )
    ```
    """
    if_not_exists_clause = "IF NOT EXISTS" if if_not_exists else ""
    
    sql = text(f"""
    SELECT create_hypertable(
        '{table_name}', 
        '{time_column}', 
        {if_not_exists_clause}
        chunk_time_interval => interval '{chunk_time_interval}'
    );
    """)
    
    connection.execute(sql)
