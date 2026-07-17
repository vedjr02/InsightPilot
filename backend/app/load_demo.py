"""Load the bundled retail sales demo CSV into Neon.

Usage (from backend/):
    python -m app.load_demo
"""

from __future__ import annotations

from pathlib import Path

from app.schema import apply_schema
from app.services.ingestion import load_or_replace_demo

# Repo root: backend/app/load_demo.py → ../../
REPO_ROOT = Path(__file__).resolve().parents[2]
DEMO_CSV = REPO_ROOT / "data" / "demo" / "retail_sales.csv"


def main() -> None:
    if not DEMO_CSV.exists():
        raise SystemExit(f"Demo CSV not found at {DEMO_CSV}")
    apply_schema()
    result = load_or_replace_demo(DEMO_CSV)
    print("Demo dataset loaded:")
    print(f"  id:         {result['id']}")
    print(f"  name:       {result['name']}")
    print(f"  table:      {result['table_name']}")
    print(f"  rows:       {result['row_count']}")
    print(f"  columns:    {result['profile']['column_count']}")
    cols = ", ".join(c["name"] for c in result["profile"]["columns"])
    print(f"  col names:  {cols}")


if __name__ == "__main__":
    main()
