import os
from pathlib import Path

APP_NAME = "Arky Finances API"
API_PREFIX = "/api"
BASE_CURRENCY = "ARS"
DEFAULT_PROJECTION_MONTHS = 12
IS_VERCEL = bool(os.getenv("VERCEL"))
ALLOW_TEMP_SQLITE = os.getenv("ALLOW_TEMP_SQLITE") == "1"

BACKEND_DIR = Path(__file__).resolve().parents[2]
DATA_DIR = Path("/tmp/arky-finances") if IS_VERCEL else BACKEND_DIR / "data"
DATA_DIR.mkdir(parents=True, exist_ok=True)
DATABASE_PATH = DATA_DIR / "arky_finances.db"
LOCAL_DATABASE_URL = f"sqlite:///{DATABASE_PATH.as_posix()}"


def _normalize_database_url(raw_url: str) -> str:
    if raw_url.startswith("postgres://"):
        return raw_url.replace("postgres://", "postgresql+psycopg://", 1)
    if raw_url.startswith("postgresql://"):
        return raw_url.replace("postgresql://", "postgresql+psycopg://", 1)
    return raw_url


def get_database_url() -> str:
    raw_url = os.getenv("DATABASE_URL") or os.getenv("POSTGRES_URL")
    if raw_url:
        return _normalize_database_url(raw_url)

    if IS_VERCEL and not ALLOW_TEMP_SQLITE:
        raise RuntimeError(
            "DATABASE_URL or POSTGRES_URL is required on Vercel. "
            "Set it to the Supabase Postgres connection string and redeploy."
        )

    return LOCAL_DATABASE_URL


def get_database_mode(database_url: str) -> str:
    return "sqlite" if database_url.startswith("sqlite") else "external"


def get_database_provider(database_url: str) -> str:
    lowered_url = database_url.lower()
    if lowered_url.startswith("sqlite"):
        return "sqlite"
    if "supabase" in lowered_url:
        return "supabase"
    if lowered_url.startswith("postgresql"):
        return "postgres"
    return "external"


def get_cors_origins() -> list[str]:
    raw_origins = os.getenv("CORS_ORIGINS")
    if raw_origins:
        return [origin.strip() for origin in raw_origins.split(",") if origin.strip()]

    return [
        "http://localhost:4200",
        "http://127.0.0.1:4200",
    ]


DATABASE_URL = get_database_url()
DATABASE_MODE = get_database_mode(DATABASE_URL)
DATABASE_PROVIDER = get_database_provider(DATABASE_URL)
CORS_ORIGINS = get_cors_origins()
