# Deployment (owner: Rahul)

Test, Staging and Production run on one EC2 host as separate Compose projects.
Each has its own database container and volume.

| Environment | Compose project | Host port |
|---|---|---|
| Test | `fixlog-test` | 8081 |
| Staging | `fixlog-staging` | 8082 |
| Production | `fixlog-prod` | 80 |

## Files

| File | Purpose |
|---|---|
| `provision.sh` | One-off setup of a fresh Amazon Linux 2023 host |
| `compose.yml` | Base file shared by all three environments |
| `compose.test.yml`, `compose.staging.yml`, `compose.prod.yml` | Per-environment port and network |
| `deploy.sh` | Pulls an image tag and deploys one environment |
| `measure-downtime.sh` | Redeploys an environment and counts failed health checks during the restart |

## Deploy

As the `deploy` user on the host:

```bash
bash ~/fixlog/deploy/deploy.sh test              # latest commit on main
bash ~/fixlog/deploy/deploy.sh test <commit-sha> # a specific image
```

Each environment reads its secrets from `~/env/<env>.env` on the host. `deploy.sh` creates the file with a random database password on the first run. These files are never committed.

Timings are written to `~/logs/deploy.log`. The last healthy tag for each environment is kept in `~/state/<env>.last_good`.
