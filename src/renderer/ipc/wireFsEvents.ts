import { fsn } from './client';
import { useFsStore } from '@renderer/state/fsStore';

export function wireFsEvents(): () => void {
  const off = fsn.onFsEvent((ev) => {
    const store = useFsStore.getState();
    if (ev.type === 'add' || ev.type === 'change') {
      store.upsertNodes([ev.node]);
    } else if (ev.type === 'remove') {
      store.removeNode(ev.path);
    }
  });
  return off;
}
