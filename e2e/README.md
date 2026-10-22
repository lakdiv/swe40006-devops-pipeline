# End-to-end tests

Playwright tests that run against Staging in the Deploy workflow, after Staging is deployed. The config is `playwright.config.js` in the repository root.

| File | Covers |
|---|---|
| `fixlog.spec.js` | The request form: logging, status, reload, validation, delete, plus `/health` and `/metrics` |
| `deployment.spec.js` | The deployed version in the footer matches the commit SHA, plus the JSON API: create, validation (400), delete (204 then 404) |

## Run locally

From the repository root, with Node.js 20 or later:

```bash
npm ci
npx playwright install --with-deps chromium
E2E_BASE_URL=http://<server-ip>:8082 npx playwright test
```

Set `EXPECTED_VERSION` to a commit SHA to check the footer shows that exact version. The HTML report is written to `playwright-report/`.
