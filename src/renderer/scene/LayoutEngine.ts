import * as THREE from 'three';
import type { FsNode } from '@shared/types';

export interface LayoutOptions {
  pedestalY: number;       // y coordinate of pedestal tops
  baseRadius: number;      // children radius scale
  fileBoxStep: number;     // distance between file blocks on a pedestal
}

const DEFAULT_OPTS: LayoutOptions = { pedestalY: 0, baseRadius: 12, fileBoxStep: 1.4 };

export class LayoutEngine {
  constructor(public opts: LayoutOptions = DEFAULT_OPTS) {}

  computeFor(nodes: FsNode[], rootPath: string): Map<string, THREE.Vector3> {
    const positions = new Map<string, THREE.Vector3>();
    const childrenByParent = new Map<string, FsNode[]>();
    const knownPaths = new Set(nodes.map(n => n.path));

    for (const n of nodes) {
      // Skip the root itself: parentOf("C:/") returns "C:/" so without this
      // guard the root ends up in its own children list and the BFS loops
      // forever queuing it again on every iteration.
      if (n.path === rootPath) continue;
      const parent = parentOf(n.path);
      if (!knownPaths.has(parent)) continue;
      if (!childrenByParent.has(parent)) childrenByParent.set(parent, []);
      childrenByParent.get(parent)!.push(n);
    }

    positions.set(rootPath, new THREE.Vector3(0, 0, 0));

    const queue = [rootPath];
    while (queue.length) {
      const parent = queue.shift()!;
      const kids = (childrenByParent.get(parent) ?? []).slice().sort((a, b) => a.path.localeCompare(b.path));
      const pPos = positions.get(parent)!;
      const dirs = kids.filter(k => k.kind === 'dir' || k.kind === 'locked');
      const files = kids.filter(k => k.kind === 'file');

      const radius = this.opts.baseRadius + Math.max(0, Math.sqrt(dirs.length) * 1.5);
      dirs.forEach((d, i) => {
        const angle = (i / Math.max(1, dirs.length)) * Math.PI * 2 + jitterAngle(d.path);
        const x = pPos.x + Math.cos(angle) * radius;
        const z = pPos.z + Math.sin(angle) * radius;
        positions.set(d.path, new THREE.Vector3(x, this.opts.pedestalY, z));
        queue.push(d.path);
      });

      // files on top of parent pedestal in a square grid
      const cols = Math.max(1, Math.ceil(Math.sqrt(files.length)));
      files.forEach((f, i) => {
        const col = i % cols;
        const row = Math.floor(i / cols);
        const ox = (col - (cols - 1) / 2) * this.opts.fileBoxStep;
        const oz = (row - (cols - 1) / 2) * this.opts.fileBoxStep;
        positions.set(f.path, new THREE.Vector3(pPos.x + ox, this.opts.pedestalY + 1.0, pPos.z + oz));
      });
    }

    return positions;
  }
}

function parentOf(p: string): string {
  const i = p.lastIndexOf('/');
  if (i <= 2) return p.slice(0, i + 1); // "C:/"
  return p.slice(0, i);
}

function jitterAngle(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) / 0xffffffff) * 0.2 - 0.1;
}
