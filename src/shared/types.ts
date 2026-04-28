export type FsNodeKind = 'dir' | 'file' | 'locked';

export interface FsNode {
  path: string;          // absolute, normalized to forward slashes
  name: string;
  kind: FsNodeKind;
  size: number;          // bytes; 0 for dirs
  mtimeMs: number;
  isHidden: boolean;
  childrenLoaded: boolean; // true when listDir filled this dir
}

export interface DriveInfo {
  letter: string;        // e.g. "C:"
  label?: string;
  totalBytes?: number;
  freeBytes?: number;
}

export type FsEvent =
  | { type: 'add';    node: FsNode }
  | { type: 'remove'; path: string }
  | { type: 'change'; node: FsNode };

export interface SearchHit {
  path: string;
  name: string;
  parentPath: string;
}
