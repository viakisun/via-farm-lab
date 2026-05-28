// Babylon canvas — WebGPU preferred, WebGL2 fallback. Composes the room
// shell (PR 33), cinematic lighting + post FX, and plants (PR 25).
import {
  ArcRotateCamera,
  Color3,
  Engine,
  MeshBuilder,
  Scene,
  StandardMaterial,
  Vector3,
  WebGPUEngine,
} from '@babylonjs/core';
import { useEffect, useRef, useState, type JSX } from 'react';

import { buildLighting } from './lighting';
import { buildPlants, PLOT_LAYOUT_INFO, type PlantsAccessor } from './plants';
import { buildRoom, ROOM_DIMS } from './room';

export interface CanvasProps {
  /** Optional callback so the parent can react when the engine reports ready. */
  readonly onReady?: (info: { backend: 'webgpu' | 'webgl2'; engine: Engine }) => void;
  /** Latest biomass snapshots (plotId → fraction). The parent owns the WS. */
  readonly plantFractions?: ReadonlyMap<string, number>;
}

async function createEngine(canvas: HTMLCanvasElement): Promise<{
  engine: Engine;
  backend: 'webgpu' | 'webgl2';
}> {
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
      // fall through
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

  // Cutaway "dollhouse" framing matching the reference render: camera in
  // front (south), elevated, looking down-and-forward at the bed area.
  // South wall is hidden by room.ts so the viewer sees in.
  // Eye-level cutaway view, looking from outside the south wall into the
  // room. Beds (y≈0.85) sit in the lower-middle of frame; ceiling strips
  // + LED bars in the upper half.
  // "Inside the room" cutaway view — south wall hidden so the viewer
  // sees in. Beds + plants centred in the lower-middle of frame.
  const camera = new ArcRotateCamera(
    'camera',
    Math.PI / 2 + 0.15,
    Math.PI * 0.42,
    3.6,
    new Vector3(-0.3, 0.85, 0),
    scene,
  );
  camera.attachControl(true);
  camera.fov = 1.15;
  camera.minZ = 0.05;
  camera.maxZ = 100;
  camera.lowerRadiusLimit = 2;
  camera.upperRadiusLimit = 16;
  camera.wheelDeltaPercentage = 0.02;
  camera.pinchDeltaPercentage = 0.02;
  camera.lowerBetaLimit = 0.1;
  camera.upperBetaLimit = Math.PI / 2 - 0.05;

  buildRoom(scene, { ceilingVisible: true, cutawayWall: 'south' });

  // Plants live in scene from the start; their scale gets driven by
  // biomass updates handed in via props.
  const plants = buildPlants(scene);
  scene.metadata = { plants };

  buildLighting(scene, engine, {
    bedRowsZ: PLOT_LAYOUT_INFO.bedRowsZ,
    bedSpanX: PLOT_LAYOUT_INFO.bedSpanX,
  });

  // Tiny orientation gizmo at the origin — easy to remove once the
  // dashboard compass arrives (PR 88).
  const arrowMat = new StandardMaterial('mat-north', scene);
  arrowMat.diffuseColor = new Color3(0.85, 0.3, 0.3);
  arrowMat.specularColor = new Color3(0, 0, 0);
  const arrow = MeshBuilder.CreateCylinder(
    'north-arrow',
    { diameterTop: 0, diameterBottom: 0.08, height: 0.2 },
    scene,
  );
  arrow.position = new Vector3(0, 0.11, -ROOM_DIMS.depthM / 2 + 0.18);
  arrow.rotation.x = Math.PI;
  arrow.material = arrowMat;

  return scene;
}

export function BabylonCanvas({ onReady, plantFractions }: CanvasProps): JSX.Element {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const sceneRef = useRef<Scene | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let engineRef: Engine | null = null;
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
        sceneRef.current = scene;
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
      sceneRef.current?.dispose();
      engineRef?.dispose();
    };
  }, [onReady]);

  useEffect(() => {
    if (!plantFractions) return;
    const scene = sceneRef.current;
    if (!scene) return;
    const meta = scene.metadata as { plants?: PlantsAccessor } | undefined;
    if (!meta?.plants) return;
    for (const [plotId, fraction] of plantFractions) {
      meta.plants.setFraction(plotId, fraction);
    }
  }, [plantFractions]);

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
