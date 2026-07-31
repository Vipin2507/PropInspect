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

# Non-interactive SSH often skips .bashrc — load Node from common install locations.
load_node() {
  export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
  # shellcheck disable=SC1090,SC1091
  if [ -s "$NVM_DIR/nvm.sh" ]; then
    . "$NVM_DIR/nvm.sh"
    nvm use default >/dev/null 2>&1 || nvm use node >/dev/null 2>&1 || true
  fi
  # shellcheck disable=SC1090,SC1091
  [ -s "$HOME/.fnm/fnm" ] && eval "$("$HOME/.fnm/fnm" env)" || true
  # shellcheck disable=SC1090,SC1091
  [ -s /usr/local/nvm/nvm.sh ] && . /usr/local/nvm/nvm.sh || true

  # Hostinger / manual installs
  for d in \
    "$HOME/.nvm/versions/node"/*/bin \
    /usr/local/bin \
    /usr/bin \
    "$HOME/.local/bin"
  do
    if [ -x "$d/node" ]; then
      export PATH="$d:$PATH"
      break
    fi
  done

  # Absolute fallbacks if `node` still missing but binary exists
  if ! command -v node >/dev/null 2>&1; then
    for candidate in \
      "$HOME/.nvm/versions/node"/*/bin/node \
      /usr/local/bin/node \
      /usr/bin/node
    do
      if [ -x "$candidate" ]; then
        export PATH="$(dirname "$candidate"):$PATH"
        break
      fi
    done
  fi
}

load_node

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

if ! command -v node >/dev/null 2>&1 || ! command -v npm >/dev/null 2>&1; then
  echo "ERROR: node/npm not found on PATH after loading nvm/fnm."
  echo "PATH=$PATH"
  echo "Which node (interactive)? Ask on the VPS: command -v node; type node; ls ~/.nvm/versions/node"
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

# pm2 is often installed next to node (same nvm bin)
if ! command -v pm2 >/dev/null 2>&1; then
  echo "ERROR: pm2 not found on PATH. Install with: npm i -g pm2"
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
