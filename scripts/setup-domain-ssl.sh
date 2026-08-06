#!/usr/bin/env bash
# One-time: nginx site + Let's Encrypt for snagdesk.cravingcodetech.in
# Run on the VPS as root (or with sudo).
#
# Prerequisites:
#   - DNS A record: snagdesk.cravingcodetech.in → this server's public IP
#   - Repo checked out (PM2 API on :4000 recommended)
#
# Usage (from the repo — path is auto-detected):
#   cd ~/apps/PropInspect
#   sudo -E bash scripts/setup-domain-ssl.sh
#
# Or set explicitly:
#   export DEPLOY_PATH=/home/deploy/apps/PropInspect
#   sudo -E bash scripts/setup-domain-ssl.sh

set -euo pipefail

DOMAIN="${DOMAIN:-snagdesk.cravingcodetech.in}"

# Prefer explicit env, else directory containing this script's repo root,
# else common deploy locations.
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

if [[ -n "${DEPLOY_PATH:-}" ]]; then
  :
elif [[ -d "$REPO_ROOT/frontend" && -d "$REPO_ROOT/backend" ]]; then
  DEPLOY_PATH="$REPO_ROOT"
elif [[ -d /home/deploy/apps/PropInspect/.git ]]; then
  DEPLOY_PATH=/home/deploy/apps/PropInspect
elif [[ -d /apps/PropInspect/.git ]]; then
  DEPLOY_PATH=/apps/PropInspect
else
  DEPLOY_PATH="$REPO_ROOT"
fi

WEB_ROOT="${WEB_ROOT:-$DEPLOY_PATH/frontend/dist}"
EMAIL="${CERTBOT_EMAIL:-admin@${DOMAIN#*.}}"
SITE_AVAIL="/etc/nginx/sites-available/snagdesk"
SITE_ENABLED="/etc/nginx/sites-enabled/snagdesk"

echo "==> Domain SSL setup for $DOMAIN"
echo "    deploy:   $DEPLOY_PATH"
echo "    web root: $WEB_ROOT"

if [[ ! -d "$DEPLOY_PATH" ]]; then
  echo "ERROR: DEPLOY_PATH does not exist: $DEPLOY_PATH"
  echo "cd into the repo (e.g. ~/apps/PropInspect) and re-run, or export DEPLOY_PATH=..."
  exit 1
fi

# Certbot only needs a reachable HTTP root; create a stub if frontend isn't built yet.
if [[ ! -d "$WEB_ROOT" ]]; then
  echo "==> WEB_ROOT missing — creating stub (run frontend build / deploy.sh after SSL)"
  mkdir -p "$WEB_ROOT"
  if [[ ! -f "$WEB_ROOT/index.html" ]]; then
    cat > "$WEB_ROOT/index.html" <<'HTML'
<!doctype html>
<html><head><meta charset="utf-8"><title>SnagDesk</title></head>
<body><p>SnagDesk — build frontend (deploy.sh) to replace this page.</p></body></html>
HTML
  fi
fi

if ! command -v nginx >/dev/null 2>&1; then
  echo "==> Installing nginx"
  apt-get update -y
  apt-get install -y nginx
fi

if ! command -v certbot >/dev/null 2>&1; then
  echo "==> Installing certbot"
  apt-get update -y
  apt-get install -y certbot python3-certbot-nginx
fi

# Write HTTP site (certbot will add SSL)
cat > "$SITE_AVAIL" <<EOF
upstream snagdesk_api {
    server 127.0.0.1:4000;
    keepalive 16;
}

server {
    listen 80;
    listen [::]:80;
    server_name ${DOMAIN};

    root ${WEB_ROOT};
    index index.html;
    client_max_body_size 20M;

    location ^~ /.well-known/acme-challenge/ {
        root /var/www/html;
        default_type "text/plain";
    }

    location /api/ {
        proxy_pass http://snagdesk_api/api/;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_set_header Connection "";
        proxy_read_timeout 120s;
    }

    location /uploads/ {
        proxy_pass http://snagdesk_api/uploads/;
        proxy_set_header Host \$host;
        proxy_set_header X-Forwarded-Proto \$scheme;
        expires 7d;
    }

    location / {
        try_files \$uri \$uri/ /index.html;
    }
}
EOF

mkdir -p /var/www/html
ln -sfn "$SITE_AVAIL" "$SITE_ENABLED"

# Avoid conflicting default / IP self-signed servers on :80/:443 if present
if [[ -L /etc/nginx/sites-enabled/default ]]; then
  echo "==> Disabling nginx default site"
  rm -f /etc/nginx/sites-enabled/default
fi

nginx -t
systemctl reload nginx

echo "==> Requesting Let's Encrypt certificate for $DOMAIN"
certbot --nginx \
  -d "$DOMAIN" \
  --non-interactive \
  --agree-tos \
  -m "$EMAIL" \
  --redirect

nginx -t
systemctl reload nginx

# Point backend CORS at the real origin
ENV_FILE="$DEPLOY_PATH/backend/.env"
if [[ -f "$ENV_FILE" ]]; then
  if grep -q '^CORS_ORIGIN=' "$ENV_FILE"; then
    sed -i "s|^CORS_ORIGIN=.*|CORS_ORIGIN=https://${DOMAIN}|" "$ENV_FILE"
  else
    echo "CORS_ORIGIN=https://${DOMAIN}" >> "$ENV_FILE"
  fi
  echo "==> Updated CORS_ORIGIN in backend/.env"
  if command -v pm2 >/dev/null 2>&1; then
    pm2 restart propinspect-api --update-env || true
  fi
fi

echo "==> Done."
echo "    Open https://${DOMAIN}/  (should show a valid padlock — no /api/health click-through)"
echo "    Health: https://${DOMAIN}/api/health"
echo ""
echo "    Then rebuild+deploy frontend so VITE_API_BASE_URL=/api is live:"
echo "      cd $DEPLOY_PATH && git pull && bash scripts/deploy.sh"
echo "    (or push to main if GitHub Actions deploy is wired)"
