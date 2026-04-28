import React from 'react';
import { useUiStore } from '@renderer/state/uiStore';
import { useFsStore } from '@renderer/state/fsStore';
import { fsn, unwrap } from '@renderer/ipc/client';
import { Backdrop } from './Backdrop';

export function ConfirmDeleteDialog() {
  const modal = useUiStore(s => s.modal);
  const close = useUiStore(s => s.closeModal);
  if (!modal || modal.kind !== 'confirmDelete') return null;

  const targetPath = modal.targetPath;

  const confirm = async () => {
    try {
      await unwrap(fsn.trash(targetPath));
      useFsStore.getState().removeNode(targetPath);
      useUiStore.getState().pushToast('info', 'Moved to Trash');
      close();
    } catch (err) {
      useUiStore.getState().pushToast('error', `delete failed: ${(err as Error).message}`);
    }
  };

  return (
    <Backdrop onClose={close}>
      <h3 style={{ marginTop: 0 }}>Move to Trash?</h3>
      <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 12, wordBreak: 'break-all' }}>{targetPath}</div>
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 12 }}>
        <button onClick={close}>Cancel</button>
        <button autoFocus onClick={confirm}>Move to Trash</button>
      </div>
    </Backdrop>
  );
}
