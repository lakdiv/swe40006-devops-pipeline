const { test, expect } = require('@playwright/test');

const uniqueAsset = () => `E2E asset ${Date.now()}-${Math.floor(Math.random() * 1000)}`;

async function createRequest(request, asset) {
  const res = await request.post('/api/requests', {
    data: { asset, description: 'Created by the end-to-end tests' },
  });
  expect(res.status()).toBe(201);
  return res.json();
}

test('home page loads', async ({ page }) => {
  const res = await page.goto('/');
  expect(res.status()).toBe(200);
  await expect(page.locator('h1')).toHaveText('FixLog');
  await expect(page.getByText('Maintenance request tracker')).toBeVisible();
});

test('footer shows the deployed version', async ({ page }) => {
  await page.goto('/');
  const expected = process.env.EXPECTED_VERSION;
  await expect(page.locator('footer')).toHaveText(expected ? `version: ${expected}` : /^version: \S+$/);
});

test('health check reports the database as connected', async ({ request }) => {
  const res = await request.get('/health');
  expect(res.ok()).toBeTruthy();
  const body = await res.json();
  expect(body.status).toBe('ok');
  expect(body.database).toBe('connected');
});

test('a new request appears on the home page', async ({ page, request }) => {
  const asset = uniqueAsset();
  const created = await createRequest(request, asset);

  await page.goto('/');
  await expect(page.getByText(asset)).toBeVisible();

  await request.delete(`/api/requests/${created.id}`);
});

test('a request without a description is rejected', async ({ request }) => {
  const res = await request.post('/api/requests', { data: { asset: uniqueAsset() } });
  expect(res.status()).toBe(400);
  const body = await res.json();
  expect(body.error).toContain('required');
});

test('a deleted request is removed', async ({ request }) => {
  const created = await createRequest(request, uniqueAsset());

  const first = await request.delete(`/api/requests/${created.id}`);
  expect(first.status()).toBe(204);

  const list = await (await request.get('/api/requests')).json();
  expect(list.map((r) => r.id)).not.toContain(created.id);

  const second = await request.delete(`/api/requests/${created.id}`);
  expect(second.status()).toBe(404);
});

test('metrics endpoint exposes request counters', async ({ request }) => {
  const res = await request.get('/metrics');
  expect(res.ok()).toBeTruthy();
  expect(await res.text()).toContain('fixlog_http_requests_total');
});
