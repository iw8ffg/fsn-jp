import { ipcMain, IpcMainInvokeEvent, BrowserWindow } from 'electron';
import { IPC, IpcResult } from '@shared/ipc';
import type { AppConfig } from '@shared/api';
import { FsService } from './FsService';
import { FsWatcher } from './FsWatcher';
import { SearchService } from './SearchService';
import { Persistence } from './Persistence';

function ok<T>(data: T): IpcResult<T>      { return { ok: true, data }; }
function fail(err: unknown): IpcResult<never> {
  const e = err as { code?: string; message?: string };
  return { ok: false, code: e?.code ?? 'UNKNOWN', message: e?.message ?? String(err) };
}

async function safe<T>(fn: () => Promise<T>): Promise<IpcResult<T>> {
  try { return ok(await fn()); }
  catch (err) { return fail(err); }
}

export function registerIpc(
  fsSvc: FsService,
  watcher: FsWatcher,
  search: SearchService,
  win: BrowserWindow,
  persistence: Persistence,
): void {
  ipcMain.handle(IPC.listDrives, async () => safe(() => fsSvc.listDrives()));
  ipcMain.handle(IPC.listDir,    async (_e: IpcMainInvokeEvent, p: string, depth: number) => safe(() => fsSvc.listDir(p, depth)));
  ipcMain.handle(IPC.mkdir,      async (_e, parent: string, name: string) => safe(() => fsSvc.mkdir(parent, name)));
  ipcMain.handle(IPC.rename,     async (_e, p: string, name: string)      => safe(() => fsSvc.rename(p, name)));
  ipcMain.handle(IPC.move,       async (_e, s: string, d: string)         => safe(() => fsSvc.move(s, d)));
  ipcMain.handle(IPC.copy,       async (_e, s: string, d: string)         => safe(() => fsSvc.copy(s, d)));
  ipcMain.handle(IPC.trash,      async (_e, p: string)                    => safe(() => fsSvc.trash(p)));
  ipcMain.handle(IPC.watchRoot,  async (_e, p: string)                    => safe(() => watcher.watch(p)));
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
