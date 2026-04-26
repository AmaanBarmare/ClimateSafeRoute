"""FastAPI entrypoint — loads .env, configures CORS, loads the graph at startup."""
import os
from contextlib import asynccontextmanager
from pathlib import Path

from dotenv import load_dotenv

# Load backend/.env in development before any module reads os.environ.
# Railway sets variables directly at runtime, so we skip dotenv there.
ENV_FILE = Path(__file__).resolve().parent.parent / ".env"
if os.environ.get("ENVIRONMENT") != "production":
    load_dotenv(ENV_FILE)

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import route as route_router
from app.services.graph import load_graph_on_startup


@asynccontextmanager
async def lifespan(_app: FastAPI):
    load_graph_on_startup()
    yield


app = FastAPI(title="ClimateSafe Route API", version="1.0.0", lifespan=lifespan)

allowed_origins = ["http://localhost:3000"]
frontend_url = os.environ.get("FRONTEND_URL", "").strip()
if frontend_url:
    allowed_origins.append(frontend_url)

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)

app.include_router(route_router.router, tags=["routing"])


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}
