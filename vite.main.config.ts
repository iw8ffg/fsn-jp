import { defineConfig } from 'vite';
import path from 'node:path';

export default defineConfig({
  resolve: {
    alias: {
      '@shared': path.resolve(__dirname, 'src/shared'),
      '@main': path.resolve(__dirname, 'src/main'),
    },
  },
  build: {
    outDir: '.vite/build',
    lib: { entry: 'src/main/index.ts', formats: ['cjs'], fileName: () => 'main.js' },
    rollupOptions: { external: ['electron', 'chokidar', 'node:fs', 'node:path'] },
  },
});
