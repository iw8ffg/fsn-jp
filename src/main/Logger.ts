import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { app } from 'electron';

export class Logger {
  #file: string;
  constructor() {
    this.#file = path.join(app.getPath('userData'), 'logs', 'error.log');
  }
  async error(msg: string, err?: unknown): Promise<void> {
    const line = `${new Date().toISOString()} ${msg} ${err instanceof Error ? err.stack : String(err ?? '')}\n`;
    await fs.mkdir(path.dirname(this.#file), { recursive: true });
    await fs.appendFile(this.#file, line);
  }
}
