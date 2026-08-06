#!/usr/bin/env bash
# One-time VPS setup. Run as the deploy user on the server.
# Usage:
#   export DEPLOY_PATH=/opt/propinspect
#   export GIT_REPO=https://github.com/Vipin2507/PropInspect.git
#   bash scripts/vps-bootstrap.sh
#
# Or after cloning manually:
#   cd /opt/propinspect && bash scripts/vps-bootstrap.sh

set -euo pipefail

DEPLOY_PATH="${DEPLOY_PATH:-/opt/propinspect}"
GIT_REPO="${GIT_REPO:-https://github.com/Vipin2507/PropInspect.git}"
PM2_APP_NAME="${PM2_APP_NAME:-propinspect-api}"

echo "==> Bootstrap PropInspect at $DEPLOY_PATH"

if [[ ! -d "$DEPLOY_PATH/.git" ]]; then
  sudo mkdir -p "$(dirname "$DEPLOY_PATH")"
  if [[ -w "$(dirname "$DEPLOY_PATH")" ]]; then
    git clone "$GIT_REPO" "$DEPLOY_PATH"
  else
    sudo git clone "$GIT_REPO" "$DEPLOY_PATH"
    sudo chown -R "$(whoami):$(whoami)" "$DEPLOY_PATH"
  fi
fi

cd "$DEPLOY_PATH"

if [[ ! -f backend/.env ]]; then
  echo "==> Creating backend/.env from example — EDIT SECRETS before going live"
  cp backend/.env.example backend/.env
  sed -i 's/^NODE_ENV=.*/NODE_ENV=production/' backend/.env || true
  sed -i 's|^CORS_ORIGIN=.*|CORS_ORIGIN=https://snagdesk.cravingcodetech.in|' backend/.env || true
fi

mkdir -p backend/data backend/uploads

cd backend && npm ci && npm run build && cd ..
cd frontend && npm ci && npm run build && cd ..

if command -v pm2 >/dev/null 2>&1; then
  if pm2 describe "$PM2_APP_NAME" >/dev/null 2>&1; then
    pm2 restart "$PM2_APP_NAME" --update-env
  else
    pm2 start ecosystem.config.cjs
    pm2 save
    echo "==> Enable boot start (run once): pm2 startup"
  fi
else
  echo "Install PM2: npm i -g pm2"
  echo "Then: cd $DEPLOY_PATH && pm2 start ecosystem.config.cjs && pm2 save && pm2 startup"
fi

echo "==> Bootstrap done. Point nginx root at $DEPLOY_PATH/frontend/dist"
echo "    and proxy /api → http://127.0.0.1:4000"
