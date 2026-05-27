// Babylon canvas — WebGPU preferred, WebGL2 fallback. Boots an empty scene
// with a single rotating crate placeholder (sized to match a 1m × 1m × 1m
// reference). Real scene composition lands in PR 33+ (room shell, racks,
// plants).
import {
  ArcRotateCamera,
  Color3,
  Color4,
  Engine,
  HemisphericLight,
  MeshBuilder,
  Scene,
  StandardMaterial,
  Vector3,
  WebGPUEngine,
} from '@babylonjs/core';
import { useEffect, useRef, useState, type JSX } from 'react';

export interface CanvasProps {
  /** Optional callback so the parent can react when the engine reports ready. */
  readonly onReady?: (info: { backend: 'webgpu' | 'webgl2'; engine: Engine }) => void;
}

async function createEngine(canvas: HTMLCanvasElement): Promise<{
  engine: Engine;
  backend: 'webgpu' | 'webgl2';
}> {
  // Browsers that expose `navigator.gpu` and where Babylon's WebGPU shim works.
  if (typeof navigator !== 'undefined' && 'gpu' in navigator) {
    try {
      const webgpu = new WebGPUEngine(canvas, {
        antialias: true,
        stencil: true,
        adaptToDeviceRatio: true,
      });
      await webgpu.initAsync();
      return { engine: webgpu as unknown as Engine, backend: 'webgpu' };
    } catch {
      // Fall through to WebGL2.
    }
  }
  const engine = new Engine(canvas, true, {
    preserveDrawingBuffer: true,
    stencil: true,
    adaptToDeviceRatio: true,
  });
  return { engine, backend: 'webgl2' };
}

function buildScene(engine: Engine): Scene {
  const scene = new Scene(engine);
  // Dark background — matches LOCALISATION §4.3 dark mode 1st-class.
  scene.clearColor = new Color4(0.063, 0.078, 0.094, 1);

  const camera = new ArcRotateCamera('camera', Math.PI / 4, Math.PI / 3, 6, Vector3.Zero(), scene);
  camera.attachControl(true);
  camera.minZ = 0.1;
  camera.wheelPrecision = 30;

  const light = new HemisphericLight('hemi', new Vector3(0, 1, 0), scene);
  light.intensity = 0.95;

  const box = MeshBuilder.CreateBox('placeholder', { size: 1 }, scene);
  const mat = new StandardMaterial('placeholder-mat', scene);
  mat.diffuseColor = new Color3(0.13, 0.7, 0.45); // brand-ish emerald
  mat.specularColor = new Color3(0.2, 0.2, 0.2);
  box.material = mat;

  // Ground reference plane so the box has scale context.
  const ground = MeshBuilder.CreateGround('ground', { width: 10, height: 10 }, scene);
  const groundMat = new StandardMaterial('ground-mat', scene);
  groundMat.diffuseColor = new Color3(0.13, 0.13, 0.16);
  groundMat.specularColor = new Color3(0, 0, 0);
  ground.material = groundMat;

  scene.onBeforeRenderObservable.add(() => {
    box.rotation.y += 0.008;
    box.rotation.x += 0.003;
  });

  return scene;
}

export function BabylonCanvas({ onReady }: CanvasProps): JSX.Element {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let engineRef: Engine | null = null;
    let sceneRef: Scene | null = null;
    let cancelled = false;
    let resize: (() => void) | null = null;

    void (async () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      try {
        const { engine, backend } = await createEngine(canvas);
        if (cancelled) {
          engine.dispose();
          return;
        }
        engineRef = engine;
        const scene = buildScene(engine);
        sceneRef = scene;
        engine.runRenderLoop(() => scene.render());
        resize = () => engine.resize();
        window.addEventListener('resize', resize);
        onReady?.({ backend, engine });
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      }
    })();

    return () => {
      cancelled = true;
      if (resize) window.removeEventListener('resize', resize);
      sceneRef?.dispose();
      engineRef?.dispose();
    };
  }, [onReady]);

  if (error) {
    return (
      <div
        role="alert"
        className="absolute inset-0 grid place-items-center bg-[var(--color-bg)] text-[var(--color-danger-500)]"
      >
        <p>Failed to initialise renderer: {error}</p>
      </div>
    );
  }

  return <canvas ref={canvasRef} className="block size-full outline-none" />;
}
