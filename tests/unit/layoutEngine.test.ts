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

describe('LayoutEngine (grid)', () => {
  it('places root at origin', () => {
    const layout = new LayoutEngine();
    const positions = layout.computeFor([dir('C:/r')], 'C:/r');
    expect(positions.get('C:/r')!.toArray()).toEqual([0, 0, 0]);
  });

  it('lays 4 children in a 2x2 grid at constant pedestal Y', () => {
    const layout = new LayoutEngine();
    const nodes: FsNode[] = [
      dir('C:/r'), dir('C:/r/a'), dir('C:/r/b'), dir('C:/r/c'), dir('C:/r/d'),
    ];
    const positions = layout.computeFor(nodes, 'C:/r');
    const children = ['C:/r/a', 'C:/r/b', 'C:/r/c', 'C:/r/d'].map(p => positions.get(p)!);
    // All at pedestal level (Y=0).
    for (const c of children) expect(c.y).toBeCloseTo(0, 6);
    // 2 cols, 2 rows: row 0 at z=8, row 1 at z=20 (8 + step 12).
    const row0 = children.filter(c => Math.abs(c.z - 8) < 1e-6);
    const row1 = children.filter(c => Math.abs(c.z - 20) < 1e-6);
    expect(row0.length).toBe(2);
    expect(row1.length).toBe(2);
    // Within a row, x is symmetric around 0 (cols=2, step=12 → -6, +6).
    const xsRow0 = row0.map(c => c.x).sort((a, b) => a - b);
    expect(xsRow0[0]).toBeCloseTo(-6, 6);
    expect(xsRow0[1]).toBeCloseTo(6, 6);
  });

  it('lays 9 children in a 3x3 grid', () => {
    const layout = new LayoutEngine();
    const nodes: FsNode[] = [
      dir('C:/r'),
      dir('C:/r/a'), dir('C:/r/b'), dir('C:/r/c'),
      dir('C:/r/d'), dir('C:/r/e'), dir('C:/r/f'),
      dir('C:/r/g'), dir('C:/r/h'), dir('C:/r/i'),
    ];
    const positions = layout.computeFor(nodes, 'C:/r');
    const childPaths = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i'].map(s => `C:/r/${s}`);
    const zs = new Set<number>();
    const xs = new Set<number>();
    for (const p of childPaths) {
      const v = positions.get(p)!;
      // Round to 6 decimals to coalesce floating-point noise.
      zs.add(Math.round(v.z * 1e6) / 1e6);
      xs.add(Math.round(v.x * 1e6) / 1e6);
    }
    // 3 distinct rows and 3 distinct columns.
    expect(zs.size).toBe(3);
    expect(xs.size).toBe(3);
  });

  it('places sub-children at z = parent.z + LEVEL_DEPTH', () => {
    const layout = new LayoutEngine();
    const nodes: FsNode[] = [
      dir('C:/r'), dir('C:/r/a'), dir('C:/r/a/x'), dir('C:/r/a/y'),
    ];
    const positions = layout.computeFor(nodes, 'C:/r');
    const a = positions.get('C:/r/a')!;
    const x = positions.get('C:/r/a/x')!;
    const y = positions.get('C:/r/a/y')!;
    // 'a' is the only top-level dir → cols=1, x=parent.x=0, z=rootZOffset=8.
    expect(a.x).toBeCloseTo(0, 6);
    expect(a.z).toBeCloseTo(8, 6);
    // sub-children begin at a.z + LEVEL_DEPTH (20) → z=28.
    expect(x.z).toBeCloseTo(28, 6);
    expect(y.z).toBeCloseTo(28, 6);
    // 2 children → cols=2, centered on parent.x=0 → x at -6 and +6.
    const xs = [x.x, y.x].sort((m, n) => m - n);
    expect(xs[0]).toBeCloseTo(-6, 6);
    expect(xs[1]).toBeCloseTo(6, 6);
  });

  it('is deterministic for same input', () => {
    const layout = new LayoutEngine();
    const nodes: FsNode[] = [dir('C:/r'), dir('C:/r/a'), dir('C:/r/b')];
    const a1 = layout.computeFor(nodes, 'C:/r').get('C:/r/a')!.toArray();
    const a2 = layout.computeFor(nodes, 'C:/r').get('C:/r/a')!.toArray();
    expect(a1).toEqual(a2);
  });
});
