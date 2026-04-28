import type { ForgeConfig } from '@electron-forge/shared-types';
import { VitePlugin } from '@electron-forge/plugin-vite';
import { MakerZIP } from '@electron-forge/maker-zip';
import { MakerSquirrel } from '@electron-forge/maker-squirrel';

const config: ForgeConfig = {
  packagerConfig: {
    name: 'FSN-JP',
    executableName: 'fsn-jp',
    asar: true,
    icon: 'resources/icon',
  },
  makers: [
    new MakerSquirrel({ name: 'fsn-jp', setupIcon: 'resources/icon.ico' }),
    new MakerZIP({}, ['win32']),
  ],
  plugins: [
    new VitePlugin({
      build: [
        { entry: 'src/main/index.ts',    config: 'vite.main.config.ts',    target: 'main' },
        { entry: 'src/preload/index.ts', config: 'vite.preload.config.ts', target: 'preload' },
      ],
      renderer: [{ name: 'main_window', config: 'vite.renderer.config.ts' }],
    }),
  ],
};

export default config;
