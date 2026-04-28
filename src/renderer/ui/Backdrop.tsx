import React from 'react';

export function Backdrop({ children, onClose }: { children: React.ReactNode; onClose: () => void; }) {
  return (
    <div onClick={onClose} style={{
      position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50,
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        background: '#1c2333', color: '#cfd8dc', padding: 20,
        borderRadius: 8, border: '1px solid #2a3a55', minWidth: 360,
      }}>{children}</div>
    </div>
  );
}
