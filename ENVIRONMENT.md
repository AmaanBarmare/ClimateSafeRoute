# ENVIRONMENT.md — ClimateSafe Route

All environment variables for the project, with exact file locations, expected formats, and how to obtain each value.

---

## Files to Create

The following files must exist locally and must never be committed to git.

```
climatesafe-route/
├── frontend/
│   └── .env.local           ← Next.js reads this automatically
└── backend/
    └── .env                 ← Load with python-dotenv or set manually
```

---

## frontend/.env.local

```env
# Mapbox public token
# How to get: https://account.mapbox.com → Tokens → Create token
# Use a PUBLIC token (starts with pk.) — this is safe to expose in the browser
NEXT_PUBLIC_MAPBOX_TOKEN=pk.eyJ1IjoieW91cnVzZXJuYW1lIiwiYSI6ImNleGFtcGxlIn0.example

# FastAPI backend base URL
# Local development: http://localhost:8000
# Production (after Railway deploy): https://your-backend.up.railway.app
NEXT_PUBLIC_API_URL=http://localhost:8000
```

---

## backend/.env

```env
# PostgreSQL + PostGIS connection string
# Local development (matches docker-compose.yml defaults):
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/climatesafe

# Production (Railway provides this automatically — copy from Railway PostgreSQL service → Connect tab)
# DATABASE_URL=postgresql://postgres:xxxx@monorail.proxy.rlwy.net:xxxxx/railway

# OpenAI API key
# How to get: https://platform.openai.com/api-keys → Create new secret key
OPENAI_API_KEY=sk-proj-example

# Environment flag
# Affects CORS and logging behavior
# Values: development | production
ENVIRONMENT=development

# Frontend URL for CORS (production only — leave blank for local dev)
# Set to your Vercel URL after deployment
FRONTEND_URL=
```

---

## docker-compose.yml (reference)

The docker-compose file defines the local PostGIS database. The `DATABASE_URL` in `backend/.env` must match these values exactly.

```yaml
version: '3.8'

services:
  db:
    image: postgis/postgis:15-3.4
    container_name: climatesafe-db
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: climatesafe
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data

volumes:
  pgdata:
```

Local DATABASE_URL that matches this config:
```
postgresql://postgres:postgres@localhost:5432/climatesafe
```

---

## frontend/.env.local.example

Commit this file (it contains no secrets). It documents what variables are needed.

```env
# Copy this file to .env.local and fill in your values

# Mapbox public token — get from https://account.mapbox.com
NEXT_PUBLIC_MAPBOX_TOKEN=

# Backend API URL
# Local: http://localhost:8000
# Production: https://your-backend.up.railway.app
NEXT_PUBLIC_API_URL=http://localhost:8000
```

---

## backend/.env.example

Commit this file (it contains no secrets). It documents what variables are needed.

```env
# Copy this file to .env and fill in your values

# PostgreSQL connection string
# Local: postgresql://postgres:postgres@localhost:5432/climatesafe
# Railway: copy from PostgreSQL service → Connect tab
DATABASE_URL=

# OpenAI API key — get from https://platform.openai.com/api-keys
OPENAI_API_KEY=

# Environment: development or production
ENVIRONMENT=development

# Frontend URL for CORS — set after Vercel deployment
FRONTEND_URL=
```

---

## How to Load .env in the Backend

**Local development** — python-dotenv loads it automatically if you add this to `app/main.py`:

```python
from dotenv import load_dotenv
load_dotenv()  # reads backend/.env
```

**Railway production** — set variables in the Railway dashboard. Do not use python-dotenv in production. Guard it:

```python
import os
from dotenv import load_dotenv

if os.environ.get("ENVIRONMENT") != "production":
    load_dotenv()
```

---

## Variable Summary

| Variable | File | Required | Secret | Description |
|---|---|---|---|---|
| `NEXT_PUBLIC_MAPBOX_TOKEN` | frontend/.env.local | Yes | No | Mapbox public map token |
| `NEXT_PUBLIC_API_URL` | frontend/.env.local | Yes | No | FastAPI backend URL |
| `DATABASE_URL` | backend/.env | Yes | Yes | PostgreSQL + PostGIS connection |
| `OPENAI_API_KEY` | backend/.env | Yes | Yes | OpenAI API key (used by `gpt-5-mini`) |
| `ENVIRONMENT` | backend/.env | Yes | No | development or production |
| `FRONTEND_URL` | backend/.env | Production only | No | Vercel URL for CORS |
