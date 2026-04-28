import { describe, it, expect } from 'vitest';
import { useUiStore } from '../../src/renderer/state/uiStore';

describe('uiStore', () => {
  it('toggles hidden', () => {
    const start = useUiStore.getState().hiddenVisible;
    useUiStore.getState().toggleHidden();
    expect(useUiStore.getState().hiddenVisible).toBe(!start);
    useUiStore.getState().toggleHidden();
  });

  it('pushes and dismisses toasts', () => {
    useUiStore.getState().pushToast('info', 'hello');
    const id = useUiStore.getState().toasts.at(-1)!.id;
    useUiStore.getState().dismissToast(id);
    expect(useUiStore.getState().toasts.find(t => t.id === id)).toBeUndefined();
  });
});
