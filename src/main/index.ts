import { app, BrowserWindow } from 'electron';
import * as path from 'node:path';
// @ts-expect-error — package has no type defs
import squirrelStartup from 'electron-squirrel-startup';
import { FsService } from './FsService';
import { FsWatcher } from './FsWatcher';
import { SearchService } from './SearchService';
import { Persistence } from './Persistence';
import { registerIpc } from './IpcRouter';
import { Logger } from './Logger';

// Handle Squirrel install/uninstall/update events. The default export is
// `true` when the helper handled a startup flag (--squirrel-install etc.)
// and the app should quit immediately to avoid flickering open multiple
// times during install.
if (squirrelStartup) {
  app.quit();
}

const logger = new Logger();
process.on('uncaughtException', (err) => {
  logger.error('main:uncaughtException', err).catch(() => {});
});
process.on('unhandledRejection', (err) => {
  logger.error('main:unhandledRejection', err).catch(() => {});
});

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
    // TEMP debug: always open DevTools in production until drive-pick hang is diagnosed.
    win.webContents.openDevTools({ mode: 'detach' });
  }

  // Enable F12 / Ctrl+Shift+I to toggle DevTools in any build.
  win.webContents.on('before-input-event', (_event, input) => {
    if (input.type !== 'keyDown') return;
    if (input.key === 'F12' || (input.control && input.shift && input.key.toLowerCase() === 'i')) {
      win.webContents.toggleDevTools();
    }
  });

  return win;
}

app.whenReady().then(async () => {
  const fsSvc = new FsService();
  const win = await createWindow();
  const watcher = new FsWatcher(win);
  const search = new SearchService();
  const persistence = new Persistence();
  registerIpc(fsSvc, watcher, search, win, persistence);

  // Optional CLI override: `--root=<path>` skips the drive picker by
  // signalling the renderer once it's ready. Send exactly once per
  // renderer load: an internal flag is reset on `did-start-loading` so HMR
  // reloads re-send after the renderer remounts, avoiding listener pile-up.
  const rootArg = process.argv.find((a) => a.startsWith('--root='))?.slice('--root='.length);
  if (rootArg) {
    let alreadySent = false;
    const fire = () => {
      if (alreadySent) return;
      alreadySent = true;
      try {
        win.webContents.send('cfg:bootRoot', rootArg);
      } catch {
        // Window may have been destroyed; ignore.
      }
    };
    win.webContents.on('did-start-loading', () => { alreadySent = false; });
    win.webContents.on('did-finish-load', fire);
  }
  let isQuitting = false;
  app.on('before-quit', async (event) => {
    if (isQuitting) return;
    event.preventDefault();
    isQuitting = true;
    await watcher.dispose();
    app.quit();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
