#!/bin/bash
# M365Watcher Dashboard — pull latest code and rebuild container
set -e

cd "$(dirname "$0")/.."
echo "Pulling latest code..."
git pull

echo "Rebuilding and restarting container..."
cd dashboard
docker compose up -d --build

echo "Waiting for health check..."
sleep 5
if curl -sf http://localhost:3001/api/health > /dev/null 2>&1; then
  echo "Dashboard is healthy and running."
else
  echo "Health check failed — check logs with: docker compose logs -f"
fi
