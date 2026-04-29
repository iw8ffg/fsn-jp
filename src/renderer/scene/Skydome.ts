import * as THREE from 'three';

/**
 * SGI FSN-style peach/cream pastel skydome. Inverted-normal sphere whose
 * inside surface carries a vertical gradient — dusty blue zenith fading
 * through peach-gray and warm peach to an orange-tan horizon. The horizon
 * color matches the linear fog in SceneRoot so distant pedestals dissolve
 * into the haze without a visible seam.
 */
export function createSkydome(): THREE.Mesh {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 512;
  const ctx = c.getContext('2d')!;
  // Vertical gradient: y=0 is top of canvas (mapped to top of sphere).
  const grad = ctx.createLinearGradient(0, 0, 0, 512);
  grad.addColorStop(0.00, '#3e5470'); // zenith, dusty blue
  grad.addColorStop(0.45, '#a89090'); // peach-gray
  grad.addColorStop(0.78, '#d6a890'); // warm peach
  grad.addColorStop(1.00, '#c89478'); // horizon, orange-tan (matches fog)
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 256, 512);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.needsUpdate = true;

  const geom = new THREE.SphereGeometry(4500, 32, 16);
  const mat = new THREE.MeshBasicMaterial({
    map: tex,
    side: THREE.BackSide,
    depthWrite: false,
    fog: false, // sky must not be tinted by fog or it would double-darken
  });
  const mesh = new THREE.Mesh(geom, mat);
  mesh.renderOrder = -1;
  mesh.name = 'skydome';
  return mesh;
}
