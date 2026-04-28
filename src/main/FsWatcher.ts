import chokidar, { FSWatcher } from 'chokidar';
import * as fs from 'node:fs/promises';
import { BrowserWindow } from 'electron';
import { IPC } from '@shared/ipc';
import type { FsEvent, FsNode } from '@shared/types';
import { normalizePath } from './util/path';
import { isHiddenName } from './util/hidden';

function parentOf(np: string): string {
  const idx = np.lastIndexOf('/');
  if (idx <= 0) return '';
  // For drive root like "C:/foo", parent is "C:/"
  if (idx === 2 && /^[A-Z]:$/.test(np.slice(0, 2))) return np.slice(0, 3);
  return np.slice(0, idx);
}

export class FsWatcher {
  #watcher: FSWatcher | null = null;
  #pending: FsEvent[] = [];
  #flushTimer: NodeJS.Timeout | null = null;
  #disposed = false;
  #generation = 0;

  constructor(private win: BrowserWindow) {}

  async watch(rootPath: string): Promise<void> {
    await this.dispose();
    this.#disposed = false;
    this.#generation++;
    const myGen = this.#generation;
    const root = normalizePath(rootPath);
    this.#watcher = chokidar.watch(root, {
      ignoreInitial: true,
      // depth=1 keeps watcher cost bounded on drive roots like C:/ where
      // depth=2 would register fs.watch handles on tens of thousands of
      // subdirs and can hang or OOM the main process on Windows.
      depth: 1,
      awaitWriteFinish: { stabilityThreshold: 200, pollInterval: 50 },
      // Don't crash main if a watched path becomes inaccessible mid-flight.
      ignorePermissionErrors: true,
    });
    this.#watcher.on('error', () => {
      // Swallow watcher errors — they would otherwise propagate as unhandled
      // 'error' events on the EventEmitter and crash the main process. The
      // logger picks up uncaughtException at the process level if needed.
    });

    this.#watcher.on('add', (p) => {
      if (this.#disposed || myGen !== this.#generation) return;
      this.#enqueueAdd(normalizePath(p), 'file');
    });
    this.#watcher.on('addDir', (p) => {
      if (this.#disposed || myGen !== this.#generation) return;
      this.#enqueueAdd(normalizePath(p), 'dir');
    });
    this.#watcher.on('unlink', (p) => {
      if (this.#disposed || myGen !== this.#generation) return;
      this.#enqueue({ type: 'remove', path: normalizePath(p) });
    });
    this.#watcher.on('unlinkDir', (p) => {
      if (this.#disposed || myGen !== this.#generation) return;
      this.#enqueue({ type: 'remove', path: normalizePath(p) });
    });
    this.#watcher.on('change', async (p) => {
      if (this.#disposed || myGen !== this.#generation) return;
      const np = normalizePath(p);
      try {
        const stat = await fs.stat(np);
        if (this.#disposed || myGen !== this.#generation) return;
        const node: FsNode = {
          path: np,
          parentPath: parentOf(np),
          name: np.split('/').pop() ?? '',
          kind: 'file',
          size: Number(stat.size),
          mtimeMs: stat.mtimeMs,
          isHidden: isHiddenName(np.split('/').pop() ?? ''),
          childrenLoaded: false,
        };
        this.#enqueue({ type: 'change', node });
      } catch {
        /* gone */
      }
    });
  }

  async dispose(): Promise<void> {
    this.#disposed = true;
    if (this.#watcher) {
      await this.#watcher.close();
      this.#watcher = null;
    }
    if (this.#flushTimer) {
      clearTimeout(this.#flushTimer);
      this.#flushTimer = null;
    }
    this.#pending = [];
  }

  async #enqueueAdd(p: string, kind: 'file' | 'dir'): Promise<void> {
    const myGen = this.#generation;
    try {
      const stat = await fs.stat(p);
      if (this.#disposed || myGen !== this.#generation) return;
      const node: FsNode = {
        path: p,
        parentPath: parentOf(p),
        name: p.split('/').pop() ?? '',
        kind,
        size: kind === 'dir' ? 0 : Number(stat.size),
        mtimeMs: stat.mtimeMs,
        isHidden: isHiddenName(p.split('/').pop() ?? ''),
        childrenLoaded: false,
      };
      this.#enqueue({ type: 'add', node });
    } catch {
      /* gone */
    }
  }

  #enqueue(ev: FsEvent): void {
    if (this.#disposed) return;
    this.#pending.push(ev);
    if (!this.#flushTimer) {
      this.#flushTimer = setTimeout(() => this.#flush(), 100);
    }
  }

  #flush(): void {
    if (this.#disposed) return;
    const batch = this.#pending;
    this.#pending = [];
    this.#flushTimer = null;
    if (this.win.isDestroyed()) return;
    for (const ev of batch) this.win.webContents.send(IPC.fsEvent, ev);
  }
}
