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
