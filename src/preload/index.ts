import { contextBridge, ipcRenderer } from 'electron';
import { IPC } from '../shared/ipc';
import type { FsnApi } from '../shared/api';
import type { FsEvent, SearchHit } from '../shared/types';

const api: FsnApi = {
  listDrives: () => ipcRenderer.invoke(IPC.listDrives),
  listDir:    (p, depth) => ipcRenderer.invoke(IPC.listDir, p, depth),
  stat:       (p) => ipcRenderer.invoke(IPC.stat, p),
  move:       (s, d) => ipcRenderer.invoke(IPC.move, s, d),
  copy:       (s, d) => ipcRenderer.invoke(IPC.copy, s, d),
  rename:     (p, name) => ipcRenderer.invoke(IPC.rename, p, name),
  trash:      (p) => ipcRenderer.invoke(IPC.trash, p),
  mkdir:      (parent, name) => ipcRenderer.invoke(IPC.mkdir, parent, name),
  search:     (root, q, id) => ipcRenderer.invoke(IPC.search, root, q, id),
  searchCancel: (id) => ipcRenderer.invoke(IPC.searchCancel, id),
  watchRoot:  (p) => ipcRenderer.invoke(IPC.watchRoot, p),
  loadConfig: () => ipcRenderer.invoke(IPC.loadConfig),
  saveConfig: (cfg) => ipcRenderer.invoke(IPC.saveConfig, cfg),

  onSearchResult(cb: (id: string, hits: SearchHit[]) => void) {
    const handler = (_: unknown, id: string, hits: SearchHit[]) => cb(id, hits);
    ipcRenderer.on(IPC.searchResult, handler);
    return () => ipcRenderer.removeListener(IPC.searchResult, handler);
  },
  onFsEvent(cb: (event: FsEvent) => void) {
    const handler = (_: unknown, event: FsEvent) => cb(event);
    ipcRenderer.on(IPC.fsEvent, handler);
    return () => ipcRenderer.removeListener(IPC.fsEvent, handler);
  },
  onBootRoot(cb: (root: string) => void) {
    const handler = (_: unknown, root: string) => cb(root);
    ipcRenderer.on(IPC.bootRoot, handler);
    return () => ipcRenderer.removeListener(IPC.bootRoot, handler);
  },
};

contextBridge.exposeInMainWorld('fsn', api);
