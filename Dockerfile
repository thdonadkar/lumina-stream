# ---------- Build stage ----------
FROM node:20-bookworm-slim AS builder

WORKDIR /app

# Install bun (matches bunfig.toml in repo). npm/ci would also work.
RUN apt-get update && apt-get install -y --no-install-recommends curl ca-certificates unzip \
    && curl -fsSL https://bun.sh/install | bash \
    && ln -s /root/.bun/bin/bun /usr/local/bin/bun \
    && rm -rf /var/lib/apt/lists/*

# Cache deps
COPY package.json bun.lockb* bunfig.toml* ./
RUN bun install --frozen-lockfile || bun install

# Copy source and build with the Nitro Node preset
COPY . .
ENV NITRO_PRESET=node-server
RUN bun run build

# Prune dev deps for the runtime image (Nitro bundles everything, but keep small)
RUN rm -rf node_modules src public supabase \
    && find . -maxdepth 1 -type f ! -name 'package.json' -delete

# ---------- Runtime stage ----------
FROM node:20-bookworm-slim AS runner

WORKDIR /app

ENV NODE_ENV=production \
    PORT=3000 \
    HOST=0.0.0.0

# Non-root user
RUN groupadd --system --gid 1001 nodejs \
    && useradd  --system --uid 1001 --gid nodejs nodejs

# Nitro node-server output is fully self-contained
COPY --from=builder --chown=nodejs:nodejs /app/.output ./.output

USER nodejs

EXPOSE 3000

# Healthcheck hits the dedicated /api/public/health route (no DB calls)
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/api/public/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", ".output/server/index.mjs"]
