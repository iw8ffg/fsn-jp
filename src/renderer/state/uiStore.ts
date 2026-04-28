import { create } from 'zustand';

interface Toast { id: string; level: 'info'|'error'; text: string; }

interface UiState {
  searchQuery: string;
  searchActiveId: string | null;
  hiddenVisible: boolean;
  toasts: Toast[];

  setSearchQuery: (q: string) => void;
  setSearchActiveId: (id: string | null) => void;
  toggleHidden: () => void;
  pushToast: (level: Toast['level'], text: string) => void;
  dismissToast: (id: string) => void;
}

export const useUiStore = create<UiState>((set) => ({
  searchQuery: '',
  searchActiveId: null,
  hiddenVisible: false,
  toasts: [],

  setSearchQuery: (searchQuery) => set({ searchQuery }),
  setSearchActiveId: (searchActiveId) => set({ searchActiveId }),
  toggleHidden: () => set((s) => ({ hiddenVisible: !s.hiddenVisible })),
  pushToast: (level, text) => set((s) => ({
    toasts: [...s.toasts, { id: crypto.randomUUID(), level, text }],
  })),
  dismissToast: (id) => set((s) => ({ toasts: s.toasts.filter(t => t.id !== id) })),
}));
