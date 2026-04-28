import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { app } from 'electron';
import type { AppConfig } from '@shared/api';

const DEFAULT: AppConfig = { hiddenVisible: false };

export class Persistence {
  #file: string;

  constructor(file?: string) {
    this.#file = file ?? path.join(app.getPath('userData'), 'config.json');
  }

  async load(): Promise<AppConfig> {
    try {
      const raw = await fs.readFile(this.#file, 'utf8');
      return { ...DEFAULT, ...JSON.parse(raw) };
    } catch {
      return { ...DEFAULT };
    }
  }

  async save(cfg: AppConfig): Promise<void> {
    await fs.mkdir(path.dirname(this.#file), { recursive: true });
    await fs.writeFile(this.#file, JSON.stringify(cfg, null, 2));
  }
}
