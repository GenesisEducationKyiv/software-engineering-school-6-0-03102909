import { test, expect } from '@playwright/test';

test.describe('Subscribe Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should display the subscription form', async ({ page }) => {
    await expect(page.locator('h1')).toHaveText('GitHub release notifications');
    await expect(page.locator('#email')).toBeVisible();
    await expect(page.locator('#repo')).toBeVisible();
    await expect(page.locator('#submit-btn')).toHaveText('Subscribe');
  });

  test('should show error when fields are empty', async ({ page }) => {
    await page.click('#submit-btn');

    await expect(page.locator('#error')).toBeVisible();
    await expect(page.locator('#error-msg')).toHaveText('Please fill in all fields.');
  });

  test('should show error when only email is filled', async ({ page }) => {
    await page.fill('#email', 'test@example.com');
    await page.click('#submit-btn');

    await expect(page.locator('#error')).toBeVisible();
    await expect(page.locator('#error-msg')).toHaveText('Please fill in all fields.');
  });

  test('should subscribe successfully with valid input', async ({ page }) => {
    const uniqueEmail = `e2e-${Date.now()}@example.com`;

    await page.fill('#email', uniqueEmail);
    await page.fill('#repo', 'facebook/react');
    await page.click('#submit-btn');

    await expect(page.locator('#submit-btn')).toHaveText('Subscribing...');
    await expect(page.locator('#success')).toBeVisible({ timeout: 15_000 });
    await expect(page.locator('#email')).toHaveValue('');
    await expect(page.locator('#repo')).toHaveValue('');
    await expect(page.locator('#submit-btn')).toHaveText('Subscribe');
  });

  test('should show error for non-existent repository', async ({ page }) => {
    await page.fill('#email', 'test@example.com');
    await page.fill('#repo', 'nonexistent-owner-xyz/nonexistent-repo-xyz');
    await page.click('#submit-btn');

    await expect(page.locator('#error')).toBeVisible({ timeout: 15_000 });
  });

  test('should show success when resending confirmation email', async ({ page }) => {
    const uniqueEmail = `dup-${Date.now()}@example.com`;

    const subscribeRes = await page.request.post('/api/subscribe', {
      data: { email: uniqueEmail, repo: 'facebook/react' },
    });
    expect(subscribeRes.ok()).toBeTruthy();

    await page.fill('#email', uniqueEmail);
    await page.fill('#repo', 'facebook/react');
    await page.click('#submit-btn');

    await expect(page.locator('#success')).toBeVisible({ timeout: 15_000 });
  });
});
