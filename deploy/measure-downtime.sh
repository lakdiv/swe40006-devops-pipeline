#!/usr/bin/env bash
# Redeploys one environment while checking /health once a second, then reports
# how many checks failed during the restart (metric M5).
# Usage (as the deploy user):  bash measure-downtime.sh [test|staging|prod] [image-tag]
set -uo pipefail

ENV_NAME="${1:-prod}"
case "$ENV_NAME" in
  test)    PORT=8081 ;;
  staging) PORT=8082 ;;
  prod)    PORT=80 ;;
  *) echo "Unknown environment: $ENV_NAME"; exit 1 ;;
esac

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
LOG_FILE="$HOME/logs/deploy.log"
CHECKS="$(mktemp)"

(
  while true; do
    if curl -fs -m 1 "http://localhost:$PORT/health" >/dev/null; then
      echo "OK" >> "$CHECKS"
    else
      echo "FAIL" >> "$CHECKS"
    fi
    sleep 1
  done
) &
POLLER=$!

sleep 3
bash "$SCRIPT_DIR/deploy.sh" "$ENV_NAME" "${2:-}"
sleep 3
kill "$POLLER" 2>/dev/null

TOTAL=$(wc -l < "$CHECKS" | tr -d ' ')
FAILS=$(grep -c FAIL "$CHECKS" || true)
rm -f "$CHECKS"

echo "$(date -u +%Y-%m-%dT%H:%M:%SZ) [$ENV_NAME] DOWNTIME failed_checks=$FAILS of $TOTAL (about ${FAILS}s)" | tee -a "$LOG_FILE"
