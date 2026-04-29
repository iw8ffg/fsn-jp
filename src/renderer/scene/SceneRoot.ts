import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { createSkydome } from './Skydome';

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
  #skydome: THREE.Mesh;

  constructor(canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    // Clear color matches the horizon stop of the skydome so any sliver of
    // unrendered background blends seamlessly with the haze.
    this.renderer.setClearColor(0xc89478);
    // ACES filmic tone mapping; exposure nudged up since the lit sky now
    // contributes ambient brightness — keeps overall image from feeling muddy.
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 0.95;

    // Linear fog tinted to the horizon stop. Distant pedestals dissolve into
    // the orange-tan haze instead of fading into a black void. 60..280 keeps
    // the near radial cluster crisp while the far ring softly recedes.
    this.scene.fog = new THREE.Fog(0xc89478, 60, 280);

    this.#skydome = createSkydome();
    this.scene.add(this.#skydome);

    this.camera = new THREE.PerspectiveCamera(45, 1, 0.1, 8000);
    this.camera.position.set(0, 25, -45);

    // Hemi at slightly higher intensity so pedestals read as actual material
    // rather than self-glowing slabs. Directional warm-tinted to imply a
    // distant key light without going neon.
    const hemi = new THREE.HemisphereLight(0x445566, 0x111111, 0.65);
    const dir  = new THREE.DirectionalLight(0xffeecc, 0.4);
    dir.position.set(50, 80, 30);
    this.scene.add(hemi, dir);

    // Deep-teal / sage grid floor. Cool greens read as a clean complement to
    // the warm peach sky and stay legible without shouting; opacity bumped to
    // 0.7 because the brighter sky would otherwise wash the lines out.
    this.#grid = new THREE.GridHelper(2000, 200, 0x224a4a, 0x3a6a55);
    this.#grid.position.y = -0.51;
    const gridMat = this.#grid.material as THREE.LineBasicMaterial;
    gridMat.transparent = true;
    gridMat.opacity = 0.7;
    gridMat.fog = true; // r0.165 LineBasicMaterial supports .fog
    this.scene.add(this.#grid);

    // Postprocessing: Render -> UnrealBloom -> Output. Bloom is now a subtle
    // highlight on emissives, not a wash — strength/radius/threshold tuned
    // accordingly. Use 1x1 placeholder size since the canvas may not have
    // layout yet; resize() will fix it.
    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    // Bloom dialled down: with a bright sky most of the frame is already
    // luminous, so only the brightest neon-emissive highlights should bleed.
    this.bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.15, 0.4, 0.95);
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
    this.scene.remove(this.#skydome);
    this.#skydome.geometry.dispose();
    const skyMat = this.#skydome.material as THREE.MeshBasicMaterial;
    if (skyMat.map) skyMat.map.dispose();
    skyMat.dispose();
    this.bloom.dispose();
    this.composer.dispose();
    this.renderer.dispose();
  }
}
