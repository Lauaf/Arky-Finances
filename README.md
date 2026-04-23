# Arky Finances

Arky Finances is a local-first personal finance planner focused on monthly cash flow, savings goals, and simple scenario testing. It is built to replace spreadsheet-based planning with a cleaner workflow that answers three practical questions:

- How much can I safely spend this month?
- How much should I save this month?
- When do I reach each goal?

## Stack

- Frontend: Angular 20
- Backend: FastAPI + Pydantic + SQLAlchemy
- Local database: SQLite
- Production on Vercel: FastAPI serverless with a required external Postgres database through `DATABASE_URL`
- Communication: REST

## Repository structure

```text
.
|-- backend/
|   |-- app/
|   |   |-- core/
|   |   |-- models/
|   |   |-- routers/
|   |   |-- schemas/
|   |   |-- services/
|   |   |-- index.py
|   |   |-- init_db.py
|   |   `-- main.py
|   |-- data/
|   |-- .env.example
|   |-- pyproject.toml
|   |-- requirements.txt
|   `-- sql/
|       `-- supabase_init.sql
|-- frontend/
|   |-- src/
|   |   |-- app/
|   |   `-- environments/
|   |-- .env.example
|   |-- angular.json
|   |-- package.json
|   `-- vercel.mjs
|-- scripts/
|   |-- init-db.ps1
|   |-- start-backend.ps1
|   `-- start-frontend.ps1
`-- README.md
```

## What the MVP includes

- Full CRUD for income entries
- Full CRUD for expense entries
- Full CRUD for financial goals
- A dashboard with key monthly metrics and alert states
- A local user selector for multiple people sharing the same app on one machine
- Conservative, base, and optimistic planning scenarios
- A deterministic 12-month projection engine
- A simple monthly recommendation engine
- Charts for projected balance, savings, goal progress, and scenario comparison
- Local SQLite persistence for development
- A guided in-app tutorial and empty-state hints in English
- A clean default setup with no sample income, expense, or goal data

## Important note about local data

The app no longer seeds example income, expense, or goal rows.

It only creates:

- one default local user workspace
- one empty financial profile
- three default scenarios: `Conservative`, `Base`, and `Optimistic`

If you already ran an older version with demo data, delete `backend/data/arky_finances.db` once and run the database initialization script again.

## Running locally

### Recommended PowerShell flow

1. Initialize the database:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\init-db.ps1
```

2. Start the backend:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\start-backend.ps1
```

3. Start the frontend:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\start-frontend.ps1
```

4. Open:

- Frontend: [http://127.0.0.1:4200](http://127.0.0.1:4200)
- Backend docs: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)

## Vercel deployment

The repository is prepared as two separate Vercel projects inside the same monorepo:

1. `backend`
2. `frontend`

### Backend project

Create a Vercel project with:

- Root Directory: `backend`
- Framework preset: `Other`

Environment variables:

- Required for production persistence: `DATABASE_URL` or `POSTGRES_URL`
- Optional CORS override: `CORS_ORIGINS`

Example:

```text
DATABASE_URL=postgresql://postgres.PROJECT_REF:PASSWORD@REGION.pooler.supabase.com:6543/postgres
```

For Supabase, use the transaction pooler connection string from Supabase. The backend normalizes
`postgresql://` and `postgres://` URLs to the SQLAlchemy psycopg driver internally.

If the database password contains symbols such as `@`, `#`, `/`, `:` or spaces, URL-encode it before
placing it inside `DATABASE_URL`. A password problem usually appears in `/health/db` as an
authentication or connection error.

If `DATABASE_URL` is missing on Vercel, the backend now reports that the database is unconfigured
instead of silently writing to temporary SQLite. This prevents the app from appearing to work while
storing data in a disposable serverless filesystem.

The backend entrypoint for Vercel is [backend/app/index.py](/C:/Users/Usuario/Desktop/QUIERO%20PLATA/backend/app/index.py).

### Supabase database setup

Run [backend/sql/supabase_init.sql](/C:/Users/Usuario/Desktop/QUIERO%20PLATA/backend/sql/supabase_init.sql)
in Supabase SQL Editor once. It creates only the Arky Finances tables:

- `users`
- `profiles`
- `incomes`
- `expenses`
- `goals`
- `scenarios`

It does not drop, truncate, or modify unrelated tables such as `garden_lines`.

After setting `DATABASE_URL` and redeploying the backend, verify:

- `GET /` returns `"database_provider": "supabase"`
- `GET /health/db` returns counts for the Arky Finances tables
- `GET /api/health/db` returns the same diagnostic through the frontend proxy

If the backend still does not connect, open `/health/db` first. The useful fields are:

- `database_configured`: `false` means `DATABASE_URL` is missing from the backend Vercel project
- `database_provider`: should be `supabase`
- `database_error`: shows the Supabase/Postgres error without exposing the connection string

### Frontend project

Create another Vercel project with:

- Root Directory: `frontend`
- Framework preset: `Angular`

Required environment variable:

```text
ARKY_BACKEND_URL=https://your-backend.vercel.app
```

The frontend uses:

- local development: `http://127.0.0.1:8000/api`
- Vercel: `/api`, proxied to the backend through [frontend/vercel.mjs](/C:/Users/Usuario/Desktop/QUIERO%20PLATA/frontend/vercel.mjs)

## Environment examples

- Backend: [backend/.env.example](/C:/Users/Usuario/Desktop/QUIERO%20PLATA/backend/.env.example)
- Frontend: [frontend/.env.example](/C:/Users/Usuario/Desktop/QUIERO%20PLATA/frontend/.env.example)

## Main endpoints

- `GET /`
- `GET /health`
- `GET /health/db`
- `GET/POST/PUT/DELETE /api/incomes`
- `GET/POST/PUT/DELETE /api/expenses`
- `GET/POST/PUT/DELETE /api/goals`
- `GET/PUT /api/profile`
- `GET/PUT /api/scenarios/{id}`
- `GET /api/insights/dashboard`
- `GET /api/insights/projection?months=12`
- `GET /api/insights/recommendation`

## Verification

The current project has been validated with:

- backend import and API smoke checks
- frontend production build
- local dashboard flow with clean seeded scenarios and no demo records

## Out of scope

- authentication
- bank connections
- CSV import
- OCR
- generative AI
- cloud sync
- multi-user support
