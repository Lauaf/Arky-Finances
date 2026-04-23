from contextlib import asynccontextmanager

from fastapi import FastAPI, Response, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from app.core.config import (
    API_PREFIX,
    APP_NAME,
    CORS_ORIGINS,
    DATABASE_CONFIG_ERROR,
    DATABASE_CONFIGURED,
    DATABASE_MODE,
    DATABASE_PROVIDER,
    DATABASE_URL,
)
from app.core.database import SessionLocal, init_db
from app.routers import expenses, goals, incomes, insights, profile, scenarios, users
from app.services.seed import seed_database

DB_STARTUP_ERROR: str | None = None


def sanitize_error(error: Exception | str) -> str:
    message = str(error)
    if DATABASE_URL:
        message = message.replace(DATABASE_URL, "[database-url-redacted]")
    return message


@asynccontextmanager
async def lifespan(_: FastAPI):
    global DB_STARTUP_ERROR
    try:
        init_db()
        if SessionLocal is None:
            raise RuntimeError(DATABASE_CONFIG_ERROR or "Database is not configured.")
        with SessionLocal() as db:
            seed_database(db)
        DB_STARTUP_ERROR = None
    except Exception as exc:
        DB_STARTUP_ERROR = sanitize_error(exc)
    yield


app = FastAPI(title=APP_NAME, version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
@app.get(f"{API_PREFIX}/health")
def healthcheck() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/health/db")
@app.get(f"{API_PREFIX}/health/db")
def database_healthcheck(response: Response) -> dict[str, str | int | bool | None]:
    if SessionLocal is None:
        response.status_code = status.HTTP_503_SERVICE_UNAVAILABLE
        return {
            "status": "error",
            "database_configured": DATABASE_CONFIGURED,
            "database_mode": DATABASE_MODE,
            "database_provider": DATABASE_PROVIDER,
            "startup_error": DB_STARTUP_ERROR or DATABASE_CONFIG_ERROR,
        }

    try:
        with SessionLocal() as db:
            db.execute(text("select 1"))
            table_counts = {
                "users": db.execute(text("select count(*) from users")).scalar_one(),
                "profiles": db.execute(text("select count(*) from profiles")).scalar_one(),
                "incomes": db.execute(text("select count(*) from incomes")).scalar_one(),
                "expenses": db.execute(text("select count(*) from expenses")).scalar_one(),
                "goals": db.execute(text("select count(*) from goals")).scalar_one(),
                "scenarios": db.execute(text("select count(*) from scenarios")).scalar_one(),
            }
    except Exception as exc:
        response.status_code = status.HTTP_503_SERVICE_UNAVAILABLE
        return {
            "status": "error",
            "database_configured": DATABASE_CONFIGURED,
            "database_mode": DATABASE_MODE,
            "database_provider": DATABASE_PROVIDER,
            "startup_error": DB_STARTUP_ERROR,
            "database_error": sanitize_error(exc),
        }

    return {
        "status": "ok",
        "database_configured": DATABASE_CONFIGURED,
        "database_mode": DATABASE_MODE,
        "database_provider": DATABASE_PROVIDER,
        "startup_error": DB_STARTUP_ERROR,
        **table_counts,
    }


@app.get("/")
def root() -> dict[str, str | bool | None]:
    return {
        "name": APP_NAME,
        "status": "ok",
        "database_configured": DATABASE_CONFIGURED,
        "database_mode": DATABASE_MODE,
        "database_provider": DATABASE_PROVIDER,
        "database_startup_ok": DB_STARTUP_ERROR is None,
        "database_startup_error": DB_STARTUP_ERROR,
        "docs_url": "/docs",
        "database_health_url": "/health/db",
        "api_database_health_url": f"{API_PREFIX}/health/db",
    }


app.include_router(profile.router, prefix=API_PREFIX)
app.include_router(users.router, prefix=API_PREFIX)
app.include_router(incomes.router, prefix=API_PREFIX)
app.include_router(expenses.router, prefix=API_PREFIX)
app.include_router(goals.router, prefix=API_PREFIX)
app.include_router(scenarios.router, prefix=API_PREFIX)
app.include_router(insights.router, prefix=API_PREFIX)
