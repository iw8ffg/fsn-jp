import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';

interface CameraState {
  focusPath: string | null;
  /** Slider-normalized flight speed in [0,1]; 0 = slow (long flyTo), 1 = fast. */
  flightSpeed: number;
  /** Camera orbit distance in world units (clamped 5..1000 by controller). */
  zoomLevel: number;
  /** Most recent camera speed in units/sec, throttled by SceneController. */
  speed: number;

  setFocus: (path: string | null) => void;
  setFlightSpeed: (v: number) => void;
  setZoomLevel: (v: number) => void;
  setSpeed: (v: number) => void;
}

export const useCameraStore = create<CameraState>()(subscribeWithSelector((set) => ({
  focusPath: null,
  flightSpeed: 0.5,
  zoomLevel: 50,
  speed: 0,

  setFocus: (focusPath) => set({ focusPath }),
  setFlightSpeed: (flightSpeed) => set({ flightSpeed }),
  setZoomLevel: (zoomLevel) => set({ zoomLevel }),
  setSpeed: (speed) => set({ speed }),
})));
