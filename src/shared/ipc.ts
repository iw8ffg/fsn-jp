export const IPC = {
  listDrives:   'fs:listDrives',
  listDir:      'fs:listDir',
  stat:         'fs:stat',
  move:         'fs:move',
  copy:         'fs:copy',
  rename:       'fs:rename',
  trash:        'fs:trash',
  mkdir:        'fs:mkdir',
  search:       'fs:search',
  searchCancel: 'fs:searchCancel',
  searchResult: 'fs:searchResult',
  fsEvent:      'fs:event',
  watchRoot:    'fs:watchRoot',
} as const;

export type IpcResult<T> =
  | { ok: true; data: T }
  | { ok: false; code: string; message: string };
