import * as THREE from 'three';

const BEAM_HEIGHT = 30;
const BEAM_COLOR = 0xfff4c8;
// Slight oblique tilt of the light shaft, like the SGI FSN beam — the
// cone leans toward the camera-back so the highlight reads as falling
// from "off-screen up-and-behind" rather than a vertical pillar.
const TILT_X = -0.22; // ~12.6° pitched forward (top moves toward +Z direction in world)
const TILT_Z = 0.06;  // ~3.4° lateral lean for asymmetry

/**
 * Visual highlight for the currently-selected node: a soft, downward
 * cone-of-light pillar plus a co-located spotlight that brightens the
 * mesh underneath. The shaft is tilted slightly off vertical so it
 * matches the look of the original SGI FSN selection light.
 */
export class SelectionBeam {
  readonly object: THREE.Group;
  readonly pivot: THREE.Group;
  readonly mesh: THREE.Mesh;
  readonly light: THREE.SpotLight;
  #geom: THREE.CylinderGeometry;
  #mat: THREE.MeshBasicMaterial;

  constructor() {
    this.object = new THREE.Group();
    // Pivot is anchored at the pedestal top; rotating the pivot rotates
    // the cone and spotlight together around the base, which keeps the
    // bottom of the cone glued to the pedestal regardless of tilt.
    this.pivot = new THREE.Group();
    this.pivot.rotation.x = TILT_X;
    this.pivot.rotation.z = TILT_Z;
    this.object.add(this.pivot);

    // Tapered open cylinder (wide top, narrow base) translated up by
    // BEAM_HEIGHT/2 so its base sits at pivot origin (y=0). With the
    // pivot rotation applied above, the base stays put while the top
    // swings outward.
    this.#geom = new THREE.CylinderGeometry(2, 0.3, BEAM_HEIGHT, 16, 1, true);
    this.#geom.translate(0, BEAM_HEIGHT / 2, 0);
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
    this.pivot.add(this.mesh);

    this.light = new THREE.SpotLight(BEAM_COLOR, 1.5, 60, Math.PI / 8, 0.4);
    this.light.position.set(0, BEAM_HEIGHT, 0);
    this.pivot.add(this.light);
    this.light.target.position.set(0, 0, 0);
    this.pivot.add(this.light.target);

    this.object.visible = false;
  }

  /**
   * @param position - world-space point at which the BOTTOM of the beam
   *   should sit (typically the top of the selected mesh).
   */
  showAt(position: THREE.Vector3, _height: number = 8): void {
    // Move the pivot to the pedestal top; the pre-applied tilt does the rest.
    this.pivot.position.copy(position);
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
