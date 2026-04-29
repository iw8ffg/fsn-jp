import * as THREE from 'three';

const BEAM_HEIGHT = 30;
const BEAM_COLOR = 0xfff4c8;

/**
 * Visual highlight for the currently-selected node: a soft, downward
 * cone-of-light pillar plus a co-located spotlight that brightens the
 * mesh underneath. Both elements live under a single THREE.Group so
 * the SceneController only has to add/remove one object.
 */
export class SelectionBeam {
  readonly object: THREE.Group;
  readonly mesh: THREE.Mesh;
  readonly light: THREE.SpotLight;
  #geom: THREE.CylinderGeometry;
  #mat: THREE.MeshBasicMaterial;

  constructor() {
    this.object = new THREE.Group();
    // Tapered open cylinder: wide at top, narrow at base — reads as a
    // light shaft. Open-ended (no caps) keeps it from looking solid.
    this.#geom = new THREE.CylinderGeometry(2, 0.3, BEAM_HEIGHT, 16, 1, true);
    this.#mat = new THREE.MeshBasicMaterial({
      color: BEAM_COLOR,
      transparent: true,
      opacity: 0.18,
      side: THREE.DoubleSide,
      depthWrite: false,
      fog: true,
    });
    this.mesh = new THREE.Mesh(this.#geom, this.#mat);
    this.mesh.raycast = () => {};
    this.object.add(this.mesh);

    this.light = new THREE.SpotLight(BEAM_COLOR, 1.5, 60, Math.PI / 8, 0.4);
    this.object.add(this.light);
    this.object.add(this.light.target);

    this.object.visible = false;
  }

  /**
   * @param position - world-space point at which the BOTTOM of the beam
   *   should sit (typically the top of the selected mesh).
   * @param height - currently unused; the beam mesh is fixed-height for
   *   visual consistency. Reserved for future per-target sizing.
   */
  showAt(position: THREE.Vector3, _height: number = 8): void {
    // Cylinder origin is its center, so to place the bottom at `position.y`
    // we lift the mesh by half the cylinder height.
    const cx = position.x;
    const cz = position.z;
    this.mesh.position.set(cx, position.y + BEAM_HEIGHT / 2, cz);
    this.light.position.set(cx, position.y + BEAM_HEIGHT, cz);
    this.light.target.position.set(cx, position.y, cz);
    this.light.target.updateMatrixWorld();
    this.object.visible = true;
  }

  hide(): void {
    this.object.visible = false;
  }

  dispose(): void {
    this.#geom.dispose();
    this.#mat.dispose();
    this.light.dispose();
  }
}
