import { create } from 'zustand';
import type { FsNode } from '@shared/types';

interface FsState {
  root: string | null;
  nodes: Map<string, FsNode>;
  expanded: Set<string>;
  hoverPath: string | null;
  selectedPath: string | null;

  setRoot: (root: string | null) => void;
  upsertNodes: (nodes: FsNode[]) => void;
  removeNode: (path: string) => void;
  toggleExpand: (path: string) => void;
  setExpanded: (path: string, value: boolean) => void;
  setHover: (path: string | null) => void;
  setSelected: (path: string | null) => void;
  childrenOf: (parent: string) => FsNode[];
  reset: () => void;
}

export const useFsStore = create<FsState>((set, get) => ({
  root: null,
  nodes: new Map(),
  expanded: new Set(),
  hoverPath: null,
  selectedPath: null,

  setRoot: (root) => set({ root }),
  upsertNodes: (incoming) => set((s) => {
    const next = new Map(s.nodes);
    for (const n of incoming) next.set(n.path, n);
    return { nodes: next };
  }),
  removeNode: (path) => set((s) => {
    const next = new Map(s.nodes);
    next.delete(path);
    return { nodes: next };
  }),
  toggleExpand: (path) => set((s) => {
    const e = new Set(s.expanded);
    if (e.has(path)) e.delete(path); else e.add(path);
    return { expanded: e };
  }),
  setExpanded: (path, value) => set((s) => {
    const e = new Set(s.expanded);
    if (value) e.add(path); else e.delete(path);
    return { expanded: e };
  }),
  setHover: (hoverPath) => set({ hoverPath }),
  setSelected: (selectedPath) => set({ selectedPath }),

  childrenOf: (parent) => {
    const out: FsNode[] = [];
    for (const n of get().nodes.values()) {
      if (n.parentPath === parent) out.push(n);
    }
    return out;
  },

  reset: () => set({
    root: null, nodes: new Map(), expanded: new Set(),
    hoverPath: null, selectedPath: null,
  }),
}));
