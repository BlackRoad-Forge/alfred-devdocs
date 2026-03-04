#!/bin/bash
set -euo pipefail

# Deploy SaaS app to Raspberry Pi
# Usage: ./deploy/deploy-to-pi.sh [pi-host] [pi-user]
# Or set PI_HOST, PI_USER, PI_DEPLOY_PATH env vars

PI_HOST="${1:-${PI_HOST:-192.168.1.100}}"
PI_USER="${2:-${PI_USER:-pi}}"
DEPLOY_PATH="${PI_DEPLOY_PATH:-/opt/saas-app}"

echo "==> Deploying to ${PI_USER}@${PI_HOST}:${DEPLOY_PATH}"

# Sync files (excluding dev stuff)
rsync -avz --delete \
  --exclude='node_modules' \
  --exclude='.env' \
  --exclude='data/' \
  --exclude='test-results/' \
  --exclude='playwright-report/' \
  --exclude='tests/' \
  --exclude='.git' \
  ./ "${PI_USER}@${PI_HOST}:${DEPLOY_PATH}/"

echo "==> Installing dependencies on Pi..."
ssh "${PI_USER}@${PI_HOST}" "cd ${DEPLOY_PATH} && npm ci --production"

echo "==> Setting up database..."
ssh "${PI_USER}@${PI_HOST}" "cd ${DEPLOY_PATH} && mkdir -p data && node src/models/setup.js"

echo "==> Installing systemd service..."
ssh "${PI_USER}@${PI_HOST}" "sudo cp ${DEPLOY_PATH}/deploy/systemd/saas-app.service /etc/systemd/system/ && sudo systemctl daemon-reload && sudo systemctl enable saas-app && sudo systemctl restart saas-app"

echo "==> Checking service status..."
ssh "${PI_USER}@${PI_HOST}" "sudo systemctl status saas-app --no-pager"

echo ""
echo "==> Deployed! App should be running at http://${PI_HOST}:3000"
echo "    To use Docker instead: cd deploy/docker && docker compose up -d"
