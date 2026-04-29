# FSN-JP

A 3D file system explorer for Windows, inspired by **SGI's File System Navigator** — the iconic UNIX desktop demo seen in *Jurassic Park* ("It's a Unix system, I know this!"). FSN-JP renders directories as flat pedestals on a horizon-haze plane, lets you fly between them, drop markers like waypoints, and select files with an oblique cone of light.

> Built as a personal Electron + Three.js project. Windows-first; the design and tests assume Windows path semantics.

---

## Screenshots

*(Add `docs/screenshots/*.png` and reference them here. The peach-tan skydome + muted pedestal palette + ground connector lines look very different from a typical neon Tron demo — capture both an idle root view and a fly-in to a deep folder.)*

---

## Features

### Visual
- **Peach-tan skydome** with vertical gradient (zenith → horizon) and matching linear fog so distant pedestals dissolve into haze instead of fading to black.
- **FNV-1a hash-based pedestal palette** — 7 muted tones (dusty rose, beige, mauve, taupe, slate, olive-tan, sandstone) deterministically picked per path, so the same folder always wears the same colour.
- **File-type colouring** — code, doc, image, video, audio, archive, exec, config, default — emissive at low intensity so files glow gently without becoming neon.
- **Subtle UnrealBloom** on emissives only (strength 0.15).
- **Ground-plane connectors** — thin teal lines from each parent pedestal to its visible children, so the hierarchy is readable at a glance.

### Layout
- **Subtree-width packing tree** — each parent's children are laid out in a single row; sibling slots are sized recursively by subtree width, so expanding a folder full of grandchildren never collides with the next sibling's grid.
- **Files-on-pedestal** — small grid of file blocks centered on their parent directory's pedestal, with height proportional to `log10(size)`.
- **Hidden files toggle** — persisted in config.

### Camera & navigation
- **Horizontal-plane orbit** — polar constrained to ~70°–93° (slight downward look to just-below-horizontal), so you can never tumble vertically out of the scene.
- **Oblique flight arrival** — every focus flight (`flyTo`) settles to a fixed slightly-pitched polar (~16°) so navigation arrives at a consistent FSN-style angle.
- **Slider-driven flight speed** — UI slider maps to `defaultDurationMs` (200ms fast → 2000ms slow).
- **Wheel + slider zoom** — both edit the same `zoomLevel`; manual wheel writes back to the store so the slider tracks.
- **Speedometer** — top-right HUD showing live camera speed in units/sec, throttled to 5Hz to avoid re-render storms.

### Interaction
- **Single click** — select + focus (selection beam appears).
- **Double click** — directory expands and folds; file opens with the OS default handler.
- **Drag threshold** — pointer drag commits only after 4px movement, so single clicks aren't eaten by the drag controller.
- **Hover highlight** — emissive intensity boosted on a per-mesh material clone (shared materials are not mutated), with proper restore on hover-out.
- **Selection beam** — tilted cone-of-light pivot anchored at the pedestal top (~12° forward, ~3° lateral lean) plus a co-located SpotLight, just like the original SGI demo.
- **Markers** — yellow inverted cones above pedestals; add / recall (camera fly-to) / remove from the side panel; persisted in config.
- **Keyboard** — `F2` rename, `Delete` delete (with confirm dialog), `Ctrl+N` new folder, `F12` / `Ctrl+Shift+I` DevTools.

### Engineering
- **Selective Zustand subscriptions** via `subscribeWithSelector` — high-frequency hover and camera-tick state changes do not trigger structural rebuilds.
- **Idempotent rebuild loop** — only adds/removes the diff between the current scene and the new visible set; positions are reused when paths don't move.
- **Atomic config persistence** — temp file + rename, queued so concurrent saves serialize.
- **chokidar fs watcher** with `depth: 0`, ignored Windows system paths (`System Volume Information`, `$Recycle.Bin`, pagefile.sys, …) and `ignorePermissionErrors`, to survive being pointed at a drive root.
- **IPC envelope pattern** — `safe(fn)` wraps every IPC handler and returns `IpcResult<T>` with `{ok, value}` or `{ok: false, error}`, never letting an exception cross the bridge.

---

## Tech stack

| Layer       | Technology                              |
|-------------|-----------------------------------------|
| Shell       | Electron 30 + Forge plugin-vite          |
| Renderer    | React 18 + TypeScript 5 + Vite 5         |
| 3D          | Three.js 0.165 + EffectComposer/UnrealBloom |
| State       | Zustand 4 (`subscribeWithSelector`)      |
| FS watching | chokidar 3                               |
| Tests       | Vitest 1 + Playwright 1                  |
| Package mgr | pnpm 10 (`node-linker=hoisted`)          |
| Installer   | Squirrel.Windows + ZIP                   |

---

## Project structure

```
src/
├─ main/                       # Electron main process (Node)
│  ├─ index.ts                 # App entry, BrowserWindow, IPC wiring
│  ├─ FsService.ts             # listDir / openPath / mutate ops
│  ├─ FsWatcher.ts             # chokidar wrapper, drive-root-safe
│  ├─ SearchService.ts         # async filename search
│  ├─ Persistence.ts           # AppConfig load/save (atomic temp+rename)
│  ├─ IpcRouter.ts             # registers IPC channels with safe() envelopes
│  └─ Logger.ts                # error-only file logger
│
├─ renderer/
│  ├─ main.tsx                 # React root, boot/picker/activation flow
│  ├─ ipc/                     # preload-bridge wrappers + event wiring
│  ├─ scene/                   # All Three.js code lives here
│  │  ├─ SceneRoot.ts          # WebGLRenderer, composer, sky, fog, grid
│  │  ├─ SceneController.ts    # subscribes to stores, drives renderers
│  │  ├─ LayoutEngine.ts       # subtree-width packing tree layout
│  │  ├─ NodeRenderer.ts       # pedestals + file blocks (per-path mat cache)
│  │  ├─ LabelRenderer.ts      # canvas-textured sprites under pedestals
│  │  ├─ ConnectorRenderer.ts  # ground-plane parent→child line segments
│  │  ├─ MarkerRenderer.ts     # yellow inverted cones above pedestals
│  │  ├─ SelectionBeam.ts      # oblique cone-of-light + SpotLight
│  │  ├─ Skydome.ts            # peach-gradient inverted sphere
│  │  ├─ OrbitCameraController.ts  # horizontal-plane orbit + flyTo + telemetry
│  │  ├─ HoverPicker / ClickHandler / DragController
│  │  └─ materials/            # pedestal palette + file-type colours
│  ├─ state/                   # Zustand stores (fs, camera, ui, markers, search)
│  ├─ ui/                      # React overlays (toolbar, sidepanel, hud, dialogs)
│  └─ util/paths.ts            # path helpers (Windows-aware)
│
└─ shared/
   ├─ types.ts                 # FsNode, etc.
   ├─ ipc.ts                   # channel name constants
   └─ api.ts                   # IpcResult<T>, AppConfig, Marker
```

---

## Getting started

### Prerequisites
- **Node.js** 20+
- **pnpm** 10+ (`corepack enable && corepack use pnpm@10`)
- **Windows** 10/11 (the app builds and runs on Windows; some FS path logic is Windows-specific)

### Develop

```bash
pnpm install
pnpm start          # launches Electron with Vite HMR
```

DevTools open with `F12` or `Ctrl+Shift+I`. Pass a boot root via `npx electron-forge start -- -- --root=C:/Some/Folder`.

### Build a Windows installer

```bash
pnpm make
```

Artifacts land in `out/make/`:
- `squirrel.windows/x64/FSN-JP-1.0.0 Setup.exe` — the installer
- `zip/win32/x64/FSN-JP-win32-x64-1.0.0.zip` — portable zip

To upgrade an existing install: uninstall the previous version, then **also** clear `%LOCALAPPDATA%\fsn-jp\` if you want to start from a fresh config (markers, last root, hidden-files preference).

### Tests

```bash
pnpm test           # Vitest unit + integration (44 tests)
pnpm test:e2e       # Playwright (boots packaged app)
pnpm typecheck      # tsc --noEmit
```

---

## Configuration

A single JSON file at `%APPDATA%\fsn-jp\config.json` holds:

```ts
interface AppConfig {
  lastRoot?: string;          // auto-restored on next launch
  hiddenVisible: boolean;     // toggle dotfiles + system files
  markers: { id: string; path: string; name: string }[];
}
```

Writes are queued and atomic (temp file + rename), so a crashed save can never produce a half-written config.

---

## Architectural notes

### Why Zustand selectors everywhere?
The scene rebuilds whenever the visible structural set changes — `nodes`, `root`, or `expanded`. But hover and selection update many times per second. Without selective subscriptions every hover would re-run `#rebuild()` from scratch. The pattern in `SceneController` is:

```ts
useFsStore.subscribe(
  (s) => ({ nodes: s.nodes, root: s.root, expanded: s.expanded }),
  () => this.#rebuild(),
  { equalityFn: (a, b) => a.nodes === b.nodes && a.root === b.root && a.expanded === b.expanded },
);
```

### Why subtree-width packing instead of grid?
The original v1 used a `cols × rows` grid centered under each parent. That breaks the moment two siblings are expanded — their child grids extend horizontally and overlap. The new layout (`LayoutEngine.ts`) computes each subtree's required horizontal extent post-order, then assigns each child a slot wide enough to contain *all* of its descendants. Siblings can never collide regardless of expand depth.

### Why a per-mesh hover material clone?
`NodeRenderer` caches `MeshStandardMaterial` instances per file-type *category* (so identical files share GPU resources). Mutating `emissiveIntensity` on a shared material would highlight every mesh of that category at once. On hover-enter we clone the material, boost emissive on the clone, and assign it to that one mesh; on hover-leave we restore the original and dispose the clone.

### Why `depth: 0` on chokidar?
Pointing a depth-2 watcher at `C:/` triggers a several-minute traversal of every system directory and frequently hangs on permission-denied files. Depth 0 watches just the root; child directories are watched implicitly when the user expands them, via separate `listDir` calls.

### Why drag commits only after 4px?
Without this guard, `pointerdown` on a node was being captured by `DragController`, which called `stopImmediatePropagation` and unconditionally swallowed the synthetic `click` event that fires a moment later. Result: clicks on files never selected anything. Now drag state arms on `pointerdown` but only commits if the pointer actually moves — anything under the threshold falls through as a normal click.

---

## Roadmap

Things left on the table from the original feasibility study (not in scope for this iteration):

- **Motif chrome** (full SGI window decoration around the canvas)
- **3D extruded text labels** (TextGeometry for pedestal names, replacing the canvas sprites)
- **"Show all" view** that lays out the whole tree at once
- **Sound effects** (selection / fly / open click)
- **Linux + macOS builds** (FsWatcher and path util are Windows-aware today)

---

## Credits

Inspired by Joel Tesler's original *fsn* (1992) for IRIX, immortalised in *Jurassic Park* (1993). This project is a homage, not a port.

Built with [Claude Code](https://claude.com/claude-code).

---

## License

ISC. See `package.json`.
