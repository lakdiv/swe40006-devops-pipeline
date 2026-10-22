#!/usr/bin/env bash
# Releases a deliberately broken version to prove the smoke test and automatic
# rollback work (metric M9). The broken image is built on the server from the
# current good image. Its start command exits because a required setting is missing.
# Usage (as the deploy user):  bash rollback-test.sh [test|staging|prod]
set -euo pipefail

ENV_NAME="${1:-prod}"
case "$ENV_NAME" in
  test)    PORT=8081 ;;
  staging) PORT=8082 ;;
  prod)    PORT=80 ;;
  *) echo "Unknown environment: $ENV_NAME"; exit 1 ;;
esac

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
GOOD="$(cat "$HOME/state/$ENV_NAME.last_good" 2>/dev/null || true)"
if [ -z "$GOOD" ]; then
  echo "No good version recorded for $ENV_NAME. Deploy it successfully first."
  exit 1
fi

echo "== Current good version: $GOOD"
echo "== Building a broken release from it"
docker build -q -t ghcr.io/lakdiv/fixlog:broken-release - <<EOF
FROM ghcr.io/lakdiv/fixlog:$GOOD
CMD ["node", "-e", "console.error('FIXLOG_REQUIRED_SETTING is not set'); process.exit(1)"]
EOF

echo "== Releasing it to $ENV_NAME. Expect FAILED, then ROLLBACK and ROLLED_BACK."
if bash "$SCRIPT_DIR/deploy.sh" "$ENV_NAME" broken-release; then
  echo "Unexpected: the broken release passed the smoke test."
  exit 1
fi

echo
echo "== $ENV_NAME is now serving:"
curl -s "http://localhost:$PORT/health"
echo
