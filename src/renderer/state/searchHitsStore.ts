import { create } from 'zustand';
import type { SearchHit } from '@shared/types';

interface SearchHitsState {
  byId: Map<string, SearchHit[]>;
  appendHits: (id: string, hits: SearchHit[]) => void;
  clear: (id: string) => void;
  reset: () => void;
}

export const useSearchHitsStore = create<SearchHitsState>((set) => ({
  byId: new Map(),
  appendHits: (id, hits) => set((s) => {
    const next = new Map(s.byId);
    next.set(id, (next.get(id) ?? []).concat(hits));
    return { byId: next };
  }),
  clear: (id) => set((s) => {
    const next = new Map(s.byId);
    next.delete(id);
    return { byId: next };
  }),
  reset: () => set({ byId: new Map() }),
}));
