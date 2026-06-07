import sqlite3
import os

db_path = os.path.join(os.path.dirname(__file__), "smartdg.db")

if not os.path.exists(db_path):
    print(f"Database not found at {db_path}")
    exit(1)

conn = sqlite3.connect(db_path)
cursor = conn.cursor()

migrations = [
    ("dashboards", "description", "TEXT"),
    ("dashboards", "theme", "VARCHAR DEFAULT 'dark'"),
]

for table, column, col_type in migrations:
    try:
        cursor.execute(f"ALTER TABLE {table} ADD COLUMN {column} {col_type}")
        print(f"Added {column} to {table}")
    except sqlite3.OperationalError as e:
        print(f"Skipped {column} on {table}: {e}")

conn.commit()
conn.close()
print("Phase D-H migration completed successfully.")
