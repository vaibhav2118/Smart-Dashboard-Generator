import sqlite3
import os

db_path = os.path.join(os.path.dirname(__file__), "smartdg.db")

if not os.path.exists(db_path):
    print(f"Database not found at {db_path}")
    exit(1)

conn = sqlite3.connect(db_path)
cursor = conn.cursor()

try:
    cursor.execute("ALTER TABLE dashboards ADD COLUMN layout_json TEXT")
    print("Added layout_json column to dashboards table")
except sqlite3.OperationalError as e:
    print(f"Skipped layout_json: {e}")

conn.commit()
conn.close()
print("Migration completed successfully.")
