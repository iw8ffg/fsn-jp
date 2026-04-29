import * as THREE from 'three';
import { useFsStore } from '@renderer/state/fsStore';
import { useCameraStore } from '@renderer/state/cameraStore';
import { fsn, unwrap } from '@renderer/ipc/client';
import { useUiStore } from '@renderer/state/uiStore';

type Pick = { path: string; kind: 'dir' | 'file' | 'locked' };

export class ClickHandler {
  #ray = new THREE.Raycaster();
  #ndc = new THREE.Vector2();
  #onClick: (e: MouseEvent) => void;
  #onDblClick: (e: MouseEvent) => void;

  constructor(
    private dom: HTMLElement,
    private camera: THREE.Camera,
    private targets: () => THREE.Object3D[],
  ) {
    this.#onClick = (e) => { void this.#handleClick(e); };
    this.#onDblClick = (e) => { void this.#handleDblClick(e); };
    dom.addEventListener('click', this.#onClick);
    dom.addEventListener('dblclick', this.#onDblClick);
  }

  dispose(): void {
    this.dom.removeEventListener('click', this.#onClick);
    this.dom.removeEventListener('dblclick', this.#onDblClick);
  }

  #pick(e: MouseEvent): Pick | null {
    const rect = this.dom.getBoundingClientRect();
    this.#ndc.x =  ((e.clientX - rect.left) / rect.width)  * 2 - 1;
    this.#ndc.y = -((e.clientY - rect.top)  / rect.height) * 2 + 1;
    this.#ray.setFromCamera(this.#ndc, this.camera);
    const hits = this.#ray.intersectObjects(this.targets(), false);
    const obj = hits[0]?.object;
    if (!obj) return null;
    return {
      path: obj.userData.path as string,
      kind: obj.userData.kind as 'dir' | 'file' | 'locked',
    };
  }

  async #handleClick(e: MouseEvent): Promise<void> {
    // detail === 2 means this click is the second of a double-click; let
    // the dblclick handler do the work instead.
    if (e.detail > 1) return;
    const hit = this.#pick(e);
    if (!hit) return;
    useFsStore.getState().setSelected(hit.path);
    useCameraStore.getState().setFocus(hit.path);
  }

  async #handleDblClick(e: MouseEvent): Promise<void> {
    const hit = this.#pick(e);
    if (!hit) return;
    // Keep selection in sync with the double-clicked target.
    useFsStore.getState().setSelected(hit.path);
    useCameraStore.getState().setFocus(hit.path);

    if (hit.kind === 'locked') return;

    if (hit.kind === 'dir') {
      const store = useFsStore.getState();
      const node = store.nodes.get(hit.path);
      if (!node?.childrenLoaded) {
        try {
          const children = await unwrap(fsn.listDir(hit.path, 1));
          store.upsertNodes(children);
        } catch (err) {
          useUiStore.getState().pushToast('error', `Cannot open: ${(err as Error).message}`);
          return;
        }
      }
      store.toggleExpand(hit.path);
      return;
    }

    // file: launch in OS default handler
    try {
      await unwrap(fsn.openPath(hit.path));
    } catch (err) {
      useUiStore.getState().pushToast('error', `Open failed: ${(err as Error).message}`);
    }
  }
}
