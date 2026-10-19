# End-to-end tests (owner: Rahul)

Playwright tests that run against Staging in the Deploy workflow, after Staging is deployed.

| Test | Checks |
|---|---|
| home page loads | The page returns 200 and shows the FixLog heading |
| footer shows the deployed version | The footer shows the commit SHA that was just deployed |
| health check reports the database as connected | `/health` returns `ok` with the database connected |
| a new request appears on the home page | A request created through the API shows on the home page |
| a request without a description is rejected | The API returns 400 for missing fields |
| a deleted request is removed | Delete returns 204, the request leaves the list, a second delete returns 404 |
| metrics endpoint exposes request counters | `/metrics` includes `fixlog_http_requests_total` |

Each test cleans up the requests it creates.

## Run locally

Needs Node.js 20 or later.

```bash
cd e2e
npm ci
npx playwright install --with-deps chromium
BASE_URL=http://<server-ip>:8082 npx playwright test
```

The HTML report is written to `e2e/playwright-report/`.
