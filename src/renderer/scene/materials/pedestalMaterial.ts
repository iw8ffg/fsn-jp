import * as THREE from 'three';

// Curated palette of muted FSN-period tones — no neons, all sat-reduced
// midtones. Picks: dusty rose, warm beige, mauve, taupe, slate blue,
// olive-tan, sandstone. They sit in the same value band so adjacent
// pedestals never harshly contrast, only quietly differ.
const PALETTE: readonly number[] = [
  0x9c7a8a, // dusty rose
  0xa68b6e, // warm beige
  0x8a6e8a, // mauve
  0xa6a08c, // taupe
  0x7e8c9c, // slate blue
  0x9c8e6e, // olive-tan
  0xb09480, // sandstone
];

// FNV-1a 32-bit. Stable across runs so a given path always yields the same
// pedestal color — important for visual consistency as the tree re-renders.
function fnv1a(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

function darken(hex: number, factor: number): number {
  const r = Math.floor(((hex >> 16) & 0xff) * factor);
  const g = Math.floor(((hex >>  8) & 0xff) * factor);
  const b = Math.floor(( hex        & 0xff) * factor);
  return (r << 16) | (g << 8) | b;
}

function toCss(hex: number): string {
  return '#' + hex.toString(16).padStart(6, '0');
}

/**
 * Build a pedestal material whose base color is deterministically picked
 * from {@link PALETTE} by hashing `seed` (typically the node path). Each
 * material gets its own canvas texture so the grid stroke sits on the
 * picked base color rather than the previous monolithic teal.
 */
export function makePedestalMaterial(seed: string): THREE.MeshStandardMaterial {
  const color = PALETTE[fnv1a(seed) % PALETTE.length]!;
  const emissive = darken(color, 0.3);

  const mat = new THREE.MeshStandardMaterial({
    color,
    metalness: 0.05,
    roughness: 0.6,
    emissive,
    // Lower than before — the lit sky now provides plenty of ambient, so
    // pedestals don't need to self-glow to read.
    emissiveIntensity: 0.15,
  });

  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = toCss(color);
  ctx.fillRect(0, 0, 64, 64);
  // Faint white grid — softer than the previous saturated stroke so the
  // base color reads cleanly through it.
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.18)';
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
