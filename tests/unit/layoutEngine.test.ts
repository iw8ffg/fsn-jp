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

// Defaults: cellStep=12, siblingGap=4, rootZOffset=8, levelDepth=20.
describe('LayoutEngine (tree, subtree-packed)', () => {
  it('places root at origin', () => {
    const layout = new LayoutEngine();
    const positions = layout.computeFor([dir('C:/r')], 'C:/r');
    expect(positions.get('C:/r')!.toArray()).toEqual([0, 0, 0]);
  });

  it('lays siblings in a single row at rootZOffset, evenly spaced', () => {
    const layout = new LayoutEngine();
    const nodes: FsNode[] = [
      dir('C:/r'), dir('C:/r/a'), dir('C:/r/b'), dir('C:/r/c'), dir('C:/r/d'),
    ];
    const positions = layout.computeFor(nodes, 'C:/r');
    const children = ['C:/r/a', 'C:/r/b', 'C:/r/c', 'C:/r/d'].map(p => positions.get(p)!);
    // All on one row at z=rootZOffset=8, pedestal y=0.
    for (const c of children) {
      expect(c.y).toBeCloseTo(0, 6);
      expect(c.z).toBeCloseTo(8, 6);
    }
    // 4 leaf subtrees of width 12 with gap 4 → total=60, centers at
    // -24, -8, 8, 24 (alphabetical sort: a,b,c,d).
    const xs = children.map(c => c.x);
    expect(xs[0]).toBeCloseTo(-24, 6);
    expect(xs[1]).toBeCloseTo(-8, 6);
    expect(xs[2]).toBeCloseTo(8, 6);
    expect(xs[3]).toBeCloseTo(24, 6);
  });

  it('places sub-children at z = parent.z + levelDepth, centered under parent', () => {
    const layout = new LayoutEngine();
    const nodes: FsNode[] = [
      dir('C:/r'), dir('C:/r/a'), dir('C:/r/a/x'), dir('C:/r/a/y'),
    ];
    const positions = layout.computeFor(nodes, 'C:/r');
    const a = positions.get('C:/r/a')!;
    const x = positions.get('C:/r/a/x')!;
    const y = positions.get('C:/r/a/y')!;
    // Only one top-level dir, so its subtree (width=28: 12+4+12) is the
    // root's only allocation and a is centered on x=0.
    expect(a.x).toBeCloseTo(0, 6);
    expect(a.z).toBeCloseTo(8, 6);
    // Sub-children at a.z + 20 = 28.
    expect(x.z).toBeCloseTo(28, 6);
    expect(y.z).toBeCloseTo(28, 6);
    // x and y each have width 12, gap 4 → centers at -8 and +8.
    const xs = [x.x, y.x].sort((m, n) => m - n);
    expect(xs[0]).toBeCloseTo(-8, 6);
    expect(xs[1]).toBeCloseTo(8, 6);
  });

  it('allocates wider slots for siblings with expanded subtrees so they do not overlap', () => {
    // 'a' has 3 grandchildren (width 12+4+12+4+12 = 44),
    // 'b' is a leaf (width 12). Sibling gap = 4.
    // Allocations: a=44, b=12, total = 44+4+12 = 60, cursor starts at -30.
    // a center: -30 + 44/2 = -8. b center: -30 + 44 + 4 + 12/2 = 20.
    // a's grandchildren are centered under -8: -8-20=-28, -8, -8+20=12.
    // b is at x=20 — it sits at x=20 with width 12, i.e. spans 14..26,
    // strictly to the right of a's rightmost grandchild at x=12 (spans 6..18).
    // 18 < 14? No — 18 > 14 means overlap. Let me re-check.
    // a's subtree width is 44, occupying x in [-30, 14]. b occupies [14+4, ...] = [18, 30].
    // b center = 18 + 12/2 = 24.
    const layout = new LayoutEngine();
    const nodes: FsNode[] = [
      dir('C:/r'),
      dir('C:/r/a'),
      dir('C:/r/a/x'), dir('C:/r/a/y'), dir('C:/r/a/z'),
      dir('C:/r/b'),
    ];
    const positions = layout.computeFor(nodes, 'C:/r');
    const a = positions.get('C:/r/a')!;
    const b = positions.get('C:/r/b')!;
    const ax = positions.get('C:/r/a/x')!;
    const az = positions.get('C:/r/a/z')!;
    // Each grandchild has width 12 → a's subtree extent is half-width 22.
    // a's right edge = a.x + 22, b's left edge = b.x - 6, must respect gap 4.
    expect(b.x - 6).toBeGreaterThanOrEqual(a.x + 22 + 4 - 1e-6);
    // Grandchildren must be within a's subtree extent.
    expect(ax.x).toBeGreaterThanOrEqual(a.x - 22 - 1e-6);
    expect(az.x).toBeLessThanOrEqual(a.x + 22 + 1e-6);
  });

  it('is deterministic for same input', () => {
    const layout = new LayoutEngine();
    const nodes: FsNode[] = [dir('C:/r'), dir('C:/r/a'), dir('C:/r/b')];
    const a1 = layout.computeFor(nodes, 'C:/r').get('C:/r/a')!.toArray();
    const a2 = layout.computeFor(nodes, 'C:/r').get('C:/r/a')!.toArray();
    expect(a1).toEqual(a2);
  });
});
