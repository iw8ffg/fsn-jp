import * as THREE from 'three';

/**
 * Per-path bookmark pin: a small bright yellow cone tip-down floating
 * above a pedestal. Geometry/material are shared across all pins;
 * meshes are pooled by path. Markers do not block raycasts so they
 * never steal hover or click from the underlying pedestal.
 */
export class MarkerRenderer {
  readonly group = new THREE.Group();
  #geom = new THREE.ConeGeometry(0.6, 1.6, 8);
  #mat = new THREE.MeshStandardMaterial({
    color: 0xfacc15,
    emissive: 0xfacc15,
    emissiveIntensity: 0.6,
    roughness: 0.3,
    metalness: 0.2,
  });
  #meshByPath = new Map<string, THREE.Mesh>();

  /** Insert or move the marker for `path` to hover above `position`. */
  upsert(path: string, position: THREE.Vector3): void {
    let m = this.#meshByPath.get(path);
    if (!m) {
      m = new THREE.Mesh(this.#geom, this.#mat);
      m.raycast = () => {};
      // ConeGeometry tip is +Y by default; flip so tip points down at the pedestal.
      m.rotation.x = Math.PI;
      this.group.add(m);
      this.#meshByPath.set(path, m);
    }
    // Pedestal half-height = 0.3, lift another 1.5 so the tip sits just above the top.
    m.position.set(position.x, position.y + 0.3 + 1.5, position.z);
  }

  remove(path: string): void {
    const m = this.#meshByPath.get(path);
    if (!m) return;
    this.group.remove(m);
    this.#meshByPath.delete(path);
  }

  clear(): void {
    for (const p of [...this.#meshByPath.keys()]) this.remove(p);
  }

  paths(): string[] { return Array.from(this.#meshByPath.keys()); }

  dispose(): void {
    this.clear();
    this.#geom.dispose();
    this.#mat.dispose();
  }
}
