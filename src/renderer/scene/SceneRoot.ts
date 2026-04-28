import * as THREE from 'three';

export class SceneRoot {
  readonly scene = new THREE.Scene();
  readonly camera: THREE.PerspectiveCamera;
  readonly renderer: THREE.WebGLRenderer;
  #raf = 0;
  #disposed = false;
  #onTick: ((dt: number) => void) | null = null;
  #last = performance.now();
  #grid: THREE.GridHelper;

  constructor(canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setClearColor(0x000000);

    // Exponential fog so distant pedestals fade smoothly to black.
    this.scene.fog = new THREE.FogExp2(0x000000, 0.012);

    this.camera = new THREE.PerspectiveCamera(45, 1, 0.1, 8000);
    this.camera.position.set(60, 60, 80);

    // Subtle hemi for fill, dim directional so neon emissives still pop.
    const hemi = new THREE.HemisphereLight(0x223344, 0x000000, 0.4);
    const dir  = new THREE.DirectionalLight(0xffffff, 0.4);
    dir.position.set(50, 80, 30);
    this.scene.add(hemi, dir);

    // Neon-cyan grid floor — major lines bright, minor lines darker, slightly
    // below pedestal base so cylinders sit on top of it cleanly.
    this.#grid = new THREE.GridHelper(2000, 200, 0x39c4ff, 0x114866);
    this.#grid.position.y = -0.51;
    const gridMat = this.#grid.material as THREE.LineBasicMaterial;
    gridMat.transparent = true;
    gridMat.opacity = 0.55;
    gridMat.fog = true; // r0.165 LineBasicMaterial supports .fog
    this.scene.add(this.#grid);
  }

  setOnTick(cb: (dt: number) => void): void { this.#onTick = cb; }

  start(): void {
    const loop = () => {
      if (this.#disposed) return;
      const now = performance.now();
      const dt = (now - this.#last) / 1000;
      this.#last = now;
      this.#onTick?.(dt);
      this.renderer.render(this.scene, this.camera);
      this.#raf = requestAnimationFrame(loop);
    };
    this.#raf = requestAnimationFrame(loop);
  }

  resize(width: number, height: number): void {
    this.renderer.setSize(width, height, false);
    this.camera.aspect = width / Math.max(1, height);
    this.camera.updateProjectionMatrix();
  }

  dispose(): void {
    this.#disposed = true;
    cancelAnimationFrame(this.#raf);
    this.scene.remove(this.#grid);
    this.#grid.geometry.dispose();
    (this.#grid.material as THREE.Material).dispose();
    this.renderer.dispose();
  }
}
