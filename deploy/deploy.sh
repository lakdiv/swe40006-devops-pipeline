#!/usr/bin/env bash
# Deploys one FixLog environment from a GHCR image tag.
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
LOG_FILE="$HOME/logs/deploy.log"
mkdir -p "$STATE_DIR" "$(dirname "$LOG_FILE")" "$HOME/env"
chmod 700 "$HOME/env"

if [ ! -f "$ENV_FILE" ]; then
  printf 'APP_ENV=%s\nDB_PASSWORD=%s\n' "$ENV_NAME" "$(openssl rand -hex 16)" > "$ENV_FILE"
  chmod 600 "$ENV_FILE"
  echo "Created $ENV_FILE"
fi

export IMAGE_TAG
COMPOSE=(docker compose -p "fixlog-$ENV_NAME" --env-file "$ENV_FILE"
         -f "$SCRIPT_DIR/compose.yml" -f "$SCRIPT_DIR/compose.$ENV_NAME.yml")

log() { echo "$(date -u +%Y-%m-%dT%H:%M:%SZ) [$ENV_NAME] $*" | tee -a "$LOG_FILE"; }

docker network inspect monitoring >/dev/null 2>&1 || docker network create monitoring >/dev/null

START=$(date +%s)
log "START tag=$IMAGE_TAG"

"${COMPOSE[@]}" pull app
"${COMPOSE[@]}" up -d --wait db
"${COMPOSE[@]}" up -d --no-deps --force-recreate app

for _ in $(seq 1 60); do
  if curl -fs -m 2 "http://localhost:$PORT/health" >/dev/null; then
    END=$(date +%s)
    log "HEALTHY tag=$IMAGE_TAG duration=$((END - START))s port=$PORT"
    echo "$IMAGE_TAG" > "$STATE_DIR/$ENV_NAME.last_good"
    exit 0
  fi
  sleep 2
done

log "FAILED tag=$IMAGE_TAG health check did not pass within 120s"
exit 1
