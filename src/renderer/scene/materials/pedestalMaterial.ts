import * as THREE from 'three';

export function makePedestalMaterial(): THREE.MeshStandardMaterial {
  const mat = new THREE.MeshStandardMaterial({
    color: 0x3a4a6b,
    metalness: 0.1,
    roughness: 0.55,
    emissive: 0x0a1422,
    emissiveIntensity: 0.5,
  });
  // simple grid pattern via canvas texture
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#3a4a6b';
  ctx.fillRect(0, 0, 64, 64);
  ctx.strokeStyle = '#7da4d8';
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
