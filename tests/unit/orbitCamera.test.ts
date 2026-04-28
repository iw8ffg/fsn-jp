// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { OrbitCameraController } from '../../src/renderer/scene/OrbitCameraController';

describe('OrbitCameraController', () => {
  it('places camera at distance from target', () => {
    const cam = new THREE.PerspectiveCamera();
    const ctl = new OrbitCameraController(cam, document.createElement('div'));
    ctl.setTarget(new THREE.Vector3(0, 0, 0), { distance: 50, polar: Math.PI / 4, azimuth: 0 });
    ctl.update(1);
    expect(cam.position.length()).toBeCloseTo(50, 1);
  });

  it('animates to a new target over time', () => {
    const cam = new THREE.PerspectiveCamera();
    const ctl = new OrbitCameraController(cam, document.createElement('div'));
    ctl.setTarget(new THREE.Vector3(0, 0, 0), { distance: 30 });
    ctl.flyTo(new THREE.Vector3(100, 0, 0), { distance: 30, durationMs: 100 });
    for (let i = 0; i < 20; i++) ctl.update(0.01);
    expect(cam.position.x).toBeGreaterThan(50);
  });
});
