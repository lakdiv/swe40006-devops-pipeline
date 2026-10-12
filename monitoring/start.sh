#!/usr/bin/env bash
# Starts (or restarts) Prometheus, Node Exporter and Grafana.
# Usage (as the deploy user):  bash start.sh
# Creates ~/env/monitoring.env with a random Grafana admin password on first run.
set -euo pipefail

DIR="$(cd "$(dirname "$0")" && pwd)"
ENV_FILE="$HOME/env/monitoring.env"
mkdir -p "$HOME/env"
chmod 700 "$HOME/env"

if [ ! -f "$ENV_FILE" ]; then
  printf 'GRAFANA_ADMIN_PASSWORD=%s\n' "$(openssl rand -hex 12)" > "$ENV_FILE"
  chmod 600 "$ENV_FILE"
fi

docker network inspect monitoring >/dev/null 2>&1 || docker network create monitoring >/dev/null
docker compose --env-file "$ENV_FILE" -f "$DIR/compose.yml" up -d
docker compose --env-file "$ENV_FILE" -f "$DIR/compose.yml" ps

# Pick up any edits to prometheus.yml or alerts.yml
sleep 3
curl -fs -X POST http://localhost:9090/-/reload >/dev/null || true

echo
echo "Grafana login: admin / $(cut -d= -f2 "$ENV_FILE")"
