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
