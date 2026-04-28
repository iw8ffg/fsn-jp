import React, { useState } from 'react';
import { useUiStore } from '@renderer/state/uiStore';
import { fsn, unwrap } from '@renderer/ipc/client';
import { Backdrop } from './NewFolderDialog';

export function RenameDialog() {
  const modal = useUiStore(s => s.modal);
  const close = useUiStore(s => s.closeModal);
  const [name, setName] = useState(modal?.kind === 'rename' ? modal.currentName : '');
  if (!modal || modal.kind !== 'rename') return null;

  const submit = async () => {
    try {
      await unwrap(fsn.rename(modal.targetPath, name.trim()));
      close();
    } catch (err) {
      useUiStore.getState().pushToast('error', `rename failed: ${(err as Error).message}`);
    }
  };

  return (
    <Backdrop onClose={close}>
      <h3 style={{ marginTop: 0 }}>Rename</h3>
      <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 8 }}>{modal.targetPath}</div>
      <input autoFocus value={name} onChange={e => setName(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') submit(); if (e.key === 'Escape') close(); }}
        style={{ width: '100%', padding: 8, background: '#0f1622', color: '#cfd8dc', border: '1px solid #2a3a55' }} />
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 12 }}>
        <button onClick={close}>Cancel</button>
        <button onClick={submit} disabled={!name.trim() || name === modal.currentName}>Rename</button>
      </div>
    </Backdrop>
  );
}
