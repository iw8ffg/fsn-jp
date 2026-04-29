import React from 'react';
import { useCameraStore } from '@renderer/state/cameraStore';

export function Speedometer() {
  const speed = useCameraStore(s => s.speed);
  const idle = speed < 0.05;
  return (
    <div style={{
      position: 'absolute', top: 50, right: 12, width: 80, height: 40,
      background: 'rgba(28,32,40,0.92)', border: '1px solid #46505e',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: 'monospace', fontWeight: 'bold', fontSize: 13,
      color: '#b89770', opacity: idle ? 0.5 : 1,
      pointerEvents: 'none', zIndex: 11,
    }}>
      {speed.toFixed(1)} m/s
    </div>
  );
}
