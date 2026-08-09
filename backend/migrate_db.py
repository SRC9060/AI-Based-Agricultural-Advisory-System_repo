import sqlite3
import os

new_columns = [
    ("farm_name", "TEXT DEFAULT ''"),
    ("farm_size_unit", "TEXT DEFAULT 'Acres'"),
    ("irrigation_type", "TEXT DEFAULT ''"),
    ("farming_type", "TEXT DEFAULT ''"),
    ("crop_variety", "TEXT DEFAULT ''"),
    ("sowing_date", "TEXT DEFAULT ''"),
    ("expected_harvest_date", "TEXT DEFAULT ''"),
    ("crop_area", "TEXT DEFAULT ''"),
    ("growth_stage", "TEXT DEFAULT ''"),
]

root_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))

for root, dirs, files in os.walk(root_dir):
    if "venv" in root or "node_modules" in root or ".next" in root:
        continue
    for file in files:
        if file.endswith(".db"):
            db_path = os.path.join(root, file)
            print(f"Checking database: {db_path}")
            try:
                conn = sqlite3.connect(db_path)
                cursor = conn.cursor()
                cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='users';")
                if cursor.fetchone():
                    cursor.execute("PRAGMA table_info(users);")
                    existing_cols = [row[1] for row in cursor.fetchall()]
                    for col_name, col_def in new_columns:
                        if col_name not in existing_cols:
                            print(f"  Adding column '{col_name}' to 'users' table in {db_path}")
                            cursor.execute(f"ALTER TABLE users ADD COLUMN {col_name} {col_def};")
                    conn.commit()
                conn.close()
            except Exception as e:
                print(f"  Error migrating {db_path}: {e}")

print("Comprehensive database migration completed!")
