from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.v1 import health
from app.core.config import settings

app = FastAPI(
    title="Project Zenith Backend",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# Canonical Order 1: CORS outermost middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.NEXT_PUBLIC_API_BASE_URL, "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router, prefix="/api/v1")
