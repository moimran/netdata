#!/usr/bin/env python3
"""
Utility script to forcefully delete and recreate the netdata database with required schemas.

This script will:
1. Connect to PostgreSQL with admin credentials
2. Drop the netdata database if it exists
3. Create a new netdata database
4. Create the required schemas (ipam, jobs, ni)
5. Apply migrations using alembic

Usage:
    python scripts/build_database.py [--no-drop]

Options:
    --no-drop    Skip dropping the database (only create schemas)
"""
import argparse
import os
import sys
import subprocess
from pathlib import Path

import psycopg2
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT

# Add the backend directory to the Python path
backend_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_dir))

from app.config import Settings

def parse_args():
    """Parse command line arguments."""
    parser = argparse.ArgumentParser(
        description='Utility to delete and recreate the netdata database with required schemas'
    )
    parser.add_argument('--no-drop', action='store_true', help='Skip dropping the database')
    return parser.parse_args()

def get_admin_connection_string():
    """Get PostgreSQL admin connection string from environment or use defaults."""
    settings = Settings()
    # Extract the database URL components
    db_url_parts = settings.DATABASE_URL.split('/')
    db_url_prefix = '/'.join(db_url_parts[:-1])
    
    # Connect to the default 'postgres' database for admin operations
    return f"{db_url_prefix}/postgres"

def drop_database(conn, db_name):
    """Drop the database if it exists."""
    print(f"Attempting to drop database {db_name} if it exists...")
    
    # Set isolation level to AUTOCOMMIT to execute DROP DATABASE
    conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
    cursor = conn.cursor()
    
    # Check if database exists
    cursor.execute("SELECT 1 FROM pg_database WHERE datname = %s", (db_name,))
    exists = cursor.fetchone()
    
    if exists:
        # Terminate all connections to the database
        cursor.execute(f"""
            SELECT pg_terminate_backend(pg_stat_activity.pid)
            FROM pg_stat_activity
            WHERE pg_stat_activity.datname = '{db_name}'
            AND pid <> pg_backend_pid()
        """)
        
        # Drop the database
        print(f"Dropping database {db_name}...")
        cursor.execute(f"DROP DATABASE {db_name}")
        print(f"Database {db_name} dropped successfully")
    else:
        print(f"Database {db_name} does not exist, nothing to drop")
    
    cursor.close()

def create_database(conn, db_name):
    """Create the database."""
    print(f"Creating database {db_name}...")
    
    # Set isolation level to AUTOCOMMIT to execute CREATE DATABASE
    conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
    cursor = conn.cursor()
    
    # Check if database already exists
    cursor.execute("SELECT 1 FROM pg_database WHERE datname = %s", (db_name,))
    exists = cursor.fetchone()
    
    if not exists:
        # Create the database
        cursor.execute(f"CREATE DATABASE {db_name}")
        print(f"Database {db_name} created successfully")
    else:
        print(f"Database {db_name} already exists, skipping creation")
    
    cursor.close()

def create_schemas(db_url):
    """Create the required schemas in the database."""
    print("Creating schemas (ipam, jobs, ni)...")
    
    conn = psycopg2.connect(db_url)
    conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
    cursor = conn.cursor()
    
    # Create schemas
    for schema in ['ipam', 'jobs', 'ni']:
        cursor.execute(f"CREATE SCHEMA IF NOT EXISTS {schema}")
        print(f"Schema {schema} created successfully")
    
    cursor.close()
    conn.close()

def run_migrations():
    """Run alembic migrations to create the tables."""
    print("Running database migrations...")
    
    # Change to the backend directory and run alembic
    os.chdir(backend_dir)
    
    # Apply migrations using alembic
    try:
        subprocess.run(["alembic", "upgrade", "head"], check=True)
        print("Migrations completed successfully")
    except subprocess.CalledProcessError as e:
        print(f"Error running migrations: {e}")
        sys.exit(1)

def main():
    """Main function."""
    args = parse_args()
    settings = Settings()
    
    # Extract database name from the DATABASE_URL
    db_url_parts = settings.DATABASE_URL.split('/')
    db_name = db_url_parts[-1]
    
    # Connect to PostgreSQL as admin
    admin_conn_string = get_admin_connection_string()
    
    try:
        conn = psycopg2.connect(admin_conn_string)
        
        # Drop database if requested
        if not args.no_drop:
            drop_database(conn, db_name)
        
        # Create database
        create_database(conn, db_name)
        conn.close()
        
        # Create schemas
        create_schemas(settings.DATABASE_URL)
        
        # Run migrations
        run_migrations()
        
        print("Database setup completed successfully")
        
    except Exception as e:
        print(f"Error setting up database: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
