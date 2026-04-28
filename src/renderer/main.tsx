import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { SceneCanvas } from './scene/SceneCanvas';
import { DrivePicker } from './ui/DrivePicker';
import { Toolbar } from './ui/Toolbar';
import { HUDOverlay } from './ui/HUDOverlay';
import { fsn, unwrap } from './ipc/client';
import { useFsStore } from './state/fsStore';
import { wireFsEvents } from './ipc/wireFsEvents';
import { wireSearch } from './ipc/wireSearch';

function App() {
  const [picked, setPicked] = useState(false);

  return (
    <div style={{ position: 'relative', width: '100vw', height: '100vh' }}>
      <SceneCanvas />
      {!picked && <DrivePicker onPicked={async (root) => {
        const children = await unwrap(fsn.listDir(root, 2));
        useFsStore.getState().upsertNodes([
          { path: root, parentPath: '', name: root, kind: 'dir', size: 0, mtimeMs: 0, isHidden: false, childrenLoaded: true },
          ...children,
        ]);
        await fsn.watchRoot(root);
        setPicked(true);
      }} />}
      {picked && <Toolbar />}
      {picked && <HUDOverlay />}
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
