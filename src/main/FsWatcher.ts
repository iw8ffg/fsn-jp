import chokidar, { FSWatcher } from 'chokidar';
import * as fs from 'node:fs/promises';
import { BrowserWindow } from 'electron';
import { IPC } from '@shared/ipc';
import type { FsEvent, FsNode } from '@shared/types';
import { normalizePath } from './util/path';

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

  constructor(private win: BrowserWindow) {}

  async watch(rootPath: string): Promise<void> {
    await this.dispose();
    const root = normalizePath(rootPath);
    this.#watcher = chokidar.watch(root, {
      ignoreInitial: true,
      depth: 2, // only watch first 2 levels — matches lazy expansion model
      awaitWriteFinish: { stabilityThreshold: 200, pollInterval: 50 },
    });

    this.#watcher.on('add', (p) => this.#enqueueAdd(normalizePath(p), 'file'));
    this.#watcher.on('addDir', (p) => this.#enqueueAdd(normalizePath(p), 'dir'));
    this.#watcher.on('unlink', (p) => this.#enqueue({ type: 'remove', path: normalizePath(p) }));
    this.#watcher.on('unlinkDir', (p) => this.#enqueue({ type: 'remove', path: normalizePath(p) }));
    this.#watcher.on('change', async (p) => {
      const np = normalizePath(p);
      try {
        const stat = await fs.stat(np);
        const node: FsNode = {
          path: np,
          parentPath: parentOf(np),
          name: np.split('/').pop() ?? '',
          kind: 'file',
          size: Number(stat.size),
          mtimeMs: stat.mtimeMs,
          isHidden: false,
          childrenLoaded: false,
        };
        this.#enqueue({ type: 'change', node });
      } catch {
        /* gone */
      }
    });
  }

  async dispose(): Promise<void> {
    if (this.#watcher) {
      await this.#watcher.close();
      this.#watcher = null;
    }
    if (this.#flushTimer) {
      clearTimeout(this.#flushTimer);
      this.#flushTimer = null;
    }
  }

  async #enqueueAdd(p: string, kind: 'file' | 'dir'): Promise<void> {
    try {
      const stat = await fs.stat(p);
      const node: FsNode = {
        path: p,
        parentPath: parentOf(p),
        name: p.split('/').pop() ?? '',
        kind,
        size: kind === 'dir' ? 0 : Number(stat.size),
        mtimeMs: stat.mtimeMs,
        isHidden: false,
        childrenLoaded: false,
      };
      this.#enqueue({ type: 'add', node });
    } catch {
      /* gone */
    }
  }

  #enqueue(ev: FsEvent): void {
    this.#pending.push(ev);
    if (!this.#flushTimer) {
      this.#flushTimer = setTimeout(() => this.#flush(), 100);
    }
  }

  #flush(): void {
    const batch = this.#pending;
    this.#pending = [];
    this.#flushTimer = null;
    if (this.win.isDestroyed()) return;
    for (const ev of batch) this.win.webContents.send(IPC.fsEvent, ev);
  }
}
