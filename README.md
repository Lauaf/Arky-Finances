# Arky Finances

MVP de planificación financiera personal orientado a flujo mensual, metas de ahorro y simulación de escenarios.

## Stack

- Frontend: Angular 20
- Backend: FastAPI + Pydantic + SQLAlchemy
- Base local: SQLite
- Producción en Vercel: FastAPI serverless + base persistente externa por `DATABASE_URL`
- Comunicación: REST

## Estructura del repo

```text
.
├─ backend/
│  ├─ app/
│  │  ├─ core/
│  │  ├─ models/
│  │  ├─ routers/
│  │  ├─ schemas/
│  │  ├─ services/
│  │  ├─ index.py
│  │  ├─ init_db.py
│  │  └─ main.py
│  ├─ data/
│  ├─ .env.example
│  ├─ pyproject.toml
│  └─ requirements.txt
├─ frontend/
│  ├─ src/
│  │  ├─ app/
│  │  └─ environments/
│  ├─ .env.example
│  ├─ angular.json
│  ├─ package.json
│  └─ vercel.mjs
├─ scripts/
│  ├─ init-db.ps1
│  ├─ start-backend.ps1
│  └─ start-frontend.ps1
└─ README.md
```

## Qué implementa este MVP

- CRUD completo de ingresos
- CRUD completo de gastos
- CRUD completo de objetivos
- Dashboard con métricas principales y alerta visual
- Escenarios `conservador`, `base` y `optimista`
- Motor de proyección determinístico a 12 meses
- Recomendador mensual simple
- Gráficos de saldo, ahorro, objetivos y comparación entre escenarios
- Persistencia local en SQLite para desarrollo
- Seed de datos de ejemplo

## Nota importante sobre Vercel

La app original fue diseñada como herramienta local con SQLite. Eso sigue funcionando en desarrollo.

Para Vercel, SQLite local no es una opción seria de persistencia porque el backend corre como funciones serverless y el almacenamiento local no es durable entre invocaciones o despliegues. Por eso el repo quedó preparado así:

- local: SQLite en `backend/data/arky_finances.db`
- Vercel: usar `DATABASE_URL` o `POSTGRES_URL` con una base externa persistente

Opciones razonables para producción:

- Vercel Postgres
- Neon
- Supabase Postgres
- Turso con adaptación adicional si quisieras seguir en SQLite remoto

## Cómo correrlo localmente

### Opción recomendada en PowerShell

1. Inicializar base de datos y seed:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\init-db.ps1
```

2. Levantar backend:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\start-backend.ps1
```

3. Levantar frontend:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\start-frontend.ps1
```

4. Abrir:

- Frontend: [http://127.0.0.1:4200](http://127.0.0.1:4200)
- Backend docs: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)

## Despliegue en Vercel

La preparación quedó pensada como dos proyectos Vercel dentro del mismo monorepo:

1. `backend`
2. `frontend`

### 1. Deploy del backend

Crear un proyecto en Vercel con:

- Root Directory: `backend`
- Framework preset: `Other`

Variables de entorno mínimas:

- `DATABASE_URL` o `POSTGRES_URL`

Opcionales:

- `CORS_ORIGINS`

Ejemplo:

```text
DATABASE_URL=postgresql+psycopg://USER:PASSWORD@HOST:5432/DBNAME
```

El backend para Vercel usa el entrypoint [backend/app/index.py](/C:/Users/Usuario/Desktop/QUIERO%20PLATA/backend/app/index.py) y el script `app = "app.main:app"` en [backend/pyproject.toml](/C:/Users/Usuario/Desktop/QUIERO%20PLATA/backend/pyproject.toml), siguiendo el despliegue estándar de FastAPI en Vercel.

### 2. Deploy del frontend

Crear otro proyecto en Vercel con:

- Root Directory: `frontend`
- Framework preset: `Angular`

Variable de entorno necesaria:

- `ARKY_BACKEND_URL`

Ejemplo:

```text
ARKY_BACKEND_URL=https://tu-backend.vercel.app
```

El frontend quedó preparado para:

- local: usar `http://127.0.0.1:8000/api`
- Vercel: usar `/api` y hacer proxy al backend definido en [frontend/vercel.mjs](/C:/Users/Usuario/Desktop/QUIERO%20PLATA/frontend/vercel.mjs)

## Configuración de entorno

- Backend ejemplo: [backend/.env.example](/C:/Users/Usuario/Desktop/QUIERO%20PLATA/backend/.env.example)
- Frontend ejemplo: [frontend/.env.example](/C:/Users/Usuario/Desktop/QUIERO%20PLATA/frontend/.env.example)

## Endpoints principales

- `GET /health`
- `GET/POST/PUT/DELETE /api/incomes`
- `GET/POST/PUT/DELETE /api/expenses`
- `GET/POST/PUT/DELETE /api/goals`
- `GET/PUT /api/profile`
- `GET/POST/PUT/DELETE /api/scenarios`
- `GET /api/insights/dashboard`
- `GET /api/insights/projection?months=12`
- `GET /api/insights/recommendation`

## Verificación realizada

- backend compilado y endpoints principales probados con `TestClient`
- frontend compilado con `npm run build`
- backend local respondió `/health`
- frontend local respondió `200` en `http://127.0.0.1:4200`

## Fuera de alcance del MVP

- autenticación
- conexión bancaria
- importación CSV
- OCR
- IA generativa
- sincronización cloud
- multiusuario
