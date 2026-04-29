import * as THREE from 'three';

/**
 * Draws thin segments on the ground plane from each parent pedestal
 * to its visible child pedestals. Rebuilt wholesale on every layout
 * change — the segment count is small (one per visible non-root node)
 * and BufferGeometry rebuilds at this scale are cheap.
 */
export class ConnectorRenderer {
  readonly group = new THREE.Group();
  #geom = new THREE.BufferGeometry();
  #mat = new THREE.LineBasicMaterial({
    color: 0x3a6a55,
    transparent: true,
    opacity: 0.55,
    fog: true,
  });
  #lines: THREE.LineSegments;
  // Slightly above the grid (grid sits at y=-0.51) but below the pedestal
  // top surface (pedestals span y -0.3..+0.3). y=-0.49 keeps the segment
  // visible against the floor and out of z-fighting with the grid.
  static readonly LINE_Y = -0.49;

  constructor() {
    this.#lines = new THREE.LineSegments(this.#geom, this.#mat);
    this.#lines.frustumCulled = false;
    (this.#lines as unknown as { raycast: () => void }).raycast = () => {};
    this.group.add(this.#lines);
  }

  /**
   * Replace the segment set. Each entry is {from, to} in world space;
   * y is overwritten to LINE_Y so segments lie flat on the ground.
   */
  setSegments(segments: { from: THREE.Vector3; to: THREE.Vector3 }[]): void {
    if (segments.length === 0) {
      this.#geom.setAttribute('position', new THREE.BufferAttribute(new Float32Array(0), 3));
      this.#geom.computeBoundingSphere();
      return;
    }
    const arr = new Float32Array(segments.length * 6);
    for (let i = 0; i < segments.length; i++) {
      const seg = segments[i]!;
      const { from, to } = seg;
      const o = i * 6;
      arr[o + 0] = from.x; arr[o + 1] = ConnectorRenderer.LINE_Y; arr[o + 2] = from.z;
      arr[o + 3] = to.x;   arr[o + 4] = ConnectorRenderer.LINE_Y; arr[o + 5] = to.z;
    }
    this.#geom.setAttribute('position', new THREE.BufferAttribute(arr, 3));
    this.#geom.computeBoundingSphere();
  }

  dispose(): void {
    this.#geom.dispose();
    this.#mat.dispose();
  }
}
