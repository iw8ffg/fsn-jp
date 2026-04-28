import React from 'react';
import { createRoot } from 'react-dom/client';

function App() {
  return <div style={{ padding: 24 }}>FSN-JP — bootstrap OK</div>;
}

createRoot(document.getElementById('root')!).render(<App />);
