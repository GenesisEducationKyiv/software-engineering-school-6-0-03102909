import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    include: ['**/tests/integration/**/*.test.ts'],
    testTimeout: 60_000,
    hookTimeout: 120_000,
    pool: 'forks',
    alias: {
      '@github-release-notification/shared': resolve(__dirname, 'packages/shared/src'),
    },
  },
});
