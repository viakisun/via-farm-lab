// Babylon canvas — WebGPU preferred, WebGL2 fallback. Composes the room
// shell (PR 33). Racks / equipment / plants land in subsequent PRs.
import {
  ArcRotateCamera,
  Color3,
  Color4,
  DirectionalLight,
  Engine,
  HemisphericLight,
  MeshBuilder,
  Scene,
  StandardMaterial,
  Vector3,
  WebGPUEngine,
} from '@babylonjs/core';
import { useEffect, useRef, useState, type JSX } from 'react';

import { buildRoom, ROOM_DIMS } from './room';

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

  // Arc-rotate camera framed for the whole room. Radius is roughly the
  // room diagonal so the operator can orbit while staying outside.
  const diagonal = Math.sqrt(ROOM_DIMS.widthM ** 2 + ROOM_DIMS.depthM ** 2);
  const camera = new ArcRotateCamera(
    'camera',
    Math.PI * 1.25, // alpha — front-left, looking towards the door (east) wall
    Math.PI * 0.28, // beta — slightly above so we look down into the room
    diagonal * 1.5,
    new Vector3(0, ROOM_DIMS.heightM * 0.4, 0),
    scene,
  );
  camera.attachControl(true);
  camera.minZ = 0.05;
  camera.maxZ = 100;
  camera.lowerRadiusLimit = 2;
  camera.upperRadiusLimit = 25;
  camera.wheelDeltaPercentage = 0.02;
  camera.pinchDeltaPercentage = 0.02;

  // Hemispheric fill so the inside of the room reads even without panel lights.
  const hemi = new HemisphericLight('hemi', new Vector3(0, 1, 0), scene);
  hemi.intensity = 0.65;
  hemi.groundColor = new Color3(0.15, 0.15, 0.18);

  // Soft directional sun for outside-the-room views (window casts light in
  // once the cutout is glazed in PR 34).
  const sun = new DirectionalLight('sun', new Vector3(-0.4, -1, -0.2), scene);
  sun.intensity = 0.45;
  sun.position = new Vector3(5, 8, 5);

  buildRoom(scene, { ceilingVisible: false });

  // North-arrow gizmo at the origin for orientation (gets replaced by a
  // proper compass in PR 88 dashboard).
  const arrowMat = new StandardMaterial('mat-north', scene);
  arrowMat.diffuseColor = new Color3(0.85, 0.3, 0.3);
  arrowMat.specularColor = new Color3(0, 0, 0);
  const arrow = MeshBuilder.CreateCylinder(
    'north-arrow',
    { diameterTop: 0, diameterBottom: 0.15, height: 0.3 },
    scene,
  );
  arrow.position = new Vector3(0, 0.16, -ROOM_DIMS.depthM / 2 + 0.3);
  arrow.rotation.x = Math.PI;
  arrow.material = arrowMat;

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
