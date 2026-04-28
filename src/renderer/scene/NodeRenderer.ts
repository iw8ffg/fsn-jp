import * as THREE from 'three';
import type { FsNode } from '@shared/types';
import { makePedestalMaterial } from './materials/pedestalMaterial';

export class NodeRenderer {
  readonly group = new THREE.Group();
  #pedestalGeom = new THREE.BoxGeometry(8, 1, 8);
  #pedestalMat = makePedestalMaterial();
  #lockedMat = new THREE.MeshStandardMaterial({ color: 0x444444, roughness: 0.9 });
  #meshByPath = new Map<string, THREE.Object3D>();

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

  remove(path: string): void {
    const m = this.#meshByPath.get(path);
    if (!m) return;
    this.group.remove(m);
    this.#meshByPath.delete(path);
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
