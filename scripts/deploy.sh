#!/usr/bin/env bash
# Runs on the VPS (piped over SSH from GitHub Actions).
# Required env: DEPLOY_PATH
# Optional: PM2_APP_NAME (default propinspect-api), WEB_ROOT, GIT_BRANCH (default main)

set -euo pipefail

DEPLOY_PATH="${DEPLOY_PATH:?DEPLOY_PATH is required}"
PM2_APP_NAME="${PM2_APP_NAME:-propinspect-api}"
GIT_BRANCH="${GIT_BRANCH:-main}"
WEB_ROOT="${WEB_ROOT:-}"

echo "==> Deploying PropInspect"
echo "    path:   $DEPLOY_PATH"
echo "    branch: $GIT_BRANCH"
echo "    pm2:    $PM2_APP_NAME"

if [[ ! -d "$DEPLOY_PATH/.git" ]]; then
  echo "ERROR: $DEPLOY_PATH is not a git checkout."
  echo "Clone the repo once on the VPS, then re-run deploy."
  exit 1
fi

cd "$DEPLOY_PATH"

echo "==> Fetching $GIT_BRANCH"
git fetch --prune origin "$GIT_BRANCH"
git checkout "$GIT_BRANCH"
git reset --hard "origin/$GIT_BRANCH"

# Keep production env files if they exist outside git (or are gitignored).
# backend/.env and frontend/.env.production should already be on the server.

NODE_BIN="$(command -v node || true)"
NPM_BIN="$(command -v npm || true)"
if [[ -z "$NODE_BIN" || -z "$NPM_BIN" ]]; then
  echo "ERROR: node/npm not found on PATH. Install Node.js >= 22.5 on the VPS."
  exit 1
fi

echo "==> Node $(node -v) / npm $(npm -v)"

echo "==> Backend install + build"
cd "$DEPLOY_PATH/backend"
npm ci
npm run build

echo "==> Frontend install + build"
cd "$DEPLOY_PATH/frontend"
npm ci
npm run build

if [[ -n "$WEB_ROOT" ]]; then
  echo "==> Syncing frontend dist → $WEB_ROOT"
  mkdir -p "$WEB_ROOT"
  rsync -a --delete "$DEPLOY_PATH/frontend/dist/" "$WEB_ROOT/"
fi

echo "==> Restart API ($PM2_APP_NAME)"
cd "$DEPLOY_PATH"

if ! command -v pm2 >/dev/null 2>&1; then
  echo "ERROR: pm2 not found. Install with: npm i -g pm2"
  exit 1
fi

if pm2 describe "$PM2_APP_NAME" >/dev/null 2>&1; then
  pm2 restart "$PM2_APP_NAME" --update-env
else
  echo "    App not registered yet — starting from ecosystem.config.cjs"
  pm2 start ecosystem.config.cjs
  pm2 save
fi

pm2 status "$PM2_APP_NAME" || pm2 status

echo "==> Deploy complete ($(git rev-parse --short HEAD))"
