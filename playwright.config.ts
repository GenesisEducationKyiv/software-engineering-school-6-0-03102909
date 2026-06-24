import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: 'packages/api/tests/e2e',
  globalTimeout: 120_000,
  timeout: 30_000,
  retries: 0,
  use: {
    baseURL: 'http://localhost:3099',
  },
  globalSetup: 'packages/api/tests/e2e/global-setup.ts',
  globalTeardown: 'packages/api/tests/e2e/global-teardown.ts',
  projects: [
    { name: 'chromium', use: { browserName: 'chromium' } },
  ],
});
