# FSN-JP — 3D File System Explorer per Windows

**Data:** 2026-04-28
**Stato:** Spec approvata via brainstorming, in attesa di review utente prima del piano di implementazione.

## 1. Visione e contesto

Applicazione desktop Windows che ricrea, in chiave moderna, l'esperienza di **FSN ("Fusion") di Silicon Graphics** — il file system navigator 3D reso famoso dal film *Jurassic Park* (1993, "It's a UNIX system!"). L'utente naviga il filesystem locale come uno spazio 3D in cui le cartelle sono piedistalli e i file sono blocchi la cui altezza è proporzionale alla dimensione, con rotazione orbitale della camera, ricerca, e operazioni reali di gestione file.

L'applicazione **non** è un emulatore o un porting di FSN: è un tributo funzionale, un file manager realmente utilizzabile su Windows con un'estetica chiaramente ispirata a FSN ma modernizzata.

### Riferimenti

- FSN originale (SGI, 1992): vedi [Wikipedia](https://en.wikipedia.org/wiki/File_System_Visualizer).
- Clone open-source storico: [fsv](https://fsv.sourceforge.net/) (architettura ispiratrice ma codebase C/GTK obsoleta).

## 2. Decisioni di prodotto

| Area | Decisione |
| --- | --- |
| Scope | File manager completo (navigazione + operazioni reali). |
| Stack | Electron + Three.js + TypeScript + React. |
| Estetica | Ispirata FSN ma modernizzata (PBR leggero, ombre soft, post-processing minimo). |
| Scala | Depth-limited tree con espansione on-demand. Profondità default 2 livelli. |
| Operazioni MVP | Apertura esterna, copy/move via drag&drop, rename inline, delete (in cestino), nuova cartella. |
| Camera | Orbit camera (FSN-style). Free fly rimandato a v2. |
| Rappresentazione | Cartelle = piedistalli, file = blocchi con altezza ∝ log(size+1), colore per tipo. Fallback griglia per cartelle con >200 file. |
| UX MVP | Search globale, breadcrumb cliccabile, HUD su hover, toggle file nascosti, status bar. |
| Mini-mappa "Eagle Eye" | Rimandata a v2. |
| Boot | Drive picker → root → naviga. |
| Persistence | `%APPDATA%/fsn-jp/config.json` (ultimo path, preferenze, dimensione finestra). |
| Distribuzione | Electron Forge → installer NSIS + zip portable. No code signing per MVP. |
| Permission errors | Mesh `LockedPlaceholder` grigia con sprite lucchetto. Mai crash. |

## 3. Architettura di alto livello

### 3.1 Processi Electron

- **Main process** (`src/main/`): unico responsabile dell'accesso al filesystem, file watching, dialoghi nativi, IPC server.
- **Renderer process** (`src/renderer/`): UI 2D React + canvas Three.js. Non tocca `fs` direttamente.
- **Preload script** (`src/preload/`): espone una `window.fsn` API tipizzata e ristretta. `nodeIntegration: false`, `contextIsolation: true`, `sandbox: true`.

### 3.2 Stack tecnico

- Electron 30+ (LTS attuale)
- TypeScript ovunque
- Three.js (rendering 3D)
- React 18 (UI 2D)
- Zustand (state management)
- chokidar (file watching)
- Vite (bundler / HMR)
- electron-forge (build / packaging)
- Vitest (unit + integration)
- Playwright (E2E con Electron)

### 3.3 Layout repository

```
fileexplorer/
  src/
    main/         # Electron main: FsService, FsWatcher, IpcRouter, SearchService
    preload/      # Bridge API tipizzato
    renderer/
      scene/      # Three.js: SceneRoot, OrbitCameraController, LayoutEngine,
                  #          NodeRenderer, Connectors, HoverPicker, DragController
      ui/         # React: Toolbar, HUDOverlay, StatusBar, Dialogs, DrivePicker
      state/      # Zustand: fsStore, uiStore, cameraStore
      ipc/        # client typed wrapper di window.fsn
    shared/       # Tipi: FsNode, IpcChannels, IpcResult
  resources/      # texture, font, icone
  docs/superpowers/specs/
  tests/
    unit/
    integration/
    e2e/
```

## 4. Componenti principali

### 4.1 Main process

- **`FsService`** — wrapper `fs.promises`. Metodi: `listDrives()`, `listDir(path, depth)`, `stat(path)`, `move(src,dst)`, `copy(src,dst)`, `rename(path,newName)`, `trash(path)` (via `electron.shell.trashItem`), `mkdir(parent,name)`. Restituisce `FsNode[]`.
- **`FsWatcher`** — wrapper chokidar sulla root corrente. Eventi `nodeAdded/Removed/Changed` pushed al renderer via `webContents.send`.
- **`IpcRouter`** — registra handler tipizzati per ogni canale (`fs:list`, `fs:move`, ecc.). Tutti gli handler ritornano `IpcResult<T> = {ok: true, data: T} | {ok: false, code: string, message: string}`.
- **`SearchService`** — walk ricorsivo cancellabile (AbortSignal). Risultati streamed via canale dedicato `fs:searchResult`. Limite 1000 risultati per query.

### 4.2 Renderer — Scene (Three.js)

- **`SceneRoot`** — `Scene`, `WebGLRenderer`, render loop con `requestAnimationFrame`. Resize-aware.
- **`OrbitCameraController`** — orbita attorno a `focusPoint`. Mouse drag = rotate, scroll = zoom (limiti min/max). Tween cubic-out 600ms al cambio focus.
- **`LayoutEngine`** — algoritmo radiale a livelli: figli disposti su cerchio attorno al parent, raggio ∝ √count, angolo distribuito uniformemente con jitter deterministico per evitare allineamenti monotoni. Deterministico (seed=path) per stabilità tra apertura/chiusura.
- **`NodeRenderer`** — fabbrica mesh con cache:
  - **Pedestal** (cartella): `BoxGeometry` piatto + texture pattern grid azzurrina + emissive sottile.
  - **FileBlock** (file): box altezza = `clamp(log10(size+1) * k, hMin, hMax)`. Materiale con colore per tipo (mappa estensione → colore in `shared/fileTypes.ts`).
  - **LockedPlaceholder**: pedestal grigio + sprite icona lucchetto.
  - **GridFallback**: per cartelle con >200 file, layout a griglia 2D di tile piatte sopra il pedestal, con paginazione "+N altri".
  - Instancing (`InstancedMesh`) per FileBlock raggruppati per materiale.
- **`Connectors`** — linee curve (BufferGeometry, CatmullRom) tra parent e children. Throttled durante interazione.
- **`HoverPicker`** — `Raycaster` su mousemove (throttled 30Hz, filtrato per distanza camera). Highlight outline pass + emit `hoverChanged`.
- **`DragController`** — pick start, ghost mesh segue raycast su piano XZ, target pedestal evidenziato, su drop confirm dialog → IPC `fs:move`.

### 4.3 Renderer — UI (React)

- **`App`** — root, gestisce flow drive picker → main view.
- **`Toolbar`** — search bar (Ctrl+F focus), breadcrumb cliccabile (anche editabile come path testuale), toggle hidden files (Ctrl+H).
- **`HUDOverlay`** — pannello info (nome, size human-readable, mtime locale, type) su hover/selezione. Fade-in 150ms.
- **`StatusBar`** — count nodi, dimensione totale visibile, FPS in dev.
- **`Dialogs`** — confirm delete, rename inline, new folder, error toast.
- **`DrivePicker`** — vista iniziale, mostra tutti i drive disponibili come tile cliccabili.

### 4.4 State (Zustand)

- **`fsStore`** — albero corrente come `Map<absolutePath, FsNode>`, root path, set di path espansi, hover/selected path. Patch incrementale su eventi watcher.
- **`uiStore`** — search query, hidden visible flag, dialog state, toast queue.
- **`cameraStore`** — `focusPath` corrente. La scena lo osserva via subscribe e anima la camera.

## 5. Data flow & interazioni chiave

### 5.1 Boot

1. App start → `App` mostra `DrivePicker`.
2. `DrivePicker` chiama `ipc.invoke('fs:listDrives')`.
3. Click su un drive → `fsStore.setRoot(path)` → `ipc.invoke('fs:list', path, depth=2)`.
4. Risposta popola `fsStore`. `SceneRoot` reagisce, `LayoutEngine` calcola posizioni, `NodeRenderer` monta mesh con animazione growth (scale 0→1, 400ms).
5. `FsWatcher` parte sulla nuova root.

### 5.2 Espansione cartella

1. Click su pedestal → `cameraStore.setFocus(path)` (camera tween) + `fsStore.expand(path)` → `ipc.invoke('fs:list', path, depth=1)`.
2. Risposta inserisce children in `fsStore`. `LayoutEngine` ricalcola sottoalbero. `NodeRenderer` monta nuove mesh con growth.

### 5.3 Drag & drop (move)

1. `mousedown` su FileBlock → `DragController` crea ghost mesh.
2. `mousemove` → ghost segue raycast su piano XZ, target pedestal evidenziato.
3. `mouseup` su pedestal valido → confirm dialog → `ipc.invoke('fs:move', src, dst)`.
4. Main esegue → `FsWatcher` emette `removed` + `added` → renderer patcha `fsStore` → `LayoutEngine` ricalcola con tween di transizione tra posizioni vecchie e nuove.

### 5.4 Ricerca

1. Input in `SearchBar` (debounce 250ms) → `ipc.invoke('fs:search', root, query)` con `AbortSignal`.
2. Main streamma risultati via canale `fs:searchResult`. Renderer accumula (max 1000), highlight glow + tween scale leggero sui match già presenti in scena.
3. Click su un risultato → camera fly-to + select. Se il path non è espanso, espandi automaticamente i parent fino al match.

### 5.5 File watching live

1. `chokidar` su root → eventi push verso renderer (`fs:event`, throttled batch 100ms).
2. Renderer applica patch a `fsStore`. Mesh aggiunti/rimossi animati (fade-in/out 200ms).

## 6. Performance budget

- **Target**: 60fps su scene fino a ~5000 mesh visibili.
- **Strategie**:
  - `InstancedMesh` per FileBlock con stesso materiale (un draw call per categoria di tipo file).
  - Frustum culling (default Three.js).
  - Raycasting throttled 30Hz, filtrato per distanza camera.
  - Cartelle con >200 file → fallback grid + sprite atlas (no instancing per ridurre overhead per-mesh).
  - Lazy load: figli solo quando parent espanso.
  - Mesh fuori dai 2 livelli espansi sono nascosti (non solo culled).
- **Diagnostica**: FPS counter visibile in dev mode (NODE_ENV=development), nascosto in produzione.

## 7. Error handling

- **IPC contract**: ogni handler ritorna `{ok: true, data} | {ok: false, code, message}`. Mai throw verso il renderer.
- **Permission denied**: mesh `LockedPlaceholder` al posto del pedestal. Hover mostra "Accesso negato". Nessun toast (sarebbe rumoroso).
- **Path inesistente** (race con eliminazioni esterne): rimosso da `fsStore`, toast info.
- **Disco rimosso** (USB unplug): tutto l'albero invalidato, ritorno a `DrivePicker` con toast.
- **Operazione fallita** (move/copy/delete): toast errore con dettaglio. Stato ripristinato.
- **Crash main**: `app.on('uncaughtException')` logga in `%APPDATA%/fsn-jp/logs/error.log` e mostra dialog di restart.
- **Crash renderer**: gestito da Electron, dialog di restart.

## 8. Testing

### 8.1 Strategia

| Layer | Tool | Cosa testa |
| --- | --- | --- |
| Unit | Vitest | `LayoutEngine` (snapshot deterministici di posizioni), parser path, mappa estensione→colore, formatter size umano. |
| Integration | Vitest + cartelle temp reali | `FsService` su filesystem reale (no mock di `fs`). Crea fixture in `os.tmpdir()`, esegue, pulisce. |
| E2E | Playwright + Electron | Boot, drive picker, espansione, drag&drop, search, delete con confirm. Fixture: cartella `tests/e2e/fixtures/sample-tree`. |

### 8.2 Principio: niente mock di `fs`

Le operazioni filesystem su Windows hanno comportamenti specifici (path con backslash, drive letters, attributi hidden, junction point, lock su file aperti). Mock-based test darebbero falsa sicurezza. Tutti i test FS girano su cartelle temporanee reali.

### 8.3 CI

- GitHub Actions su Windows runner.
- Job: lint (ESLint + tsc --noEmit) → unit → integration → e2e → build.
- Cache `node_modules` e Electron download.

## 9. Scope esplicito v1 vs v2

### MVP (v1)

Tutto quanto sopra: navigazione, drag&drop move, copy (Ctrl+drag), rename, delete (cestino), nuova cartella, search, breadcrumb, HUD, file nascosti, status bar, drive picker, persistence config, error handling, packaging Windows.

### Rimandato a v2

- Mini-mappa "Eagle Eye" (overview top-down).
- Free fly camera mode.
- Multi-selezione (rectangle select 3D, ctrl+click).
- Taglia/copia/incolla con clipboard.
- Properties dialog completo (permessi, attributi).
- Terminal-in-folder, link/scorciatoie.
- Worker pool per scan parallelo (necessario solo se profilatura lo richiede).
- Code signing + auto-update.
- Tema personalizzabile (l'MVP ha un solo tema).

## 10. Rischi noti

| Rischio | Mitigazione |
| --- | --- |
| Performance con cartelle giganti (es. `node_modules`) | Fallback grid >200 file + lazy depth-limited. Profilare presto su fixture reale. |
| UX drag&drop in 3D confusa | Ghost mesh chiaro + highlight target + confirm dialog. Iterare in base a uso reale prima del freeze. |
| Path Windows lunghi (>260 char) | Usare API `\\?\` prefix nel main, testare su fixture con path lunghi. |
| Permission denied a cascata (es. `C:\Windows`) | Placeholder mesh + skip silenzioso. Mai bloccare l'enumerazione. |
| Memory leak in scene graph su molte espansioni/contrazioni | Test stress: espandi/contrai 1000 volte e monitora heap. Cleanup mesh esplicito (dispose geometry/material). |

## 11. Out of scope

- macOS / Linux build (l'utente ha richiesto Windows; cross-platform è gratis quasi-totale con Electron ma non è obiettivo dichiarato).
- Cloud / network filesystem (S3, SMB, ecc.).
- Operazioni su archivi (entrare in zip come fossero cartelle).
- Anteprime contenuto file (immagine, video, testo).
- Gestione versioni / git status overlay.
