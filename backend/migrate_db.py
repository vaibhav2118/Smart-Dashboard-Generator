import sqlite3
import os

db_path = os.path.join(os.path.dirname(__file__), "smartdg.db")

if not os.path.exists(db_path):
    print(f"Database not found at {db_path}")
    exit(1)

conn = sqlite3.connect(db_path)
cursor = conn.cursor()

try:
    cursor.execute("ALTER TABLE datasets ADD COLUMN dataset_category VARCHAR DEFAULT 'General Dataset'")
    print("Added dataset_category column")
except sqlite3.OperationalError as e:
    print(f"Skipped dataset_category: {e}")

try:
    cursor.execute("ALTER TABLE datasets ADD COLUMN detected_columns TEXT")
    print("Added detected_columns column")
except sqlite3.OperationalError as e:
    print(f"Skipped detected_columns: {e}")

try:
    cursor.execute("ALTER TABLE datasets ADD COLUMN last_profiled_at DATETIME")
    print("Added last_profiled_at column")
except sqlite3.OperationalError as e:
    print(f"Skipped last_profiled_at: {e}")

conn.commit()
conn.close()
print("Migration completed successfully.")
