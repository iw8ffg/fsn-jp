import * as fs from 'node:fs/promises';
import { joinPath, normalizePath } from './util/path';
import type { SearchHit } from '@shared/types';

const MAX_HITS = 1000;

export class SearchService {
  #cancellations = new Map<string, AbortController>();

  async search(
    root: string,
    query: string,
    id: string,
    onBatch: (hits: SearchHit[]) => void,
  ): Promise<void> {
    const ac = new AbortController();
    this.#cancellations.set(id, ac);
    const needle = query.toLowerCase();
    let total = 0;
    const buffer: SearchHit[] = [];

    const flush = (): void => {
      if (buffer.length) {
        onBatch(buffer.splice(0, buffer.length));
      }
    };

    const walk = async (dir: string): Promise<void> => {
      if (ac.signal.aborted) return;
      let entries: import('node:fs').Dirent[];
      try { entries = await fs.readdir(dir, { withFileTypes: true }); }
      catch { return; }

      for (const ent of entries) {
        if (ac.signal.aborted) return;
        const lname = ent.name.toLowerCase();
        if (!needle || lname.includes(needle)) {
          buffer.push({
            path: joinPath(dir, ent.name),
            name: ent.name,
            parentPath: dir,
          });
          total++;
          if (buffer.length >= 50) flush();
          if (total >= MAX_HITS) { ac.abort(); flush(); return; }
        }
        if (ent.isDirectory()) await walk(joinPath(dir, ent.name));
      }
    };

    try {
      await walk(normalizePath(root));
    } finally {
      if (!ac.signal.aborted) flush();
      this.#cancellations.delete(id);
    }
  }

  cancel(id: string): void {
    this.#cancellations.get(id)?.abort();
    this.#cancellations.delete(id);
  }
}
