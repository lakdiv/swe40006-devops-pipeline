# Monitoring (owner: Rahul)

Prometheus, Node Exporter and Grafana run on the Production host.

| File | Purpose |
|---|---|
| `compose.yml` | The three monitoring containers |
| `start.sh` | Starts the stack and prints the Grafana login |
| `prometheus.yml` | Scrape jobs, every 15 seconds |
| `alerts.yml` | The five Production alert rules |
| `alert-test.sh` | Controlled tests that make each alert fire |
| `grafana/provisioning/` | Prometheus data source and dashboard loader |
| `grafana/dashboards/fixlog-production.json` | CPU, memory, disk I/O, network and latency panels |

## Start

As the `deploy` user on the host:

```bash
bash ~/fixlog/monitoring/start.sh
```

`~/env/monitoring.env` holds `GRAFANA_ADMIN_PASSWORD`. `start.sh` creates it on the first run. It is never committed.

Prometheus: port 9090. Grafana: port 3000. Both are limited to team IP addresses in the security group.

## Application metrics

The `fixlog-prod` job scrapes `/metrics` from the app. The latency panel and the HighLatency alert use the `fixlog_http_request_duration_seconds` histogram from `src/metrics.js`, excluding the `/metrics` route itself.
