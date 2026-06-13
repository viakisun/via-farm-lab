// Lightweight observable store for runtime scene controls.
//
// HUD sliders + the flow-mode toggle write here; Canvas.tsx subscribes once
// at scene boot and applies the values to Babylon objects every frame's
// scene.onBeforeRender hook. Zero external deps — just a typed
// EventTarget-shaped emitter to avoid pulling in zustand/redux for four
// numbers and a boolean.
import { useEffect, useState } from 'react';

export type ViewMode = 'iso' | 'top';

export interface SceneControls {
  /** Ambient brightness — sun + hemi intensity scale. 0..1. */
  ambient: number;
  /** Grow-LED intensity scale (multiplier on per-rack PointLight). 0..1.5. */
  led: number;
  /** Bloom weight scale on the default rendering pipeline. 0..1. */
  bloom: number;
  /** Flow-mode toggle — when true, piping pulses + ambient dims. */
  flowMode: boolean;
  /**
   * Camera view mode. 'iso' = default 3/4 isometric perspective; 'top' = 2D
   * orthographic plan view from above, with the ceiling hidden so the room
   * interior reads like a floor plan.
   */
  viewMode: ViewMode;
}

const DEFAULTS: SceneControls = {
  ambient: 0.5,
  led: 0.7,
  bloom: 0.25,
  flowMode: false,
  viewMode: 'iso',
};

type Listener = (next: SceneControls) => void;

class ControlsStore {
  private state: SceneControls = { ...DEFAULTS };
  private listeners = new Set<Listener>();

  get current(): SceneControls {
    return this.state;
  }

  set(patch: Partial<SceneControls>): void {
    this.state = { ...this.state, ...patch };
    for (const l of this.listeners) l(this.state);
  }

  reset(): void {
    this.set({ ...DEFAULTS });
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
}

export const sceneControls = new ControlsStore();

/**
 * React hook — re-renders when any field changes. Returns the live state +
 * a setter so the HUD components can stay simple.
 */
export function useSceneControls(): readonly [
  SceneControls,
  (patch: Partial<SceneControls>) => void,
] {
  const [snap, setSnap] = useState<SceneControls>(sceneControls.current);
  useEffect(() => sceneControls.subscribe(setSnap), []);
  const set = (patch: Partial<SceneControls>): void => sceneControls.set(patch);
  return [snap, set];
}
