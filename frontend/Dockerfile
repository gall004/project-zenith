# Frontend
# ── Stage 1: Install dependencies + build ─────────────────────────
FROM node:22-slim AS builder

WORKDIR /app

# Install dependencies first (cached layer)
COPY package.json package-lock.json ./
RUN npm ci

# Copy source and build
COPY . .

# NEXT_PUBLIC_* vars must be present at build time
ARG NEXT_PUBLIC_API_BASE_URL
ARG NEXT_PUBLIC_LIVEKIT_URL
ARG NEXT_PUBLIC_MAX_ATTACHMENT_SIZE_MB=5
ARG NEXT_PUBLIC_ALLOWED_ATTACHMENT_TYPES=image/jpeg,image/png,image/webp,image/gif

ENV NEXT_PUBLIC_API_BASE_URL=$NEXT_PUBLIC_API_BASE_URL
ENV NEXT_PUBLIC_LIVEKIT_URL=$NEXT_PUBLIC_LIVEKIT_URL
ENV NEXT_PUBLIC_MAX_ATTACHMENT_SIZE_MB=$NEXT_PUBLIC_MAX_ATTACHMENT_SIZE_MB
ENV NEXT_PUBLIC_ALLOWED_ATTACHMENT_TYPES=$NEXT_PUBLIC_ALLOWED_ATTACHMENT_TYPES

RUN npm run build

# ── Stage 2: Production runtime ──────────────────────────────────
FROM node:22-slim

WORKDIR /app

ENV NODE_ENV=production

# Copy standalone output + static assets
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

# Cloud Run injects PORT (default 8080). Next.js standalone respects it.
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
