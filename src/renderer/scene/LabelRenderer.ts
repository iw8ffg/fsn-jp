import * as THREE from 'three';

interface LabelEntry {
  sprite: THREE.Sprite;
  texture: THREE.CanvasTexture;
  material: THREE.SpriteMaterial;
  text: string;
}

const CANVAS_W = 256;
const CANVAS_H = 64;
const SPRITE_SCALE = new THREE.Vector3(4, 1, 1);
const Y_OFFSET = 1.5;
const LABEL_COLOR = '#4dd0e1';

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

function makeLabelTexture(text: string): { texture: THREE.CanvasTexture; material: THREE.SpriteMaterial } {
  const canvas = document.createElement('canvas');
  canvas.width = CANVAS_W;
  canvas.height = CANVAS_H;
  const ctx = canvas.getContext('2d')!;
  ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
  ctx.font = 'bold 28px "Segoe UI", system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  // Subtle outer glow.
  ctx.shadowColor = LABEL_COLOR;
  ctx.shadowBlur = 8;
  ctx.fillStyle = LABEL_COLOR;
  ctx.fillText(text, CANVAS_W / 2, CANVAS_H / 2);
  // Second pass without shadow for crisper core.
  ctx.shadowBlur = 0;
  ctx.fillText(text, CANVAS_W / 2, CANVAS_H / 2);

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
