import * as THREE from 'three';

export function makePedestalMaterial(): THREE.MeshStandardMaterial {
  const mat = new THREE.MeshStandardMaterial({
    color: 0x2a8a9a,
    metalness: 0.1,
    roughness: 0.6,
    emissive: 0x1a4a55,
    emissiveIntensity: 0.4,
  });
  // Subtle grid pattern: lighter teal strokes on the base teal so the tile
  // reads as an FSN-style platform without a strong distracting pattern.
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#2a8a9a';
  ctx.fillRect(0, 0, 64, 64);
  ctx.strokeStyle = 'rgba(93,197,209,0.25)';
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
