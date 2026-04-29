import * as THREE from 'three';
import type { SceneRoot } from './SceneRoot';
import { LayoutEngine } from './LayoutEngine';
import { NodeRenderer } from './NodeRenderer';
import { OrbitCameraController } from './OrbitCameraController';
import { HoverPicker } from './HoverPicker';
import { ClickHandler } from './ClickHandler';
import { DragController } from './DragController';
import { LabelRenderer } from './LabelRenderer';
import { SelectionBeam } from './SelectionBeam';
import { useFsStore } from '@renderer/state/fsStore';
import { useCameraStore } from '@renderer/state/cameraStore';
import { useUiStore } from '@renderer/state/uiStore';
import { parentOf } from '@renderer/util/paths';
import type { FsNode } from '@shared/types';

const GRID_FALLBACK_THRESHOLD = 200;

export class SceneController {
  readonly nodes: NodeRenderer;
  readonly labels: LabelRenderer;
  readonly camera: OrbitCameraController;
  readonly layout = new LayoutEngine();
  readonly picker: HoverPicker;
  readonly click: ClickHandler;
  readonly drag: DragController;
  readonly beam: SelectionBeam;
  #unsubFs: () => void;
  #unsubCam: () => void;
  #unsubHover: () => void;
  #unsubSelected: () => void;
  #unsubUi: () => void;
  // Track per-mesh original (shared) material so we can restore it on hover-out.
  // NodeRenderer caches materials by category, so mutating emissiveIntensity on
  // the shared material would highlight every mesh of that category. Instead,
  // on hover-enter we clone the material, boost emissiveIntensity on the clone,
  // and assign it to that mesh only; on hover-leave we restore the original
  // shared material and dispose the clone.
  #hoverOriginalMat: { mesh: THREE.Mesh; mat: THREE.Material | THREE.Material[] } | null = null;
  #lastFocus: string | null = null;

  constructor(private root: SceneRoot, dom: HTMLElement) {
    this.nodes = new NodeRenderer();
    this.root.scene.add(this.nodes.group);
    this.labels = new LabelRenderer();
    this.root.scene.add(this.labels.group);
    this.camera = new OrbitCameraController(root.camera, dom);
    this.picker = new HoverPicker(dom, root.camera, () => this.nodes.allMeshes());
    this.click = new ClickHandler(dom, root.camera, () => this.nodes.allMeshes());
    this.drag = new DragController(dom, root.camera, root.scene, () => this.nodes.allMeshes());
    this.beam = new SelectionBeam();
    this.root.scene.add(this.beam.object);

    // Selective subscription: only rebuild when the structural fields change.
    // Without this, every hover update (which is high-frequency) re-runs
    // the full #rebuild() because Zustand's default subscribe fires on any
    // state change.
    this.#unsubFs = useFsStore.subscribe(
      (s) => ({ nodes: s.nodes, root: s.root, expanded: s.expanded }),
      () => this.#rebuild(),
      { equalityFn: (a, b) => a.nodes === b.nodes && a.root === b.root && a.expanded === b.expanded },
    );
    this.#unsubCam = useCameraStore.subscribe(() => this.#applyFocus());
    this.#unsubHover = useFsStore.subscribe((s) => s.hoverPath, () => this.#applyHover());
    this.#unsubSelected = useFsStore.subscribe((s) => s.selectedPath, () => this.#applySelection());
    // Selector form: only fires when hiddenVisible changes, not on toast/modal churn.
    this.#unsubUi = useUiStore.subscribe((s) => s.hiddenVisible, () => this.#rebuild());

    this.root.setOnTick((dt) => this.camera.update(dt));

    // Initial build in case state is already populated.
    this.#rebuild();
  }

  dispose(): void {
    this.#unsubFs();
    this.#unsubCam();
    this.#unsubHover();
    this.#unsubSelected();
    this.#unsubUi();
    this.#restoreHover();
    this.drag.dispose();
    this.click.dispose();
    this.picker.dispose();
    this.camera.dispose();
    this.root.scene.remove(this.nodes.group);
    this.nodes.dispose();
    this.root.scene.remove(this.labels.group);
    this.labels.dispose();
    this.root.scene.remove(this.beam.object);
    this.beam.dispose();
  }

  #applySelection(): void {
    const path = useFsStore.getState().selectedPath;
    if (!path) { this.beam.hide(); return; }
    const mesh = this.nodes.meshAt(path) as THREE.Mesh | undefined;
    if (!mesh) { this.beam.hide(); return; }
    // Compute the world-space top of the mesh so the beam's bottom rests
    // on it. Pedestal box has geometry height 0.6 (flat tile), file block
    // has geometry height 1 scaled in Y by computed file height.
    const kind = mesh.userData.kind as 'dir' | 'file' | 'locked' | undefined;
    const geomHeight = kind === 'file' ? 1 : 0.6;
    const top = mesh.position.y + (geomHeight * mesh.scale.y) / 2;
    this.beam.showAt(new THREE.Vector3(mesh.position.x, top, mesh.position.z));
  }

  #applyHover = (() => {
    let last: string | null = null;
    return () => {
      const path = useFsStore.getState().hoverPath;
      if (path === last) return;
      this.#restoreHover();
      if (path) {
        const m = this.nodes.meshAt(path) as THREE.Mesh | undefined;
        if (m) {
          const original = m.material;
          // Only attempt to highlight standard-style materials with emissive.
          const single = Array.isArray(original) ? null : (original as THREE.MeshStandardMaterial);
          if (single && 'emissive' in single) {
            const clone = single.clone();
            clone.emissiveIntensity = 1.5;
            // Ensure emissive color is visible even if base material was 0.
            if (clone.emissive.getHex() === 0x000000) clone.emissive.copy(single.color);
            m.material = clone;
            this.#hoverOriginalMat = { mesh: m, mat: original };
          }
        }
      }
      last = path;
    };
  })();

  #restoreHover(): void {
    if (!this.#hoverOriginalMat) return;
    const { mesh, mat } = this.#hoverOriginalMat;
    const cloned = mesh.material as THREE.Material | THREE.Material[];
    mesh.material = mat;
    if (!Array.isArray(cloned)) cloned.dispose();
    this.#hoverOriginalMat = null;
  }

  #rebuild(): void {
    const { nodes, root, expanded } = useFsStore.getState();
    const showHidden = useUiStore.getState().hiddenVisible;
    if (!root) { this.nodes.clear(); return; }

    const visible: FsNode[] = [];
    const isVisible = (n: FsNode): boolean => {
      if (n.path === root) return true;
      const parent = parentOf(n.path);
      if (!nodes.has(parent)) return false;
      return parent === root || expanded.has(parent);
    };
    for (const n of nodes.values()) {
      if (n.isHidden && !showHidden) continue;
      if (isVisible(n)) visible.push(n);
    }

    const filesPerParent = new Map<string, number>();
    for (const n of visible) {
      if (n.kind !== 'file') continue;
      const p = parentOf(n.path);
      filesPerParent.set(p, (filesPerParent.get(p) ?? 0) + 1);
    }

    const positions = this.layout.computeFor(visible, root);

    const visiblePaths = new Set(visible.map(v => v.path));
    for (const m of this.nodes.allMeshes()) {
      const p = m.userData.path as string;
      if (!visiblePaths.has(p)) this.nodes.remove(p);
    }
    for (const p of this.labels.paths()) {
      if (!visiblePaths.has(p)) this.labels.remove(p);
    }
    for (const n of visible) {
      const pos = positions.get(n.path);
      if (!pos) continue;
      if (n.kind === 'dir' || n.kind === 'locked') {
        this.nodes.upsertPedestal(n, pos);
        this.labels.upsertLabel(n.path, n.name, pos);
      } else {
        const parent = parentOf(n.path);
        if ((filesPerParent.get(parent) ?? 0) > GRID_FALLBACK_THRESHOLD) continue;
        this.nodes.upsertFileBlock(n, pos);
      }
    }

    // Selection beam may need repositioning if the selected mesh moved
    // (re-layout after expand/collapse) or if it just appeared.
    this.#applySelection();
  }

  #applyFocus(): void {
    const focus = useCameraStore.getState().focusPath;
    if (!focus) return;
    if (focus === this.#lastFocus) return;
    const mesh = this.nodes.meshAt(focus);
    if (!mesh) return;
    this.#lastFocus = focus;
    this.camera.flyTo(mesh.position.clone(), { distance: 50 });
  }
}
