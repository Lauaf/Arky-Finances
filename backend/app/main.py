from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from app.core.config import API_PREFIX, APP_NAME, CORS_ORIGINS, DATABASE_MODE, DATABASE_PROVIDER
from app.core.database import SessionLocal, init_db
from app.routers import expenses, goals, incomes, insights, profile, scenarios, users
from app.services.seed import seed_database


@asynccontextmanager
async def lifespan(_: FastAPI):
    init_db()
    with SessionLocal() as db:
        seed_database(db)
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
def healthcheck() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/health/db")
def database_healthcheck() -> dict[str, str | int]:
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

    return {
        "status": "ok",
        "database_mode": DATABASE_MODE,
        "database_provider": DATABASE_PROVIDER,
        **table_counts,
    }


@app.get("/")
def root() -> dict[str, str]:
    return {
        "name": APP_NAME,
        "status": "ok",
        "database_mode": DATABASE_MODE,
        "database_provider": DATABASE_PROVIDER,
        "docs_url": "/docs",
        "database_health_url": "/health/db",
    }


app.include_router(profile.router, prefix=API_PREFIX)
app.include_router(users.router, prefix=API_PREFIX)
app.include_router(incomes.router, prefix=API_PREFIX)
app.include_router(expenses.router, prefix=API_PREFIX)
app.include_router(goals.router, prefix=API_PREFIX)
app.include_router(scenarios.router, prefix=API_PREFIX)
app.include_router(insights.router, prefix=API_PREFIX)
