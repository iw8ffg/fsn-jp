import * as THREE from 'three';
import { useFsStore } from '@renderer/state/fsStore';
import { useCameraStore } from '@renderer/state/cameraStore';
import { fsn, unwrap } from '@renderer/ipc/client';
import { useUiStore } from '@renderer/state/uiStore';

export class ClickHandler {
  #ray = new THREE.Raycaster();
  #ndc = new THREE.Vector2();
  #onClick: (e: MouseEvent) => void;

  constructor(
    private dom: HTMLElement,
    private camera: THREE.Camera,
    private targets: () => THREE.Object3D[],
  ) {
    this.#onClick = (e) => { void this.#handle(e); };
    dom.addEventListener('click', this.#onClick);
  }

  dispose(): void { this.dom.removeEventListener('click', this.#onClick); }

  async #handle(e: MouseEvent): Promise<void> {
    const rect = this.dom.getBoundingClientRect();
    this.#ndc.x =  ((e.clientX - rect.left) / rect.width)  * 2 - 1;
    this.#ndc.y = -((e.clientY - rect.top)  / rect.height) * 2 + 1;
    this.#ray.setFromCamera(this.#ndc, this.camera);
    const hits = this.#ray.intersectObjects(this.targets(), false);
    const obj = hits[0]?.object;
    if (!obj) return;

    const path = obj.userData.path as string;
    const kind = obj.userData.kind as 'dir' | 'file' | 'locked';

    useFsStore.getState().setSelected(path);
    useCameraStore.getState().setFocus(path);

    if (kind !== 'dir') return;
    const store = useFsStore.getState();
    const wasExpanded = store.expanded.has(path);
    if (!wasExpanded) {
      try {
        const children = await unwrap(fsn.listDir(path, 1));
        store.upsertNodes(children);
      } catch (err) {
        useUiStore.getState().pushToast('error', `Cannot open: ${(err as Error).message}`);
        return;
      }
    }
    store.toggleExpand(path);
  }
}
