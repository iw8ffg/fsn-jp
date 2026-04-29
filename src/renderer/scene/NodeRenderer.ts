import * as THREE from 'three';
import type { FsNode } from '@shared/types';
import { makePedestalMaterial } from './materials/pedestalMaterial';
import { colorForFile, fileTypeCategory } from './materials/fileTypeColors';

export class NodeRenderer {
  readonly group = new THREE.Group();
  #pedestalGeom = new THREE.CylinderGeometry(5, 5, 1, 32);
  #pedestalMat  = makePedestalMaterial();
  #lockedMat    = new THREE.MeshStandardMaterial({ color: 0x444444, roughness: 0.9 });
  #fileBlockGeom = new THREE.BoxGeometry(1, 1, 1);
  #fileMatByCategory = new Map<string, THREE.MeshStandardMaterial>();
  #meshByPath = new Map<string, THREE.Object3D>();
  #fileBlocks = new Map<string, THREE.Mesh>();
  // Shared wireframe-glow overlays — one EdgesGeometry per source geometry,
  // one LineBasicMaterial reused across all overlays.
  #pedestalEdgeGeom = new THREE.EdgesGeometry(this.#pedestalGeom);
  #fileEdgeGeom = new THREE.EdgesGeometry(this.#fileBlockGeom);
  #edgeMat = new THREE.LineBasicMaterial({
    color: 0x6a8aa0,
    transparent: true,
    opacity: 0.55,
    fog: true,
  });

  #attachEdges(mesh: THREE.Mesh, edgeGeom: THREE.BufferGeometry): void {
    const edges = new THREE.LineSegments(edgeGeom, this.#edgeMat);
    edges.raycast = () => {}; // do not block raycasting on parent mesh
    mesh.add(edges);
  }

  upsertPedestal(node: FsNode, position: THREE.Vector3): THREE.Mesh {
    let mesh = this.#meshByPath.get(node.path) as THREE.Mesh | undefined;
    if (!mesh) {
      mesh = new THREE.Mesh(this.#pedestalGeom, node.kind === 'locked' ? this.#lockedMat : this.#pedestalMat);
      mesh.userData.path = node.path;
      mesh.userData.kind = node.kind;
      this.#attachEdges(mesh, this.#pedestalEdgeGeom);
      this.group.add(mesh);
      this.#meshByPath.set(node.path, mesh);
    }
    mesh.position.copy(position);
    return mesh;
  }

  upsertFileBlock(node: FsNode, position: THREE.Vector3): THREE.Mesh {
    const category = fileTypeCategory(node.name);
    let mat = this.#fileMatByCategory.get(category);
    if (!mat) {
      const hex = colorForFile(node.name);
      mat = new THREE.MeshStandardMaterial({
        color: hex,
        emissive: hex,
        emissiveIntensity: 0.18,
        roughness: 0.45,
        metalness: 0.0,
      });
      this.#fileMatByCategory.set(category, mat);
    }
    let mesh = this.#fileBlocks.get(node.path);
    const height = clamp(Math.log10(node.size + 10) * 1.2, 0.4, 12);
    if (!mesh) {
      mesh = new THREE.Mesh(this.#fileBlockGeom, mat);
      mesh.userData.path = node.path;
      mesh.userData.kind = 'file';
      this.#attachEdges(mesh, this.#fileEdgeGeom);
      this.group.add(mesh);
      this.#fileBlocks.set(node.path, mesh);
      this.#meshByPath.set(node.path, mesh);
    } else {
      // material may have changed (rare — rename across category)
      mesh.material = mat;
    }
    mesh.scale.set(1, height, 1);
    mesh.position.set(position.x, position.y + height / 2, position.z);
    return mesh;
  }

  remove(path: string): void {
    const m = this.#meshByPath.get(path);
    if (!m) return;
    this.group.remove(m);
    this.#meshByPath.delete(path);
    this.#fileBlocks.delete(path);
  }

  removeFileBlock(path: string): void {
    this.remove(path);
  }

  clear(): void {
    for (const path of [...this.#meshByPath.keys()]) this.remove(path);
  }

  meshAt(path: string): THREE.Object3D | undefined { return this.#meshByPath.get(path); }
  allMeshes(): THREE.Object3D[] { return [...this.#meshByPath.values()]; }

  dispose(): void {
    this.clear();
    this.#pedestalGeom.dispose();
    this.#fileBlockGeom.dispose();
    this.#pedestalEdgeGeom.dispose();
    this.#fileEdgeGeom.dispose();
    this.#edgeMat.dispose();
    if (this.#pedestalMat.map) this.#pedestalMat.map.dispose();
    this.#pedestalMat.dispose();
    this.#lockedMat.dispose();
    for (const mat of this.#fileMatByCategory.values()) mat.dispose();
    this.#fileMatByCategory.clear();
  }
}

function clamp(v: number, lo: number, hi: number): number { return Math.max(lo, Math.min(hi, v)); }
