import * as THREE from 'three';

/**
 * Procedural starfield: ~2000 random points distributed on the surface of a
 * large sphere. Sized to sit just inside the camera's far plane so the
 * exponential fog blends most of them toward black, leaving only a faint
 * neon-FSN twinkle around the horizon.
 *
 * No animation — the field is static and disposed via the returned Points.
 */
export function createStarfield(
  count = 2000,
  radius = 4000,
): THREE.Points {
  const positions = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    // Uniform point on a sphere via inverse-CDF on cos(theta).
    const u = Math.random();
    const v = Math.random();
    const theta = 2 * Math.PI * u;
    const phi = Math.acos(2 * v - 1);
    const x = radius * Math.sin(phi) * Math.cos(theta);
    const y = radius * Math.sin(phi) * Math.sin(theta);
    const z = radius * Math.cos(phi);
    positions[i * 3 + 0] = x;
    positions[i * 3 + 1] = y;
    positions[i * 3 + 2] = z;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

  const material = new THREE.PointsMaterial({
    color: 0xffffff,
    size: 2,
    sizeAttenuation: true,
    transparent: true,
    opacity: 0.7,
    fog: false, // stars must not be erased by the fog at this distance
    depthWrite: false,
  });

  const points = new THREE.Points(geometry, material);
  points.frustumCulled = false;
  return points;
}
