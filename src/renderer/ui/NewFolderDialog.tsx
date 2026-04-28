import React, { useState } from 'react';
import { useUiStore } from '@renderer/state/uiStore';
import { fsn, unwrap } from '@renderer/ipc/client';
import { Backdrop } from './Backdrop';

export function NewFolderDialog() {
  const modal = useUiStore(s => s.modal);
  const close = useUiStore(s => s.closeModal);
  const [name, setName] = useState('');
  if (!modal || modal.kind !== 'newFolder') return null;

  const submit = async () => {
    try {
      await unwrap(fsn.mkdir(modal.parentPath, name.trim()));
      useUiStore.getState().pushToast('info', `Created ${name}`);
      close();
    } catch (err) {
      useUiStore.getState().pushToast('error', `mkdir failed: ${(err as Error).message}`);
    }
  };

  return (
    <Backdrop onClose={close}>
      <h3 style={{ marginTop: 0 }}>New folder in {modal.parentPath}</h3>
      <input autoFocus value={name} onChange={e => setName(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') submit(); if (e.key === 'Escape') close(); }}
        style={{ width: '100%', padding: 8, background: '#0f1622', color: '#cfd8dc', border: '1px solid #2a3a55' }} />
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 12 }}>
        <button onClick={close}>Cancel</button>
        <button onClick={submit} disabled={!name.trim()}>Create</button>
      </div>
    </Backdrop>
  );
}
