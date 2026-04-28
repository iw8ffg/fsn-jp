// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import type { FsNode } from '../../src/shared/types';

// jsdom's HTMLCanvasElement has no 2d context; stub a minimal one
const ctxStub = {
  fillStyle: '', strokeStyle: '', lineWidth: 0,
  fillRect: () => {}, beginPath: () => {}, moveTo: () => {}, lineTo: () => {}, stroke: () => {},
};
// eslint-disable-next-line @typescript-eslint/no-explicit-any
HTMLCanvasElement.prototype.getContext = function () { return ctxStub as any; };

import { NodeRenderer } from '../../src/renderer/scene/NodeRenderer';

const file = (path: string, ext: string): FsNode => ({
  path: `${path}.${ext}`,
  parentPath: path.includes('/') ? path.slice(0, path.lastIndexOf('/')) : '',
  name: `${path.split('/').pop()}.${ext}`,
  kind: 'file', size: 1000, mtimeMs: 0, isHidden: false, childrenLoaded: false,
});

describe('NodeRenderer', () => {
  it('shares material across files of the same category', () => {
    const r = new NodeRenderer();
    const m1 = r.upsertFileBlock(file('C:/a/foo', 'ts'), new THREE.Vector3());
    const m2 = r.upsertFileBlock(file('C:/a/bar', 'tsx'), new THREE.Vector3());
    expect(m1.material).toBe(m2.material); // same instance, code category
    r.dispose();
  });

  it('uses different materials for different categories', () => {
    const r = new NodeRenderer();
    const m1 = r.upsertFileBlock(file('C:/a/foo', 'ts'), new THREE.Vector3());
    const m2 = r.upsertFileBlock(file('C:/a/bar', 'png'), new THREE.Vector3());
    expect(m1.material).not.toBe(m2.material);
    r.dispose();
  });
});
