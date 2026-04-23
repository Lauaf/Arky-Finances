from collections.abc import Generator

from fastapi import HTTPException, status
from sqlalchemy import create_engine, inspect, text
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from app.core.config import DATABASE_CONFIG_ERROR, DATABASE_URL


class Base(DeclarativeBase):
    pass


IS_SQLITE = DATABASE_URL.startswith("sqlite") if DATABASE_URL else False
DATABASE_ENGINE_ERROR: str | None = None


def sanitize_database_message(message: str) -> str:
    if DATABASE_URL:
        return message.replace(DATABASE_URL, "[database-url-redacted]")
    return message


def build_connect_args() -> dict[str, object]:
    if IS_SQLITE:
        return {"check_same_thread": False}

    # Supabase transaction pooler is the right fit for Vercel/serverless, but
    # PgBouncer-style transaction pooling does not support prepared statements.
    if "supabase" in DATABASE_URL or "pooler" in DATABASE_URL:
        return {"prepare_threshold": None}

    return {}


def build_engine_options() -> dict[str, object]:
    if IS_SQLITE:
        return {}

    return {
        "pool_size": 1,
        "max_overflow": 2,
        "pool_recycle": 300,
    }


try:
    engine = (
        create_engine(
            DATABASE_URL,
            connect_args=build_connect_args(),
            pool_pre_ping=not IS_SQLITE,
            **build_engine_options(),
            future=True,
        )
        if DATABASE_URL
        else None
    )
except Exception as exc:
    DATABASE_ENGINE_ERROR = sanitize_database_message(str(exc))
    engine = None

SessionLocal = (
    sessionmaker(
        bind=engine,
        autoflush=False,
        autocommit=False,
        expire_on_commit=False,
        future=True,
    )
    if engine is not None
    else None
)


def get_db() -> Generator[Session, None, None]:
    if SessionLocal is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=DATABASE_ENGINE_ERROR or DATABASE_CONFIG_ERROR or "Database is not configured.",
        )

    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db() -> None:
    if engine is None:
        raise RuntimeError(DATABASE_ENGINE_ERROR or DATABASE_CONFIG_ERROR or "Database is not configured.")

    from app.models import expense, goal, income, profile, scenario, user  # noqa: F401

    Base.metadata.create_all(bind=engine)
    run_lightweight_migrations()
    Base.metadata.create_all(bind=engine)


def run_lightweight_migrations() -> None:
    if engine is None:
        raise RuntimeError(DATABASE_ENGINE_ERROR or DATABASE_CONFIG_ERROR or "Database is not configured.")

    inspector = inspect(engine)
    existing_tables = set(inspector.get_table_names())

    with engine.begin() as connection:
        if "users" not in existing_tables:
            connection.execute(
                text(
                    """
                    CREATE TABLE users (
                        id INTEGER PRIMARY KEY,
                        name VARCHAR(120) NOT NULL,
                        locale VARCHAR(20) NOT NULL DEFAULT 'en-US',
                        timezone VARCHAR(64) NOT NULL DEFAULT 'America/Argentina/Buenos_Aires',
                        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
                    )
                    """
                )
            )
            connection.execute(
                text(
                    """
                    INSERT INTO users (name, locale, timezone)
                    VALUES ('Primary user', 'en-US', 'America/Argentina/Buenos_Aires')
                    """
                )
            )

        default_user_id = connection.execute(text("SELECT id FROM users ORDER BY id ASC LIMIT 1")).scalar_one_or_none()
        if default_user_id is None:
            connection.execute(
                text(
                    """
                    INSERT INTO users (name, locale, timezone)
                    VALUES ('Primary user', 'en-US', 'America/Argentina/Buenos_Aires')
                    """
                )
            )
            default_user_id = connection.execute(text("SELECT id FROM users ORDER BY id ASC LIMIT 1")).scalar_one()

        for table_name in ("profiles", "incomes", "expenses", "goals"):
            columns = {column["name"] for column in inspect(engine).get_columns(table_name)}
            if "user_id" not in columns:
                connection.execute(text(f"ALTER TABLE {table_name} ADD COLUMN user_id INTEGER"))
            connection.execute(
                text(f"UPDATE {table_name} SET user_id = :default_user_id WHERE user_id IS NULL"),
                {"default_user_id": default_user_id},
            )
