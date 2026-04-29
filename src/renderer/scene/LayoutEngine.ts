import * as THREE from 'three';
import type { FsNode } from '@shared/types';

export interface LayoutOptions {
  pedestalY: number;       // y coordinate of pedestal tops
  levelDepth: number;      // z spacing between hierarchy levels
  siblingGap: number;      // x gap between sibling subtrees
  leafWidth: number;       // x width allocated to a leaf directory
  fileBoxStep: number;     // distance between file blocks on a pedestal
}

const DEFAULT_OPTS: LayoutOptions = {
  pedestalY: 0,
  levelDepth: 18,
  siblingGap: 4,
  leafWidth: 6,
  fileBoxStep: 1.4,
};

export class LayoutEngine {
  constructor(public opts: LayoutOptions = DEFAULT_OPTS) {}

  computeFor(nodes: FsNode[], rootPath: string): Map<string, THREE.Vector3> {
    const positions = new Map<string, THREE.Vector3>();
    const childrenByParent = new Map<string, FsNode[]>();
    const knownPaths = new Set(nodes.map(n => n.path));

    for (const n of nodes) {
      // Skip the root itself: parentOf("C:/") returns "C:/" so without this
      // guard the root ends up in its own children list.
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

    const widthCache = new Map<string, number>();
    const measure = (p: string): number => {
      const cached = widthCache.get(p);
      if (cached !== undefined) return cached;
      const dirs = dirsOf(p);
      let w: number;
      if (dirs.length === 0) {
        w = this.opts.leafWidth;
      } else {
        const childWidths = dirs.map(d => measure(d.path));
        w = childWidths.reduce((a, b) => a + b, 0)
          + this.opts.siblingGap * (dirs.length - 1);
      }
      widthCache.set(p, w);
      return w;
    };

    const assign = (p: string, x: number, depth: number): void => {
      positions.set(p, new THREE.Vector3(x, this.opts.pedestalY, depth * this.opts.levelDepth));

      // Place files-on-pedestal grid centered on the parent.
      const files = filesOf(p);
      const cols = Math.max(1, Math.ceil(Math.sqrt(files.length)));
      files.forEach((f, i) => {
        const col = i % cols;
        const row = Math.floor(i / cols);
        const ox = (col - (cols - 1) / 2) * this.opts.fileBoxStep;
        const oz = (row - (cols - 1) / 2) * this.opts.fileBoxStep;
        positions.set(f.path, new THREE.Vector3(
          x + ox,
          this.opts.pedestalY + 1.0,
          depth * this.opts.levelDepth + oz,
        ));
      });

      const dirs = dirsOf(p);
      if (dirs.length === 0) return;
      const totalWidth = measure(p);
      let cursor = x - totalWidth / 2;
      for (const child of dirs) {
        const w = measure(child.path);
        const childX = cursor + w / 2;
        assign(child.path, childX, depth + 1);
        cursor += w + this.opts.siblingGap;
      }
    };

    if (knownPaths.has(rootPath)) {
      measure(rootPath);
      assign(rootPath, 0, 0);
    }

    return positions;
  }
}

function parentOf(p: string): string {
  const i = p.lastIndexOf('/');
  if (i <= 2) return p.slice(0, i + 1); // "C:/"
  return p.slice(0, i);
}
