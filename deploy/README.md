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
| `deploy.sh` | Deploys an image tag, smoke tests it and rolls back if it fails |
| `measure-downtime.sh` | Redeploys an environment and counts failed health checks during the restart |
| `rollback-test.sh` | Releases a deliberately broken version to prove the automatic rollback |
| `RUNBOOK.md` | How to rebuild the server from nothing |

## Pipeline

`.github/workflows/deploy.yml` runs after CI passes on `main`:

1. **Test**: copies this repository to the server and runs `deploy.sh test <sha>`
2. **Staging**: runs `deploy.sh staging <sha>`, then the Playwright tests in `e2e/`
3. **Production**: waits for approval in the `production` environment, then runs `deploy.sh prod <sha>`

It needs the `EC2_HOST` repository variable and the `EC2_SSH_KEY` repository secret.

## Deploy by hand

As the `deploy` user on the host:

```bash
bash ~/fixlog/deploy/deploy.sh test              # latest commit on main
bash ~/fixlog/deploy/deploy.sh test <commit-sha> # a specific image
```

After starting the new version, `deploy.sh` checks `/health` and the home page for up to 60 seconds. If either fails, it restarts the last good version and exits with an error.

Each environment reads its secrets from `~/env/<env>.env` on the host. `deploy.sh` creates the file with a random database password on the first run. These files are never committed.

Timings, failures and rollbacks are written to `~/logs/deploy.log`. The last good tag for each environment is kept in `~/state/<env>.last_good`.
