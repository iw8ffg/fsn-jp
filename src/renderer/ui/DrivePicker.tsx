import React, { useEffect, useState } from 'react';
import { fsn, unwrap } from '@renderer/ipc/client';
import { useFsStore } from '@renderer/state/fsStore';
import type { DriveInfo } from '@shared/types';

export function DrivePicker({ onPicked }: { onPicked: (root: string) => void }) {
  const [drives, setDrives] = useState<DriveInfo[]>([]);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    unwrap(fsn.listDrives()).then(setDrives).catch(e => setErr(String(e)));
  }, []);

  return (
    <div style={{
      position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: '#0a0e14', color: '#cfd8dc', flexDirection: 'column', gap: 24,
    }}>
      <h1 style={{ fontFamily: 'Helvetica, Arial, sans-serif', letterSpacing: 2 }}>FSN-JP</h1>
      {err && <div style={{ color: 'salmon' }}>{err}</div>}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, 120px)', gap: 16 }}>
        {drives.map(d => (
          <button key={d.letter} onClick={() => {
            useFsStore.getState().setRoot(d.letter + '/');
            onPicked(d.letter + '/');
          }} style={{
            width: 120, height: 120, background: '#1c2333', color: '#cfd8dc',
            border: '1px solid #3a4a6b', borderRadius: 8, fontSize: 28, cursor: 'pointer',
          }}>{d.letter}</button>
        ))}
      </div>
      <div style={{ opacity: 0.5, fontSize: 12 }}>Pick a drive to enter its 3D view</div>
    </div>
  );
}
