import React from 'react';
import { useCameraStore } from '@renderer/state/cameraStore';
import { useFsStore } from '@renderer/state/fsStore';

export function Breadcrumb() {
  const focus = useCameraStore(s => s.focusPath);
  const root  = useFsStore(s => s.root);
  const path = focus ?? root ?? '';
  const segments = path.split('/').filter(Boolean);

  return (
    <div style={{ display: 'flex', gap: 6, alignItems: 'center', fontFamily: 'monospace' }}>
      {segments.map((seg, i) => {
        const slice = segments.slice(0, i + 1);
        const full = slice[0]!.endsWith(':')
          ? slice[0] + '/' + slice.slice(1).join('/')
          : '/' + slice.join('/');
        return (
          <span key={i}>
            <button style={btn} onClick={() => useCameraStore.getState().setFocus(full)}>{seg}</button>
            {i < segments.length - 1 && <span style={{ opacity: 0.4 }}> / </span>}
          </span>
        );
      })}
    </div>
  );
}

const btn: React.CSSProperties = {
  background: 'transparent', color: '#cfd8dc', border: 'none', cursor: 'pointer',
  padding: '2px 6px', borderRadius: 4,
};
