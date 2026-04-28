import { app, BrowserWindow } from 'electron';
import * as path from 'node:path';
import { FsService } from './FsService';
import { FsWatcher } from './FsWatcher';
import { registerIpc } from './IpcRouter';

// Forge's plugin-vite injects MAIN_WINDOW_VITE_DEV_SERVER_URL via Vite `define`
// when `vite.main.config.ts` calls `getBuildDefine`. The constant is replaced
// inline at build time (truthy URL during `electron-forge start`, `undefined`
// in production builds). plugin-vite does NOT inject a preload entry global,
// so we resolve the preload path relative to the bundled main.
declare const MAIN_WINDOW_VITE_DEV_SERVER_URL: string | undefined;
declare const MAIN_WINDOW_VITE_NAME: string | undefined;

async function createWindow(): Promise<BrowserWindow> {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    backgroundColor: '#0a0e14',
    webPreferences: {
      // plugin-vite emits the preload to `.vite/build/index.js`, alongside main.js.
      preload: path.join(__dirname, 'index.js'),
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
    },
  });

  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    await win.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
    win.webContents.openDevTools({ mode: 'detach' });
  } else {
    // `vite.renderer.config.ts` flattens outDir to `.vite/renderer/index.html`
    // (rather than Forge's default `<name>/` subdir), so resolve directly.
    void MAIN_WINDOW_VITE_NAME;
    await win.loadFile(path.join(__dirname, '../renderer/index.html'));
  }

  return win;
}

app.whenReady().then(async () => {
  const fsSvc = new FsService();
  const win = await createWindow();
  const watcher = new FsWatcher(win);
  registerIpc(fsSvc, watcher);
  app.on('before-quit', () => {
    void watcher.dispose();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
