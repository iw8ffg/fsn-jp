import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { app } from 'electron';
import type { AppConfig } from '@shared/api';

const DEFAULT: AppConfig = { hiddenVisible: false };

export class Persistence {
  #file: string;
  #queue: Promise<void> = Promise.resolve();

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

  /**
   * Serializes saves through an internal promise queue so concurrent callers
   * do not interleave writes. Each save is atomic: temp file + rename.
   */
  save(cfg: AppConfig): Promise<void> {
    const tail = this.#queue.then(() => this.#doSave(cfg)).catch(() => {});
    this.#queue = tail;
    return tail;
  }

  async #doSave(cfg: AppConfig): Promise<void> {
    await fs.mkdir(path.dirname(this.#file), { recursive: true });
    const tmp = this.#file + '.tmp';
    const json = JSON.stringify(cfg, null, 2);
    await fs.writeFile(tmp, json);
    try {
      await fs.rename(tmp, this.#file);
    } catch (err) {
      // Best-effort cleanup of the temp file; rethrow so the caller sees the failure.
      await fs.unlink(tmp).catch(() => {});
      throw err;
    }
  }
}
