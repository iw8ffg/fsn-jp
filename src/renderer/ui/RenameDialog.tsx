import React, { useState } from 'react';
import { useUiStore } from '@renderer/state/uiStore';
import { useFsStore } from '@renderer/state/fsStore';
import { fsn, unwrap } from '@renderer/ipc/client';
import { parentOf } from '@renderer/util/paths';
import { Backdrop } from './Backdrop';

export function RenameDialog() {
  const modal = useUiStore(s => s.modal);
  const close = useUiStore(s => s.closeModal);
  const [name, setName] = useState(modal?.kind === 'rename' ? modal.currentName : '');
  if (!modal || modal.kind !== 'rename') return null;

  const submit = async () => {
    try {
      const newName = name.trim();
      const returned = await unwrap(fsn.rename(modal.targetPath, newName));
      const parent = parentOf(modal.targetPath);
      const newPath = returned ?? (parent.endsWith('/') ? parent + newName : parent + '/' + newName);
      const fs = useFsStore.getState();
      const oldNode = fs.nodes.get(modal.targetPath);
      if (oldNode) {
        fs.removeNode(modal.targetPath);
        fs.upsertNodes([{ ...oldNode, path: newPath, name: newName, parentPath: oldNode.parentPath }]);
      }
      useUiStore.getState().pushToast('info', 'Renamed');
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
