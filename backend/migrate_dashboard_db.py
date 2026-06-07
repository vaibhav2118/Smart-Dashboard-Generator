import sqlite3
import os

db_path = os.path.join(os.path.dirname(__file__), "smartdg.db")

if not os.path.exists(db_path):
    print(f"Database not found at {db_path}")
    exit(1)

conn = sqlite3.connect(db_path)
cursor = conn.cursor()

try:
    cursor.execute("ALTER TABLE dashboards ADD COLUMN dashboard_type VARCHAR")
    print("Added dashboard_type column to dashboards")
except sqlite3.OperationalError as e:
    print(f"Skipped dashboard_type: {e}")

conn.commit()
conn.close()
print("Migration completed successfully.")
