import React, { useEffect, useRef } from 'react';
import { useUiStore } from '@renderer/state/uiStore';

export function Toasts() {
  const toasts = useUiStore(s => s.toasts);
  const dismiss = useUiStore(s => s.dismissToast);
  const timers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  useEffect(() => {
    const live = new Set(toasts.map(t => t.id));
    // Schedule timers only for newly-arrived toasts so dismissals are not
    // reset every time `toasts` changes.
    for (const t of toasts) {
      if (!timers.current.has(t.id)) {
        const handle = setTimeout(() => {
          timers.current.delete(t.id);
          dismiss(t.id);
        }, 3500);
        timers.current.set(t.id, handle);
      }
    }
    // Clean up timers for toasts that have been removed externally.
    for (const [id, handle] of timers.current) {
      if (!live.has(id)) {
        clearTimeout(handle);
        timers.current.delete(id);
      }
    }
  }, [toasts, dismiss]);

  // Clear all timers on unmount.
  useEffect(() => {
    const map = timers.current;
    return () => {
      for (const handle of map.values()) clearTimeout(handle);
      map.clear();
    };
  }, []);

  return (
    <div style={{
      position: 'absolute', top: 60, right: 12, display: 'flex', flexDirection: 'column', gap: 6, zIndex: 30,
    }}>
      {toasts.map(t => (
        <div key={t.id} onClick={() => dismiss(t.id)} style={{
          padding: '8px 12px', borderRadius: 4, cursor: 'pointer',
          background: t.level === 'error' ? '#3a1a1a' : '#1c2333',
          color: t.level === 'error' ? '#ff8a8a' : '#cfd8dc',
          border: '1px solid #2a3a55', maxWidth: 360,
        }}>{t.text}</div>
      ))}
    </div>
  );
}
