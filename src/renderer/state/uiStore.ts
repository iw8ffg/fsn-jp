import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';

interface Toast { id: string; level: 'info'|'error'; text: string; }

type Modal =
  | { kind: 'newFolder'; parentPath: string }
  | { kind: 'rename'; targetPath: string; currentName: string }
  | null;

interface UiState {
  searchQuery: string;
  searchActiveId: string | null;
  hiddenVisible: boolean;
  toasts: Toast[];
  modal: Modal;

  setSearchQuery: (q: string) => void;
  setSearchActiveId: (id: string | null) => void;
  toggleHidden: () => void;
  pushToast: (level: Toast['level'], text: string) => void;
  dismissToast: (id: string) => void;
  openModal: (m: NonNullable<UiState['modal']>) => void;
  closeModal: () => void;
}

export const useUiStore = create<UiState>()(subscribeWithSelector((set) => ({
  searchQuery: '',
  searchActiveId: null,
  hiddenVisible: false,
  toasts: [],
  modal: null,

  setSearchQuery: (searchQuery) => set({ searchQuery }),
  setSearchActiveId: (searchActiveId) => set({ searchActiveId }),
  toggleHidden: () => set((s) => ({ hiddenVisible: !s.hiddenVisible })),
  pushToast: (level, text) => set((s) => ({
    toasts: [...s.toasts, { id: crypto.randomUUID(), level, text }],
  })),
  dismissToast: (id) => set((s) => ({ toasts: s.toasts.filter(t => t.id !== id) })),
  openModal: (m) => set({ modal: m }),
  closeModal: () => set({ modal: null }),
})));
