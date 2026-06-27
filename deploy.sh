#!/usr/bin/env bash
# deploy.sh — pull, install, build, reload PM2.
# Run as the deploy user inside the project directory.
set -Eeuo pipefail

APP_NAME="atomspot"
APP_DIR="${APP_DIR:-$(pwd)}"
BRANCH="${BRANCH:-main}"

cd "$APP_DIR"

echo "==> [1/5] git pull origin $BRANCH"
git fetch --all --prune
git checkout "$BRANCH"
git pull --ff-only origin "$BRANCH"

echo "==> [2/5] install dependencies"
if command -v bun >/dev/null 2>&1; then
  bun install --frozen-lockfile || bun install
else
  npm ci || npm install
fi

echo "==> [3/5] build (Nitro node-server preset)"
export NITRO_PRESET=node-server
if command -v bun >/dev/null 2>&1; then
  bun run build
else
  npm run build
fi

echo "==> [4/5] reload PM2"
if pm2 describe "$APP_NAME" >/dev/null 2>&1; then
  pm2 reload ecosystem.config.js --env production --update-env
else
  pm2 start ecosystem.config.js --env production
fi
pm2 save

echo "==> [5/5] health check"
sleep 3
PORT="${PORT:-3000}"
curl -fsS "http://127.0.0.1:${PORT}/api/public/health" >/dev/null \
  && echo "Healthy ✓" \
  || { echo "Health check FAILED" >&2; pm2 logs "$APP_NAME" --lines 50 --nostream; exit 1; }

echo "Deployment complete."
