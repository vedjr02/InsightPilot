"""CLI entry: python -m app.migrate"""

from app.schema import apply_schema


def main() -> None:
    apply_schema()
    print("Migration complete.")


if __name__ == "__main__":
    main()
