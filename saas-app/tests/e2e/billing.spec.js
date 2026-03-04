const { test, expect } = require('@playwright/test');

test.describe('Billing & Pricing', () => {
  test('pricing page shows all plans', async ({ page }) => {
    await page.goto('/pricing');
    await expect(page.locator('.plan-card')).toHaveCount(3);
    await expect(page.locator('text=Free')).toBeVisible();
    await expect(page.locator('text=Basic')).toBeVisible();
    await expect(page.locator('text=Pro')).toBeVisible();
    await expect(page.locator('text=$9')).toBeVisible();
    await expect(page.locator('text=$29')).toBeVisible();
  });

  test('checkout button requires login', async ({ page }) => {
    await page.goto('/pricing');
    // Click subscribe without being logged in
    const [response] = await Promise.all([
      page.waitForResponse(resp => resp.url().includes('/billing/checkout')),
      page.locator('[data-checkout]').first().click(),
    ]);
    // Should get 401 since not authenticated
    expect(response.status()).toBe(401);
  });

  test('dashboard shows current plan', async ({ page }) => {
    const email = `billing-${Date.now()}@example.com`;
    await page.goto('/signup');
    await page.fill('input[name="email"]', email);
    await page.fill('input[name="password"]', 'testpassword123');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/dashboard');

    // Free plan by default
    await expect(page.locator('.plan-badge')).toContainText('FREE');
  });

  test('health endpoint returns ok', async ({ request }) => {
    const res = await request.get('/api/health');
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.status).toBe('ok');
    expect(body.uptime).toBeGreaterThan(0);
  });

  test('webhook endpoint rejects unsigned requests', async ({ request }) => {
    const res = await request.post('/billing/webhook', {
      data: JSON.stringify({ type: 'test' }),
      headers: { 'Content-Type': 'application/json' },
    });
    expect(res.status()).toBe(400);
  });
});
