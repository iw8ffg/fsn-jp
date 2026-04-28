import type { SceneRoot } from './SceneRoot';
import { LayoutEngine } from './LayoutEngine';
import { NodeRenderer } from './NodeRenderer';
import { OrbitCameraController } from './OrbitCameraController';
import { useFsStore } from '@renderer/state/fsStore';
import { useCameraStore } from '@renderer/state/cameraStore';
import type { FsNode } from '@shared/types';

const GRID_FALLBACK_THRESHOLD = 200;

export class SceneController {
  readonly nodes: NodeRenderer;
  readonly camera: OrbitCameraController;
  readonly layout = new LayoutEngine();
  #unsubFs: () => void;
  #unsubCam: () => void;

  constructor(private root: SceneRoot, dom: HTMLElement) {
    this.nodes = new NodeRenderer();
    this.root.scene.add(this.nodes.group);
    this.camera = new OrbitCameraController(root.camera, dom);

    this.#unsubFs = useFsStore.subscribe(() => this.#rebuild());
    this.#unsubCam = useCameraStore.subscribe(() => this.#applyFocus());

    this.root.setOnTick((dt) => this.camera.update(dt));

    // Initial build in case state is already populated.
    this.#rebuild();
  }

  dispose(): void {
    this.#unsubFs();
    this.#unsubCam();
    this.camera.dispose();
    this.root.scene.remove(this.nodes.group);
    this.nodes.dispose();
  }

  #rebuild(): void {
    const { nodes, root, expanded } = useFsStore.getState();
    if (!root) { this.nodes.clear(); return; }

    const visible: FsNode[] = [];
    const isVisible = (n: FsNode): boolean => {
      if (n.path === root) return true;
      const parent = parentOf(n.path);
      if (!nodes.has(parent)) return false;
      return parent === root || expanded.has(parent);
    };
    for (const n of nodes.values()) if (isVisible(n)) visible.push(n);

    // group files per parent for fallback decision
    const filesPerParent = new Map<string, number>();
    for (const n of visible) {
      if (n.kind !== 'file') continue;
      const p = parentOf(n.path);
      filesPerParent.set(p, (filesPerParent.get(p) ?? 0) + 1);
    }

    const positions = this.layout.computeFor(visible, root);

    // diff: remove disappeared
    const visiblePaths = new Set(visible.map(v => v.path));
    for (const m of this.nodes.allMeshes()) {
      const p = m.userData.path as string;
      if (!visiblePaths.has(p)) this.nodes.remove(p);
    }
    // upsert
    for (const n of visible) {
      const pos = positions.get(n.path);
      if (!pos) continue;
      if (n.kind === 'dir' || n.kind === 'locked') {
        this.nodes.upsertPedestal(n, pos);
      } else {
        const parent = parentOf(n.path);
        if ((filesPerParent.get(parent) ?? 0) > GRID_FALLBACK_THRESHOLD) {
          // skip individual blocks — could draw an aggregate badge in v2
          continue;
        }
        this.nodes.upsertFileBlock(n, pos);
      }
    }
  }

  #applyFocus(): void {
    const focus = useCameraStore.getState().focusPath;
    if (!focus) return;
    const mesh = this.nodes.meshAt(focus);
    if (!mesh) return;
    this.camera.flyTo(mesh.position.clone(), { distance: 50, polar: Math.PI / 4 });
  }
}

function parentOf(p: string): string {
  const i = p.lastIndexOf('/');
  if (i <= 2) return p.slice(0, i + 1);
  return p.slice(0, i);
}
