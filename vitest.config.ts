import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    exclude: ['**/tests/integration/**', '**/tests/e2e/**', '**/node_modules/**', '**/dist/**'],
    alias: {
      '@github-release-notification/shared': resolve(__dirname, 'packages/shared/src'),
    },
  },
});
