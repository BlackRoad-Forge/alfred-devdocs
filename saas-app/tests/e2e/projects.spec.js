const { test, expect } = require('@playwright/test');

test.describe('Projects (plan limits)', () => {
  let email;

  test.beforeEach(async ({ page }) => {
    email = `proj-${Date.now()}@example.com`;
    await page.goto('/signup');
    await page.fill('input[name="email"]', email);
    await page.fill('input[name="password"]', 'testpassword123');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/dashboard');
  });

  test('can create a project from dashboard', async ({ page }) => {
    await page.fill('#create-project input[name="name"]', 'My First Project');
    await page.click('#create-project button[type="submit"]');

    // Wait for project to appear in list
    await expect(page.locator('.project-item')).toHaveCount(1);
    await expect(page.locator('.project-item')).toContainText('My First Project');
  });

  test('can delete a project', async ({ page }) => {
    // Create
    await page.fill('#create-project input[name="name"]', 'Delete Me');
    await page.click('#create-project button[type="submit"]');
    await expect(page.locator('.project-item')).toHaveCount(1);

    // Delete
    await page.click('.project-item .btn-danger');
    await expect(page.locator('.project-item')).toHaveCount(0);
  });

  test('API returns projects as JSON', async ({ page, request }) => {
    // Get cookies from browser context for API auth
    const cookies = await page.context().cookies();
    const cookieHeader = cookies.map(c => `${c.name}=${c.value}`).join('; ');

    // Create via API
    const createRes = await request.post('/api/projects', {
      headers: { Cookie: cookieHeader, 'Content-Type': 'application/json' },
      data: { name: 'API Project', description: 'Created via API' },
    });
    expect(createRes.ok()).toBeTruthy();
    const created = await createRes.json();
    expect(created.name).toBe('API Project');

    // List via API
    const listRes = await request.get('/api/projects', {
      headers: { Cookie: cookieHeader },
    });
    const projects = await listRes.json();
    expect(projects.length).toBe(1);
    expect(projects[0].name).toBe('API Project');
  });

  test('free plan limits to 5 projects', async ({ page, request }) => {
    const cookies = await page.context().cookies();
    const cookieHeader = cookies.map(c => `${c.name}=${c.value}`).join('; ');

    // Create 5 projects
    for (let i = 1; i <= 5; i++) {
      const res = await request.post('/api/projects', {
        headers: { Cookie: cookieHeader, 'Content-Type': 'application/json' },
        data: { name: `Project ${i}` },
      });
      expect(res.ok()).toBeTruthy();
    }

    // 6th should fail
    const res = await request.post('/api/projects', {
      headers: { Cookie: cookieHeader, 'Content-Type': 'application/json' },
      data: { name: 'Project 6' },
    });
    expect(res.status()).toBe(403);
    const body = await res.json();
    expect(body.error).toContain('Plan limit');
  });
});
