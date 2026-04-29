import * as THREE from 'three';
import type { FsNode } from '@shared/types';

export interface LayoutOptions {
  pedestalY: number;       // y coordinate of pedestal tops
  levelDepth: number;      // z spacing between hierarchy levels
  cellStep: number;        // minimum horizontal slot width per node
  siblingGap: number;      // horizontal gap between sibling subtrees
  rootZOffset: number;     // z offset of the first row from root
  fileBoxStep: number;     // distance between file blocks on a pedestal
}

const DEFAULT_OPTS: LayoutOptions = {
  pedestalY: 0,
  levelDepth: 20,
  cellStep: 12,
  siblingGap: 4,
  rootZOffset: 8,
  fileBoxStep: 1.4,
};

export class LayoutEngine {
  constructor(public opts: LayoutOptions = DEFAULT_OPTS) {}

  /**
   * Hierarchical tree layout with subtree-width packing. Each node's
   * subtree is allocated a horizontal slot wide enough to contain all
   * its descendants laid out side by side, so expanding a sibling
   * never causes its children to overlap an adjacent subtree.
   *
   * Children are placed in a single row at z = parent.z + levelDepth.
   * Files belonging to a directory remain on the directory's own
   * pedestal in a small centered grid.
   */
  computeFor(nodes: FsNode[], rootPath: string): Map<string, THREE.Vector3> {
    const positions = new Map<string, THREE.Vector3>();
    const childrenByParent = new Map<string, FsNode[]>();
    const knownPaths = new Set(nodes.map(n => n.path));

    for (const n of nodes) {
      if (n.path === rootPath) continue;
      const parent = parentOf(n.path);
      if (!knownPaths.has(parent)) continue;
      if (!childrenByParent.has(parent)) childrenByParent.set(parent, []);
      childrenByParent.get(parent)!.push(n);
    }
    for (const arr of childrenByParent.values()) {
      arr.sort((a, b) => a.path.localeCompare(b.path));
    }

    const dirsOf = (p: string): FsNode[] =>
      (childrenByParent.get(p) ?? []).filter(c => c.kind === 'dir' || c.kind === 'locked');
    const filesOf = (p: string): FsNode[] =>
      (childrenByParent.get(p) ?? []).filter(c => c.kind === 'file');

    if (!knownPaths.has(rootPath)) return positions;

    const { cellStep, siblingGap, levelDepth, pedestalY, rootZOffset, fileBoxStep } = this.opts;

    // Memoised post-order subtree-width: how much horizontal space
    // this node needs at its level, accounting for its expanded
    // descendants. A leaf takes one cell; a parent takes the wider
    // of one cell or the sum of its children's widths plus gaps.
    const widthCache = new Map<string, number>();
    const subtreeWidth = (path: string): number => {
      const cached = widthCache.get(path);
      if (cached !== undefined) return cached;
      const dirs = dirsOf(path);
      if (dirs.length === 0) {
        widthCache.set(path, cellStep);
        return cellStep;
      }
      let total = 0;
      for (const d of dirs) total += subtreeWidth(d.path);
      total += siblingGap * (dirs.length - 1);
      const w = Math.max(cellStep, total);
      widthCache.set(path, w);
      return w;
    };

    const placeFiles = (parent: string, parentPos: THREE.Vector3): void => {
      const files = filesOf(parent);
      if (files.length === 0) return;
      const fcols = Math.max(1, Math.ceil(Math.sqrt(files.length)));
      files.forEach((f, i) => {
        const col = i % fcols;
        const row = Math.floor(i / fcols);
        const ox = (col - (fcols - 1) / 2) * fileBoxStep;
        const oz = (row - (fcols - 1) / 2) * fileBoxStep;
        positions.set(f.path, new THREE.Vector3(
          parentPos.x + ox,
          pedestalY + 1.0,
          parentPos.z + oz,
        ));
      });
    };

    // Pre-order placement: parent already has a position; children get
    // assigned slots based on their cached subtree widths. Each child
    // is centered within its own slot, then we recurse so its grandchildren
    // pack inside that same slot.
    const place = (parent: string): void => {
      const parentPos = positions.get(parent)!;
      placeFiles(parent, parentPos);
      const dirs = dirsOf(parent);
      if (dirs.length === 0) return;

      const widths = dirs.map(d => subtreeWidth(d.path));
      let total = 0;
      for (const w of widths) total += w;
      total += siblingGap * (dirs.length - 1);

      const childZ = parent === rootPath ? rootZOffset : parentPos.z + levelDepth;
      let cursor = parentPos.x - total / 2;
      dirs.forEach((d, i) => {
        const w = widths[i]!;
        const cx = cursor + w / 2;
        positions.set(d.path, new THREE.Vector3(cx, pedestalY, childZ));
        place(d.path);
        cursor += w + siblingGap;
      });
    };

    positions.set(rootPath, new THREE.Vector3(0, pedestalY, 0));
    place(rootPath);
    return positions;
  }
}

function parentOf(p: string): string {
  const i = p.lastIndexOf('/');
  if (i <= 2) return p.slice(0, i + 1);
  return p.slice(0, i);
}
