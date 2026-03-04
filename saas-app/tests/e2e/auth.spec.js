const { test, expect } = require('@playwright/test');

test.describe('Authentication', () => {
  const testUser = {
    email: `test-${Date.now()}@example.com`,
    password: 'testpassword123',
    name: 'Test User',
  };

  test('homepage loads and shows hero', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('h1')).toContainText('Build faster');
    await expect(page.locator('a[href="/signup"]')).toBeVisible();
  });

  test('signup creates account and redirects to dashboard', async ({ page }) => {
    await page.goto('/signup');
    await page.fill('input[name="name"]', testUser.name);
    await page.fill('input[name="email"]', testUser.email);
    await page.fill('input[name="password"]', testUser.password);
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL('/dashboard');
    await expect(page.locator('h2')).toContainText('Dashboard');
  });

  test('signup rejects duplicate email', async ({ page }) => {
    // First signup
    await page.goto('/signup');
    const email = `dup-${Date.now()}@example.com`;
    await page.fill('input[name="email"]', email);
    await page.fill('input[name="password"]', 'testpassword123');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/dashboard');

    // Logout
    await page.click('button:text("Logout")');

    // Try same email
    await page.goto('/signup');
    await page.fill('input[name="email"]', email);
    await page.fill('input[name="password"]', 'anotherpassword');
    await page.click('button[type="submit"]');
    await expect(page.locator('.error')).toContainText('already exists');
  });

  test('signup rejects short password', async ({ page }) => {
    await page.goto('/signup');
    await page.fill('input[name="email"]', `short-${Date.now()}@example.com`);
    await page.fill('input[name="password"]', 'short');
    await page.click('button[type="submit"]');
    await expect(page.locator('.error')).toContainText('8 characters');
  });

  test('login works with valid credentials', async ({ page }) => {
    // Create account first
    const email = `login-${Date.now()}@example.com`;
    await page.goto('/signup');
    await page.fill('input[name="email"]', email);
    await page.fill('input[name="password"]', 'testpassword123');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/dashboard');

    // Logout
    await page.click('button:text("Logout")');

    // Login
    await page.goto('/login');
    await page.fill('input[name="email"]', email);
    await page.fill('input[name="password"]', 'testpassword123');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/dashboard');
  });

  test('login rejects invalid credentials', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[name="email"]', 'nobody@example.com');
    await page.fill('input[name="password"]', 'wrongpassword');
    await page.click('button[type="submit"]');
    await expect(page.locator('.error')).toContainText('Invalid');
  });

  test('protected routes redirect to login', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page).toHaveURL('/login');
  });

  test('logout clears session', async ({ page }) => {
    const email = `logout-${Date.now()}@example.com`;
    await page.goto('/signup');
    await page.fill('input[name="email"]', email);
    await page.fill('input[name="password"]', 'testpassword123');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/dashboard');

    await page.click('button:text("Logout")');
    await page.goto('/dashboard');
    await expect(page).toHaveURL('/login');
  });
});
