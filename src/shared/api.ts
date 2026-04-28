import type { DriveInfo, FsEvent, FsNode, SearchHit } from './types';
import type { IpcResult } from './ipc';

export interface FsnApi {
  listDrives():                                   Promise<IpcResult<DriveInfo[]>>;
  listDir(path: string, depth: number):           Promise<IpcResult<FsNode[]>>;
  stat(path: string):                             Promise<IpcResult<FsNode>>;
  move(src: string, dst: string):                 Promise<IpcResult<void>>;
  copy(src: string, dst: string):                 Promise<IpcResult<void>>;
  rename(path: string, newName: string):          Promise<IpcResult<string>>;
  trash(path: string):                            Promise<IpcResult<void>>;
  mkdir(parent: string, name: string):            Promise<IpcResult<string>>;
  search(root: string, query: string, id: string): Promise<IpcResult<void>>;
  searchCancel(id: string):                       Promise<IpcResult<void>>;
  watchRoot(path: string):                        Promise<IpcResult<void>>;

  onSearchResult(cb: (id: string, hits: SearchHit[]) => void): () => void;
  onFsEvent(cb: (event: FsEvent) => void):                     () => void;
}

declare global {
  interface Window { fsn: FsnApi; }
}
