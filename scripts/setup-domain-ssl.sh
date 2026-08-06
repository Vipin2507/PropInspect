#!/usr/bin/env bash
# One-time: nginx site + Let's Encrypt for snagdesk.cravingcodetech.in
# Run on the VPS as root (or with sudo).
#
# Prerequisites:
#   - DNS A record: snagdesk.cravingcodetech.in → this server's public IP
#   - App already deployed (frontend dist + PM2 API on :4000)
#
# Usage:
#   export DEPLOY_PATH=/apps/PropInspect
#   export WEB_ROOT=/apps/PropInspect/frontend/dist   # optional
#   sudo -E bash scripts/setup-domain-ssl.sh

set -euo pipefail

DOMAIN="${DOMAIN:-snagdesk.cravingcodetech.in}"
DEPLOY_PATH="${DEPLOY_PATH:-/apps/PropInspect}"
WEB_ROOT="${WEB_ROOT:-$DEPLOY_PATH/frontend/dist}"
EMAIL="${CERTBOT_EMAIL:-admin@${DOMAIN#*.}}"
SITE_AVAIL="/etc/nginx/sites-available/snagdesk"
SITE_ENABLED="/etc/nginx/sites-enabled/snagdesk"

echo "==> Domain SSL setup for $DOMAIN"
echo "    web root: $WEB_ROOT"

if [[ ! -d "$WEB_ROOT" ]]; then
  echo "ERROR: WEB_ROOT missing: $WEB_ROOT"
  echo "Build frontend first (npm run build) or set WEB_ROOT."
  exit 1
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
