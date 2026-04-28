import React, { useEffect } from 'react';
import { useUiStore } from '@renderer/state/uiStore';

export function Toasts() {
  const toasts = useUiStore(s => s.toasts);
  const dismiss = useUiStore(s => s.dismissToast);
  useEffect(() => {
    const timers = toasts.map(t => setTimeout(() => dismiss(t.id), 3500));
    return () => { timers.forEach(clearTimeout); };
  }, [toasts, dismiss]);

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
