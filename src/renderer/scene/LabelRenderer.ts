import * as THREE from 'three';

interface LabelEntry {
  sprite: THREE.Sprite;
  texture: THREE.CanvasTexture;
  material: THREE.SpriteMaterial;
  text: string;
}

const CANVAS_W = 1024;
const CANVAS_H = 256;
// Texture aspect 4:1 — sprite scale 8:2 keeps the label readable in world space
// without distortion.
const SPRITE_SCALE = new THREE.Vector3(8, 2, 1);
const Y_OFFSET = -1.0;
const FONT = '600 96px "Segoe UI", Helvetica, Arial, sans-serif';
const TEXT_COLOR = '#e8edf2';
const BACKPLATE_FILL = 'rgba(10,14,20,0.7)';
const BACKPLATE_STROKE = 'rgba(120,140,160,0.5)';
const PAD_X = 40;
const RADIUS = 10;

export class LabelRenderer {
  readonly group = new THREE.Group();
  #labels = new Map<string, LabelEntry>();

  upsertLabel(path: string, text: string, position: THREE.Vector3): void {
    const existing = this.#labels.get(path);
    if (existing) {
      if (existing.text !== text) {
        // Rename: tear down old texture/material and rebuild.
        existing.texture.dispose();
        existing.material.dispose();
        const { texture, material } = makeLabelTexture(text);
        existing.sprite.material = material;
        existing.texture = texture;
        existing.material = material;
        existing.text = text;
      }
      existing.sprite.position.set(position.x, position.y + Y_OFFSET, position.z);
      return;
    }

    const { texture, material } = makeLabelTexture(text);
    const sprite = new THREE.Sprite(material);
    sprite.scale.copy(SPRITE_SCALE);
    sprite.position.set(position.x, position.y + Y_OFFSET, position.z);
    // Labels must not be raycastable — hover/click/drag use NodeRenderer meshes.
    sprite.raycast = () => {};
    this.group.add(sprite);
    this.#labels.set(path, { sprite, texture, material, text });
  }

  remove(path: string): void {
    const entry = this.#labels.get(path);
    if (!entry) return;
    this.group.remove(entry.sprite);
    entry.texture.dispose();
    entry.material.dispose();
    this.#labels.delete(path);
  }

  clear(): void {
    for (const path of [...this.#labels.keys()]) this.remove(path);
  }

  has(path: string): boolean { return this.#labels.has(path); }
  paths(): string[] { return [...this.#labels.keys()]; }

  dispose(): void {
    this.clear();
  }
}

function roundedRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.lineTo(x + w - rr, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + rr);
  ctx.lineTo(x + w, y + h - rr);
  ctx.quadraticCurveTo(x + w, y + h, x + w - rr, y + h);
  ctx.lineTo(x + rr, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - rr);
  ctx.lineTo(x, y + rr);
  ctx.quadraticCurveTo(x, y, x + rr, y);
  ctx.closePath();
}

function makeLabelTexture(text: string): { texture: THREE.CanvasTexture; material: THREE.SpriteMaterial } {
  const displayText = text.length > 32 ? text.slice(0, 30) + '…' : text;

  const canvas = document.createElement('canvas');
  canvas.width = CANVAS_W;
  canvas.height = CANVAS_H;
  const ctx = canvas.getContext('2d')!;
  ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);

  ctx.font = FONT;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // Measure for dynamic backplate sizing.
  const metrics = ctx.measureText(displayText);
  const textW = metrics.width;
  const plateW = Math.min(CANVAS_W - 8, textW + PAD_X * 2);
  const plateH = Math.min(CANVAS_H - 8, 160);
  const plateX = (CANVAS_W - plateW) / 2;
  const plateY = (CANVAS_H - plateH) / 2;

  // Dark rounded backplate with subtle steel border.
  ctx.fillStyle = BACKPLATE_FILL;
  ctx.strokeStyle = BACKPLATE_STROKE;
  ctx.lineWidth = 1;
  roundedRect(ctx, plateX, plateY, plateW, plateH, RADIUS);
  ctx.fill();
  ctx.stroke();

  // Text on top — soft black shadow for legibility against any background
  // that bleeds through translucent fog.
  ctx.shadowColor = 'rgba(0,0,0,0.9)';
  ctx.shadowBlur = 4;
  ctx.fillStyle = TEXT_COLOR;
  ctx.fillText(displayText, CANVAS_W / 2, CANVAS_H / 2);

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  const material = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    depthTest: false,
    fog: true,
  });
  return { texture, material };
}
