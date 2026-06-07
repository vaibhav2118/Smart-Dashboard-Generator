"""
Migration: Add description + theme columns to dashboards table.
Run: python migrate_dashboard_v2.py
"""
import sqlite3
import os

DB_PATH = os.path.join(os.path.dirname(__file__), "smartdg.db")

def run():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    # Check existing columns
    cursor.execute("PRAGMA table_info(dashboards)")
    cols = {row[1] for row in cursor.fetchall()}
    print(f"Existing columns: {cols}")

    added = []

    if "description" not in cols:
        cursor.execute("ALTER TABLE dashboards ADD COLUMN description TEXT")
        added.append("description")

    if "theme" not in cols:
        cursor.execute("ALTER TABLE dashboards ADD COLUMN theme VARCHAR DEFAULT 'dark'")
        added.append("theme")

    conn.commit()
    conn.close()

    if added:
        print(f"✅ Added columns: {added}")
    else:
        print("✅ Schema already up to date — no changes needed.")

if __name__ == "__main__":
    run()
