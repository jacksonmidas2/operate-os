# ─────────────────────────────────────────────────────────────────────
# Production Dockerfile for @operate/web.
#
# Built by Cloud Build (cloudbuild.yaml at repo root) and pushed to
# Artifact Registry. Targets Cloud Run.
#
# Build locally:
#   docker build -t operate-web -f apps/web/Dockerfile .
# ─────────────────────────────────────────────────────────────────────

# Use debian-slim (not alpine) — Prisma client binaries are built for
# debian-openssl-3.0.x which works on slim but NOT on alpine musl.
FROM node:22-slim AS deps
WORKDIR /repo

# OpenSSL is needed for Prisma at runtime + build
RUN apt-get update -y && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*

# Copy workspace manifests
COPY package.json package-lock.json* tsconfig.base.json ./
COPY apps/web/package.json ./apps/web/package.json
COPY packages/db-control/package.json ./packages/db-control/package.json
COPY packages/db-tenant/package.json ./packages/db-tenant/package.json
COPY packages/providers/package.json ./packages/providers/package.json
COPY packages/tenant-router/package.json ./packages/tenant-router/package.json

RUN npm ci

# ── build stage ──────────────────────────────────────────────────────
FROM node:22-slim AS builder
WORKDIR /repo
RUN apt-get update -y && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*
COPY --from=deps /repo/node_modules ./node_modules
COPY . .

# Generate Prisma clients
RUN npm run control:generate
RUN npm run tenant:generate

# Build Next.js
RUN npm run build -w @operate/web

# ── runner stage ─────────────────────────────────────────────────────
# Keep WORKDIR=/repo to match builder paths — Prisma's bundled code
# encodes the build-time absolute path to its query engine binary.
FROM node:22-slim AS runner
WORKDIR /repo
ENV NODE_ENV=production
# Cloud Run injects PORT=8080 by default; respect it.
ENV PORT=8080
# Do NOT set HOSTNAME — Next.js's `next start -H 0.0.0.0` flag below
# already binds to all interfaces, and HOSTNAME would leak into
# NextAuth's URL fallback (was producing https://0.0.0.0:8080/... error
# redirects when AUTH_URL was unset).

RUN apt-get update -y && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*
RUN groupadd --system --gid 1001 operate \
 && useradd --system --uid 1001 --gid 1001 operate

# Copy production artifacts at the SAME paths the build used
COPY --from=builder --chown=operate:operate /repo/apps/web/.next ./apps/web/.next
COPY --from=builder --chown=operate:operate /repo/apps/web/public ./apps/web/public
COPY --from=builder --chown=operate:operate /repo/apps/web/package.json ./apps/web/package.json
COPY --from=builder --chown=operate:operate /repo/packages ./packages
COPY --from=builder --chown=operate:operate /repo/node_modules ./node_modules
COPY --from=builder --chown=operate:operate /repo/package.json ./package.json

USER operate
EXPOSE 8080
# Use sh -c so the PORT env var is interpolated at runtime
CMD ["sh", "-c", "cd apps/web && npx next start -H 0.0.0.0 -p ${PORT:-8080}"]
