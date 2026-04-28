import * as THREE from 'three';

/**
 * Renders parent->child connector lines between pedestals as a single
 * THREE.LineSegments so all edges share one draw call. Updates positions
 * in-place via setEdges() — does not recreate the LineSegments object.
 */
export class EdgeRenderer {
  #geom = new THREE.BufferGeometry();
  #mat = new THREE.LineBasicMaterial({
    color: 0x39c4ff,
    transparent: true,
    opacity: 0.6,
    fog: true,
  });
  #lines: THREE.LineSegments;

  constructor() {
    this.#lines = new THREE.LineSegments(this.#geom, this.#mat);
    // Avoid raycast hits — these are decorative.
    this.#lines.raycast = () => {};
    // Initialize with empty position buffer so three doesn't complain.
    this.#geom.setAttribute('position', new THREE.BufferAttribute(new Float32Array(0), 3));
  }

  get object(): THREE.LineSegments { return this.#lines; }

  setEdges(pairs: { from: THREE.Vector3; to: THREE.Vector3 }[]): void {
    const arr = new Float32Array(pairs.length * 6);
    for (let i = 0; i < pairs.length; i++) {
      const { from, to } = pairs[i]!;
      const o = i * 6;
      arr[o + 0] = from.x; arr[o + 1] = from.y; arr[o + 2] = from.z;
      arr[o + 3] = to.x;   arr[o + 4] = to.y;   arr[o + 5] = to.z;
    }
    const old = this.#geom.getAttribute('position') as THREE.BufferAttribute | undefined;
    this.#geom.setAttribute('position', new THREE.BufferAttribute(arr, 3));
    this.#geom.computeBoundingSphere();
    // Free the previous array's underlying buffer reference.
    if (old) old.array = new Float32Array(0);
  }

  dispose(): void {
    this.#geom.dispose();
    this.#mat.dispose();
  }
}
