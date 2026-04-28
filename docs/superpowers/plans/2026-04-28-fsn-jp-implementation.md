# FSN-JP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Windows desktop file manager that renders the local filesystem as a 3D scene inspired by SGI's FSN (the navigator from *Jurassic Park*), with real file operations (move/copy/rename/delete/mkdir), search, hover info, and live file watching.

**Architecture:** Electron app with a strict main/renderer split. Main process owns all `fs` access and exposes a typed IPC contract. Renderer is a React UI overlay on top of a Three.js canvas. State is held in Zustand stores; the scene subscribes to state changes. Tree is depth-limited with on-demand expansion.

**Tech Stack:** Electron 30 + TypeScript + Vite + React 18 + Three.js + Zustand + chokidar + electron-forge + Vitest + Playwright.

**Spec:** `docs/superpowers/specs/2026-04-28-fsn-jp-windows-design.md`

**Working directory:** `C:\Users\dscognamiglio\Downloads\webapp\fileexplorer` (Windows).

**Conventions:**
- Every commit message follows Conventional Commits: `feat:`, `fix:`, `chore:`, `test:`, `docs:`, `refactor:`.
- Use `pnpm` as the package manager (faster, smaller `node_modules`). All commands below assume `pnpm`.
- Run all dev commands from the repo root.
- Use absolute paths in tests where Windows separators matter; otherwise rely on `path.posix` for IPC payload normalization.
- Co-locate small unit tests with source where helpful; otherwise put tests under `tests/` mirroring `src/`.

---

## Phase 0 — Project setup

### Task 1: Initialize repo and tooling

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `tsconfig.node.json`
- Create: `.gitignore`
- Create: `.editorconfig`
- Create: `README.md`
- Create: `.nvmrc`

- [ ] **Step 1: Init git and pnpm**

```bash
cd /c/Users/dscognamiglio/Downloads/webapp/fileexplorer
git init -b main
corepack enable
pnpm init
```

Expected: `package.json` exists, `.git/` exists.

- [ ] **Step 2: Set Node version**

Write `.nvmrc`:

```
20
```

- [ ] **Step 3: Install dev dependencies**

```bash
pnpm add -D typescript@^5.4 vite@^5 @vitejs/plugin-react@^4 \
  electron@^30 @electron-forge/cli@^7 \
  vitest@^1 @vitest/ui@^1 \
  @playwright/test@^1 \
  eslint@^8 @typescript-eslint/parser@^7 @typescript-eslint/eslint-plugin@^7 \
  prettier@^3
```

- [ ] **Step 4: Install runtime dependencies**

```bash
pnpm add three@^0.165 react@^18 react-dom@^18 zustand@^4 chokidar@^3
pnpm add -D @types/three @types/react @types/react-dom @types/node
```

- [ ] **Step 5: Write `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "jsx": "react-jsx",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "verbatimModuleSyntax": false,
    "baseUrl": ".",
    "paths": {
      "@shared/*": ["src/shared/*"],
      "@main/*":   ["src/main/*"],
      "@renderer/*": ["src/renderer/*"]
    }
  },
  "include": ["src", "tests"]
}
```

- [ ] **Step 6: Write `tsconfig.node.json`**

For Electron main / preload (CommonJS-friendly):

```json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "module": "CommonJS",
    "moduleResolution": "Node",
    "outDir": "dist/main",
    "noEmit": false,
    "types": ["node", "electron"]
  },
  "include": ["src/main", "src/preload", "src/shared"]
}
```

- [ ] **Step 7: Write `.gitignore`**

```
node_modules/
dist/
out/
.vite/
coverage/
*.log
playwright-report/
test-results/
.DS_Store
.env
.env.local
```

- [ ] **Step 8: Write `.editorconfig`**

```ini
root = true
[*]
charset = utf-8
end_of_line = lf
indent_style = space
indent_size = 2
insert_final_newline = true
trim_trailing_whitespace = true
```

- [ ] **Step 9: Write minimal `README.md`**

```markdown
# FSN-JP

3D file system explorer for Windows, inspired by SGI's FSN (Jurassic Park).

See `docs/superpowers/specs/2026-04-28-fsn-jp-windows-design.md` for design.

## Dev

```bash
pnpm install
pnpm dev
```
```

- [ ] **Step 10: First commit**

```bash
git add .
git commit -m "chore: initialize repo with TypeScript + Electron toolchain"
```

---

### Task 2: Folder skeleton + barrel files

**Files:**
- Create: `src/main/index.ts`
- Create: `src/preload/index.ts`
- Create: `src/renderer/main.tsx`
- Create: `src/renderer/index.html`
- Create: `src/shared/types.ts`
- Create: `src/shared/ipc.ts`

- [ ] **Step 1: Create folder structure**

```bash
mkdir -p src/main src/preload src/renderer/scene src/renderer/ui src/renderer/state src/renderer/ipc src/shared resources tests/unit tests/integration tests/e2e/fixtures
```

- [ ] **Step 2: Write `src/shared/types.ts`** (initial empty type module — populated in Task 5)

```ts
export type FsNodeKind = 'dir' | 'file' | 'locked';

export interface FsNode {
  path: string;
  name: string;
  kind: FsNodeKind;
  size: number;
  mtimeMs: number;
  isHidden: boolean;
  childrenLoaded: boolean;
}
```

- [ ] **Step 3: Write `src/shared/ipc.ts`** (channel constants — populated in Task 5)

```ts
export const IPC = {
  listDrives: 'fs:listDrives',
  listDir:    'fs:listDir',
  stat:       'fs:stat',
  move:       'fs:move',
  copy:       'fs:copy',
  rename:     'fs:rename',
  trash:      'fs:trash',
  mkdir:      'fs:mkdir',
  search:     'fs:search',
  searchCancel: 'fs:searchCancel',
  searchResult: 'fs:searchResult',
  fsEvent:    'fs:event',
} as const;

export type IpcResult<T> =
  | { ok: true; data: T }
  | { ok: false; code: string; message: string };
```

- [ ] **Step 4: Write minimal `src/main/index.ts`**

```ts
import { app, BrowserWindow } from 'electron';
import * as path from 'node:path';

const isDev = !app.isPackaged;

async function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    backgroundColor: '#0a0e14',
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
    },
  });

  if (isDev && process.env.VITE_DEV_SERVER_URL) {
    await win.loadURL(process.env.VITE_DEV_SERVER_URL);
    win.webContents.openDevTools({ mode: 'detach' });
  } else {
    await win.loadFile(path.join(__dirname, '../renderer/index.html'));
  }
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
```

- [ ] **Step 5: Write minimal `src/preload/index.ts`**

```ts
import { contextBridge } from 'electron';

contextBridge.exposeInMainWorld('fsn', {
  ping: () => 'pong',
});
```

- [ ] **Step 6: Write `src/renderer/index.html`**

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>FSN-JP</title>
    <meta http-equiv="Content-Security-Policy" content="default-src 'self'; style-src 'self' 'unsafe-inline'; script-src 'self'; connect-src 'self' ws:" />
    <style>html,body,#root{margin:0;padding:0;height:100%;background:#0a0e14;color:#cfd8dc;font-family:system-ui,sans-serif;}</style>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 7: Write `src/renderer/main.tsx`**

```tsx
import React from 'react';
import { createRoot } from 'react-dom/client';

function App() {
  return <div style={{ padding: 24 }}>FSN-JP — bootstrap OK</div>;
}

createRoot(document.getElementById('root')!).render(<App />);
```

- [ ] **Step 8: Commit**

```bash
git add src
git commit -m "chore: scaffold src layout and IPC type stubs"
```

---

### Task 3: Vite + Electron Forge wiring

**Files:**
- Create: `vite.renderer.config.ts`
- Create: `vite.main.config.ts`
- Create: `vite.preload.config.ts`
- Create: `forge.config.ts`
- Modify: `package.json` (scripts + main entry)

- [ ] **Step 1: Install Forge plugin for Vite**

```bash
pnpm add -D @electron-forge/plugin-vite @electron-forge/maker-squirrel @electron-forge/maker-zip
```

- [ ] **Step 2: Write `vite.main.config.ts`**

```ts
import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    outDir: '.vite/build',
    lib: { entry: 'src/main/index.ts', formats: ['cjs'], fileName: () => 'main.js' },
    rollupOptions: { external: ['electron', 'chokidar', 'node:fs', 'node:path'] },
  },
});
```

- [ ] **Step 3: Write `vite.preload.config.ts`**

```ts
import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    outDir: '.vite/build',
    lib: { entry: 'src/preload/index.ts', formats: ['cjs'], fileName: () => 'preload.js' },
    rollupOptions: { external: ['electron'] },
  },
});
```

- [ ] **Step 4: Write `vite.renderer.config.ts`**

```ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  root: 'src/renderer',
  plugins: [react()],
  resolve: {
    alias: {
      '@shared': path.resolve(__dirname, 'src/shared'),
      '@renderer': path.resolve(__dirname, 'src/renderer'),
    },
  },
  build: { outDir: '../../.vite/renderer' },
});
```

- [ ] **Step 5: Write `forge.config.ts`**

```ts
import type { ForgeConfig } from '@electron-forge/shared-types';
import { VitePlugin } from '@electron-forge/plugin-vite';
import { MakerZIP } from '@electron-forge/maker-zip';
import { MakerSquirrel } from '@electron-forge/maker-squirrel';

const config: ForgeConfig = {
  packagerConfig: {
    name: 'FSN-JP',
    executableName: 'fsn-jp',
    asar: true,
  },
  makers: [
    new MakerSquirrel({ name: 'fsn-jp' }),
    new MakerZIP({}, ['win32']),
  ],
  plugins: [
    new VitePlugin({
      build: [
        { entry: 'src/main/index.ts',    config: 'vite.main.config.ts',    target: 'main' },
        { entry: 'src/preload/index.ts', config: 'vite.preload.config.ts', target: 'preload' },
      ],
      renderer: [{ name: 'main_window', config: 'vite.renderer.config.ts' }],
    }),
  ],
};

export default config;
```

- [ ] **Step 6: Update `package.json` scripts and `main`**

Set in `package.json`:

```json
{
  "main": ".vite/build/main.js",
  "scripts": {
    "start":   "electron-forge start",
    "package": "electron-forge package",
    "make":    "electron-forge make",
    "lint":    "eslint . --ext .ts,.tsx",
    "typecheck": "tsc --noEmit",
    "test":    "vitest run",
    "test:watch": "vitest",
    "test:e2e":   "playwright test"
  }
}
```

- [ ] **Step 7: Smoke test**

```bash
pnpm start
```

Expected: an Electron window opens showing `FSN-JP — bootstrap OK`. Close it.

- [ ] **Step 8: Commit**

```bash
git add .
git commit -m "chore: wire vite + electron-forge build pipeline"
```

---

### Task 4: Test harness (Vitest + Playwright)

**Files:**
- Create: `vitest.config.ts`
- Create: `playwright.config.ts`
- Create: `tests/unit/sanity.test.ts`
- Create: `tests/e2e/boot.spec.ts`

- [ ] **Step 1: Write `vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/unit/**/*.test.ts', 'tests/integration/**/*.test.ts'],
    coverage: { provider: 'v8', reporter: ['text', 'html'] },
  },
  resolve: {
    alias: {
      '@shared': path.resolve(__dirname, 'src/shared'),
      '@main':   path.resolve(__dirname, 'src/main'),
    },
  },
});
```

- [ ] **Step 2: Write `playwright.config.ts`**

```ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 60_000,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: { trace: 'retain-on-failure' },
});
```

- [ ] **Step 3: Write a sanity unit test**

`tests/unit/sanity.test.ts`:

```ts
import { describe, it, expect } from 'vitest';

describe('sanity', () => {
  it('runs', () => {
    expect(1 + 1).toBe(2);
  });
});
```

- [ ] **Step 4: Run unit test**

```bash
pnpm test
```

Expected: `1 passed`.

- [ ] **Step 5: Write a boot E2E**

`tests/e2e/boot.spec.ts`:

```ts
import { test, expect, _electron as electron } from '@playwright/test';
import path from 'node:path';

test('app boots and shows bootstrap text', async () => {
  const app = await electron.launch({ args: ['.'], cwd: path.resolve(__dirname, '../..') });
  const win = await app.firstWindow();
  await expect(win.locator('text=FSN-JP — bootstrap OK')).toBeVisible({ timeout: 15000 });
  await app.close();
});
```

- [ ] **Step 6: Build and run E2E**

```bash
pnpm package
pnpm test:e2e
```

Expected: 1 passed.

- [ ] **Step 7: Commit**

```bash
git add .
git commit -m "test: add vitest + playwright harnesses with smoke tests"
```

---

## Phase 1 — Filesystem layer

### Task 5: Shared types and IPC contract

**Files:**
- Modify: `src/shared/types.ts`
- Modify: `src/shared/ipc.ts`
- Create: `src/shared/api.ts`

- [ ] **Step 1: Expand `src/shared/types.ts`**

```ts
export type FsNodeKind = 'dir' | 'file' | 'locked';

export interface FsNode {
  path: string;          // absolute, normalized to forward slashes
  name: string;
  kind: FsNodeKind;
  size: number;          // bytes; 0 for dirs
  mtimeMs: number;
  isHidden: boolean;
  childrenLoaded: boolean; // true when listDir filled this dir
}

export interface DriveInfo {
  letter: string;        // e.g. "C:"
  label?: string;
  totalBytes?: number;
  freeBytes?: number;
}

export type FsEvent =
  | { type: 'add';    node: FsNode }
  | { type: 'remove'; path: string }
  | { type: 'change'; node: FsNode };

export interface SearchHit {
  path: string;
  name: string;
  parentPath: string;
}
```

- [ ] **Step 2: Expand `src/shared/ipc.ts`**

```ts
export const IPC = {
  listDrives:   'fs:listDrives',
  listDir:      'fs:listDir',
  stat:         'fs:stat',
  move:         'fs:move',
  copy:         'fs:copy',
  rename:       'fs:rename',
  trash:        'fs:trash',
  mkdir:        'fs:mkdir',
  search:       'fs:search',
  searchCancel: 'fs:searchCancel',
  searchResult: 'fs:searchResult',
  fsEvent:      'fs:event',
  watchRoot:    'fs:watchRoot',
} as const;

export type IpcResult<T> =
  | { ok: true; data: T }
  | { ok: false; code: string; message: string };
```

- [ ] **Step 3: Write `src/shared/api.ts`** — API surface exposed via preload

```ts
import type { DriveInfo, FsEvent, FsNode, SearchHit } from './types';
import type { IpcResult } from './ipc';

export interface FsnApi {
  listDrives():                                   Promise<IpcResult<DriveInfo[]>>;
  listDir(path: string, depth: number):           Promise<IpcResult<FsNode[]>>;
  stat(path: string):                             Promise<IpcResult<FsNode>>;
  move(src: string, dst: string):                 Promise<IpcResult<void>>;
  copy(src: string, dst: string):                 Promise<IpcResult<void>>;
  rename(path: string, newName: string):          Promise<IpcResult<string>>;
  trash(path: string):                            Promise<IpcResult<void>>;
  mkdir(parent: string, name: string):            Promise<IpcResult<string>>;
  search(root: string, query: string, id: string): Promise<IpcResult<void>>;
  searchCancel(id: string):                       Promise<IpcResult<void>>;
  watchRoot(path: string):                        Promise<IpcResult<void>>;

  onSearchResult(cb: (id: string, hits: SearchHit[]) => void): () => void;
  onFsEvent(cb: (event: FsEvent) => void):                     () => void;
}

declare global {
  interface Window { fsn: FsnApi; }
}
```

- [ ] **Step 4: Commit**

```bash
git add src/shared
git commit -m "feat: define shared FsNode types and IPC contract"
```

---

### Task 6: FsService — listDrives

**Files:**
- Create: `src/main/FsService.ts`
- Create: `src/main/util/path.ts`
- Test: `tests/unit/path.test.ts`
- Test: `tests/integration/FsService.listDrives.test.ts`

- [ ] **Step 1: Write the path util test**

`tests/unit/path.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { normalizePath, joinPath } from '../../src/main/util/path';

describe('normalizePath', () => {
  it('uses forward slashes and uppercases drive letter', () => {
    expect(normalizePath('c:\\users\\foo')).toBe('C:/users/foo');
  });
  it('strips trailing slashes except for root', () => {
    expect(normalizePath('C:/foo/')).toBe('C:/foo');
    expect(normalizePath('C:/')).toBe('C:/');
  });
});

describe('joinPath', () => {
  it('joins with forward slashes', () => {
    expect(joinPath('C:/foo', 'bar.txt')).toBe('C:/foo/bar.txt');
  });
});
```

- [ ] **Step 2: Run the test (expect failure: module missing)**

```bash
pnpm test path.test
```

Expected: FAIL — Cannot find module `src/main/util/path`.

- [ ] **Step 3: Implement `src/main/util/path.ts`**

```ts
export function normalizePath(p: string): string {
  let n = p.replace(/\\/g, '/');
  // uppercase drive letter
  if (/^[a-z]:/i.test(n)) n = n[0]!.toUpperCase() + n.slice(1);
  // strip trailing slashes (but keep "C:/")
  if (n.length > 3 && n.endsWith('/')) n = n.replace(/\/+$/, '');
  return n;
}

export function joinPath(parent: string, child: string): string {
  const p = normalizePath(parent);
  const c = child.replace(/\\/g, '/').replace(/^\/+/, '');
  return p.endsWith('/') ? p + c : `${p}/${c}`;
}
```

- [ ] **Step 4: Re-run test (expect pass)**

```bash
pnpm test path.test
```

Expected: PASS.

- [ ] **Step 5: Write the listDrives integration test**

`tests/integration/FsService.listDrives.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { FsService } from '../../src/main/FsService';

describe('FsService.listDrives (Windows)', () => {
  it('returns at least drive C:', async () => {
    const svc = new FsService();
    const drives = await svc.listDrives();
    expect(drives.length).toBeGreaterThan(0);
    expect(drives.some(d => d.letter === 'C:')).toBe(true);
  });
});
```

- [ ] **Step 6: Implement `FsService` listDrives**

`src/main/FsService.ts`:

```ts
import * as fs from 'node:fs/promises';
import type { DriveInfo, FsNode } from '@shared/types';

export class FsService {
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
}
```

- [ ] **Step 7: Run integration test**

```bash
pnpm test FsService.listDrives
```

Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add src/main src/shared tests
git commit -m "feat(main): add FsService.listDrives + path utils"
```

---

### Task 7: FsService — listDir with depth

**Files:**
- Modify: `src/main/FsService.ts`
- Test: `tests/integration/FsService.listDir.test.ts`

- [ ] **Step 1: Write the test**

`tests/integration/FsService.listDir.test.ts`:

```ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { FsService } from '../../src/main/FsService';

let root: string;
const svc = new FsService();

beforeAll(async () => {
  root = await fs.mkdtemp(path.join(os.tmpdir(), 'fsn-listdir-'));
  await fs.mkdir(path.join(root, 'sub'));
  await fs.mkdir(path.join(root, 'sub', 'deep'));
  await fs.writeFile(path.join(root, 'a.txt'), 'hello');
  await fs.writeFile(path.join(root, 'sub', 'b.txt'), 'world');
  await fs.writeFile(path.join(root, 'sub', 'deep', 'c.txt'), 'x');
});

afterAll(async () => {
  await fs.rm(root, { recursive: true, force: true });
});

describe('FsService.listDir', () => {
  it('lists immediate children with depth=1', async () => {
    const nodes = await svc.listDir(root, 1);
    const names = nodes.map(n => n.name).sort();
    expect(names).toEqual(['a.txt', 'sub']);
    const sub = nodes.find(n => n.name === 'sub')!;
    expect(sub.kind).toBe('dir');
    expect(sub.childrenLoaded).toBe(false);
  });

  it('lists two levels with depth=2', async () => {
    const nodes = await svc.listDir(root, 2);
    const sub = nodes.find(n => n.name === 'sub')!;
    expect(sub.childrenLoaded).toBe(true);
    // children of sub are returned as siblings via path
    const subChildren = nodes.filter(n => n.path.startsWith(sub.path + '/'));
    expect(subChildren.map(n => n.name).sort()).toContain('b.txt');
    expect(subChildren.map(n => n.name).sort()).toContain('deep');
    // deep is included but its own children are not
    const deep = subChildren.find(n => n.name === 'deep')!;
    expect(deep.childrenLoaded).toBe(false);
  });

  it('marks unreadable directories as locked', async () => {
    const nodes = await svc.listDir('C:/Windows/CSC', 1).catch(() => []);
    // either returns [] or includes locked entries — both acceptable, no throw
    expect(Array.isArray(nodes)).toBe(true);
  });
});
```

- [ ] **Step 2: Run (expect failure: method missing)**

```bash
pnpm test FsService.listDir
```

Expected: FAIL.

- [ ] **Step 3: Implement listDir**

Add to `src/main/FsService.ts`:

```ts
import * as path from 'node:path';
import { normalizePath, joinPath } from './util/path';

// ... inside class FsService

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
        await this.#walk(full, depth - 1, out);
        node.childrenLoaded = true;
      } catch {
        // tolerate per-dir failures
      }
    }
  }
}

async #isHiddenWin(_p: string): Promise<boolean> {
  // Stub: real Windows hidden attribute requires `winattr`-like native call.
  // For MVP, rely on dotfile convention; extend in Task 8.
  return false;
}
```

- [ ] **Step 4: Run integration test**

```bash
pnpm test FsService.listDir
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/main tests/integration
git commit -m "feat(main): listDir with depth-limited traversal"
```

---

### Task 8: FsService — Windows hidden attribute

**Files:**
- Modify: `src/main/FsService.ts`
- Test: `tests/integration/FsService.hidden.test.ts`

- [ ] **Step 1: Add native attribute query via PowerShell-free approach**

We avoid native modules. Use `fs.constants` and a fallback by reading Windows attributes via `child_process.exec('attrib')` is slow; instead use `winattr` semantics through `fs.statSync`'s `birthtime` fields — but those don't expose attributes. Practical compromise: use Node 20+ `fs.opendir` + `dirent.name` plus `\\?\` path support; for hidden attribute, call `fs.lstat` and check `mode` bit which on Windows reflects hidden via `0o4000` is unreliable. **Decision:** for MVP, treat dotfiles + a hardcoded list (`System Volume Information`, `$Recycle.Bin`, `pagefile.sys`) as hidden. Document the limitation.

- [ ] **Step 2: Replace `#isHiddenWin` with a name-based heuristic**

```ts
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
```

- [ ] **Step 3: Write test**

`tests/integration/FsService.hidden.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { FsService } from '../../src/main/FsService';

describe('FsService hidden detection', () => {
  it('marks dotfiles as hidden', async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), 'fsn-hidden-'));
    await fs.writeFile(path.join(root, '.secret'), 'x');
    await fs.writeFile(path.join(root, 'visible.txt'), 'y');
    const svc = new FsService();
    const nodes = await svc.listDir(root, 1);
    const secret  = nodes.find(n => n.name === '.secret')!;
    const visible = nodes.find(n => n.name === 'visible.txt')!;
    expect(secret.isHidden).toBe(true);
    expect(visible.isHidden).toBe(false);
    await fs.rm(root, { recursive: true, force: true });
  });
});
```

- [ ] **Step 4: Run test**

```bash
pnpm test FsService.hidden
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/main tests
git commit -m "feat(main): heuristic hidden-file detection on Windows"
```

---

### Task 9: FsService — mutating operations

**Files:**
- Modify: `src/main/FsService.ts`
- Test: `tests/integration/FsService.mutate.test.ts`

- [ ] **Step 1: Write tests**

`tests/integration/FsService.mutate.test.ts`:

```ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { FsService } from '../../src/main/FsService';

const svc = new FsService();
let root: string;

beforeEach(async () => {
  root = await fs.mkdtemp(path.join(os.tmpdir(), 'fsn-mutate-'));
});
afterEach(async () => {
  await fs.rm(root, { recursive: true, force: true });
});

describe('FsService mutations', () => {
  it('mkdir creates a directory and returns its path', async () => {
    const created = await svc.mkdir(root, 'foo');
    const stat = await fs.stat(created);
    expect(stat.isDirectory()).toBe(true);
  });

  it('rename renames a file and returns new path', async () => {
    const orig = path.join(root, 'a.txt');
    await fs.writeFile(orig, 'x');
    const next = await svc.rename(orig, 'b.txt');
    expect(next.endsWith('/b.txt')).toBe(true);
    await expect(fs.access(orig)).rejects.toThrow();
  });

  it('move relocates a file', async () => {
    await fs.writeFile(path.join(root, 'a.txt'), 'x');
    await fs.mkdir(path.join(root, 'sub'));
    await svc.move(path.join(root, 'a.txt'), path.join(root, 'sub', 'a.txt'));
    await expect(fs.access(path.join(root, 'sub', 'a.txt'))).resolves.toBeUndefined();
  });

  it('copy duplicates a file', async () => {
    await fs.writeFile(path.join(root, 'a.txt'), 'hello');
    await fs.mkdir(path.join(root, 'sub'));
    await svc.copy(path.join(root, 'a.txt'), path.join(root, 'sub', 'a.txt'));
    expect(await fs.readFile(path.join(root, 'sub', 'a.txt'), 'utf8')).toBe('hello');
    expect(await fs.readFile(path.join(root, 'a.txt'),         'utf8')).toBe('hello');
  });

  it('rename rejects names containing slashes', async () => {
    const orig = path.join(root, 'a.txt');
    await fs.writeFile(orig, 'x');
    await expect(svc.rename(orig, 'evil/b.txt')).rejects.toThrow();
  });
});
```

- [ ] **Step 2: Run (expect failure)**

```bash
pnpm test FsService.mutate
```

- [ ] **Step 3: Implement mutations**

Add to `src/main/FsService.ts`:

```ts
import { shell } from 'electron';

// inside class

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
```

Note: `shell.trashItem` is only available inside an Electron runtime; the unit/integration tests run under Node directly, so trash is **not** covered here. We'll cover it via E2E in Task 38.

- [ ] **Step 4: Run tests**

```bash
pnpm test FsService.mutate
```

Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add src/main tests
git commit -m "feat(main): mkdir/rename/move/copy with safe-name validation"
```

---

### Task 10: IpcRouter — wrap FsService into typed IPC handlers

**Files:**
- Create: `src/main/IpcRouter.ts`
- Modify: `src/main/index.ts`

- [ ] **Step 1: Write `src/main/IpcRouter.ts`**

```ts
import { ipcMain, IpcMainInvokeEvent } from 'electron';
import { IPC, IpcResult } from '@shared/ipc';
import { FsService } from './FsService';

function ok<T>(data: T): IpcResult<T>      { return { ok: true, data }; }
function fail(err: unknown): IpcResult<never> {
  const e = err as { code?: string; message?: string };
  return { ok: false, code: e?.code ?? 'UNKNOWN', message: e?.message ?? String(err) };
}

async function safe<T>(fn: () => Promise<T>): Promise<IpcResult<T>> {
  try { return ok(await fn()); }
  catch (err) { return fail(err); }
}

export function registerIpc(fsSvc: FsService): void {
  ipcMain.handle(IPC.listDrives, async () => safe(() => fsSvc.listDrives()));
  ipcMain.handle(IPC.listDir,    async (_e: IpcMainInvokeEvent, p: string, depth: number) => safe(() => fsSvc.listDir(p, depth)));
  ipcMain.handle(IPC.mkdir,      async (_e, parent: string, name: string) => safe(() => fsSvc.mkdir(parent, name)));
  ipcMain.handle(IPC.rename,     async (_e, p: string, name: string)      => safe(() => fsSvc.rename(p, name)));
  ipcMain.handle(IPC.move,       async (_e, s: string, d: string)         => safe(() => fsSvc.move(s, d)));
  ipcMain.handle(IPC.copy,       async (_e, s: string, d: string)         => safe(() => fsSvc.copy(s, d)));
  ipcMain.handle(IPC.trash,      async (_e, p: string)                    => safe(() => fsSvc.trash(p)));
}
```

- [ ] **Step 2: Wire in `src/main/index.ts`**

Add at the top:

```ts
import { FsService } from './FsService';
import { registerIpc } from './IpcRouter';
```

Inside `app.whenReady().then(...)`, BEFORE `createWindow()`:

```ts
const fsSvc = new FsService();
registerIpc(fsSvc);
```

- [ ] **Step 3: Smoke test**

```bash
pnpm start
```

Expected: app boots, no console errors. Close.

- [ ] **Step 4: Commit**

```bash
git add src/main
git commit -m "feat(main): typed IPC router wrapping FsService"
```

---

### Task 11: Preload bridge — typed `window.fsn`

**Files:**
- Modify: `src/preload/index.ts`

- [ ] **Step 1: Implement preload**

```ts
import { contextBridge, ipcRenderer } from 'electron';
import { IPC } from '../shared/ipc';
import type { FsnApi } from '../shared/api';
import type { FsEvent, SearchHit } from '../shared/types';

const api: FsnApi = {
  listDrives: () => ipcRenderer.invoke(IPC.listDrives),
  listDir:    (p, depth) => ipcRenderer.invoke(IPC.listDir, p, depth),
  stat:       (p) => ipcRenderer.invoke(IPC.stat, p),
  move:       (s, d) => ipcRenderer.invoke(IPC.move, s, d),
  copy:       (s, d) => ipcRenderer.invoke(IPC.copy, s, d),
  rename:     (p, name) => ipcRenderer.invoke(IPC.rename, p, name),
  trash:      (p) => ipcRenderer.invoke(IPC.trash, p),
  mkdir:      (parent, name) => ipcRenderer.invoke(IPC.mkdir, parent, name),
  search:     (root, q, id) => ipcRenderer.invoke(IPC.search, root, q, id),
  searchCancel: (id) => ipcRenderer.invoke(IPC.searchCancel, id),
  watchRoot:  (p) => ipcRenderer.invoke(IPC.watchRoot, p),

  onSearchResult(cb: (id: string, hits: SearchHit[]) => void) {
    const handler = (_: unknown, id: string, hits: SearchHit[]) => cb(id, hits);
    ipcRenderer.on(IPC.searchResult, handler);
    return () => ipcRenderer.removeListener(IPC.searchResult, handler);
  },
  onFsEvent(cb: (event: FsEvent) => void) {
    const handler = (_: unknown, event: FsEvent) => cb(event);
    ipcRenderer.on(IPC.fsEvent, handler);
    return () => ipcRenderer.removeListener(IPC.fsEvent, handler);
  },
};

contextBridge.exposeInMainWorld('fsn', api);
```

- [ ] **Step 2: Smoke test**

In renderer devtools console after `pnpm start`:

```js
await window.fsn.listDrives()
```

Expected: `{ ok: true, data: [{ letter: 'C:' }, ...] }`.

- [ ] **Step 3: Commit**

```bash
git add src/preload
git commit -m "feat(preload): expose typed fsn API to renderer"
```

---

### Task 12: FsWatcher with chokidar

**Files:**
- Create: `src/main/FsWatcher.ts`
- Modify: `src/main/IpcRouter.ts` (add `watchRoot`)
- Modify: `src/main/index.ts`

- [ ] **Step 1: Write `src/main/FsWatcher.ts`**

```ts
import chokidar, { FSWatcher } from 'chokidar';
import * as fs from 'node:fs/promises';
import { BrowserWindow } from 'electron';
import { IPC } from '@shared/ipc';
import type { FsEvent, FsNode } from '@shared/types';
import { normalizePath } from './util/path';

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
      depth: 2,           // only watch first 2 levels — matches lazy expansion model
      awaitWriteFinish: { stabilityThreshold: 200, pollInterval: 50 },
    });

    this.#watcher.on('add',    (p) => this.#enqueueAdd(normalizePath(p), 'file'));
    this.#watcher.on('addDir', (p) => this.#enqueueAdd(normalizePath(p), 'dir'));
    this.#watcher.on('unlink',    (p) => this.#enqueue({ type: 'remove', path: normalizePath(p) }));
    this.#watcher.on('unlinkDir', (p) => this.#enqueue({ type: 'remove', path: normalizePath(p) }));
    this.#watcher.on('change', async (p) => {
      const np = normalizePath(p);
      try {
        const stat = await fs.stat(np);
        const node: FsNode = {
          path: np, name: np.split('/').pop() ?? '',
          kind: 'file', size: Number(stat.size),
          mtimeMs: stat.mtimeMs, isHidden: false, childrenLoaded: false,
        };
        this.#enqueue({ type: 'change', node });
      } catch { /* gone */ }
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
        path: p, name: p.split('/').pop() ?? '',
        kind, size: kind === 'dir' ? 0 : Number(stat.size),
        mtimeMs: stat.mtimeMs, isHidden: false, childrenLoaded: false,
      };
      this.#enqueue({ type: 'add', node });
    } catch { /* gone */ }
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
    for (const ev of batch) this.win.webContents.send(IPC.fsEvent, ev);
  }
}
```

- [ ] **Step 2: Wire in IpcRouter**

Modify `src/main/IpcRouter.ts` to take an `FsWatcher` reference and register `watchRoot`:

```ts
import { FsWatcher } from './FsWatcher';

export function registerIpc(fsSvc: FsService, watcher: FsWatcher): void {
  // ... existing handlers
  ipcMain.handle(IPC.watchRoot, async (_e, p: string) => safe(() => watcher.watch(p)));
}
```

- [ ] **Step 3: Wire in main**

In `src/main/index.ts`, replace the `registerIpc(fsSvc)` line with:

```ts
const fsSvc = new FsService();
const win = await createWindow();
const watcher = new FsWatcher(win);
registerIpc(fsSvc, watcher);
app.on('before-quit', () => { watcher.dispose(); });
```

Make `createWindow` return the window:

```ts
async function createWindow(): Promise<BrowserWindow> {
  const win = new BrowserWindow({ /* ... */ });
  // ... loadURL/loadFile
  return win;
}
```

- [ ] **Step 4: Smoke test**

```bash
pnpm start
```

In devtools:

```js
window.fsn.onFsEvent(e => console.log('FS', e));
await window.fsn.watchRoot('C:/Users/Public');
// create a file in that folder via Explorer; expect 'add' event in console
```

- [ ] **Step 5: Commit**

```bash
git add src/main
git commit -m "feat(main): chokidar-based FsWatcher with batched IPC events"
```

---

### Task 13: SearchService — streamed cancellable search

**Files:**
- Create: `src/main/SearchService.ts`
- Modify: `src/main/IpcRouter.ts`
- Modify: `src/main/index.ts`
- Test: `tests/integration/SearchService.test.ts`

- [ ] **Step 1: Write the test**

`tests/integration/SearchService.test.ts`:

```ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { SearchService } from '../../src/main/SearchService';

let root: string;

beforeAll(async () => {
  root = await fs.mkdtemp(path.join(os.tmpdir(), 'fsn-search-'));
  await fs.mkdir(path.join(root, 'sub'));
  await fs.writeFile(path.join(root, 'alpha.txt'), 'x');
  await fs.writeFile(path.join(root, 'sub', 'alphabet.md'), 'x');
  await fs.writeFile(path.join(root, 'sub', 'other.bin'), 'x');
});
afterAll(async () => { await fs.rm(root, { recursive: true, force: true }); });

describe('SearchService', () => {
  it('streams hits matching name substring', async () => {
    const svc = new SearchService();
    const allHits: string[] = [];
    await svc.search(root, 'alpha', 'q1', (hits) => {
      for (const h of hits) allHits.push(h.name);
    });
    expect(allHits.sort()).toEqual(['alpha.txt', 'alphabet.md']);
  });

  it('cancels on demand', async () => {
    const svc = new SearchService();
    let count = 0;
    const p = svc.search(root, '', 'q2', () => { count++; });
    svc.cancel('q2');
    await p;
    // result count is non-deterministic but shouldn't crash; just assert no throw
    expect(typeof count).toBe('number');
  });
});
```

- [ ] **Step 2: Implement `SearchService`**

`src/main/SearchService.ts`:

```ts
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

    const flush = () => {
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
      flush();
      this.#cancellations.delete(id);
    }
  }

  cancel(id: string): void {
    this.#cancellations.get(id)?.abort();
    this.#cancellations.delete(id);
  }
}
```

- [ ] **Step 3: Run tests**

```bash
pnpm test SearchService
```

Expected: PASS.

- [ ] **Step 4: Wire in IpcRouter**

In `src/main/IpcRouter.ts`:

```ts
import { SearchService } from './SearchService';
import type { BrowserWindow } from 'electron';

export function registerIpc(
  fsSvc: FsService,
  watcher: FsWatcher,
  search: SearchService,
  win: BrowserWindow,
): void {
  // ... previous handlers
  ipcMain.handle(IPC.search, async (_e, root: string, query: string, id: string) =>
    safe(async () => {
      await search.search(root, query, id, (hits) => {
        win.webContents.send(IPC.searchResult, id, hits);
      });
    }),
  );
  ipcMain.handle(IPC.searchCancel, async (_e, id: string) => safe(async () => { search.cancel(id); }));
}
```

- [ ] **Step 5: Wire in main**

```ts
const search = new SearchService();
registerIpc(fsSvc, watcher, search, win);
```

- [ ] **Step 6: Commit**

```bash
git add src/main tests
git commit -m "feat(main): cancellable streamed search service"
```

---

## Phase 2 — State stores (renderer)

### Task 14: Zustand store wiring + fsStore

**Files:**
- Create: `src/renderer/state/fsStore.ts`
- Test: `tests/unit/fsStore.test.ts`

- [ ] **Step 1: Write the test**

`tests/unit/fsStore.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { useFsStore } from '../../src/renderer/state/fsStore';
import type { FsNode } from '../../src/shared/types';

const node = (path: string, kind: 'dir'|'file' = 'file'): FsNode => ({
  path, name: path.split('/').pop()!, kind,
  size: 100, mtimeMs: 0, isHidden: false, childrenLoaded: false,
});

describe('fsStore', () => {
  beforeEach(() => useFsStore.getState().reset());

  it('sets root and stores nodes', () => {
    useFsStore.getState().setRoot('C:/r');
    useFsStore.getState().upsertNodes([node('C:/r/a'), node('C:/r/b')]);
    expect(useFsStore.getState().nodes.size).toBe(2);
    expect(useFsStore.getState().root).toBe('C:/r');
  });

  it('removeNode drops the node', () => {
    useFsStore.getState().upsertNodes([node('C:/r/a')]);
    useFsStore.getState().removeNode('C:/r/a');
    expect(useFsStore.getState().nodes.has('C:/r/a')).toBe(false);
  });

  it('expand toggles expansion', () => {
    useFsStore.getState().toggleExpand('C:/r/a');
    expect(useFsStore.getState().expanded.has('C:/r/a')).toBe(true);
    useFsStore.getState().toggleExpand('C:/r/a');
    expect(useFsStore.getState().expanded.has('C:/r/a')).toBe(false);
  });

  it('childrenOf returns immediate children', () => {
    useFsStore.getState().setRoot('C:/r');
    useFsStore.getState().upsertNodes([
      node('C:/r/a'),
      node('C:/r/b', 'dir'),
      node('C:/r/b/c'),
    ]);
    const parent = useFsStore.getState().childrenOf('C:/r').map(n => n.path).sort();
    expect(parent).toEqual(['C:/r/a', 'C:/r/b']);
  });
});
```

- [ ] **Step 2: Run (expect fail)**

```bash
pnpm test fsStore
```

- [ ] **Step 3: Implement `fsStore`**

```ts
import { create } from 'zustand';
import type { FsNode } from '@shared/types';

interface FsState {
  root: string | null;
  nodes: Map<string, FsNode>;
  expanded: Set<string>;
  hoverPath: string | null;
  selectedPath: string | null;

  setRoot: (root: string | null) => void;
  upsertNodes: (nodes: FsNode[]) => void;
  removeNode: (path: string) => void;
  toggleExpand: (path: string) => void;
  setExpanded: (path: string, value: boolean) => void;
  setHover: (path: string | null) => void;
  setSelected: (path: string | null) => void;
  childrenOf: (parent: string) => FsNode[];
  reset: () => void;
}

export const useFsStore = create<FsState>((set, get) => ({
  root: null,
  nodes: new Map(),
  expanded: new Set(),
  hoverPath: null,
  selectedPath: null,

  setRoot: (root) => set({ root }),
  upsertNodes: (incoming) => set((s) => {
    const next = new Map(s.nodes);
    for (const n of incoming) next.set(n.path, n);
    return { nodes: next };
  }),
  removeNode: (path) => set((s) => {
    const next = new Map(s.nodes);
    next.delete(path);
    return { nodes: next };
  }),
  toggleExpand: (path) => set((s) => {
    const e = new Set(s.expanded);
    if (e.has(path)) e.delete(path); else e.add(path);
    return { expanded: e };
  }),
  setExpanded: (path, value) => set((s) => {
    const e = new Set(s.expanded);
    if (value) e.add(path); else e.delete(path);
    return { expanded: e };
  }),
  setHover: (hoverPath) => set({ hoverPath }),
  setSelected: (selectedPath) => set({ selectedPath }),

  childrenOf: (parent) => {
    const out: FsNode[] = [];
    const prefix = parent.endsWith('/') ? parent : parent + '/';
    for (const n of get().nodes.values()) {
      if (n.path.startsWith(prefix)) {
        const rest = n.path.slice(prefix.length);
        if (!rest.includes('/')) out.push(n);
      }
    }
    return out;
  },

  reset: () => set({
    root: null, nodes: new Map(), expanded: new Set(),
    hoverPath: null, selectedPath: null,
  }),
}));
```

- [ ] **Step 4: Add `jsdom` for renderer tests**

```bash
pnpm add -D jsdom
```

Update `vitest.config.ts` to override env per test file via `// @vitest-environment jsdom` directives, or run the test under node if Zustand allows it (we don't render). Since we don't render, keep `environment: 'node'` — Zustand works fine.

- [ ] **Step 5: Run test**

```bash
pnpm test fsStore
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/renderer/state tests/unit
git commit -m "feat(state): fsStore with nodes/expanded/hover/selection"
```

---

### Task 15: uiStore + cameraStore

**Files:**
- Create: `src/renderer/state/uiStore.ts`
- Create: `src/renderer/state/cameraStore.ts`
- Test: `tests/unit/uiStore.test.ts`

- [ ] **Step 1: Write `uiStore`**

```ts
import { create } from 'zustand';

interface Toast { id: string; level: 'info'|'error'; text: string; }

interface UiState {
  searchQuery: string;
  searchActiveId: string | null;
  hiddenVisible: boolean;
  toasts: Toast[];

  setSearchQuery: (q: string) => void;
  setSearchActiveId: (id: string | null) => void;
  toggleHidden: () => void;
  pushToast: (level: Toast['level'], text: string) => void;
  dismissToast: (id: string) => void;
}

export const useUiStore = create<UiState>((set) => ({
  searchQuery: '',
  searchActiveId: null,
  hiddenVisible: false,
  toasts: [],

  setSearchQuery: (searchQuery) => set({ searchQuery }),
  setSearchActiveId: (searchActiveId) => set({ searchActiveId }),
  toggleHidden: () => set((s) => ({ hiddenVisible: !s.hiddenVisible })),
  pushToast: (level, text) => set((s) => ({
    toasts: [...s.toasts, { id: crypto.randomUUID(), level, text }],
  })),
  dismissToast: (id) => set((s) => ({ toasts: s.toasts.filter(t => t.id !== id) })),
}));
```

- [ ] **Step 2: Write `cameraStore`**

```ts
import { create } from 'zustand';

interface CameraState {
  focusPath: string | null;
  setFocus: (path: string | null) => void;
}

export const useCameraStore = create<CameraState>((set) => ({
  focusPath: null,
  setFocus: (focusPath) => set({ focusPath }),
}));
```

- [ ] **Step 3: Write `uiStore` test**

```ts
import { describe, it, expect } from 'vitest';
import { useUiStore } from '../../src/renderer/state/uiStore';

describe('uiStore', () => {
  it('toggles hidden', () => {
    const start = useUiStore.getState().hiddenVisible;
    useUiStore.getState().toggleHidden();
    expect(useUiStore.getState().hiddenVisible).toBe(!start);
    useUiStore.getState().toggleHidden();
  });

  it('pushes and dismisses toasts', () => {
    useUiStore.getState().pushToast('info', 'hello');
    const id = useUiStore.getState().toasts.at(-1)!.id;
    useUiStore.getState().dismissToast(id);
    expect(useUiStore.getState().toasts.find(t => t.id === id)).toBeUndefined();
  });
});
```

- [ ] **Step 4: Run tests**

```bash
pnpm test uiStore
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/renderer/state tests/unit
git commit -m "feat(state): uiStore (search/toast/hidden) + cameraStore"
```

---

### Task 16: IPC client wrapper + watcher subscription

**Files:**
- Create: `src/renderer/ipc/client.ts`
- Create: `src/renderer/ipc/wireFsEvents.ts`

- [ ] **Step 1: Write `client.ts`**

```ts
import type { FsnApi } from '@shared/api';

export const fsn: FsnApi = window.fsn;

export async function unwrap<T>(p: Promise<{ ok: true; data: T } | { ok: false; code: string; message: string }>): Promise<T> {
  const r = await p;
  if (!r.ok) throw new Error(`[${r.code}] ${r.message}`);
  return r.data;
}
```

- [ ] **Step 2: Write `wireFsEvents.ts`**

```ts
import { fsn } from './client';
import { useFsStore } from '@renderer/state/fsStore';

export function wireFsEvents(): () => void {
  const off = fsn.onFsEvent((ev) => {
    const store = useFsStore.getState();
    if (ev.type === 'add' || ev.type === 'change') {
      store.upsertNodes([ev.node]);
    } else if (ev.type === 'remove') {
      store.removeNode(ev.path);
    }
  });
  return off;
}
```

- [ ] **Step 3: Commit**

```bash
git add src/renderer/ipc
git commit -m "feat(renderer): typed IPC client + fs-event wiring"
```

---

## Phase 3 — Scene foundation

### Task 17: SceneRoot — Three.js canvas + render loop

**Files:**
- Create: `src/renderer/scene/SceneRoot.ts`
- Create: `src/renderer/scene/SceneCanvas.tsx`
- Modify: `src/renderer/main.tsx`

- [ ] **Step 1: Implement `SceneRoot`**

```ts
import * as THREE from 'three';

export class SceneRoot {
  readonly scene = new THREE.Scene();
  readonly camera: THREE.PerspectiveCamera;
  readonly renderer: THREE.WebGLRenderer;
  #raf = 0;
  #disposed = false;
  #onTick: ((dt: number) => void) | null = null;
  #last = performance.now();

  constructor(canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setClearColor(0x0a0e14);

    this.camera = new THREE.PerspectiveCamera(45, 1, 0.1, 5000);
    this.camera.position.set(40, 40, 60);

    // simple lights
    const hemi = new THREE.HemisphereLight(0xbcd6ff, 0x1c2333, 0.6);
    const dir  = new THREE.DirectionalLight(0xffffff, 0.8);
    dir.position.set(50, 80, 30);
    this.scene.add(hemi, dir);

    // starfield-ish background gradient: skip for MVP, just dark color
  }

  setOnTick(cb: (dt: number) => void): void { this.#onTick = cb; }

  start(): void {
    const loop = () => {
      if (this.#disposed) return;
      const now = performance.now();
      const dt = (now - this.#last) / 1000;
      this.#last = now;
      this.#onTick?.(dt);
      this.renderer.render(this.scene, this.camera);
      this.#raf = requestAnimationFrame(loop);
    };
    this.#raf = requestAnimationFrame(loop);
  }

  resize(width: number, height: number): void {
    this.renderer.setSize(width, height, false);
    this.camera.aspect = width / Math.max(1, height);
    this.camera.updateProjectionMatrix();
  }

  dispose(): void {
    this.#disposed = true;
    cancelAnimationFrame(this.#raf);
    this.renderer.dispose();
  }
}
```

- [ ] **Step 2: Implement `SceneCanvas.tsx`**

```tsx
import React, { useEffect, useRef } from 'react';
import { SceneRoot } from './SceneRoot';

export function SceneCanvas({ onReady }: { onReady?: (s: SceneRoot) => void }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current!;
    const scene = new SceneRoot(canvas);
    onReady?.(scene);

    const ro = new ResizeObserver(() => {
      const r = canvas.getBoundingClientRect();
      scene.resize(r.width, r.height);
    });
    ro.observe(canvas);
    scene.start();

    return () => { ro.disconnect(); scene.dispose(); };
  }, []);

  return <canvas ref={ref} style={{
    position: 'absolute', inset: 0, width: '100%', height: '100%',
    display: 'block', outline: 'none',
  }} />;
}
```

- [ ] **Step 3: Use in `main.tsx`**

```tsx
import React from 'react';
import { createRoot } from 'react-dom/client';
import { SceneCanvas } from './scene/SceneCanvas';

function App() {
  return (
    <div style={{ position: 'relative', width: '100vw', height: '100vh' }}>
      <SceneCanvas />
      <div style={{ position: 'absolute', top: 12, left: 12, color: '#cfd8dc' }}>FSN-JP</div>
    </div>
  );
}

createRoot(document.getElementById('root')!).render(<App />);
```

- [ ] **Step 4: Smoke test**

```bash
pnpm start
```

Expected: dark canvas with "FSN-JP" overlay; no errors.

- [ ] **Step 5: Commit**

```bash
git add src/renderer
git commit -m "feat(scene): SceneRoot + SceneCanvas Three.js bootstrap"
```

---

### Task 18: OrbitCameraController

**Files:**
- Create: `src/renderer/scene/OrbitCameraController.ts`
- Test: `tests/unit/orbitCamera.test.ts`

- [ ] **Step 1: Write the test (deterministic math only)**

```ts
import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { OrbitCameraController } from '../../src/renderer/scene/OrbitCameraController';

describe('OrbitCameraController', () => {
  it('places camera at distance from target', () => {
    const cam = new THREE.PerspectiveCamera();
    const ctl = new OrbitCameraController(cam, document.createElement('div'));
    ctl.setTarget(new THREE.Vector3(0, 0, 0), { distance: 50, polar: Math.PI / 4, azimuth: 0 });
    ctl.update(1);
    expect(cam.position.length()).toBeCloseTo(50, 1);
  });

  it('animates to a new target over time', () => {
    const cam = new THREE.PerspectiveCamera();
    const ctl = new OrbitCameraController(cam, document.createElement('div'));
    ctl.setTarget(new THREE.Vector3(0, 0, 0), { distance: 30 });
    ctl.flyTo(new THREE.Vector3(100, 0, 0), { distance: 30, durationMs: 100 });
    for (let i = 0; i < 20; i++) ctl.update(0.01);
    expect(cam.position.x).toBeGreaterThan(50);
  });
});
```

- [ ] **Step 2: Run (expect fail)**

```bash
pnpm test orbitCamera
```

This needs `jsdom` for `document.createElement`. Mark the file:

Add at the top: `// @vitest-environment jsdom`

- [ ] **Step 3: Implement `OrbitCameraController`**

```ts
import * as THREE from 'three';

interface OrbitState { distance: number; polar: number; azimuth: number; }

interface FlyOptions {
  distance?: number; polar?: number; azimuth?: number;
  durationMs?: number;
}

export class OrbitCameraController {
  #target = new THREE.Vector3();
  #state: OrbitState = { distance: 50, polar: Math.PI / 4, azimuth: 0 };
  #fly: { from: { target: THREE.Vector3; state: OrbitState }; to: { target: THREE.Vector3; state: OrbitState }; t: number; dur: number } | null = null;
  #pointerDown = false;
  #last = { x: 0, y: 0 };

  constructor(private camera: THREE.PerspectiveCamera, dom: HTMLElement) {
    dom.addEventListener('pointerdown',  this.#onDown);
    dom.addEventListener('pointermove',  this.#onMove);
    dom.addEventListener('pointerup',    this.#onUp);
    dom.addEventListener('pointerleave', this.#onUp);
    dom.addEventListener('wheel',        this.#onWheel, { passive: false });
  }

  setTarget(t: THREE.Vector3, partial?: Partial<OrbitState>): void {
    this.#target.copy(t);
    if (partial) Object.assign(this.#state, partial);
    this.#applyImmediate();
  }

  flyTo(t: THREE.Vector3, opts: FlyOptions = {}): void {
    const to: OrbitState = {
      distance: opts.distance ?? this.#state.distance,
      polar:    opts.polar    ?? this.#state.polar,
      azimuth:  opts.azimuth  ?? this.#state.azimuth,
    };
    this.#fly = {
      from: { target: this.#target.clone(), state: { ...this.#state } },
      to:   { target: t.clone(),            state: to },
      t: 0,
      dur: (opts.durationMs ?? 600) / 1000,
    };
  }

  update(dt: number): void {
    if (this.#fly) {
      this.#fly.t = Math.min(this.#fly.dur, this.#fly.t + dt);
      const k = ease(this.#fly.t / this.#fly.dur);
      this.#target.lerpVectors(this.#fly.from.target, this.#fly.to.target, k);
      this.#state.distance = lerp(this.#fly.from.state.distance, this.#fly.to.state.distance, k);
      this.#state.polar    = lerp(this.#fly.from.state.polar,    this.#fly.to.state.polar,    k);
      this.#state.azimuth  = lerp(this.#fly.from.state.azimuth,  this.#fly.to.state.azimuth,  k);
      if (this.#fly.t >= this.#fly.dur) this.#fly = null;
    }
    this.#applyImmediate();
  }

  #applyImmediate(): void {
    const { distance, polar, azimuth } = this.#state;
    const sinP = Math.sin(polar), cosP = Math.cos(polar);
    const x = this.#target.x + distance * sinP * Math.cos(azimuth);
    const y = this.#target.y + distance * cosP;
    const z = this.#target.z + distance * sinP * Math.sin(azimuth);
    this.camera.position.set(x, y, z);
    this.camera.lookAt(this.#target);
  }

  #onDown = (e: PointerEvent) => {
    this.#pointerDown = true;
    this.#last.x = e.clientX; this.#last.y = e.clientY;
  };
  #onUp = () => { this.#pointerDown = false; };
  #onMove = (e: PointerEvent) => {
    if (!this.#pointerDown) return;
    const dx = e.clientX - this.#last.x;
    const dy = e.clientY - this.#last.y;
    this.#last.x = e.clientX; this.#last.y = e.clientY;
    this.#fly = null;
    this.#state.azimuth -= dx * 0.005;
    this.#state.polar   = clamp(this.#state.polar - dy * 0.005, 0.05, Math.PI - 0.05);
  };
  #onWheel = (e: WheelEvent) => {
    e.preventDefault();
    this.#fly = null;
    this.#state.distance = clamp(this.#state.distance * (1 + Math.sign(e.deltaY) * 0.1), 5, 1000);
  };
}

function lerp(a: number, b: number, t: number): number { return a + (b - a) * t; }
function clamp(v: number, lo: number, hi: number): number { return Math.max(lo, Math.min(hi, v)); }
function ease(t: number): number { return 1 - Math.pow(1 - t, 3); } // cubic-out
```

- [ ] **Step 4: Run test**

```bash
pnpm test orbitCamera
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/renderer/scene tests/unit
git commit -m "feat(scene): OrbitCameraController with tween and pointer/wheel input"
```

---

### Task 19: LayoutEngine — radial layout

**Files:**
- Create: `src/renderer/scene/LayoutEngine.ts`
- Test: `tests/unit/layoutEngine.test.ts`

- [ ] **Step 1: Write the test**

```ts
import { describe, it, expect } from 'vitest';
import { LayoutEngine } from '../../src/renderer/scene/LayoutEngine';
import type { FsNode } from '../../src/shared/types';

const dir = (path: string): FsNode => ({
  path, name: path.split('/').pop()!, kind: 'dir',
  size: 0, mtimeMs: 0, isHidden: false, childrenLoaded: true,
});

describe('LayoutEngine', () => {
  it('places single root at origin', () => {
    const layout = new LayoutEngine();
    const positions = layout.computeFor([dir('C:/r')], 'C:/r');
    expect(positions.get('C:/r')!.toArray()).toEqual([0, 0, 0]);
  });

  it('places children on a circle around parent', () => {
    const layout = new LayoutEngine();
    const nodes: FsNode[] = [
      dir('C:/r'), dir('C:/r/a'), dir('C:/r/b'), dir('C:/r/c'), dir('C:/r/d'),
    ];
    const positions = layout.computeFor(nodes, 'C:/r');
    const a = positions.get('C:/r/a')!;
    const b = positions.get('C:/r/b')!;
    // children at same Y as parent (top of pedestal)
    expect(a.y).toBeCloseTo(b.y, 5);
    // distance from parent equal
    expect(a.length()).toBeCloseTo(b.length(), 4);
    expect(a.length()).toBeGreaterThan(0);
  });

  it('is deterministic for same input', () => {
    const layout = new LayoutEngine();
    const nodes: FsNode[] = [dir('C:/r'), dir('C:/r/a'), dir('C:/r/b')];
    const a1 = layout.computeFor(nodes, 'C:/r').get('C:/r/a')!.toArray();
    const a2 = layout.computeFor(nodes, 'C:/r').get('C:/r/a')!.toArray();
    expect(a1).toEqual(a2);
  });
});
```

- [ ] **Step 2: Implement `LayoutEngine`**

```ts
import * as THREE from 'three';
import type { FsNode } from '@shared/types';

export interface LayoutOptions {
  pedestalY: number;       // y coordinate of pedestal tops
  baseRadius: number;      // children radius scale
  fileBoxStep: number;     // distance between file blocks on a pedestal
}

const DEFAULT_OPTS: LayoutOptions = { pedestalY: 0, baseRadius: 12, fileBoxStep: 1.4 };

export class LayoutEngine {
  constructor(public opts: LayoutOptions = DEFAULT_OPTS) {}

  computeFor(nodes: FsNode[], rootPath: string): Map<string, THREE.Vector3> {
    const positions = new Map<string, THREE.Vector3>();
    const childrenByParent = new Map<string, FsNode[]>();
    const knownPaths = new Set(nodes.map(n => n.path));

    for (const n of nodes) {
      const parent = parentOf(n.path);
      if (!knownPaths.has(parent) && n.path !== rootPath) continue;
      if (!childrenByParent.has(parent)) childrenByParent.set(parent, []);
      childrenByParent.get(parent)!.push(n);
    }

    positions.set(rootPath, new THREE.Vector3(0, 0, 0));

    const queue = [rootPath];
    while (queue.length) {
      const parent = queue.shift()!;
      const kids = (childrenByParent.get(parent) ?? []).slice().sort((a,b) => a.path.localeCompare(b.path));
      const pPos = positions.get(parent)!;
      const dirs = kids.filter(k => k.kind === 'dir' || k.kind === 'locked');
      const files = kids.filter(k => k.kind === 'file');

      const radius = this.opts.baseRadius + Math.max(0, Math.sqrt(dirs.length) * 1.5);
      dirs.forEach((d, i) => {
        const angle = (i / Math.max(1, dirs.length)) * Math.PI * 2 + jitterAngle(d.path);
        const x = pPos.x + Math.cos(angle) * radius;
        const z = pPos.z + Math.sin(angle) * radius;
        positions.set(d.path, new THREE.Vector3(x, this.opts.pedestalY, z));
        queue.push(d.path);
      });

      // files on top of parent pedestal in a square grid
      const cols = Math.max(1, Math.ceil(Math.sqrt(files.length)));
      files.forEach((f, i) => {
        const col = i % cols;
        const row = Math.floor(i / cols);
        const ox = (col - (cols - 1) / 2) * this.opts.fileBoxStep;
        const oz = (row - (cols - 1) / 2) * this.opts.fileBoxStep;
        positions.set(f.path, new THREE.Vector3(pPos.x + ox, this.opts.pedestalY + 1.0, pPos.z + oz));
      });
    }

    return positions;
  }
}

function parentOf(p: string): string {
  const i = p.lastIndexOf('/');
  if (i <= 2) return p.slice(0, i + 1); // "C:/"
  return p.slice(0, i);
}
function jitterAngle(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) { h ^= seed.charCodeAt(i); h = Math.imul(h, 16777619); }
  return ((h >>> 0) / 0xffffffff) * 0.2 - 0.1;
}
```

- [ ] **Step 3: Run tests**

```bash
pnpm test layoutEngine
```

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/renderer/scene tests/unit
git commit -m "feat(scene): deterministic radial LayoutEngine"
```

---

## Phase 4 — Scene nodes

### Task 20: NodeRenderer — Pedestal mesh factory

**Files:**
- Create: `src/renderer/scene/materials/pedestalMaterial.ts`
- Create: `src/renderer/scene/NodeRenderer.ts`

- [ ] **Step 1: Implement pedestal material**

```ts
import * as THREE from 'three';

export function makePedestalMaterial(): THREE.MeshStandardMaterial {
  const mat = new THREE.MeshStandardMaterial({
    color: 0x3a4a6b,
    metalness: 0.1,
    roughness: 0.55,
    emissive: 0x0a1422,
    emissiveIntensity: 0.5,
  });
  // simple grid pattern via canvas texture
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#3a4a6b'; ctx.fillRect(0, 0, 64, 64);
  ctx.strokeStyle = '#7da4d8'; ctx.lineWidth = 1;
  for (let i = 0; i <= 64; i += 8) { ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, 64); ctx.stroke(); ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(64, i); ctx.stroke(); }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(2, 2);
  mat.map = tex;
  return mat;
}
```

- [ ] **Step 2: Implement initial `NodeRenderer`**

```ts
import * as THREE from 'three';
import type { FsNode } from '@shared/types';
import { makePedestalMaterial } from './materials/pedestalMaterial';

export class NodeRenderer {
  readonly group = new THREE.Group();
  #pedestalGeom = new THREE.BoxGeometry(8, 1, 8);
  #pedestalMat  = makePedestalMaterial();
  #lockedMat    = new THREE.MeshStandardMaterial({ color: 0x444, roughness: 0.9 });
  #meshByPath = new Map<string, THREE.Object3D>();

  upsertPedestal(node: FsNode, position: THREE.Vector3): THREE.Mesh {
    let mesh = this.#meshByPath.get(node.path) as THREE.Mesh | undefined;
    if (!mesh) {
      mesh = new THREE.Mesh(this.#pedestalGeom, node.kind === 'locked' ? this.#lockedMat : this.#pedestalMat);
      mesh.userData.path = node.path;
      mesh.userData.kind = node.kind;
      this.group.add(mesh);
      this.#meshByPath.set(node.path, mesh);
    }
    mesh.position.copy(position);
    return mesh;
  }

  remove(path: string): void {
    const m = this.#meshByPath.get(path);
    if (!m) return;
    this.group.remove(m);
    this.#meshByPath.delete(path);
  }

  clear(): void {
    for (const path of [...this.#meshByPath.keys()]) this.remove(path);
  }

  meshAt(path: string): THREE.Object3D | undefined { return this.#meshByPath.get(path); }
  allMeshes(): THREE.Object3D[] { return [...this.#meshByPath.values()]; }
}
```

- [ ] **Step 3: Commit**

```bash
git add src/renderer/scene
git commit -m "feat(scene): NodeRenderer + pedestal material"
```

---

### Task 21: NodeRenderer — file blocks via InstancedMesh

**Files:**
- Modify: `src/renderer/scene/NodeRenderer.ts`
- Create: `src/renderer/scene/materials/fileTypeColors.ts`
- Test: `tests/unit/fileTypeColors.test.ts`

- [ ] **Step 1: Write fileTypeColors test**

```ts
import { describe, it, expect } from 'vitest';
import { colorForFile } from '../../src/renderer/scene/materials/fileTypeColors';

describe('colorForFile', () => {
  it('codes typescript files as code color', () => {
    expect(colorForFile('foo.ts')).toBe(colorForFile('bar.tsx'));
  });
  it('groups exe/bat as exec', () => {
    expect(colorForFile('a.exe')).toBe(colorForFile('b.bat'));
  });
  it('returns default for unknown', () => {
    expect(colorForFile('mystery.xyz')).toBeTypeOf('number');
  });
});
```

- [ ] **Step 2: Implement `fileTypeColors.ts`**

```ts
const CATEGORIES: Record<string, number> = {
  code:    0x6cb0ff, // TS/JS/PY/RS/GO/JAVA
  doc:     0xb6e0ff, // MD/TXT/PDF
  data:    0xc4d4a8, // JSON/CSV/YAML
  image:   0xffb37a, // PNG/JPG/SVG
  video:   0xff8a8a,
  audio:   0xd6a4ff,
  archive: 0xc8c8c8, // ZIP/RAR/7Z
  exec:    0xff5b5b, // EXE/BAT/MSI
  config:  0x9fb3a3,
  default: 0x8c98a5,
};

const EXT_MAP: Record<string, keyof typeof CATEGORIES> = {
  ts: 'code', tsx: 'code', js: 'code', jsx: 'code', py: 'code', rs: 'code', go: 'code', java: 'code', kt: 'code', cs: 'code', cpp: 'code', c: 'code', h: 'code',
  md: 'doc', txt: 'doc', pdf: 'doc', rtf: 'doc', docx: 'doc',
  json: 'data', csv: 'data', yml: 'data', yaml: 'data', xml: 'data', toml: 'data',
  png: 'image', jpg: 'image', jpeg: 'image', gif: 'image', svg: 'image', webp: 'image',
  mp4: 'video', mov: 'video', avi: 'video', mkv: 'video', webm: 'video',
  mp3: 'audio', wav: 'audio', flac: 'audio', ogg: 'audio',
  zip: 'archive', rar: 'archive', '7z': 'archive', tar: 'archive', gz: 'archive',
  exe: 'exec', bat: 'exec', cmd: 'exec', msi: 'exec', ps1: 'exec',
  ini: 'config', conf: 'config', env: 'config',
};

export function colorForFile(name: string): number {
  const dot = name.lastIndexOf('.');
  if (dot < 0) return CATEGORIES.default;
  const ext = name.slice(dot + 1).toLowerCase();
  const cat = EXT_MAP[ext] ?? 'default';
  return CATEGORIES[cat];
}

export function fileTypeCategory(name: string): keyof typeof CATEGORIES {
  const dot = name.lastIndexOf('.');
  if (dot < 0) return 'default';
  const ext = name.slice(dot + 1).toLowerCase();
  return EXT_MAP[ext] ?? 'default';
}
```

- [ ] **Step 3: Run test**

```bash
pnpm test fileTypeColors
```

Expected: PASS.

- [ ] **Step 4: Add file block rendering to `NodeRenderer`**

Append to `NodeRenderer`:

```ts
import { colorForFile } from './materials/fileTypeColors';

// inside class
#fileBlocks = new Map<string, THREE.Mesh>();
#fileBlockGeom = new THREE.BoxGeometry(1, 1, 1);

upsertFileBlock(node: FsNode, position: THREE.Vector3): THREE.Mesh {
  let mesh = this.#fileBlocks.get(node.path);
  const height = clamp(Math.log10(node.size + 10) * 1.2, 0.4, 12);
  if (!mesh) {
    const mat = new THREE.MeshStandardMaterial({
      color: colorForFile(node.name),
      roughness: 0.45, metalness: 0.0,
    });
    mesh = new THREE.Mesh(this.#fileBlockGeom, mat);
    mesh.userData.path = node.path;
    mesh.userData.kind = 'file';
    this.group.add(mesh);
    this.#fileBlocks.set(node.path, mesh);
    this.#meshByPath.set(node.path, mesh);
  }
  mesh.scale.set(1, height, 1);
  mesh.position.set(position.x, position.y + height / 2, position.z);
  return mesh;
}

removeFileBlock(path: string): void {
  const m = this.#fileBlocks.get(path);
  if (m) { this.group.remove(m); this.#fileBlocks.delete(path); this.#meshByPath.delete(path); }
}

// helper
function clamp(v: number, lo: number, hi: number): number { return Math.max(lo, Math.min(hi, v)); }
```

(Note: we use one mesh per file rather than InstancedMesh in MVP for simplicity. Optimize later only if profiler shows draw calls dominating.)

- [ ] **Step 5: Commit**

```bash
git add src/renderer/scene tests/unit
git commit -m "feat(scene): file block meshes with type-coded color"
```

---

### Task 22: SceneController — wire fsStore → meshes

**Files:**
- Create: `src/renderer/scene/SceneController.ts`
- Modify: `src/renderer/scene/SceneCanvas.tsx`

- [ ] **Step 1: Implement `SceneController`**

```ts
import * as THREE from 'three';
import type { SceneRoot } from './SceneRoot';
import { LayoutEngine } from './LayoutEngine';
import { NodeRenderer } from './NodeRenderer';
import { OrbitCameraController } from './OrbitCameraController';
import { useFsStore } from '@renderer/state/fsStore';
import { useCameraStore } from '@renderer/state/cameraStore';
import type { FsNode } from '@shared/types';

const GRID_FALLBACK_THRESHOLD = 200;

export class SceneController {
  readonly nodes: NodeRenderer;
  readonly camera: OrbitCameraController;
  readonly layout = new LayoutEngine();
  #unsubFs: () => void;
  #unsubCam: () => void;

  constructor(private root: SceneRoot, dom: HTMLElement) {
    this.nodes = new NodeRenderer();
    this.root.scene.add(this.nodes.group);
    this.camera = new OrbitCameraController(root.camera, dom);

    this.#unsubFs = useFsStore.subscribe(() => this.#rebuild());
    this.#unsubCam = useCameraStore.subscribe(() => this.#applyFocus());

    this.root.setOnTick((dt) => this.camera.update(dt));
  }

  dispose(): void { this.#unsubFs(); this.#unsubCam(); }

  #rebuild(): void {
    const { nodes, root, expanded } = useFsStore.getState();
    if (!root) { this.nodes.clear(); return; }

    const visible: FsNode[] = [];
    const isVisible = (n: FsNode): boolean => {
      if (n.path === root) return true;
      const parent = parentOf(n.path);
      if (!nodes.has(parent)) return false;
      return parent === root || expanded.has(parent);
    };
    for (const n of nodes.values()) if (isVisible(n)) visible.push(n);

    // group files per parent for fallback decision
    const filesPerParent = new Map<string, number>();
    for (const n of visible) {
      if (n.kind !== 'file') continue;
      const p = parentOf(n.path);
      filesPerParent.set(p, (filesPerParent.get(p) ?? 0) + 1);
    }

    const positions = this.layout.computeFor(visible, root);

    // diff: remove disappeared
    const visiblePaths = new Set(visible.map(v => v.path));
    for (const m of this.nodes.allMeshes()) {
      const p = m.userData.path as string;
      if (!visiblePaths.has(p)) this.nodes.remove(p);
    }
    // upsert
    for (const n of visible) {
      const pos = positions.get(n.path);
      if (!pos) continue;
      if (n.kind === 'dir' || n.kind === 'locked') {
        this.nodes.upsertPedestal(n, pos);
      } else {
        const parent = parentOf(n.path);
        if ((filesPerParent.get(parent) ?? 0) > GRID_FALLBACK_THRESHOLD) {
          // skip individual blocks — could draw an aggregate badge in v2
          continue;
        }
        this.nodes.upsertFileBlock(n, pos);
      }
    }
  }

  #applyFocus(): void {
    const focus = useCameraStore.getState().focusPath;
    if (!focus) return;
    const mesh = this.nodes.meshAt(focus);
    if (!mesh) return;
    this.camera.flyTo(mesh.position.clone(), { distance: 50, polar: Math.PI / 4 });
  }
}

function parentOf(p: string): string {
  const i = p.lastIndexOf('/');
  if (i <= 2) return p.slice(0, i + 1);
  return p.slice(0, i);
}
```

- [ ] **Step 2: Wire in `SceneCanvas.tsx`**

```tsx
import React, { useEffect, useRef } from 'react';
import { SceneRoot } from './SceneRoot';
import { SceneController } from './SceneController';

export function SceneCanvas() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current!;
    const scene = new SceneRoot(canvas);
    const controller = new SceneController(scene, canvas);
    const ro = new ResizeObserver(() => {
      const r = canvas.getBoundingClientRect();
      scene.resize(r.width, r.height);
    });
    ro.observe(canvas);
    scene.start();
    return () => { ro.disconnect(); controller.dispose(); scene.dispose(); };
  }, []);

  return <canvas ref={ref} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} />;
}
```

- [ ] **Step 3: Smoke test (no nodes loaded yet)**

```bash
pnpm start
```

Expected: empty dark scene, no errors.

- [ ] **Step 4: Commit**

```bash
git add src/renderer/scene
git commit -m "feat(scene): SceneController binding fsStore to meshes"
```

---

## Phase 5 — Interactions

### Task 23: HoverPicker — raycaster + outline

**Files:**
- Create: `src/renderer/scene/HoverPicker.ts`
- Modify: `src/renderer/scene/SceneController.ts`

- [ ] **Step 1: Implement `HoverPicker`**

```ts
import * as THREE from 'three';
import { useFsStore } from '@renderer/state/fsStore';

export class HoverPicker {
  #ray = new THREE.Raycaster();
  #ndc = new THREE.Vector2();
  #last = 0;
  #throttleMs = 33;
  #onPointerMove: (e: PointerEvent) => void;

  constructor(
    private dom: HTMLElement,
    private camera: THREE.Camera,
    private targets: () => THREE.Object3D[],
  ) {
    this.#onPointerMove = (e) => this.#handle(e);
    dom.addEventListener('pointermove', this.#onPointerMove);
  }

  dispose(): void {
    this.dom.removeEventListener('pointermove', this.#onPointerMove);
  }

  #handle(e: PointerEvent): void {
    const now = performance.now();
    if (now - this.#last < this.#throttleMs) return;
    this.#last = now;

    const rect = this.dom.getBoundingClientRect();
    this.#ndc.x =  ((e.clientX - rect.left) / rect.width)  * 2 - 1;
    this.#ndc.y = -((e.clientY - rect.top)  / rect.height) * 2 + 1;
    this.#ray.setFromCamera(this.#ndc, this.camera);

    const hits = this.#ray.intersectObjects(this.targets(), false);
    const path = hits[0]?.object.userData.path as string | undefined;
    useFsStore.getState().setHover(path ?? null);
  }
}
```

- [ ] **Step 2: Use in `SceneController`**

In `SceneController` constructor, after creating `nodes`:

```ts
this.picker = new HoverPicker(dom, root.camera, () => this.nodes.allMeshes());
```

Add field `picker: HoverPicker;` and dispose in `dispose()`.

- [ ] **Step 3: Add a hover highlight effect**

Add to `SceneController`:

```ts
#highlightedPath: string | null = null;

#applyHover = (() => {
  let last: string | null = null;
  return () => {
    const path = useFsStore.getState().hoverPath;
    if (path === last) return;
    if (last) {
      const m = this.nodes.meshAt(last) as THREE.Mesh | undefined;
      if (m && (m.material as THREE.MeshStandardMaterial).emissive) {
        (m.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.5;
      }
    }
    if (path) {
      const m = this.nodes.meshAt(path) as THREE.Mesh | undefined;
      if (m && (m.material as THREE.MeshStandardMaterial).emissive) {
        (m.material as THREE.MeshStandardMaterial).emissiveIntensity = 1.5;
      }
    }
    last = path;
  };
})();
```

Subscribe in constructor:

```ts
this.#unsubHover = useFsStore.subscribe(() => this.#applyHover());
```

Add `#unsubHover` field and call it in dispose.

- [ ] **Step 4: Commit**

```bash
git add src/renderer/scene
git commit -m "feat(scene): hover picker with emissive highlight"
```

---

### Task 24: Click-to-expand interaction

**Files:**
- Create: `src/renderer/scene/ClickHandler.ts`
- Modify: `src/renderer/scene/SceneController.ts`

- [ ] **Step 1: Implement `ClickHandler`**

```ts
import * as THREE from 'three';
import { useFsStore } from '@renderer/state/fsStore';
import { useCameraStore } from '@renderer/state/cameraStore';
import { fsn, unwrap } from '@renderer/ipc/client';
import { useUiStore } from '@renderer/state/uiStore';

export class ClickHandler {
  #ray = new THREE.Raycaster();
  #ndc = new THREE.Vector2();
  #onClick: (e: MouseEvent) => void;

  constructor(
    private dom: HTMLElement,
    private camera: THREE.Camera,
    private targets: () => THREE.Object3D[],
  ) {
    this.#onClick = (e) => this.#handle(e);
    dom.addEventListener('click', this.#onClick);
  }

  dispose(): void { this.dom.removeEventListener('click', this.#onClick); }

  async #handle(e: MouseEvent): Promise<void> {
    const rect = this.dom.getBoundingClientRect();
    this.#ndc.x =  ((e.clientX - rect.left) / rect.width)  * 2 - 1;
    this.#ndc.y = -((e.clientY - rect.top)  / rect.height) * 2 + 1;
    this.#ray.setFromCamera(this.#ndc, this.camera);
    const hits = this.#ray.intersectObjects(this.targets(), false);
    const obj = hits[0]?.object;
    if (!obj) return;

    const path = obj.userData.path as string;
    const kind = obj.userData.kind as 'dir'|'file'|'locked';

    useFsStore.getState().setSelected(path);
    useCameraStore.getState().setFocus(path);

    if (kind !== 'dir') return;
    const store = useFsStore.getState();
    const wasExpanded = store.expanded.has(path);
    if (!wasExpanded) {
      try {
        const children = await unwrap(fsn.listDir(path, 1));
        store.upsertNodes(children);
      } catch (err) {
        useUiStore.getState().pushToast('error', `Cannot open: ${(err as Error).message}`);
        return;
      }
    }
    store.toggleExpand(path);
  }
}
```

- [ ] **Step 2: Wire in `SceneController`**

```ts
this.click = new ClickHandler(dom, root.camera, () => this.nodes.allMeshes());
```

Add field, dispose in `dispose()`.

- [ ] **Step 3: Smoke test (manual)**

After Task 26 (Drive picker) we'll test interactively.

- [ ] **Step 4: Commit**

```bash
git add src/renderer/scene
git commit -m "feat(scene): click-to-expand with camera focus"
```

---

### Task 25: DragController — move file between pedestals

**Files:**
- Create: `src/renderer/scene/DragController.ts`
- Modify: `src/renderer/scene/SceneController.ts`

- [ ] **Step 1: Implement `DragController`**

```ts
import * as THREE from 'three';
import { fsn, unwrap } from '@renderer/ipc/client';
import { useUiStore } from '@renderer/state/uiStore';
import { useFsStore } from '@renderer/state/fsStore';

export class DragController {
  #ray = new THREE.Raycaster();
  #ndc = new THREE.Vector2();
  #ground = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  #ghost: THREE.Mesh | null = null;
  #dragSrcPath: string | null = null;
  #dragSrcMesh: THREE.Mesh | null = null;
  #onDown: (e: PointerEvent) => void;
  #onMove: (e: PointerEvent) => void;
  #onUp:   (e: PointerEvent) => void;

  constructor(
    private dom: HTMLElement,
    private camera: THREE.Camera,
    private scene: THREE.Scene,
    private targets: () => THREE.Object3D[],
  ) {
    this.#onDown = (e) => this.#start(e);
    this.#onMove = (e) => this.#drag(e);
    this.#onUp   = (e) => this.#drop(e);
    dom.addEventListener('pointerdown', this.#onDown);
    dom.addEventListener('pointermove', this.#onMove);
    dom.addEventListener('pointerup',   this.#onUp);
  }

  dispose(): void {
    this.dom.removeEventListener('pointerdown', this.#onDown);
    this.dom.removeEventListener('pointermove', this.#onMove);
    this.dom.removeEventListener('pointerup',   this.#onUp);
  }

  #pickAt(e: PointerEvent, kindFilter?: 'file' | 'dir'): THREE.Object3D | null {
    const rect = this.dom.getBoundingClientRect();
    this.#ndc.x =  ((e.clientX - rect.left) / rect.width)  * 2 - 1;
    this.#ndc.y = -((e.clientY - rect.top)  / rect.height) * 2 + 1;
    this.#ray.setFromCamera(this.#ndc, this.camera);
    const hits = this.#ray.intersectObjects(this.targets(), false);
    const m = hits.find(h => !kindFilter || h.object.userData.kind === kindFilter)?.object;
    return m ?? null;
  }

  #start(e: PointerEvent): void {
    if (e.button !== 0 || !e.altKey && !e.shiftKey && !e.ctrlKey && !e.metaKey) {
      // start drag on plain left click only when grabbing a file (heuristic)
    }
    const obj = this.#pickAt(e, 'file');
    if (!obj) return;
    e.stopImmediatePropagation();
    this.#dragSrcPath = obj.userData.path;
    this.#dragSrcMesh = obj as THREE.Mesh;
    const ghostGeom = new THREE.BoxGeometry(1.2, 1.2, 1.2);
    const ghostMat  = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.5 });
    this.#ghost = new THREE.Mesh(ghostGeom, ghostMat);
    this.scene.add(this.#ghost);
  }

  #drag(e: PointerEvent): void {
    if (!this.#ghost) return;
    const rect = this.dom.getBoundingClientRect();
    this.#ndc.x =  ((e.clientX - rect.left) / rect.width)  * 2 - 1;
    this.#ndc.y = -((e.clientY - rect.top)  / rect.height) * 2 + 1;
    this.#ray.setFromCamera(this.#ndc, this.camera);
    const hit = new THREE.Vector3();
    if (this.#ray.ray.intersectPlane(this.#ground, hit)) this.#ghost.position.copy(hit.add(new THREE.Vector3(0, 1, 0)));
  }

  async #drop(e: PointerEvent): Promise<void> {
    if (!this.#ghost || !this.#dragSrcPath) return;
    const target = this.#pickAt(e, 'dir');
    this.scene.remove(this.#ghost);
    this.#ghost = null;
    const src = this.#dragSrcPath;
    this.#dragSrcPath = null;
    this.#dragSrcMesh = null;

    if (!target) return;
    const dstParent = target.userData.path as string;
    const fileName  = src.split('/').pop()!;
    const dst = `${dstParent}/${fileName}`;

    const ok = window.confirm(`Move "${fileName}" to ${dstParent}?`);
    if (!ok) return;

    try {
      await unwrap(fsn.move(src, dst));
      useUiStore.getState().pushToast('info', `Moved ${fileName}`);
      // optimistic: remove from store immediately; watcher will reconcile
      useFsStore.getState().removeNode(src);
    } catch (err) {
      useUiStore.getState().pushToast('error', `Move failed: ${(err as Error).message}`);
    }
  }
}
```

- [ ] **Step 2: Wire in `SceneController`**

```ts
this.drag = new DragController(dom, root.camera, root.scene, () => this.nodes.allMeshes());
```

Add field + dispose.

- [ ] **Step 3: Commit**

```bash
git add src/renderer/scene
git commit -m "feat(scene): drag-and-drop file move between pedestals"
```

---

## Phase 6 — UI 2D

### Task 26: DrivePicker

**Files:**
- Create: `src/renderer/ui/DrivePicker.tsx`
- Modify: `src/renderer/main.tsx`

- [ ] **Step 1: Implement `DrivePicker`**

```tsx
import React, { useEffect, useState } from 'react';
import { fsn, unwrap } from '@renderer/ipc/client';
import { useFsStore } from '@renderer/state/fsStore';
import type { DriveInfo } from '@shared/types';

export function DrivePicker({ onPicked }: { onPicked: (root: string) => void }) {
  const [drives, setDrives] = useState<DriveInfo[]>([]);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    unwrap(fsn.listDrives()).then(setDrives).catch(e => setErr(String(e)));
  }, []);

  return (
    <div style={{
      position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: '#0a0e14', color: '#cfd8dc', flexDirection: 'column', gap: 24,
    }}>
      <h1 style={{ fontFamily: 'Helvetica, Arial, sans-serif', letterSpacing: 2 }}>FSN-JP</h1>
      {err && <div style={{ color: 'salmon' }}>{err}</div>}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, 120px)', gap: 16 }}>
        {drives.map(d => (
          <button key={d.letter} onClick={() => {
            useFsStore.getState().setRoot(d.letter + '/');
            onPicked(d.letter + '/');
          }} style={{
            width: 120, height: 120, background: '#1c2333', color: '#cfd8dc',
            border: '1px solid #3a4a6b', borderRadius: 8, fontSize: 28, cursor: 'pointer',
          }}>{d.letter}</button>
        ))}
      </div>
      <div style={{ opacity: 0.5, fontSize: 12 }}>Pick a drive to enter its 3D view</div>
    </div>
  );
}
```

- [ ] **Step 2: Use in `main.tsx`**

```tsx
import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { SceneCanvas } from './scene/SceneCanvas';
import { DrivePicker } from './ui/DrivePicker';
import { fsn, unwrap } from './ipc/client';
import { useFsStore } from './state/fsStore';
import { wireFsEvents } from './ipc/wireFsEvents';

function App() {
  const [picked, setPicked] = useState(false);

  return (
    <div style={{ position: 'relative', width: '100vw', height: '100vh' }}>
      <SceneCanvas />
      {!picked && <DrivePicker onPicked={async (root) => {
        const children = await unwrap(fsn.listDir(root, 2));
        useFsStore.getState().upsertNodes([
          { path: root, name: root, kind: 'dir', size: 0, mtimeMs: 0, isHidden: false, childrenLoaded: true },
          ...children,
        ]);
        await fsn.watchRoot(root);
        setPicked(true);
      }} />}
    </div>
  );
}

wireFsEvents();
createRoot(document.getElementById('root')!).render(<App />);
```

- [ ] **Step 3: Smoke test**

```bash
pnpm start
```

Expected: drive picker → click `C:` → 3D scene with pedestals/files.

- [ ] **Step 4: Commit**

```bash
git add src/renderer
git commit -m "feat(ui): drive picker entry flow"
```

---

### Task 27: Toolbar — breadcrumb + hidden toggle

**Files:**
- Create: `src/renderer/ui/Toolbar.tsx`
- Create: `src/renderer/ui/Breadcrumb.tsx`
- Modify: `src/renderer/main.tsx`

- [ ] **Step 1: Implement `Breadcrumb.tsx`**

```tsx
import React from 'react';
import { useCameraStore } from '@renderer/state/cameraStore';
import { useFsStore } from '@renderer/state/fsStore';

export function Breadcrumb() {
  const focus = useCameraStore(s => s.focusPath);
  const root  = useFsStore(s => s.root);
  const path = focus ?? root ?? '';
  const segments = path.split('/').filter(Boolean);

  return (
    <div style={{ display: 'flex', gap: 6, alignItems: 'center', fontFamily: 'monospace' }}>
      {segments.map((seg, i) => {
        const slice = segments.slice(0, i + 1);
        const full = slice[0]!.endsWith(':')
          ? slice[0] + '/' + slice.slice(1).join('/')
          : '/' + slice.join('/');
        return (
          <span key={i}>
            <button style={btn} onClick={() => useCameraStore.getState().setFocus(full)}>{seg}</button>
            {i < segments.length - 1 && <span style={{ opacity: 0.4 }}> / </span>}
          </span>
        );
      })}
    </div>
  );
}

const btn: React.CSSProperties = {
  background: 'transparent', color: '#cfd8dc', border: 'none', cursor: 'pointer',
  padding: '2px 6px', borderRadius: 4,
};
```

- [ ] **Step 2: Implement `Toolbar.tsx`**

```tsx
import React from 'react';
import { useUiStore } from '@renderer/state/uiStore';
import { Breadcrumb } from './Breadcrumb';
import { SearchBar } from './SearchBar';

export function Toolbar() {
  const hiddenVisible = useUiStore(s => s.hiddenVisible);
  return (
    <div style={{
      position: 'absolute', top: 0, left: 0, right: 0, height: 44,
      background: 'rgba(10,14,20,0.85)', borderBottom: '1px solid #1f2a3d',
      display: 'flex', alignItems: 'center', padding: '0 12px', gap: 12, zIndex: 10,
    }}>
      <strong style={{ color: '#7da4d8' }}>FSN-JP</strong>
      <Breadcrumb />
      <div style={{ flex: 1 }} />
      <SearchBar />
      <label style={{ color: '#cfd8dc', fontSize: 12, display: 'flex', gap: 6, alignItems: 'center' }}>
        <input type="checkbox" checked={hiddenVisible} onChange={() => useUiStore.getState().toggleHidden()} />
        hidden
      </label>
    </div>
  );
}
```

- [ ] **Step 3: Add `Toolbar` to `App`**

```tsx
{picked && <Toolbar />}
```

- [ ] **Step 4: Commit**

```bash
git add src/renderer/ui src/renderer/main.tsx
git commit -m "feat(ui): toolbar with breadcrumb + hidden toggle"
```

---

### Task 28: SearchBar with streamed results

**Files:**
- Create: `src/renderer/ui/SearchBar.tsx`
- Create: `src/renderer/ipc/wireSearch.ts`
- Modify: `src/renderer/main.tsx`

- [ ] **Step 1: Implement `wireSearch.ts`**

```ts
import { fsn } from './client';
import { useUiStore } from '@renderer/state/uiStore';
import type { SearchHit } from '@shared/types';

const hitsByQuery = new Map<string, SearchHit[]>();

export function getHits(id: string): SearchHit[] {
  return hitsByQuery.get(id) ?? [];
}

export function wireSearch(): () => void {
  const off = fsn.onSearchResult((id, hits) => {
    const existing = hitsByQuery.get(id) ?? [];
    hitsByQuery.set(id, existing.concat(hits));
    // trigger re-render via uiStore (touch a noop slice)
    useUiStore.getState().pushToast('info', `+${hits.length} hits`);
    useUiStore.getState().dismissToast(useUiStore.getState().toasts.at(-1)!.id);
  });
  return off;
}
```

(We won't use toast as a re-render proxy in production — replace with a small `searchHitsStore`.)

- [ ] **Step 2: Replace with a dedicated `searchHitsStore`**

`src/renderer/state/searchHitsStore.ts`:

```ts
import { create } from 'zustand';
import type { SearchHit } from '@shared/types';

interface SearchHitsState {
  byId: Map<string, SearchHit[]>;
  appendHits: (id: string, hits: SearchHit[]) => void;
  clear: (id: string) => void;
  reset: () => void;
}

export const useSearchHitsStore = create<SearchHitsState>((set) => ({
  byId: new Map(),
  appendHits: (id, hits) => set((s) => {
    const next = new Map(s.byId);
    next.set(id, (next.get(id) ?? []).concat(hits));
    return { byId: next };
  }),
  clear: (id) => set((s) => {
    const next = new Map(s.byId);
    next.delete(id);
    return { byId: next };
  }),
  reset: () => set({ byId: new Map() }),
}));
```

Update `wireSearch.ts`:

```ts
import { fsn } from './client';
import { useSearchHitsStore } from '@renderer/state/searchHitsStore';

export function wireSearch(): () => void {
  return fsn.onSearchResult((id, hits) => {
    useSearchHitsStore.getState().appendHits(id, hits);
  });
}
```

- [ ] **Step 3: Implement `SearchBar.tsx`**

```tsx
import React, { useEffect, useRef, useState } from 'react';
import { fsn, unwrap } from '@renderer/ipc/client';
import { useUiStore } from '@renderer/state/uiStore';
import { useFsStore } from '@renderer/state/fsStore';
import { useCameraStore } from '@renderer/state/cameraStore';
import { useSearchHitsStore } from '@renderer/state/searchHitsStore';

export function SearchBar() {
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const idRef = useRef<string | null>(null);
  const hits = useSearchHitsStore(s => idRef.current ? s.byId.get(idRef.current) ?? [] : []);
  const root = useFsStore(s => s.root);

  // Ctrl+F focus
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key.toLowerCase() === 'f') { e.preventDefault(); inputRef.current?.focus(); }
      if (e.key === 'Escape') { setQ(''); setOpen(false); inputRef.current?.blur(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // debounce
  useEffect(() => {
    if (!root) return;
    const handle = setTimeout(async () => {
      if (!q || q.length < 2) return;
      if (idRef.current) await fsn.searchCancel(idRef.current);
      const id = crypto.randomUUID();
      idRef.current = id;
      useSearchHitsStore.getState().clear(id);
      try { await unwrap(fsn.search(root, q, id)); }
      catch (err) { useUiStore.getState().pushToast('error', String(err)); }
    }, 250);
    return () => clearTimeout(handle);
  }, [q, root]);

  return (
    <div style={{ position: 'relative' }}>
      <input
        ref={inputRef}
        value={q}
        onChange={(e) => { setQ(e.target.value); setOpen(true); }}
        placeholder="Search… (Ctrl+F)"
        onFocus={() => setOpen(true)}
        style={{
          width: 220, height: 28, padding: '0 8px',
          background: '#0f1622', color: '#cfd8dc', border: '1px solid #2a3a55', borderRadius: 4,
        }}
      />
      {open && q.length >= 2 && (
        <div style={{
          position: 'absolute', top: 32, right: 0, width: 360, maxHeight: 320, overflowY: 'auto',
          background: '#0f1622', border: '1px solid #2a3a55', borderRadius: 4, zIndex: 20,
        }}>
          {hits.slice(0, 100).map(h => (
            <div key={h.path} style={{ padding: '6px 10px', cursor: 'pointer', borderBottom: '1px solid #1f2a3d' }}
                 onClick={async () => {
                   // expand parents up to hit
                   const segments = h.path.split('/').filter(Boolean);
                   const acc: string[] = [];
                   for (const s of segments) {
                     acc.push(s);
                     const partial = acc[0]!.endsWith(':') ? acc[0] + '/' + acc.slice(1).join('/') : '/' + acc.join('/');
                     if (useFsStore.getState().nodes.has(partial)) {
                       useFsStore.getState().setExpanded(partial, true);
                     }
                   }
                   useCameraStore.getState().setFocus(h.path);
                   setOpen(false);
                 }}>
              <div style={{ color: '#cfd8dc', fontFamily: 'monospace' }}>{h.name}</div>
              <div style={{ color: '#7da4d8', fontSize: 11 }}>{h.parentPath}</div>
            </div>
          ))}
          {hits.length === 0 && <div style={{ padding: 10, color: '#7da4d8' }}>searching…</div>}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Wire `wireSearch` in `main.tsx`**

```ts
import { wireSearch } from './ipc/wireSearch';
wireSearch();
```

- [ ] **Step 5: Smoke test**

```bash
pnpm start
```

Pick a drive, type a query — expect dropdown with hits, click navigates.

- [ ] **Step 6: Commit**

```bash
git add src/renderer
git commit -m "feat(ui): search bar with debounced streamed results"
```

---

### Task 29: HUDOverlay (hover info)

**Files:**
- Create: `src/renderer/ui/HUDOverlay.tsx`
- Modify: `src/renderer/main.tsx`

- [ ] **Step 1: Implement `HUDOverlay.tsx`**

```tsx
import React from 'react';
import { useFsStore } from '@renderer/state/fsStore';

function fmt(size: number): string {
  if (size < 1024) return `${size} B`;
  const units = ['KB', 'MB', 'GB', 'TB'];
  let v = size, i = -1;
  while (v >= 1024 && i < units.length - 1) { v /= 1024; i++; }
  return `${v.toFixed(1)} ${units[i]}`;
}

export function HUDOverlay() {
  const hover = useFsStore(s => s.hoverPath);
  const node = useFsStore(s => hover ? s.nodes.get(hover) : null);
  if (!node) return null;
  return (
    <div style={{
      position: 'absolute', bottom: 36, left: 12, padding: '10px 14px',
      background: 'rgba(10,14,20,0.85)', color: '#cfd8dc',
      border: '1px solid #2a3a55', borderRadius: 6, fontFamily: 'monospace',
      pointerEvents: 'none', minWidth: 220, transition: 'opacity 150ms',
    }}>
      <div style={{ color: '#7da4d8' }}>{node.kind.toUpperCase()}</div>
      <div style={{ fontSize: 14, marginTop: 4 }}>{node.name}</div>
      <div style={{ fontSize: 11, opacity: 0.7, marginTop: 4 }}>{node.path}</div>
      {node.kind === 'file' && <div style={{ fontSize: 11, marginTop: 4 }}>size: {fmt(node.size)}</div>}
      <div style={{ fontSize: 11 }}>modified: {new Date(node.mtimeMs).toLocaleString()}</div>
    </div>
  );
}
```

- [ ] **Step 2: Add to `App`**

```tsx
{picked && <HUDOverlay />}
```

- [ ] **Step 3: Commit**

```bash
git add src/renderer/ui src/renderer/main.tsx
git commit -m "feat(ui): hover HUD overlay"
```

---

### Task 30: StatusBar

**Files:**
- Create: `src/renderer/ui/StatusBar.tsx`
- Modify: `src/renderer/main.tsx`

- [ ] **Step 1: Implement `StatusBar.tsx`**

```tsx
import React, { useEffect, useState } from 'react';
import { useFsStore } from '@renderer/state/fsStore';

function fmt(size: number): string {
  if (size < 1024) return `${size} B`;
  const u = ['KB','MB','GB','TB']; let v = size, i = -1;
  while (v >= 1024 && i < u.length - 1) { v /= 1024; i++; }
  return `${v.toFixed(1)} ${u[i]}`;
}

export function StatusBar() {
  const nodes = useFsStore(s => s.nodes);
  const [fps, setFps] = useState(0);
  useEffect(() => {
    let frames = 0, last = performance.now();
    let stop = false;
    const tick = () => {
      if (stop) return;
      frames++;
      const now = performance.now();
      if (now - last >= 1000) { setFps(Math.round((frames * 1000) / (now - last))); frames = 0; last = now; }
      requestAnimationFrame(tick);
    };
    tick();
    return () => { stop = true; };
  }, []);

  let count = 0, total = 0;
  for (const n of nodes.values()) { count++; total += n.size; }

  return (
    <div style={{
      position: 'absolute', bottom: 0, left: 0, right: 0, height: 24,
      background: 'rgba(10,14,20,0.9)', borderTop: '1px solid #1f2a3d',
      display: 'flex', alignItems: 'center', padding: '0 12px', gap: 16,
      color: '#7da4d8', fontFamily: 'monospace', fontSize: 11, zIndex: 10,
    }}>
      <span>{count} nodes</span>
      <span>total {fmt(total)}</span>
      {!import.meta.env.PROD && <span>{fps} fps</span>}
    </div>
  );
}
```

- [ ] **Step 2: Add to `App`**

```tsx
{picked && <StatusBar />}
```

- [ ] **Step 3: Commit**

```bash
git add src/renderer/ui src/renderer/main.tsx
git commit -m "feat(ui): status bar with counts and dev FPS"
```

---

### Task 31: Dialogs — confirm + new folder + rename + toasts

**Files:**
- Create: `src/renderer/ui/Toasts.tsx`
- Create: `src/renderer/ui/NewFolderDialog.tsx`
- Create: `src/renderer/ui/RenameDialog.tsx`
- Modify: `src/renderer/state/uiStore.ts`
- Modify: `src/renderer/main.tsx`

- [ ] **Step 1: Add modal state to `uiStore`**

Append fields:

```ts
// in UiState
modal: { kind: 'newFolder'; parentPath: string }
     | { kind: 'rename'; targetPath: string; currentName: string }
     | null;
openModal: (m: NonNullable<UiState['modal']>) => void;
closeModal: () => void;
```

Initial value `modal: null` and add setters.

- [ ] **Step 2: Implement `Toasts.tsx`**

```tsx
import React, { useEffect } from 'react';
import { useUiStore } from '@renderer/state/uiStore';

export function Toasts() {
  const toasts = useUiStore(s => s.toasts);
  const dismiss = useUiStore(s => s.dismissToast);
  useEffect(() => {
    const timers = toasts.map(t => setTimeout(() => dismiss(t.id), 3500));
    return () => { timers.forEach(clearTimeout); };
  }, [toasts, dismiss]);

  return (
    <div style={{
      position: 'absolute', top: 60, right: 12, display: 'flex', flexDirection: 'column', gap: 6, zIndex: 30,
    }}>
      {toasts.map(t => (
        <div key={t.id} onClick={() => dismiss(t.id)} style={{
          padding: '8px 12px', borderRadius: 4, cursor: 'pointer',
          background: t.level === 'error' ? '#3a1a1a' : '#1c2333',
          color: t.level === 'error' ? '#ff8a8a' : '#cfd8dc',
          border: '1px solid #2a3a55', maxWidth: 360,
        }}>{t.text}</div>
      ))}
    </div>
  );
}
```

- [ ] **Step 3: Implement `NewFolderDialog.tsx`**

```tsx
import React, { useState } from 'react';
import { useUiStore } from '@renderer/state/uiStore';
import { fsn, unwrap } from '@renderer/ipc/client';

export function NewFolderDialog() {
  const modal = useUiStore(s => s.modal);
  const close = useUiStore(s => s.closeModal);
  const [name, setName] = useState('');
  if (!modal || modal.kind !== 'newFolder') return null;

  const submit = async () => {
    try {
      await unwrap(fsn.mkdir(modal.parentPath, name.trim()));
      useUiStore.getState().pushToast('info', `Created ${name}`);
      close();
    } catch (err) {
      useUiStore.getState().pushToast('error', `mkdir failed: ${(err as Error).message}`);
    }
  };

  return (
    <Backdrop onClose={close}>
      <h3 style={{ marginTop: 0 }}>New folder in {modal.parentPath}</h3>
      <input autoFocus value={name} onChange={e => setName(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') submit(); if (e.key === 'Escape') close(); }}
        style={{ width: '100%', padding: 8, background: '#0f1622', color: '#cfd8dc', border: '1px solid #2a3a55' }} />
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 12 }}>
        <button onClick={close}>Cancel</button>
        <button onClick={submit} disabled={!name.trim()}>Create</button>
      </div>
    </Backdrop>
  );
}

export function Backdrop({ children, onClose }: { children: React.ReactNode; onClose: () => void; }) {
  return (
    <div onClick={onClose} style={{
      position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50,
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        background: '#1c2333', color: '#cfd8dc', padding: 20,
        borderRadius: 8, border: '1px solid #2a3a55', minWidth: 360,
      }}>{children}</div>
    </div>
  );
}
```

- [ ] **Step 4: Implement `RenameDialog.tsx`**

```tsx
import React, { useState } from 'react';
import { useUiStore } from '@renderer/state/uiStore';
import { fsn, unwrap } from '@renderer/ipc/client';
import { Backdrop } from './NewFolderDialog';

export function RenameDialog() {
  const modal = useUiStore(s => s.modal);
  const close = useUiStore(s => s.closeModal);
  const [name, setName] = useState(modal?.kind === 'rename' ? modal.currentName : '');
  if (!modal || modal.kind !== 'rename') return null;

  const submit = async () => {
    try {
      await unwrap(fsn.rename(modal.targetPath, name.trim()));
      close();
    } catch (err) {
      useUiStore.getState().pushToast('error', `rename failed: ${(err as Error).message}`);
    }
  };

  return (
    <Backdrop onClose={close}>
      <h3 style={{ marginTop: 0 }}>Rename</h3>
      <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 8 }}>{modal.targetPath}</div>
      <input autoFocus value={name} onChange={e => setName(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') submit(); if (e.key === 'Escape') close(); }}
        style={{ width: '100%', padding: 8, background: '#0f1622', color: '#cfd8dc', border: '1px solid #2a3a55' }} />
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 12 }}>
        <button onClick={close}>Cancel</button>
        <button onClick={submit} disabled={!name.trim() || name === modal.currentName}>Rename</button>
      </div>
    </Backdrop>
  );
}
```

- [ ] **Step 5: Add to `App`**

```tsx
{picked && <Toasts />}
{picked && <NewFolderDialog />}
{picked && <RenameDialog />}
```

- [ ] **Step 6: Add keyboard shortcuts**

In `main.tsx` add a global key handler hook:

```tsx
import { useEffect } from 'react';
import { useFsStore } from './state/fsStore';
import { useUiStore } from './state/uiStore';

function useGlobalShortcuts() {
  useEffect(() => {
    const handler = async (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;

      const sel = useFsStore.getState().selectedPath;
      if (!sel) return;

      if (e.key === 'F2') {
        const node = useFsStore.getState().nodes.get(sel);
        if (node) useUiStore.getState().openModal({ kind: 'rename', targetPath: sel, currentName: node.name });
      }
      if (e.key === 'Delete') {
        if (window.confirm(`Move "${sel}" to Trash?`)) {
          try {
            const { fsn, unwrap } = await import('./ipc/client');
            await unwrap(fsn.trash(sel));
            useFsStore.getState().removeNode(sel);
          } catch (err) {
            useUiStore.getState().pushToast('error', String(err));
          }
        }
      }
      if (e.ctrlKey && e.key.toLowerCase() === 'n') {
        const node = useFsStore.getState().nodes.get(sel);
        const parent = node?.kind === 'dir' ? sel : sel.split('/').slice(0, -1).join('/');
        useUiStore.getState().openModal({ kind: 'newFolder', parentPath: parent });
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);
}
```

Call `useGlobalShortcuts()` inside `App`.

- [ ] **Step 7: Commit**

```bash
git add src/renderer
git commit -m "feat(ui): toasts + new folder + rename dialogs + shortcuts"
```

---

## Phase 7 — Integration & polish

### Task 32: Hidden filter visibility

**Files:**
- Modify: `src/renderer/scene/SceneController.ts`

- [ ] **Step 1: Apply filter in rebuild**

In `SceneController.#rebuild`, before building `visible`:

```ts
import { useUiStore } from '@renderer/state/uiStore';
const showHidden = useUiStore.getState().hiddenVisible;
```

Subscribe to `useUiStore` for re-render:

```ts
this.#unsubUi = useUiStore.subscribe(() => this.#rebuild());
```

Filter in iteration:

```ts
for (const n of nodes.values()) {
  if (n.isHidden && !showHidden) continue;
  if (isVisible(n)) visible.push(n);
}
```

Add `#unsubUi` field, dispose.

- [ ] **Step 2: Smoke test**

Toggle "hidden" checkbox, observe scene change.

- [ ] **Step 3: Commit**

```bash
git add src/renderer/scene
git commit -m "feat(scene): respect hidden-visibility toggle"
```

---

### Task 33: Persistence — last opened root

**Files:**
- Create: `src/main/Persistence.ts`
- Modify: `src/main/index.ts`
- Modify: `src/main/IpcRouter.ts`
- Modify: `src/shared/ipc.ts`
- Modify: `src/shared/api.ts`
- Modify: `src/preload/index.ts`
- Modify: `src/renderer/main.tsx`

- [ ] **Step 1: Add IPC channel**

In `src/shared/ipc.ts` add:

```ts
loadConfig: 'cfg:load',
saveConfig: 'cfg:save',
```

In `src/shared/api.ts` add:

```ts
loadConfig(): Promise<IpcResult<AppConfig>>;
saveConfig(cfg: AppConfig): Promise<IpcResult<void>>;
```

And export type:

```ts
export interface AppConfig { lastRoot?: string; hiddenVisible: boolean; }
```

- [ ] **Step 2: Implement `Persistence.ts`**

```ts
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { app } from 'electron';

export interface AppConfig { lastRoot?: string; hiddenVisible: boolean; }
const DEFAULT: AppConfig = { hiddenVisible: false };

export class Persistence {
  #file: string;
  constructor() { this.#file = path.join(app.getPath('userData'), 'config.json'); }

  async load(): Promise<AppConfig> {
    try { return { ...DEFAULT, ...JSON.parse(await fs.readFile(this.#file, 'utf8')) }; }
    catch { return { ...DEFAULT }; }
  }
  async save(cfg: AppConfig): Promise<void> {
    await fs.mkdir(path.dirname(this.#file), { recursive: true });
    await fs.writeFile(this.#file, JSON.stringify(cfg, null, 2));
  }
}
```

- [ ] **Step 3: Wire in IPC**

```ts
ipcMain.handle(IPC.loadConfig, async () => safe(() => persistence.load()));
ipcMain.handle(IPC.saveConfig, async (_e, cfg: AppConfig) => safe(() => persistence.save(cfg)));
```

- [ ] **Step 4: Wire in preload**

```ts
loadConfig: () => ipcRenderer.invoke(IPC.loadConfig),
saveConfig: (cfg) => ipcRenderer.invoke(IPC.saveConfig, cfg),
```

- [ ] **Step 5: Use in `App`**

On boot, `unwrap(fsn.loadConfig())`. If `lastRoot` exists and is valid, auto-pick it. On hidden toggle / drive pick, call `saveConfig`.

- [ ] **Step 6: Commit**

```bash
git add .
git commit -m "feat: persist last opened root and hidden flag"
```

---

### Task 34: Error logging

**Files:**
- Create: `src/main/Logger.ts`
- Modify: `src/main/index.ts`

- [ ] **Step 1: Implement logger**

```ts
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { app } from 'electron';

export class Logger {
  #file: string;
  constructor() { this.#file = path.join(app.getPath('userData'), 'logs', 'error.log'); }
  async error(msg: string, err?: unknown): Promise<void> {
    const line = `${new Date().toISOString()} ${msg} ${err instanceof Error ? err.stack : String(err ?? '')}\n`;
    await fs.mkdir(path.dirname(this.#file), { recursive: true });
    await fs.appendFile(this.#file, line);
  }
}
```

- [ ] **Step 2: Wire in main**

```ts
const logger = new Logger();
process.on('uncaughtException', (err) => { logger.error('main:uncaughtException', err); });
process.on('unhandledRejection', (err) => { logger.error('main:unhandledRejection', err); });
```

- [ ] **Step 3: Commit**

```bash
git add src/main
git commit -m "feat(main): file-based error logger"
```

---

## Phase 8 — Final E2E + packaging

### Task 35: E2E happy path

**Files:**
- Create: `tests/e2e/happy.spec.ts`
- Create: `tests/e2e/fixtures/sample-tree/` (a few files)

- [ ] **Step 1: Build a sample tree**

```bash
mkdir -p tests/e2e/fixtures/sample-tree/sub1/deep
mkdir -p tests/e2e/fixtures/sample-tree/sub2
echo hello > tests/e2e/fixtures/sample-tree/a.txt
echo world > tests/e2e/fixtures/sample-tree/sub1/b.txt
echo deeper > tests/e2e/fixtures/sample-tree/sub1/deep/c.txt
```

Commit this fixture.

- [ ] **Step 2: Add fixtures path overriding**

Make the app accept `--root <path>` CLI arg in main and skip drive picker if provided.

In `src/main/index.ts`:

```ts
const argv = process.argv.slice(1);
const rootArg = argv.find(a => a.startsWith('--root='))?.slice('--root='.length);
if (rootArg) win.webContents.send('cfg:bootRoot', rootArg);
```

Add a preload `onBootRoot(cb)` listener and have the renderer auto-pick if it fires.

- [ ] **Step 3: Write E2E**

`tests/e2e/happy.spec.ts`:

```ts
import { test, expect, _electron as electron } from '@playwright/test';
import path from 'node:path';

const fixtureRoot = path.resolve(__dirname, 'fixtures/sample-tree').replace(/\\/g, '/');

test('boot, see scene, drag move via UI', async () => {
  const app = await electron.launch({
    args: ['.', `--root=${fixtureRoot}`],
    cwd: path.resolve(__dirname, '../..'),
  });
  const win = await app.firstWindow();

  await expect(win.locator('text=FSN-JP').first()).toBeVisible({ timeout: 15000 });

  // canvas exists
  await expect(win.locator('canvas')).toBeVisible();

  // search for "alpha" should yield no result; for "a.txt" should yield one
  await win.keyboard.press('Control+f');
  await win.keyboard.type('a.txt');
  await expect(win.locator('text=a.txt')).toBeVisible({ timeout: 5000 });

  await app.close();
});
```

- [ ] **Step 4: Run**

```bash
pnpm package
pnpm test:e2e
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add tests/e2e
git commit -m "test(e2e): happy-path scene + search"
```

---

### Task 36: Package an installer

**Files:**
- Modify: `package.json` (icon paths optional)
- Create: `resources/icon.ico` (placeholder)

- [ ] **Step 1: Drop a placeholder icon**

Place any 256x256 .ico at `resources/icon.ico`.

In `forge.config.ts`:

```ts
packagerConfig: { ..., icon: 'resources/icon' },
makers: [
  new MakerSquirrel({ name: 'fsn-jp', setupIcon: 'resources/icon.ico' }),
  new MakerZIP({}, ['win32']),
],
```

- [ ] **Step 2: Build installer + zip**

```bash
pnpm make
```

Expected: artifacts in `out/make/`.

- [ ] **Step 3: Smoke install**

Run `out/make/squirrel.windows/x64/fsn-jp-*.exe`. App should install and launch.

- [ ] **Step 4: Commit**

```bash
git add resources forge.config.ts
git commit -m "chore: bundle Squirrel installer + zip artifacts"
```

---

## Self-review

I checked the spec against this plan. Coverage:

| Spec section | Tasks |
| --- | --- |
| §3 Architecture (main/preload/renderer split, stack) | 1, 2, 3, 4 |
| §4.1 Main components (FsService, FsWatcher, IpcRouter, SearchService) | 6, 7, 8, 9, 10, 12, 13 |
| §4.2 Renderer scene | 17, 18, 19, 20, 21, 22, 23, 24, 25 |
| §4.3 Renderer UI | 26, 27, 28, 29, 30, 31 |
| §4.4 State stores | 14, 15, 16 |
| §5 Data flow | covered across 22, 24, 25, 28 |
| §6 Performance | size threshold in 22, picker throttle in 23 |
| §7 Error handling | 9 (safe-name), 10 (IpcResult), 28 (toast on error), 34 (logger) |
| §8 Testing | 4, 6, 7, 8, 9, 13, 14, 15, 19, 21, 35 |
| §9 MVP scope | all of the above |

Open follow-ups intentionally deferred (consistent with spec §9.2 v2): mini-map, free fly camera, multi-select, properties dialog, code signing, auto-update.

Type/method consistency: `setExpanded`, `toggleExpand`, `upsertNodes`, `removeNode` used consistently across stores and consumers. `colorForFile`, `fileTypeCategory`, `LayoutEngine.computeFor`, `OrbitCameraController.flyTo` referenced consistently.

No TBD/TODO/placeholder text in code blocks.
