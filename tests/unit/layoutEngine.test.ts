import { describe, it, expect } from 'vitest';
import { LayoutEngine } from '../../src/renderer/scene/LayoutEngine';
import type { FsNode } from '../../src/shared/types';

const dir = (path: string): FsNode => ({
  path,
  parentPath: path.includes('/') ? path.slice(0, path.lastIndexOf('/')) : '',
  name: path.split('/').pop()!,
  kind: 'dir',
  size: 0,
  mtimeMs: 0,
  isHidden: false,
  childrenLoaded: true,
});

describe('LayoutEngine', () => {
  it('places single root at origin', () => {
    const layout = new LayoutEngine();
    const positions = layout.computeFor([dir('C:/r')], 'C:/r');
    expect(positions.get('C:/r')!.toArray()).toEqual([0, 0, 0]);
  });

  it('places children on a circle around parent', () => {
    const layout = new LayoutEngine();
    const nodes: FsNode[] = [
      dir('C:/r'), dir('C:/r/a'), dir('C:/r/b'), dir('C:/r/c'), dir('C:/r/d'),
    ];
    const positions = layout.computeFor(nodes, 'C:/r');
    const a = positions.get('C:/r/a')!;
    const b = positions.get('C:/r/b')!;
    // children at same Y as parent (top of pedestal)
    expect(a.y).toBeCloseTo(b.y, 5);
    // distance from parent equal
    expect(a.length()).toBeCloseTo(b.length(), 4);
    expect(a.length()).toBeGreaterThan(0);
  });

  it('is deterministic for same input', () => {
    const layout = new LayoutEngine();
    const nodes: FsNode[] = [dir('C:/r'), dir('C:/r/a'), dir('C:/r/b')];
    const a1 = layout.computeFor(nodes, 'C:/r').get('C:/r/a')!.toArray();
    const a2 = layout.computeFor(nodes, 'C:/r').get('C:/r/a')!.toArray();
    expect(a1).toEqual(a2);
  });
});
