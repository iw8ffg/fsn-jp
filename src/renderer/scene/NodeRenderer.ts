import * as THREE from 'three';
import type { FsNode } from '@shared/types';
import { makePedestalMaterial } from './materials/pedestalMaterial';
import { colorForFile } from './materials/fileTypeColors';

export class NodeRenderer {
  readonly group = new THREE.Group();
  #pedestalGeom = new THREE.BoxGeometry(8, 1, 8);
  #pedestalMat = makePedestalMaterial();
  #lockedMat = new THREE.MeshStandardMaterial({ color: 0x444444, roughness: 0.9 });
  #meshByPath = new Map<string, THREE.Object3D>();
  #fileBlocks = new Map<string, THREE.Mesh>();
  #fileBlockGeom = new THREE.BoxGeometry(1, 1, 1);

  upsertPedestal(node: FsNode, position: THREE.Vector3): THREE.Mesh {
    let mesh = this.#meshByPath.get(node.path) as THREE.Mesh | undefined;
    if (!mesh) {
      mesh = new THREE.Mesh(
        this.#pedestalGeom,
        node.kind === 'locked' ? this.#lockedMat : this.#pedestalMat,
      );
      mesh.userData.path = node.path;
      mesh.userData.kind = node.kind;
      this.group.add(mesh);
      this.#meshByPath.set(node.path, mesh);
    }
    mesh.position.copy(position);
    return mesh;
  }

  upsertFileBlock(node: FsNode, position: THREE.Vector3): THREE.Mesh {
    let mesh = this.#fileBlocks.get(node.path);
    const height = clamp(Math.log10(node.size + 10) * 1.2, 0.4, 12);
    if (!mesh) {
      const mat = new THREE.MeshStandardMaterial({
        color: colorForFile(node.name),
        roughness: 0.45, metalness: 0.0,
      });
      mesh = new THREE.Mesh(this.#fileBlockGeom, mat);
      mesh.userData.path = node.path;
      mesh.userData.kind = 'file';
      this.group.add(mesh);
      this.#fileBlocks.set(node.path, mesh);
      this.#meshByPath.set(node.path, mesh);
    }
    mesh.scale.set(1, height, 1);
    mesh.position.set(position.x, position.y + height / 2, position.z);
    return mesh;
  }

  removeFileBlock(path: string): void {
    const m = this.#fileBlocks.get(path);
    if (m) {
      this.group.remove(m);
      this.#fileBlocks.delete(path);
      this.#meshByPath.delete(path);
    }
  }

  remove(path: string): void {
    const m = this.#meshByPath.get(path);
    if (!m) return;
    this.group.remove(m);
    this.#meshByPath.delete(path);
    this.#fileBlocks.delete(path);
  }

  clear(): void {
    for (const path of [...this.#meshByPath.keys()]) this.remove(path);
  }

  meshAt(path: string): THREE.Object3D | undefined {
    return this.#meshByPath.get(path);
  }

  allMeshes(): THREE.Object3D[] {
    return [...this.#meshByPath.values()];
  }
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}
