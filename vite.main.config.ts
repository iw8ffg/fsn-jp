import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    outDir: '.vite/build',
    lib: { entry: 'src/main/index.ts', formats: ['cjs'], fileName: () => 'main.js' },
    rollupOptions: { external: ['electron', 'chokidar', 'node:fs', 'node:path'] },
  },
});
