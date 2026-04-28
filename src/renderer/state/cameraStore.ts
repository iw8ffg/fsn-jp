import { create } from 'zustand';

interface CameraState {
  focusPath: string | null;
  setFocus: (path: string | null) => void;
}

export const useCameraStore = create<CameraState>((set) => ({
  focusPath: null,
  setFocus: (focusPath) => set({ focusPath }),
}));
