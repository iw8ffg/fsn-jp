import { ipcMain, IpcMainInvokeEvent } from 'electron';
import { IPC, IpcResult } from '@shared/ipc';
import { FsService } from './FsService';

function ok<T>(data: T): IpcResult<T>      { return { ok: true, data }; }
function fail(err: unknown): IpcResult<never> {
  const e = err as { code?: string; message?: string };
  return { ok: false, code: e?.code ?? 'UNKNOWN', message: e?.message ?? String(err) };
}

async function safe<T>(fn: () => Promise<T>): Promise<IpcResult<T>> {
  try { return ok(await fn()); }
  catch (err) { return fail(err); }
}

export function registerIpc(fsSvc: FsService): void {
  ipcMain.handle(IPC.listDrives, async () => safe(() => fsSvc.listDrives()));
  ipcMain.handle(IPC.listDir,    async (_e: IpcMainInvokeEvent, p: string, depth: number) => safe(() => fsSvc.listDir(p, depth)));
  ipcMain.handle(IPC.mkdir,      async (_e, parent: string, name: string) => safe(() => fsSvc.mkdir(parent, name)));
  ipcMain.handle(IPC.rename,     async (_e, p: string, name: string)      => safe(() => fsSvc.rename(p, name)));
  ipcMain.handle(IPC.move,       async (_e, s: string, d: string)         => safe(() => fsSvc.move(s, d)));
  ipcMain.handle(IPC.copy,       async (_e, s: string, d: string)         => safe(() => fsSvc.copy(s, d)));
  ipcMain.handle(IPC.trash,      async (_e, p: string)                    => safe(() => fsSvc.trash(p)));
}
