# Backend
FROM ghcr.io/astral-sh/uv:0.7 AS uv

# ── Stage 1: Install dependencies ──────────────────────────────────
FROM python:3.12-slim-bookworm AS builder

COPY --from=uv /uv /usr/local/bin/uv
WORKDIR /app

# Install dependencies first (cached layer)
COPY pyproject.toml uv.lock ./
RUN uv sync --frozen --no-dev --no-editable

# Copy application code
COPY app/ app/

# ── Stage 2: Production runtime ───────────────────────────────────
FROM python:3.12-slim-bookworm

WORKDIR /app

# Copy virtualenv and application from builder
COPY --from=builder /app/.venv /app/.venv
COPY --from=builder /app/app /app/app

ENV PATH="/app/.venv/bin:$PATH"

# Cloud Run injects PORT (default 8080). Uvicorn binds to it.
ENV PORT=8080

CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT}"]
