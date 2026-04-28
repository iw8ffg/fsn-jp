import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/unit/**/*.test.ts', 'tests/integration/**/*.test.ts'],
    coverage: { provider: 'v8', reporter: ['text', 'html'] },
  },
  resolve: {
    alias: {
      '@shared':   path.resolve(__dirname, 'src/shared'),
      '@main':     path.resolve(__dirname, 'src/main'),
      '@renderer': path.resolve(__dirname, 'src/renderer'),
    },
  },
});
