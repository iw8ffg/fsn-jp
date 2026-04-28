export type FsNodeKind = 'dir' | 'file' | 'locked';

export interface FsNode {
  path: string;
  name: string;
  kind: FsNodeKind;
  size: number;
  mtimeMs: number;
  isHidden: boolean;
  childrenLoaded: boolean;
}
