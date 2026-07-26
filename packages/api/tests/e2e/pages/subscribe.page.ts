import { Locator, Page } from '@playwright/test';

export class SubscribePage {
  readonly page: Page;
  readonly heading: Locator;
  readonly emailInput: Locator;
  readonly repoInput: Locator;
  readonly submitBtn: Locator;
  readonly errorContainer: Locator;
  readonly errorMsgText: Locator;
  readonly successContainer: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.locator('h1');
    this.emailInput = page.locator('#email');
    this.repoInput = page.locator('#repo');
    this.submitBtn = page.locator('#submit-btn');
    this.errorContainer = page.locator('#error');
    this.errorMsgText = page.locator('#error-msg');
    this.successContainer = page.locator('#success');
  }

  async goto() {
    await this.page.goto('/');
  }

  async subscribe(email: string, repo: string) {
    if (email) {
      await this.emailInput.fill(email);
    }
    if (repo) {
      await this.repoInput.fill(repo);
    }
    await this.submitBtn.click();
  }
}
