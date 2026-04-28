import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { shell } from 'electron';
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

  async mkdir(parent: string, name: string): Promise<string> {
    this.#assertSafeName(name);
    const p = joinPath(normalizePath(parent), name);
    await fs.mkdir(p, { recursive: false });
    return p;
  }

  async rename(target: string, newName: string): Promise<string> {
    this.#assertSafeName(newName);
    const dir = path.posix.dirname(normalizePath(target));
    const next = joinPath(dir, newName);
    await fs.rename(target, next);
    return next;
  }

  async move(src: string, dst: string): Promise<void> {
    await fs.rename(src, dst).catch(async err => {
      if (err?.code !== 'EXDEV') throw err;
      // cross-device fallback
      await fs.cp(src, dst, { recursive: true });
      await fs.rm(src, { recursive: true, force: true });
    });
  }

  async copy(src: string, dst: string): Promise<void> {
    await fs.cp(src, dst, { recursive: true, errorOnExist: true, force: false });
  }

  async trash(target: string): Promise<void> {
    await shell.trashItem(target);
  }

  #assertSafeName(name: string): void {
    if (!name || /[\\/:*?"<>|]/.test(name) || name === '.' || name === '..') {
      throw new Error(`Invalid name: ${name}`);
    }
  }

  async #isHiddenWin(p: string): Promise<boolean> {
    const base = p.split('/').pop() ?? '';
    const HARDCODED = new Set([
      'System Volume Information',
      '$Recycle.Bin',
      'pagefile.sys',
      'hiberfil.sys',
      'swapfile.sys',
      'DumpStack.log',
      'DumpStack.log.tmp',
    ]);
    if (HARDCODED.has(base)) return true;
    return base.startsWith('.');
  }
}
