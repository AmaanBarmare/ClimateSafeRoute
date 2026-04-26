"""Idempotent schema application — runs scripts/schema.sql against DATABASE_URL.

Safe to run multiple times (CREATE TABLE/INDEX IF NOT EXISTS).
"""
import os
from pathlib import Path

from dotenv import load_dotenv
from sqlalchemy import create_engine

ROOT = Path(__file__).resolve().parent.parent
load_dotenv(ROOT / ".env")

SCHEMA_PATH = ROOT / "scripts" / "schema.sql"


def main() -> None:
    db_url = os.environ["DATABASE_URL"]
    if db_url.startswith("postgres://"):
        db_url = db_url.replace("postgres://", "postgresql://", 1)
    engine = create_engine(db_url)
    sql = SCHEMA_PATH.read_text()
    print(f"Applying schema from {SCHEMA_PATH}")
    with engine.begin() as conn:
        conn.exec_driver_sql(sql)
    print("Schema applied.")


if __name__ == "__main__":
    main()
