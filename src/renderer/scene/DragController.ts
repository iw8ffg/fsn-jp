import * as THREE from 'three';
import { fsn, unwrap } from '@renderer/ipc/client';
import { useUiStore } from '@renderer/state/uiStore';
import { useFsStore } from '@renderer/state/fsStore';

export class DragController {
  #ray = new THREE.Raycaster();
  #ndc = new THREE.Vector2();
  #ground = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  #ghost: THREE.Mesh | null = null;
  #dragSrcPath: string | null = null;
  #onDown: (e: PointerEvent) => void;
  #onMove: (e: PointerEvent) => void;
  #onUp: (e: PointerEvent) => void;

  constructor(
    private dom: HTMLElement,
    private camera: THREE.Camera,
    private scene: THREE.Scene,
    private targets: () => THREE.Object3D[],
  ) {
    this.#onDown = (e) => this.#start(e);
    this.#onMove = (e) => this.#drag(e);
    this.#onUp = (e) => { void this.#drop(e); };
    // Capture phase so we run BEFORE OrbitCameraController's bubble-phase
    // listeners. On file pickup we call stopImmediatePropagation, which
    // prevents orbit from arming its pan state for this gesture.
    dom.addEventListener('pointerdown', this.#onDown, { capture: true });
    dom.addEventListener('pointermove', this.#onMove, { capture: true });
    dom.addEventListener('pointerup', this.#onUp, { capture: true });
  }

  dispose(): void {
    this.dom.removeEventListener('pointerdown', this.#onDown, { capture: true });
    this.dom.removeEventListener('pointermove', this.#onMove, { capture: true });
    this.dom.removeEventListener('pointerup', this.#onUp, { capture: true });
    this.#disposeGhost();
    this.#dragSrcPath = null;
  }

  #disposeGhost(): void {
    if (!this.#ghost) return;
    this.scene.remove(this.#ghost);
    this.#ghost.geometry.dispose();
    const m = this.#ghost.material;
    if (Array.isArray(m)) m.forEach((mm) => mm.dispose());
    else m.dispose();
    this.#ghost = null;
  }

  #pickAt(e: PointerEvent, kindFilter?: 'file' | 'dir'): THREE.Object3D | null {
    const rect = this.dom.getBoundingClientRect();
    this.#ndc.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.#ndc.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    this.#ray.setFromCamera(this.#ndc, this.camera);
    const hits = this.#ray.intersectObjects(this.targets(), false);
    const m = hits.find((h) => !kindFilter || h.object.userData.kind === kindFilter)?.object;
    return m ?? null;
  }

  #start(e: PointerEvent): void {
    if (e.button !== 0) return;
    const obj = this.#pickAt(e, 'file');
    if (!obj) return;
    e.stopImmediatePropagation();
    this.#dragSrcPath = obj.userData.path as string;
    const ghostGeom = new THREE.BoxGeometry(1.2, 1.2, 1.2);
    const ghostMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.5 });
    this.#ghost = new THREE.Mesh(ghostGeom, ghostMat);
    this.scene.add(this.#ghost);
  }

  #drag(e: PointerEvent): void {
    if (!this.#ghost) return;
    const rect = this.dom.getBoundingClientRect();
    this.#ndc.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.#ndc.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    this.#ray.setFromCamera(this.#ndc, this.camera);
    const hit = new THREE.Vector3();
    if (this.#ray.ray.intersectPlane(this.#ground, hit)) {
      this.#ghost.position.copy(hit.add(new THREE.Vector3(0, 1, 0)));
    }
  }

  async #drop(e: PointerEvent): Promise<void> {
    if (!this.#ghost || !this.#dragSrcPath) return;
    const target = this.#pickAt(e, 'dir');
    // Dispose ghost geometry+material to avoid leaking GPU resources.
    this.#disposeGhost();
    const src = this.#dragSrcPath;
    this.#dragSrcPath = null;

    // Browsers synthesize a `click` event on pointerup even when we treated
    // the gesture as a drag. Suppress that one synthetic click so it doesn't
    // re-trigger ClickHandler (which would expand or focus the drop target).
    // Register a one-shot capture-phase swallow for the immediately-following
    // click, then deregister on next tick if nothing fires.
    const swallow = (ev: Event) => {
      ev.stopImmediatePropagation();
      ev.preventDefault();
      this.dom.removeEventListener('click', swallow, { capture: true });
    };
    this.dom.addEventListener('click', swallow, { capture: true });
    setTimeout(() => this.dom.removeEventListener('click', swallow, { capture: true }), 0);

    if (!target) return;
    const dstParent = target.userData.path as string;
    const fileName = src.split('/').pop()!;
    const dst = `${dstParent}/${fileName}`;

    const ok = window.confirm(`Move "${fileName}" to ${dstParent}?`);
    if (!ok) return;

    try {
      await unwrap(fsn.move(src, dst));
      useUiStore.getState().pushToast('info', `Moved ${fileName}`);
      // optimistic: remove from store immediately; watcher will reconcile
      useFsStore.getState().removeNode(src);
    } catch (err) {
      useUiStore.getState().pushToast('error', `Move failed: ${(err as Error).message}`);
    }
  }
}
