import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { SceneCanvas } from './scene/SceneCanvas';
import { DrivePicker } from './ui/DrivePicker';
import { Toolbar } from './ui/Toolbar';
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
    </div>
  );
}

wireFsEvents();
wireSearch();
createRoot(document.getElementById('root')!).render(<App />);
