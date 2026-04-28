import { describe, it, expect, beforeEach } from 'vitest';
import { useFsStore } from '../../src/renderer/state/fsStore';
import type { FsNode } from '../../src/shared/types';

const node = (path: string, kind: 'dir' | 'file' = 'file'): FsNode => ({
  path,
  parentPath: path.includes('/') ? path.slice(0, path.lastIndexOf('/')) : '',
  name: path.split('/').pop()!,
  kind,
  size: 100,
  mtimeMs: 0,
  isHidden: false,
  childrenLoaded: false,
});

describe('fsStore', () => {
  beforeEach(() => useFsStore.getState().reset());

  it('sets root and stores nodes', () => {
    useFsStore.getState().setRoot('C:/r');
    useFsStore.getState().upsertNodes([node('C:/r/a'), node('C:/r/b')]);
    expect(useFsStore.getState().nodes.size).toBe(2);
    expect(useFsStore.getState().root).toBe('C:/r');
  });

  it('removeNode drops the node', () => {
    useFsStore.getState().upsertNodes([node('C:/r/a')]);
    useFsStore.getState().removeNode('C:/r/a');
    expect(useFsStore.getState().nodes.has('C:/r/a')).toBe(false);
  });

  it('expand toggles expansion', () => {
    useFsStore.getState().toggleExpand('C:/r/a');
    expect(useFsStore.getState().expanded.has('C:/r/a')).toBe(true);
    useFsStore.getState().toggleExpand('C:/r/a');
    expect(useFsStore.getState().expanded.has('C:/r/a')).toBe(false);
  });

  it('childrenOf returns immediate children', () => {
    useFsStore.getState().setRoot('C:/r');
    useFsStore.getState().upsertNodes([
      node('C:/r/a'),
      node('C:/r/b', 'dir'),
      node('C:/r/b/c'),
    ]);
    const parent = useFsStore.getState().childrenOf('C:/r').map(n => n.path).sort();
    expect(parent).toEqual(['C:/r/a', 'C:/r/b']);
  });
});
