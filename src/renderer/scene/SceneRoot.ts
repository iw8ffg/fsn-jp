import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';

export class SceneRoot {
  readonly scene = new THREE.Scene();
  readonly camera: THREE.PerspectiveCamera;
  readonly renderer: THREE.WebGLRenderer;
  readonly composer: EffectComposer;
  readonly bloom: UnrealBloomPass;
  #raf = 0;
  #disposed = false;
  #onTick: ((dt: number) => void) | null = null;
  #last = performance.now();
  #grid: THREE.GridHelper;

  constructor(canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setClearColor(0x000000);
    // ACES filmic tone mapping with reduced exposure for grounded, less
    // blown-out FSN look — closer to the Jurassic Park original.
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 0.85;

    // Denser exponential fog deepens the FSN void around the radial spread.
    this.scene.fog = new THREE.FogExp2(0x000000, 0.018);

    this.camera = new THREE.PerspectiveCamera(45, 1, 0.1, 8000);
    this.camera.position.set(60, 60, 80);

    // Hemi at slightly higher intensity so pedestals read as actual material
    // rather than self-glowing slabs. Directional warm-tinted to imply a
    // distant key light without going neon.
    const hemi = new THREE.HemisphereLight(0x445566, 0x111111, 0.65);
    const dir  = new THREE.DirectionalLight(0xffeecc, 0.4);
    dir.position.set(50, 80, 30);
    this.scene.add(hemi, dir);

    // Steel-blue grid floor — desaturated relative to the original neon-cyan
    // version, lower opacity so it whispers rather than shouts.
    this.#grid = new THREE.GridHelper(2000, 200, 0x335577, 0x162636);
    this.#grid.position.y = -0.51;
    const gridMat = this.#grid.material as THREE.LineBasicMaterial;
    gridMat.transparent = true;
    gridMat.opacity = 0.4;
    gridMat.fog = true; // r0.165 LineBasicMaterial supports .fog
    this.scene.add(this.#grid);

    // Postprocessing: Render -> UnrealBloom -> Output. Bloom is now a subtle
    // highlight on emissives, not a wash — strength/radius/threshold tuned
    // accordingly. Use 1x1 placeholder size since the canvas may not have
    // layout yet; resize() will fix it.
    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    this.bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.25, 0.4, 0.85);
    this.composer.addPass(this.bloom);
    this.composer.addPass(new OutputPass());
  }

  setOnTick(cb: (dt: number) => void): void { this.#onTick = cb; }

  start(): void {
    const loop = () => {
      if (this.#disposed) return;
      const now = performance.now();
      const dt = (now - this.#last) / 1000;
      this.#last = now;
      this.#onTick?.(dt);
      this.composer.render(dt);
      this.#raf = requestAnimationFrame(loop);
    };
    this.#raf = requestAnimationFrame(loop);
  }

  resize(width: number, height: number): void {
    this.renderer.setSize(width, height, false);
    this.composer.setSize(width, height);
    this.bloom.setSize(width, height);
    this.camera.aspect = width / Math.max(1, height);
    this.camera.updateProjectionMatrix();
  }

  dispose(): void {
    this.#disposed = true;
    cancelAnimationFrame(this.#raf);
    this.scene.remove(this.#grid);
    this.#grid.geometry.dispose();
    (this.#grid.material as THREE.Material).dispose();
    this.bloom.dispose();
    this.composer.dispose();
    this.renderer.dispose();
  }
}
