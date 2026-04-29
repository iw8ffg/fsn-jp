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
  // Track pointer-down position so we can distinguish a click (no movement)
  // from an actual drag. Without this, every file-click installs a click
  // swallower and ClickHandler never sees the event — file selection breaks.
  #downXY: { x: number; y: number } | null = null;
  #moved = false;
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
    // Don't stopImmediatePropagation here — we don't yet know if this is a
    // click or a drag. We only commit to the drag (creating a ghost,
    // suppressing other handlers) once the user has moved the pointer past
    // a small threshold in #drag.
    this.#dragSrcPath = obj.userData.path as string;
    this.#downXY = { x: e.clientX, y: e.clientY };
    this.#moved = false;
  }

  #drag(e: PointerEvent): void {
    if (!this.#dragSrcPath || !this.#downXY) return;
    if (!this.#moved) {
      const dx = e.clientX - this.#downXY.x;
      const dy = e.clientY - this.#downXY.y;
      if (dx * dx + dy * dy < 16) return; // <4px = still a click
      this.#moved = true;
      // Now we're committed to a drag: create the ghost and suppress orbit.
      e.stopImmediatePropagation();
      const ghostGeom = new THREE.BoxGeometry(1.2, 1.2, 1.2);
      const ghostMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.5 });
      this.#ghost = new THREE.Mesh(ghostGeom, ghostMat);
      this.scene.add(this.#ghost);
    }
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
    const wasDrag = this.#moved && this.#ghost !== null;
    this.#downXY = null;
    this.#moved = false;
    if (!wasDrag) {
      // No real drag occurred — pointerdown started over a file but the
      // user didn't move. Reset state and let the click event reach
      // ClickHandler so the file gets selected normally.
      this.#dragSrcPath = null;
      return;
    }
    const target = this.#pickAt(e, 'dir');
    this.#disposeGhost();
    const src = this.#dragSrcPath!;
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
      this.dom.removeEventListener('dblclick', swallow, { capture: true });
    };
    this.dom.addEventListener('click', swallow, { capture: true });
    this.dom.addEventListener('dblclick', swallow, { capture: true });
    setTimeout(() => {
      this.dom.removeEventListener('click', swallow, { capture: true });
      this.dom.removeEventListener('dblclick', swallow, { capture: true });
    }, 0);

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
