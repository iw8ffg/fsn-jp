import { defineConfig } from 'vite';
import path from 'node:path';
import { getBuildDefine } from '@electron-forge/plugin-vite/dist/config/vite.base.config';

export default defineConfig((env) => ({
  resolve: {
    alias: {
      '@shared': path.resolve(__dirname, 'src/shared'),
      '@main': path.resolve(__dirname, 'src/main'),
    },
  },
  // Replaces `MAIN_WINDOW_VITE_DEV_SERVER_URL` / `MAIN_WINDOW_VITE_NAME`
  // (and any other renderer entries from forge.config.ts) with their build-time
  // values so the main process can branch on dev vs packaged.
  define: getBuildDefine(env as never),
  build: {
    outDir: '.vite/build',
    lib: { entry: 'src/main/index.ts', formats: ['cjs'], fileName: () => 'main.js' },
    rollupOptions: { external: ['electron', 'chokidar', 'node:fs', 'node:path'] },
  },
}));
