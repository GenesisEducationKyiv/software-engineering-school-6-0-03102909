import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    exclude: [
      'tests/integration/**',
      'tests/e2e/**',
      'node_modules/**',
    ],
  },
});
