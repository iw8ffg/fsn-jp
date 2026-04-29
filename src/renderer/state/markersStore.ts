import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import type { Marker } from '@shared/api';

export type { Marker };

interface MarkersState {
  byId: Map<string, Marker>;
  add: (m: Marker) => void;
  remove: (id: string) => void;
  clear: () => void;
  list: () => Marker[];
  /** Boot-time hydration; does not trigger save on its own beyond store change. */
  setAll: (markers: Marker[]) => void;
}

export const useMarkersStore = create<MarkersState>()(subscribeWithSelector((set, get) => ({
  byId: new Map(),
  add: (m) => set((s) => {
    const next = new Map(s.byId);
    next.set(m.id, m);
    return { byId: next };
  }),
  remove: (id) => set((s) => {
    const next = new Map(s.byId);
    next.delete(id);
    return { byId: next };
  }),
  clear: () => set({ byId: new Map() }),
  list: () => Array.from(get().byId.values()),
  setAll: (arr) => set({ byId: new Map(arr.map((m) => [m.id, m])) }),
})));
