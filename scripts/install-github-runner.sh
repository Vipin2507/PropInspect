#!/usr/bin/env bash
# Install a GitHub Actions self-hosted runner on the VPS (as user deploy).
# Run this ONCE while SSH'd into the server.
#
# 1. GitHub repo → Settings → Actions → Runners → New self-hosted runner
# 2. Copy the token from that page into RUNNER_TOKEN below (or export it)
# 3. bash scripts/install-github-runner.sh

set -euo pipefail

REPO_URL="${REPO_URL:-https://github.com/Vipin2507/PropInspect}"
RUNNER_DIR="${RUNNER_DIR:-$HOME/actions-runner}"
RUNNER_VERSION="${RUNNER_VERSION:-2.336.0}"

if [[ -z "${RUNNER_TOKEN:-}" ]]; then
  echo "Set RUNNER_TOKEN first (from GitHub → Settings → Actions → Runners → New runner)."
  echo "Example:"
  echo "  export RUNNER_TOKEN=AAAAAAAAAAAA...."
  echo "  bash scripts/install-github-runner.sh"
  exit 1
fi

mkdir -p "$RUNNER_DIR"
cd "$RUNNER_DIR"

if [[ ! -f ./config.sh ]]; then
  echo "==> Downloading runner ${RUNNER_VERSION}"
  curl -fsSL -o actions-runner-linux-x64.tar.gz \
    "https://github.com/actions/runner/releases/download/v${RUNNER_VERSION}/actions-runner-linux-x64-${RUNNER_VERSION}.tar.gz"
  tar xzf ./actions-runner-linux-x64.tar.gz
  rm -f ./actions-runner-linux-x64.tar.gz
fi

if [[ ! -f .runner ]]; then
  echo "==> Configuring runner for ${REPO_URL}"
  ./config.sh --unattended \
    --url "$REPO_URL" \
    --token "$RUNNER_TOKEN" \
    --name "propinspect-vps" \
    --labels "self-hosted,Linux,X64,propinspect" \
    --work "_work"
fi

echo "==> Installing and starting systemd service"
sudo ./svc.sh install
sudo ./svc.sh start
sudo ./svc.sh status

echo ""
echo "Done. In GitHub → Settings → Actions → Runners you should see 'propinspect-vps' Idle."
echo "Then push to main (or Run workflow) to deploy."
echo ""
echo "You can remove these secrets if you only used SSH deploy: VPS_SSH_PRIVATE_KEY, VPS_HOST, VPS_USER, VPS_PORT, VPS_SSH_KNOWN_HOSTS"
echo "Keep: DEPLOY_PATH=/apps/PropInspect  PM2_APP_NAME=propinspect-api"
