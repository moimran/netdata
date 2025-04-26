"""
Fix import paths in Alembic migration files

This script updates the imports in migration files to use relative imports correctly.
"""
import os
import re
import sys
from pathlib import Path

def fix_migration_file(file_path):
    """
    Fix the import paths in the given migration file
    """
    print(f"Fixing import paths in {file_path}")
    with open(file_path, 'r') as f:
        content = f.read()
    
    # Replace app.models.fields.IPNetworkType with the proper relative import
    content = content.replace(
        "app.models.fields.IPNetworkType", 
        "IPNetworkType"
    )
    
    # Add the import at the top if not already there
    if "from app.models.fields import IPNetworkType" not in content:
        content = re.sub(
            r"(from alembic import op.*?)(\n\n# revision)",
            r"\1\nfrom app.models.fields import IPNetworkType\n\n# revision",
            content
        )
    
    with open(file_path, 'w') as f:
        f.write(content)
    
    print(f"Fixed import paths in {file_path}")

def fix_all_migration_files():
    """
    Find all migration files and fix them
    """
    versions_dir = Path("alembic/versions")
    if not versions_dir.exists():
        print(f"Versions directory not found: {versions_dir}")
        return
    
    for file_path in versions_dir.glob("*.py"):
        fix_migration_file(file_path)

if __name__ == "__main__":
    fix_all_migration_files() 