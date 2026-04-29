import * as THREE from 'three';

interface OrbitState { distance: number; polar: number; azimuth: number; }

// Constrain camera to near-horizontal navigation, like the FSN in the film:
// the user yaws around the scene at roughly eye level, with only a small
// vertical tilt. polar = 0 looks straight down, polar = PI looks straight up;
// PI/2 is exactly horizontal. We allow ~70°..95° (slight downward tilt to
// straight-on at most).
const POLAR_MIN = Math.PI / 2 - 0.35; // ~70° (slight downward look)
const POLAR_MAX = Math.PI / 2 + 0.05; // ~93° (just below horizontal)

interface FlyOptions {
  distance?: number; polar?: number; azimuth?: number;
  durationMs?: number;
}

export class OrbitCameraController {
  #target = new THREE.Vector3();
  #state: OrbitState = { distance: 50, polar: Math.PI / 2 - 0.15, azimuth: 0 };
  #fly: { from: { target: THREE.Vector3; state: OrbitState }; to: { target: THREE.Vector3; state: OrbitState }; t: number; dur: number } | null = null;
  #pointerDown = false;
  #last = { x: 0, y: 0 };
  #dom: HTMLElement;

  constructor(private camera: THREE.PerspectiveCamera, dom: HTMLElement) {
    this.#dom = dom;
    dom.addEventListener('pointerdown',  this.#onDown);
    dom.addEventListener('pointermove',  this.#onMove);
    dom.addEventListener('pointerup',    this.#onUp);
    dom.addEventListener('pointerleave', this.#onUp);
    dom.addEventListener('wheel',        this.#onWheel, { passive: false });
  }

  dispose(): void {
    this.#dom.removeEventListener('pointerdown',  this.#onDown);
    this.#dom.removeEventListener('pointermove',  this.#onMove);
    this.#dom.removeEventListener('pointerup',    this.#onUp);
    this.#dom.removeEventListener('pointerleave', this.#onUp);
    this.#dom.removeEventListener('wheel',        this.#onWheel);
  }

  setTarget(t: THREE.Vector3, partial?: Partial<OrbitState>): void {
    this.#target.copy(t);
    if (partial) Object.assign(this.#state, partial);
    this.#applyImmediate();
  }

  flyTo(t: THREE.Vector3, opts: FlyOptions = {}): void {
    const to: OrbitState = {
      distance: opts.distance ?? this.#state.distance,
      polar:    clamp(opts.polar ?? this.#state.polar, POLAR_MIN, POLAR_MAX),
      azimuth:  opts.azimuth  ?? this.#state.azimuth,
    };
    this.#fly = {
      from: { target: this.#target.clone(), state: { ...this.#state } },
      to:   { target: t.clone(),            state: to },
      t: 0,
      dur: (opts.durationMs ?? 600) / 1000,
    };
  }

  update(dt: number): void {
    if (this.#fly) {
      this.#fly.t = Math.min(this.#fly.dur, this.#fly.t + dt);
      const k = ease(this.#fly.t / this.#fly.dur);
      this.#target.lerpVectors(this.#fly.from.target, this.#fly.to.target, k);
      this.#state.distance = lerp(this.#fly.from.state.distance, this.#fly.to.state.distance, k);
      this.#state.polar    = lerp(this.#fly.from.state.polar,    this.#fly.to.state.polar,    k);
      this.#state.azimuth  = lerp(this.#fly.from.state.azimuth,  this.#fly.to.state.azimuth,  k);
      if (this.#fly.t >= this.#fly.dur) this.#fly = null;
    }
    this.#applyImmediate();
  }

  #applyImmediate(): void {
    const { distance, polar, azimuth } = this.#state;
    const sinP = Math.sin(polar), cosP = Math.cos(polar);
    const x = this.#target.x + distance * sinP * Math.cos(azimuth);
    const y = this.#target.y + distance * cosP;
    const z = this.#target.z + distance * sinP * Math.sin(azimuth);
    this.camera.position.set(x, y, z);
    this.camera.lookAt(this.#target);
  }

  #onDown = (e: PointerEvent) => {
    this.#pointerDown = true;
    this.#last.x = e.clientX; this.#last.y = e.clientY;
  };
  #onUp = () => { this.#pointerDown = false; };
  #onMove = (e: PointerEvent) => {
    if (!this.#pointerDown) return;
    const dx = e.clientX - this.#last.x;
    const dy = e.clientY - this.#last.y;
    this.#last.x = e.clientX; this.#last.y = e.clientY;
    this.#fly = null;
    this.#state.azimuth -= dx * 0.005;
    this.#state.polar   = clamp(this.#state.polar - dy * 0.005, POLAR_MIN, POLAR_MAX);
  };
  #onWheel = (e: WheelEvent) => {
    e.preventDefault();
    this.#fly = null;
    this.#state.distance = clamp(this.#state.distance * (1 + Math.sign(e.deltaY) * 0.1), 5, 1000);
  };
}

function lerp(a: number, b: number, t: number): number { return a + (b - a) * t; }
function clamp(v: number, lo: number, hi: number): number { return Math.max(lo, Math.min(hi, v)); }
function ease(t: number): number { return 1 - Math.pow(1 - t, 3); } // cubic-out
