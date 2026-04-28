import * as THREE from 'three';
import { useFsStore } from '@renderer/state/fsStore';

export class HoverPicker {
  #ray = new THREE.Raycaster();
  #ndc = new THREE.Vector2();
  #last = 0;
  #throttleMs = 33;
  #onPointerMove: (e: PointerEvent) => void;

  constructor(
    private dom: HTMLElement,
    private camera: THREE.Camera,
    private targets: () => THREE.Object3D[],
  ) {
    this.#onPointerMove = (e) => this.#handle(e);
    dom.addEventListener('pointermove', this.#onPointerMove);
  }

  dispose(): void {
    this.dom.removeEventListener('pointermove', this.#onPointerMove);
  }

  #handle(e: PointerEvent): void {
    const now = performance.now();
    if (now - this.#last < this.#throttleMs) return;
    this.#last = now;

    const rect = this.dom.getBoundingClientRect();
    this.#ndc.x =  ((e.clientX - rect.left) / rect.width)  * 2 - 1;
    this.#ndc.y = -((e.clientY - rect.top)  / rect.height) * 2 + 1;
    this.#ray.setFromCamera(this.#ndc, this.camera);

    const hits = this.#ray.intersectObjects(this.targets(), false);
    const path = hits[0]?.object.userData.path as string | undefined;
    useFsStore.getState().setHover(path ?? null);
  }
}
