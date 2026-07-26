import { test, expect } from '@playwright/test';
import { SubscribePage } from './pages/subscribe.page';

test.describe('Subscribe Page', () => {
  let subscribePage: SubscribePage;

  test.beforeEach(async ({ page }) => {
    subscribePage = new SubscribePage(page);
    await subscribePage.goto();
  });

  test('should display the subscription form', async () => {
    await expect(subscribePage.heading).toHaveText('GitHub release notifications');
    await expect(subscribePage.emailInput).toBeVisible();
    await expect(subscribePage.repoInput).toBeVisible();
    await expect(subscribePage.submitBtn).toHaveText('Subscribe');
  });

  test('should show error when fields are empty', async () => {
    await subscribePage.submitBtn.click();

    await expect(subscribePage.errorContainer).toBeVisible();
    await expect(subscribePage.errorMsgText).toHaveText('Please fill in all fields.');
  });

  test('should show error when only email is filled', async () => {
    await subscribePage.emailInput.fill('test@example.com');
    await subscribePage.submitBtn.click();

    await expect(subscribePage.errorContainer).toBeVisible();
    await expect(subscribePage.errorMsgText).toHaveText('Please fill in all fields.');
  });

  test('should subscribe successfully with valid input', async () => {
    const uniqueEmail = `e2e-${Date.now()}@example.com`;

    await subscribePage.subscribe(uniqueEmail, 'facebook/react');

    await expect(subscribePage.submitBtn).toHaveText('Subscribing...');
    await expect(subscribePage.successContainer).toBeVisible({ timeout: 15_000 });
    await expect(subscribePage.emailInput).toHaveValue('');
    await expect(subscribePage.repoInput).toHaveValue('');
    await expect(subscribePage.submitBtn).toHaveText('Subscribe');
  });

  test('should show error for non-existent repository', async () => {
    await subscribePage.subscribe('test@example.com', 'nonexistent-owner-xyz/nonexistent-repo-xyz');

    await expect(subscribePage.errorContainer).toBeVisible({ timeout: 15_000 });
  });

  test('should show success when resending confirmation email', async ({ page }) => {
    const uniqueEmail = `dup-${Date.now()}@example.com`;

    const subscribeRes = await page.request.post('/api/subscribe', {
      data: { email: uniqueEmail, repo: 'facebook/react' },
    });
    expect(subscribeRes.ok()).toBeTruthy();

    await subscribePage.subscribe(uniqueEmail, 'facebook/react');

    await expect(subscribePage.successContainer).toBeVisible({ timeout: 15_000 });
  });
});
