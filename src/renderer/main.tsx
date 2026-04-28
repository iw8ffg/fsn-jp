import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { SceneCanvas } from './scene/SceneCanvas';
import { DrivePicker } from './ui/DrivePicker';
import { Toolbar } from './ui/Toolbar';
import { HUDOverlay } from './ui/HUDOverlay';
import { StatusBar } from './ui/StatusBar';
import { Toasts } from './ui/Toasts';
import { NewFolderDialog } from './ui/NewFolderDialog';
import { RenameDialog } from './ui/RenameDialog';
import { ConfirmDeleteDialog } from './ui/ConfirmDeleteDialog';
import { fsn, unwrap } from './ipc/client';
import { useFsStore } from './state/fsStore';
import { useUiStore } from './state/uiStore';
import { wireFsEvents } from './ipc/wireFsEvents';
import { wireSearch } from './ipc/wireSearch';
import { parentOf } from './util/paths';

function useGlobalShortcuts() {
  useEffect(() => {
    const handler = async (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;

      const sel = useFsStore.getState().selectedPath;

      if (e.key === 'F2') {
        if (!sel) return;
        const node = useFsStore.getState().nodes.get(sel);
        if (node) useUiStore.getState().openModal({ kind: 'rename', targetPath: sel, currentName: node.name });
        return;
      }
      if (e.key === 'Delete') {
        if (!sel) return;
        useUiStore.getState().openModal({ kind: 'confirmDelete', targetPath: sel });
        return;
      }
      if (e.ctrlKey && e.key.toLowerCase() === 'n') {
        // Ctrl+N falls back to the active root if nothing is selected.
        const root = useFsStore.getState().root;
        let parent: string | null = null;
        if (sel) {
          const node = useFsStore.getState().nodes.get(sel);
          parent = node?.kind === 'dir' ? sel : parentOf(sel);
        } else if (root) {
          parent = root;
        }
        if (!parent) return;
        useUiStore.getState().openModal({ kind: 'newFolder', parentPath: parent });
        return;
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);
}

// Module-level guard: tracks the path that activateRoot has already been
// called with. Both the persisted-lastRoot effect, the `cfg:bootRoot`
// listener and DrivePicker.onPicked all share this guard so we never
// double-`watchRoot`. First caller wins.
let bootActivatedPath: string | null = null;

async function activateRoot(root: string): Promise<void> {
  if (bootActivatedPath !== null) {
    // Already activated (either to this same path or to a different one).
    // First caller wins; subsequent calls are no-ops.
    return;
  }
  bootActivatedPath = root;
  try {
    const children = await unwrap(fsn.listDir(root, 2));
    useFsStore.getState().upsertNodes([
      { path: root, parentPath: '', name: root, kind: 'dir', size: 0, mtimeMs: 0, isHidden: false, childrenLoaded: true },
      ...children,
    ]);
    await fsn.watchRoot(root);
    useFsStore.getState().setRoot(root);
  } catch (err) {
    // Roll back on failure so a user-driven retry (e.g. picking another drive)
    // can succeed. The renderer surfaces errors via toasts elsewhere.
    bootActivatedPath = null;
    throw err;
  }
}

function App() {
  const [picked, setPicked] = useState(false);
  const [bootDone, setBootDone] = useState(false);
  const bootActivatedRef = useRef(false);
  useGlobalShortcuts();

  // Listen for `--root=<path>` boot override from main. Subscribed early so
  // the message isn't lost if the renderer mounts before main sends it.
  useEffect(() => {
    const unsub = fsn.onBootRoot(async (root) => {
      if (bootActivatedRef.current) return;
      bootActivatedRef.current = true;
      try {
        await activateRoot(root);
        setPicked(true);
        setBootDone(true);
      } catch {
        // ignore; fall through to picker
      }
    });
    return unsub;
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const cfg = await unwrap(fsn.loadConfig());
        if (cancelled) return;
        // Apply hiddenVisible without firing a save (subscription not yet attached).
        if (cfg.hiddenVisible !== useUiStore.getState().hiddenVisible) {
          useUiStore.setState({ hiddenVisible: cfg.hiddenVisible });
        }
        if (cfg.lastRoot && !bootActivatedRef.current) {
          bootActivatedRef.current = true;
          try {
            await activateRoot(cfg.lastRoot);
            if (!cancelled) setPicked(true);
          } catch {
            // Saved root no longer accessible; fall through to DrivePicker.
            bootActivatedRef.current = false;
          }
        }
      } catch {
        // Config load failed; proceed with defaults.
      } finally {
        if (!cancelled) setBootDone(true);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Persist hiddenVisible changes only after initial config has been applied.
  useEffect(() => {
    if (!bootDone) return;
    const unsub = useUiStore.subscribe(
      (s) => s.hiddenVisible,
      (hiddenVisible) => {
        const lastRoot = useFsStore.getState().root ?? undefined;
        void fsn.saveConfig({ lastRoot, hiddenVisible });
      },
    );
    return unsub;
  }, [bootDone]);

  return (
    <div style={{ position: 'relative', width: '100vw', height: '100vh' }}>
      <SceneCanvas />
      {bootDone && !picked && <DrivePicker onPicked={async (root) => {
        if (bootActivatedRef.current) return;
        bootActivatedRef.current = true;
        try {
          await activateRoot(root);
          await fsn.saveConfig({ lastRoot: root, hiddenVisible: useUiStore.getState().hiddenVisible });
          setPicked(true);
        } catch {
          bootActivatedRef.current = false;
        }
      }} />}
      {picked && <Toolbar />}
      {picked && <HUDOverlay />}
      {picked && <StatusBar />}
      {picked && <Toasts />}
      {picked && <NewFolderDialog />}
      {picked && <RenameDialog />}
      {picked && <ConfirmDeleteDialog />}
    </div>
  );
}

const disposeFsEvents = wireFsEvents();
const disposeSearch = wireSearch();
createRoot(document.getElementById('root')!).render(<App />);

// Vite HMR: dispose the IPC subscriptions so we don't accumulate
// listeners on every hot-reload of this entry module.
const hot = (import.meta as { hot?: { dispose: (cb: () => void) => void } }).hot;
if (hot) {
  hot.dispose(() => {
    disposeFsEvents?.();
    disposeSearch?.();
  });
}
