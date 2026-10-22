#!/usr/bin/env bash
# Deploys one FixLog environment from a GHCR image tag, then smoke tests it.
# If the new version fails the smoke test, the last good version is restored.
# Usage (as the deploy user):  bash deploy.sh <test|staging|prod> [image-tag]
# With no tag, it uses the latest commit SHA on main, which CI uses as the image tag.
# Creates ~/env/<env>.env with a random database password on first run.
# Writes timings to ~/logs/deploy.log and the last good tag to ~/state/<env>.last_good
set -euo pipefail

USAGE="Usage: deploy.sh <test|staging|prod> [image-tag]"
ENV_NAME="${1:?$USAGE}"
REPO_URL="https://github.com/lakdiv/swe40006-devops-pipeline.git"

case "$ENV_NAME" in
  test)    PORT=8081 ;;
  staging) PORT=8082 ;;
  prod)    PORT=80 ;;
  *) echo "Unknown environment: $ENV_NAME"; echo "$USAGE"; exit 1 ;;
esac

IMAGE_TAG="${2:-}"
if [ -z "$IMAGE_TAG" ]; then
  IMAGE_TAG="$(git ls-remote "$REPO_URL" refs/heads/main | cut -f1)"
fi
if [ -z "$IMAGE_TAG" ]; then
  echo "Could not work out the image tag. Pass one: $USAGE"; exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ENV_FILE="$HOME/env/$ENV_NAME.env"
STATE_DIR="$HOME/state"
LAST_GOOD_FILE="$STATE_DIR/$ENV_NAME.last_good"
LOG_FILE="$HOME/logs/deploy.log"
mkdir -p "$STATE_DIR" "$(dirname "$LOG_FILE")" "$HOME/env"
chmod 700 "$HOME/env"

if [ ! -f "$ENV_FILE" ]; then
  printf 'APP_ENV=%s\nDB_PASSWORD=%s\n' "$ENV_NAME" "$(openssl rand -hex 16)" > "$ENV_FILE"
  chmod 600 "$ENV_FILE"
  echo "Created $ENV_FILE"
fi

COMPOSE=(docker compose -p "fixlog-$ENV_NAME" --env-file "$ENV_FILE"
         -f "$SCRIPT_DIR/compose.yml" -f "$SCRIPT_DIR/compose.$ENV_NAME.yml")

log() { echo "$(date -u +%Y-%m-%dT%H:%M:%SZ) [$ENV_NAME] $*" | tee -a "$LOG_FILE"; }

start_app() {
  export IMAGE_TAG="$1"
  "${COMPOSE[@]}" up -d --no-deps --force-recreate app
}

# Smoke test: /health and the home page must both answer within 60 seconds
smoke_test() {
  for _ in $(seq 1 30); do
    if curl -fs -m 2 -o /dev/null "http://localhost:$PORT/health" &&
       curl -fs -m 2 -o /dev/null "http://localhost:$PORT/"; then
      return 0
    fi
    sleep 2
  done
  return 1
}

docker network inspect monitoring >/dev/null 2>&1 || docker network create monitoring >/dev/null

START=$(date +%s)
log "START tag=$IMAGE_TAG"

export IMAGE_TAG
"${COMPOSE[@]}" pull app || log "WARN could not pull tag=$IMAGE_TAG, using a local image if there is one"
"${COMPOSE[@]}" up -d --wait db
start_app "$IMAGE_TAG"

if smoke_test; then
  log "HEALTHY tag=$IMAGE_TAG duration=$(( $(date +%s) - START ))s port=$PORT"
  echo "$IMAGE_TAG" > "$LAST_GOOD_FILE"
  exit 0
fi

FAILED_AT=$(date +%s)
log "FAILED tag=$IMAGE_TAG smoke test did not pass within 60s"

PREVIOUS=""
[ -f "$LAST_GOOD_FILE" ] && PREVIOUS="$(cat "$LAST_GOOD_FILE")"

if [ -n "$PREVIOUS" ] && [ "$PREVIOUS" != "$IMAGE_TAG" ]; then
  log "ROLLBACK to tag=$PREVIOUS"
  start_app "$PREVIOUS"
  if smoke_test; then
    log "ROLLED_BACK tag=$PREVIOUS restored_in=$(( $(date +%s) - FAILED_AT ))s"
  else
    log "ROLLBACK_FAILED tag=$PREVIOUS"
  fi
else
  log "No earlier good version to roll back to"
fi
exit 1
