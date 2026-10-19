const { test, expect } = require('@playwright/test');

const unique = () => `Asset-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

test.describe('FixLog end-to-end', () => {

  test('home page loads and shows the running version', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('h1')).toHaveText('FixLog');
    await expect(page.locator('footer')).toContainText('version:');
  });

  test('logs a maintenance request and shows it in the list', async ({ page }) => {
    const asset = unique();
    await page.goto('/');
    await page.getByTestId('asset-input').fill(asset);
    await page.getByTestId('description-input').fill('Not cooling');
    await page.getByTestId('submit').click();

    const row = page.getByTestId('request').filter({ hasText: asset });
    await expect(row).toBeVisible();
    await expect(row).toContainText('Not cooling');
  });

  test('a new request starts with status open', async ({ page }) => {
    const asset = unique();
    await page.goto('/');
    await page.getByTestId('asset-input').fill(asset);
    await page.getByTestId('description-input').fill('Door sticking');
    await page.getByTestId('submit').click();

    const row = page.getByTestId('request').filter({ hasText: asset });
    await expect(row.getByTestId('status')).toHaveText('open');
  });

  test('the request survives a page reload', async ({ page }) => {
    const asset = unique();
    await page.goto('/');
    await page.getByTestId('asset-input').fill(asset);
    await page.getByTestId('description-input').fill('Leaking');
    await page.getByTestId('submit').click();

    await page.reload();
    await expect(page.getByTestId('request').filter({ hasText: asset })).toBeVisible();
  });

  test('the form will not submit without a description', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('asset-input').fill(unique());
    await page.getByTestId('submit').click();
    await expect(page.getByTestId('description-input')).toBeFocused();
  });

  test('deletes a request', async ({ page }) => {
    const asset = unique();
    await page.goto('/');
    await page.getByTestId('asset-input').fill(asset);
    await page.getByTestId('description-input').fill('To be removed');
    await page.getByTestId('submit').click();

    const row = page.getByTestId('request').filter({ hasText: asset });
    await expect(row).toBeVisible();
    await row.getByTestId('delete').click();
    await expect(page.getByTestId('request').filter({ hasText: asset })).toHaveCount(0);
  });

  test('health endpoint reports a connected database', async ({ request }) => {
    const res = await request.get('/health');
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.status).toBe('ok');
    expect(body.database).toBe('connected');
  });

  test('metrics endpoint exposes request counters', async ({ request }) => {
    const res = await request.get('/metrics');
    expect(res.status()).toBe(200);
    expect(await res.text()).toContain('fixlog_http_requests_total');
  });

});