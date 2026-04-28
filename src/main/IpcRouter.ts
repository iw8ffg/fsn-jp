import { ipcMain, IpcMainInvokeEvent, BrowserWindow } from 'electron';
import { IPC, IpcResult } from '@shared/ipc';
import type { AppConfig } from '@shared/api';
import { FsService } from './FsService';
import { FsWatcher } from './FsWatcher';
import { SearchService } from './SearchService';
import { Persistence } from './Persistence';
import { Logger } from './Logger';

const debugLog = new Logger();

function ok<T>(data: T): IpcResult<T>      { return { ok: true, data }; }
function fail(err: unknown): IpcResult<never> {
  const e = err as { code?: string; message?: string };
  return { ok: false, code: e?.code ?? 'UNKNOWN', message: e?.message ?? String(err) };
}

async function safe<T>(fn: () => Promise<T>, label?: string): Promise<IpcResult<T>> {
  const t0 = Date.now();
  if (label) debugLog.info(`IPC ${label} start`).catch(() => {});
  try {
    const data = await fn();
    if (label) debugLog.info(`IPC ${label} ok in ${Date.now() - t0}ms`).catch(() => {});
    return ok(data);
  } catch (err) {
    if (label) debugLog.error(`IPC ${label} fail in ${Date.now() - t0}ms`, err).catch(() => {});
    return fail(err);
  }
}

export function registerIpc(
  fsSvc: FsService,
  watcher: FsWatcher,
  search: SearchService,
  win: BrowserWindow,
  persistence: Persistence,
): void {
  ipcMain.handle(IPC.listDrives, async () => safe(() => fsSvc.listDrives(), 'listDrives'));
  ipcMain.handle(IPC.listDir,    async (_e: IpcMainInvokeEvent, p: string, depth: number) => safe(() => fsSvc.listDir(p, depth), `listDir(${p},${depth})`));
  ipcMain.handle(IPC.mkdir,      async (_e, parent: string, name: string) => safe(() => fsSvc.mkdir(parent, name), 'mkdir'));
  ipcMain.handle(IPC.rename,     async (_e, p: string, name: string)      => safe(() => fsSvc.rename(p, name), 'rename'));
  ipcMain.handle(IPC.move,       async (_e, s: string, d: string)         => safe(() => fsSvc.move(s, d), 'move'));
  ipcMain.handle(IPC.copy,       async (_e, s: string, d: string)         => safe(() => fsSvc.copy(s, d), 'copy'));
  ipcMain.handle(IPC.trash,      async (_e, p: string)                    => safe(() => fsSvc.trash(p), 'trash'));
  ipcMain.handle(IPC.watchRoot,  async (_e, p: string)                    => safe(() => watcher.watch(p), `watchRoot(${p})`));
  ipcMain.handle(IPC.search,     async (_e, root: string, query: string, id: string) =>
    safe(async () => {
      await search.search(root, query, id, (hits) => {
        win.webContents.send(IPC.searchResult, id, hits);
      });
    }),
  );
  ipcMain.handle(IPC.searchCancel, async (_e, id: string) => safe(async () => { search.cancel(id); }));
  ipcMain.handle(IPC.loadConfig, async () => safe(() => persistence.load()));
  ipcMain.handle(IPC.saveConfig, async (_e, cfg: AppConfig) => safe(() => persistence.save(cfg)));
}
