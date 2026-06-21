"""
Migration: Add sharing and analytics columns to dashboards table.
Run: python migrate_dashboard_v3.py
"""
import sys
import os

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy import text
from app.core.database import engine

def run():
    print("==================================================")
    print("SMARTDG DASHBOARD SHARING SCHEMA MIGRATION")
    print("==================================================")
    
    cols_to_add = [
        ("share_enabled", "BOOLEAN DEFAULT FALSE"),
        ("share_type", "VARCHAR"),
        ("snapshot_json", "TEXT"),
        ("expires_at", "TIMESTAMP"),
        ("password_hash", "VARCHAR"),
        ("view_count", "INTEGER DEFAULT 0"),
        ("unique_visitors", "INTEGER DEFAULT 0"),
        ("unique_visitor_ips", "TEXT DEFAULT '[]'"),
        ("first_viewed_at", "TIMESTAMP"),
        ("last_viewed_at", "TIMESTAMP")
    ]
    
    try:
        with engine.begin() as conn:
            for col_name, col_type in cols_to_add:
                try:
                    # Engine-agnostic ALTER statement
                    sql = f"ALTER TABLE dashboards ADD COLUMN {col_name} {col_type}"
                    conn.execute(text(sql))
                    print(f"[+] Added column: {col_name} ({col_type})")
                except Exception as e:
                    # Catch cases where columns already exist (e.g. SQLite duplicate column errors)
                    print(f"[INFO] Skipped column: {col_name} (already exists or database restriction)")
        print("\nSUCCESS: Migration completed successfully.")
    except Exception as e:
        print(f"\n[ERR] Migration failed: {e}")
        sys.exit(1)

if __name__ == "__main__":
    run()
