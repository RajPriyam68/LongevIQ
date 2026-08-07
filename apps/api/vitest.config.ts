import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.spec.ts'],
    setupFiles: ['tests/setup.ts'],
    globalSetup: ['tests/integration/global-setup.ts'],
    globals: false,
    reporters: ['default'],
  },
});
