import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: 'tests/e2e',
  globalTimeout: 120_000,
  timeout: 30_000,
  retries: 0,
  use: {
    baseURL: 'http://localhost:3001',
  },
  globalSetup: 'tests/e2e/global-setup.ts',
  globalTeardown: 'tests/e2e/global-teardown.ts',
  projects: [
    { name: 'chromium', use: { browserName: 'chromium' } },
  ],
});
