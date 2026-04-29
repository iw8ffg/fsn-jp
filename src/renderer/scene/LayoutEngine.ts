import * as THREE from 'three';
import type { FsNode } from '@shared/types';

export interface LayoutOptions {
  pedestalY: number;       // y coordinate of pedestal tops
  levelDepth: number;      // z spacing between hierarchy levels
  cellStep: number;        // distance between grid cell centers (cellSize + gap)
  rootZOffset: number;     // z offset of the first row from root
  fileBoxStep: number;     // distance between file blocks on a pedestal
}

const DEFAULT_OPTS: LayoutOptions = {
  pedestalY: 0,
  levelDepth: 20,
  cellStep: 12, // 8 cell + 4 gap
  rootZOffset: 8,
  fileBoxStep: 1.4,
};

export class LayoutEngine {
  constructor(public opts: LayoutOptions = DEFAULT_OPTS) {}

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
    // Stable child ordering for determinism.
    for (const arr of childrenByParent.values()) {
      arr.sort((a, b) => a.path.localeCompare(b.path));
    }

    const dirsOf = (p: string): FsNode[] =>
      (childrenByParent.get(p) ?? []).filter(c => c.kind === 'dir' || c.kind === 'locked');
    const filesOf = (p: string): FsNode[] =>
      (childrenByParent.get(p) ?? []).filter(c => c.kind === 'file');

    if (!knownPaths.has(rootPath)) return positions;

    // Root always sits at origin.
    positions.set(rootPath, new THREE.Vector3(0, this.opts.pedestalY, 0));

    // Recursive grid placement: each parent's expanded children are laid out
    // in their own grid, centered on the parent's X, at z = parent.z + LEVEL_DEPTH.
    // Sub-grids may overlap when multiple sibling parents are expanded — known
    // simplification for v1.
    const layoutChildren = (parent: string): void => {
      const dirs = dirsOf(parent);
      const parentPos = positions.get(parent)!;
      const baseZ = parent === rootPath
        ? this.opts.rootZOffset
        : parentPos.z + this.opts.levelDepth;

      if (dirs.length > 0) {
        const cols = Math.max(1, Math.ceil(Math.sqrt(dirs.length)));
        const step = this.opts.cellStep;
        dirs.forEach((d, i) => {
          const col = i % cols;
          const row = Math.floor(i / cols);
          const x = parentPos.x + col * step - ((cols - 1) * step) / 2;
          const z = baseZ + row * step;
          positions.set(d.path, new THREE.Vector3(x, this.opts.pedestalY, z));
        });
        // Recurse only for dirs whose children are present in the visible set.
        for (const d of dirs) {
          if (childrenByParent.has(d.path)) layoutChildren(d.path);
        }
      }

      // Files on the parent pedestal — small grid centered on parent (x, z).
      const files = filesOf(parent);
      if (files.length > 0) {
        const fcols = Math.max(1, Math.ceil(Math.sqrt(files.length)));
        files.forEach((f, i) => {
          const col = i % fcols;
          const row = Math.floor(i / fcols);
          const ox = (col - (fcols - 1) / 2) * this.opts.fileBoxStep;
          const oz = (row - (fcols - 1) / 2) * this.opts.fileBoxStep;
          positions.set(f.path, new THREE.Vector3(
            parentPos.x + ox,
            this.opts.pedestalY + 1.0,
            parentPos.z + oz,
          ));
        });
      }
    };

    layoutChildren(rootPath);
    return positions;
  }
}

function parentOf(p: string): string {
  const i = p.lastIndexOf('/');
  if (i <= 2) return p.slice(0, i + 1); // "C:/"
  return p.slice(0, i);
}
