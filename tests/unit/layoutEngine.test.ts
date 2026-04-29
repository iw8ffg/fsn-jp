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

describe('LayoutEngine (tree)', () => {
  it('places single root at origin', () => {
    const layout = new LayoutEngine();
    const positions = layout.computeFor([dir('C:/r')], 'C:/r');
    expect(positions.get('C:/r')!.toArray()).toEqual([0, 0, 0]);
  });

  it('lays children out coplanar (Y=0) at z = LEVEL_DEPTH on distinct X', () => {
    const layout = new LayoutEngine();
    const nodes: FsNode[] = [
      dir('C:/r'), dir('C:/r/a'), dir('C:/r/b'), dir('C:/r/c'), dir('C:/r/d'),
    ];
    const positions = layout.computeFor(nodes, 'C:/r');
    const children = ['C:/r/a', 'C:/r/b', 'C:/r/c', 'C:/r/d'].map(p => positions.get(p)!);
    // All at pedestal level (Y=0).
    for (const c of children) expect(c.y).toBeCloseTo(0, 6);
    // All at the same depth z = levelDepth (default 18).
    const z0 = children[0]!.z;
    expect(z0).toBeGreaterThan(0);
    for (const c of children) expect(c.z).toBeCloseTo(z0, 6);
    // No two siblings share an X.
    const xs = children.map(c => c.x);
    const unique = new Set(xs);
    expect(unique.size).toBe(xs.length);
  });

  it('grandchildren land at z = 2 * LEVEL_DEPTH', () => {
    const layout = new LayoutEngine();
    const nodes: FsNode[] = [
      dir('C:/r'), dir('C:/r/a'), dir('C:/r/a/x'), dir('C:/r/a/y'),
    ];
    const positions = layout.computeFor(nodes, 'C:/r');
    const child = positions.get('C:/r/a')!;
    const gx = positions.get('C:/r/a/x')!;
    const gy = positions.get('C:/r/a/y')!;
    expect(child.z).toBeCloseTo(18, 6);
    expect(gx.z).toBeCloseTo(36, 6);
    expect(gy.z).toBeCloseTo(36, 6);
    // grandchildren are centered around their parent's X
    const mid = (gx.x + gy.x) / 2;
    expect(mid).toBeCloseTo(child.x, 5);
  });

  it('is deterministic for same input', () => {
    const layout = new LayoutEngine();
    const nodes: FsNode[] = [dir('C:/r'), dir('C:/r/a'), dir('C:/r/b')];
    const a1 = layout.computeFor(nodes, 'C:/r').get('C:/r/a')!.toArray();
    const a2 = layout.computeFor(nodes, 'C:/r').get('C:/r/a')!.toArray();
    expect(a1).toEqual(a2);
  });
});
