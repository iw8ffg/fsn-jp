import * as THREE from 'three';

export function makePedestalMaterial(): THREE.MeshStandardMaterial {
  const mat = new THREE.MeshStandardMaterial({
    color: 0x2a2f38,
    metalness: 0.05,
    roughness: 0.7,
    emissive: 0x000000,
    emissiveIntensity: 0,
  });
  // Grid pattern via canvas texture — subtle steel strokes on warm dark gray
  // so the top of the cylinder reads as a stone-like FSN platform.
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#2a2f38';
  ctx.fillRect(0, 0, 64, 64);
  ctx.strokeStyle = '#5a7a90';
  ctx.lineWidth = 1;
  for (let i = 0; i <= 64; i += 8) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i, 64);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, i);
    ctx.lineTo(64, i);
    ctx.stroke();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(2, 2);
  mat.map = tex;
  return mat;
}
