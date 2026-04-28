import * as THREE from 'three';

export function makePedestalMaterial(): THREE.MeshStandardMaterial {
  const mat = new THREE.MeshStandardMaterial({
    color: 0x0a1a2a,
    metalness: 0.1,
    roughness: 0.4,
    emissive: 0x0a3050,
    emissiveIntensity: 0.6,
  });
  // Grid pattern via canvas texture — bright cyan strokes on dark base so the
  // top of the cylinder reads as an FSN platform.
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#0a1a2a';
  ctx.fillRect(0, 0, 64, 64);
  ctx.strokeStyle = '#39c4ff';
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
