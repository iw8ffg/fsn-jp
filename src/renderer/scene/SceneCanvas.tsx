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
