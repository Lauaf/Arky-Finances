from app.core.database import SessionLocal, init_db
from app.services.seed import seed_database


def main() -> None:
    init_db()
    with SessionLocal() as db:
        seed_database(db)
    print("Arky Finances database initialized.")


if __name__ == "__main__":
    main()
