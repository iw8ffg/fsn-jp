import * as fs from 'node:fs/promises';
import { normalizePath, joinPath } from './util/path';
import type { DriveInfo, FsNode } from '@shared/types';

export class FsService {
  // TODO(perf+enrich): A-Z is sequential; parallelize via Promise.all once it
  // matters. Also populate label/totalBytes/freeBytes — currently DriveInfo
  // fields are typed optional but never set. Defer to a dedicated drive-info
  // task; do NOT block this MVP on it.
  async listDrives(): Promise<DriveInfo[]> {
    const drives: DriveInfo[] = [];
    for (let code = 'A'.charCodeAt(0); code <= 'Z'.charCodeAt(0); code++) {
      const letter = String.fromCharCode(code) + ':';
      try {
        await fs.access(letter + '/');
        drives.push({ letter });
      } catch {
        // not present
      }
    }
    return drives;
  }

  async listDir(rootPath: string, depth: number): Promise<FsNode[]> {
    const out: FsNode[] = [];
    await this.#walk(normalizePath(rootPath), depth, out);
    return out;
  }

  async #walk(dirPath: string, depth: number, out: FsNode[]): Promise<void> {
    let entries: import('node:fs').Dirent[];
    try {
      entries = await fs.readdir(dirPath, { withFileTypes: true });
    } catch (err: any) {
      if (err?.code === 'EACCES' || err?.code === 'EPERM') return;
      throw err;
    }

    for (const ent of entries) {
      const full = joinPath(dirPath, ent.name);
      let stat: import('node:fs').Stats;
      try { stat = await fs.stat(full); }
      catch { continue; }

      const isDir = ent.isDirectory();
      const node: FsNode = {
        path: full,
        parentPath: dirPath,
        name: ent.name,
        kind: isDir ? 'dir' : 'file',
        size: isDir ? 0 : Number(stat.size),
        mtimeMs: stat.mtimeMs,
        isHidden: ent.name.startsWith('.') || (await this.#isHiddenWin(full)),
        childrenLoaded: false,
      };
      out.push(node);

      if (isDir && depth > 1) {
        try {
          // probe access; throws EACCES/EPERM if locked
          await fs.readdir(full).then(() => {});
          await this.#walk(full, depth - 1, out);
          node.childrenLoaded = true;
        } catch (err: unknown) {
          const e = err as NodeJS.ErrnoException;
          if (e?.code === 'EACCES' || e?.code === 'EPERM') {
            node.kind = 'locked';
          }
          // other errors are tolerated; childrenLoaded stays false
        }
      }
    }
  }

  async #isHiddenWin(_p: string): Promise<boolean> {
    // Stub: real Windows hidden attribute requires `winattr`-like native call.
    // For MVP, rely on dotfile convention; extend in Task 8.
    return false;
  }
}
