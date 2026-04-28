import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { SceneCanvas } from './scene/SceneCanvas';
import { DrivePicker } from './ui/DrivePicker';
import { Toolbar } from './ui/Toolbar';
import { HUDOverlay } from './ui/HUDOverlay';
import { StatusBar } from './ui/StatusBar';
import { Toasts } from './ui/Toasts';
import { NewFolderDialog } from './ui/NewFolderDialog';
import { RenameDialog } from './ui/RenameDialog';
import { fsn, unwrap } from './ipc/client';
import { useFsStore } from './state/fsStore';
import { useUiStore } from './state/uiStore';
import { wireFsEvents } from './ipc/wireFsEvents';
import { wireSearch } from './ipc/wireSearch';

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

async function activateRoot(root: string): Promise<void> {
  const children = await unwrap(fsn.listDir(root, 2));
  useFsStore.getState().upsertNodes([
    { path: root, parentPath: '', name: root, kind: 'dir', size: 0, mtimeMs: 0, isHidden: false, childrenLoaded: true },
    ...children,
  ]);
  await fsn.watchRoot(root);
  useFsStore.getState().setRoot(root);
}

function App() {
  const [picked, setPicked] = useState(false);
  const [bootDone, setBootDone] = useState(false);
  useGlobalShortcuts();

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
        if (cfg.lastRoot) {
          try {
            await activateRoot(cfg.lastRoot);
            if (!cancelled) setPicked(true);
          } catch {
            // Saved root no longer accessible; fall through to DrivePicker.
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
        await activateRoot(root);
        await fsn.saveConfig({ lastRoot: root, hiddenVisible: useUiStore.getState().hiddenVisible });
        setPicked(true);
      }} />}
      {picked && <Toolbar />}
      {picked && <HUDOverlay />}
      {picked && <StatusBar />}
      {picked && <Toasts />}
      {picked && <NewFolderDialog />}
      {picked && <RenameDialog />}
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
