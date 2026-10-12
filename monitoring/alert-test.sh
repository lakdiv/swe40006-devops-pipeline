#!/usr/bin/env bash
# Controlled tests for the five alert rules (metric M12).
# Usage (as the deploy user):  bash alert-test.sh <test>
#
#   host           CPU, memory and disk load for 13 minutes (HighCPU, HighMemory, LowDiskSpace)
#   host-stop      stop the host load early and delete the disk filler
#   appdown        stop the Production app container (AppDown)
#   appdown-stop   start it again
#   latency        lower the HighLatency threshold and send traffic for 7 minutes
#   latency-stop   restore the threshold
set -euo pipefail

DIR="$(cd "$(dirname "$0")" && pwd)"
PIDS="$HOME/state/alert-test.pids"
FILLER="$HOME/fill.img"
mkdir -p "$HOME/state"

bg() { nohup "$@" >/dev/null 2>&1 & echo $! >> "$PIDS"; }

reload_prometheus() { curl -fs -X POST http://localhost:9090/-/reload && echo "Prometheus rules reloaded"; }

stop_bg() {
  if [ -f "$PIDS" ]; then
    while read -r pid; do kill "$pid" 2>/dev/null || true; done < "$PIDS"
    rm -f "$PIDS"
  fi
}

case "${1:-}" in
  host)
    bg timeout 13m yes
    bg timeout 13m yes
    bg timeout 13m python3 -c "import time; x = b'1' * (1200*1024*1024); time.sleep(900)"
    FREE_KB=$(df --output=avail -k / | tail -1)
    fallocate -l $(( FREE_KB - 2*1024*1024 ))K "$FILLER"
    echo "CPU and memory load running for 13 minutes. Disk filled:"
    df -h /
    echo "HighMemory fires after about 5 minutes, HighCPU after about 9 and LowDiskSpace after about 10."
    echo "Take the screenshot at about 11 minutes, then run 'bash alert-test.sh host-stop'."
    ;;
  host-stop)
    stop_bg
    rm -f "$FILLER"
    echo "Load stopped and disk filler deleted."
    df -h /
    ;;
  appdown)
    docker stop fixlog-prod-app-1
    echo "Production app stopped. AppDown fires after about 1 to 2 minutes."
    ;;
  appdown-stop)
    docker start fixlog-prod-app-1
    echo "Production app started again."
    ;;
  latency)
    sed -i 's/by (le)) > 0\.5$/by (le)) > 0.001/' "$DIR/alerts.yml"
    reload_prometheus
    bg timeout 7m bash -c 'while true; do curl -s -o /dev/null http://localhost/; done'
    echo "Threshold lowered to 0.001 s and traffic running for 7 minutes."
    echo "Run 'bash alert-test.sh latency-stop' after the screenshot."
    ;;
  latency-stop)
    stop_bg
    sed -i 's/by (le)) > 0\.001$/by (le)) > 0.5/' "$DIR/alerts.yml"
    reload_prometheus
    echo "Threshold restored to 0.5 s."
    ;;
  *)
    sed -n '2,10p' "$0"
    exit 1
    ;;
esac
