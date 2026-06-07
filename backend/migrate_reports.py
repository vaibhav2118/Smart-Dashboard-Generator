import sqlite3
import os

db_path = os.path.join(os.path.dirname(__file__), "smartdg.db")

if not os.path.exists(db_path):
    print(f"Database not found at {db_path}")
    exit(1)

conn = sqlite3.connect(db_path)
cursor = conn.cursor()

# Add report_type
try:
    cursor.execute("ALTER TABLE reports ADD COLUMN report_type VARCHAR")
    print("Added report_type column to reports table")
except sqlite3.OperationalError as e:
    print(f"Skipped report_type: {e}")

# Add report_path
try:
    cursor.execute("ALTER TABLE reports ADD COLUMN report_path VARCHAR")
    print("Added report_path column to reports table")
except sqlite3.OperationalError as e:
    print(f"Skipped report_path: {e}")

# Note: sqlite3 does not support altering column constraints (like nullable).
# But SQLite doesn't enforce NULL constraints on existing tables for new columns unless specified,
# and we changed dataset_id to be nullable in SQLAlchemy which is sufficient since SQLite doesn't enforce FK checks by default.

conn.commit()
conn.close()
print("Reports table migration completed successfully.")
