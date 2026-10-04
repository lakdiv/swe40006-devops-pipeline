# FixLog — SWE40006 DevOps Pipeline Project

A maintenance request tracker built to demonstrate a multi-environment
DevOps pipeline (build, test, deploy, monitor).

**Team:** K.W.D. Gayanuka Lakdiv · Rahul Raju
**Unit:** SWE40006 Software Deployment and Evolution

## Requirements

- Node.js 20 LTS
- Docker Desktop (needed from Week 8 onward)
- Git

## Run it locally

```bash
cd swe40006-devops-pipeline
npm install
npm start
```

Open http://localhost:3000

## Run the tests

```bash
npm test
```

## Endpoints

| Method | Path | Purpose |
|---|---|---|
| GET | `/` | Home page |
| GET | `/health` | Health check used by the deployment smoke test |
| GET | `/api/items` | List all requests |
| POST | `/api/items` | Create a request (JSON body: `{ "title": "..." }`) |
| DELETE | `/api/items/:id` | Delete a request |

## Repository layout

| Path | Owner | Contents |
|---|---|---|
| `src/` | Gayanuka | Application code |
| `tests/` | Gayanuka | Unit and integration tests |
| `.github/workflows/ci.yml` | Gayanuka | Build and test pipeline |
| `deploy/` | Rahul | Compose files and deployment scripts |
| `monitoring/` | Rahul | Prometheus and Grafana configuration |
| `e2e/` | Rahul | Playwright end-to-end tests |

## Working agreement

- No direct commits to `main`. Branch, push, open a pull request, get one approval, merge.
- Branch naming: `feature/`, `fix/`, `infra/`, `docs/`
- Pull `main` at the start of every session.
- Secrets never go in the repository. Use GitHub Actions secrets.
