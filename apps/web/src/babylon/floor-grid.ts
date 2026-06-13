// Floor tile grid — straight lines drawn on top of the floor at a fixed
// world-space interval. Used instead of a tiled albedo texture so the grid
// can be anchored to a specific corner (NW = sink) and stay exactly
// `cellSizeM` apart across the whole footprint regardless of room size or
// the dividing wall between main and annex.
//
// Lines are LineSystem meshes (cheap, single draw call) painted just above
// the floor surface (Y = 0.011 m). Cells at the room edges may be partially
// clipped — that's intentional and matches the user spec ("잘려도 좋으니
// 빈틈없이").
import {
  Color3,
  type LinesMesh,
  MeshBuilder,
  type Scene,
  TransformNode,
  Vector3,
} from '@babylonjs/core';

export interface BuildFloorGridOptions {
  /** Cell edge length in metres. Default 0.5 = 50 cm. */
  readonly cellSizeM?: number;
  /** World position of the grid origin (top-left corner). Lines emanate
   *  from this point. Default anchors to the main-room NW corner. */
  readonly origin: { readonly x: number; readonly z: number };
  /** Bounding box the grid should cover, in world space. */
  readonly extent: {
    readonly xMin: number;
    readonly xMax: number;
    readonly zMin: number;
    readonly zMax: number;
  };
  /** Y height of the line plane (just above floor). Default 0.011 m. */
  readonly y?: number;
  /** Line colour. Default a darker shade of the floor base. */
  readonly colour?: Color3;
}

export interface BuiltFloorGrid {
  readonly root: TransformNode;
  readonly lines: LinesMesh;
}

export function buildFloorGrid(scene: Scene, opts: BuildFloorGridOptions): BuiltFloorGrid {
  const cellSize = opts.cellSizeM ?? 0.5;
  const y = opts.y ?? 0.011;
  const colour = opts.colour ?? new Color3(0.34, 0.36, 0.39);
  const { xMin, xMax, zMin, zMax } = opts.extent;
  const { x: ox, z: oz } = opts.origin;

  const root = new TransformNode('floor-grid', scene);

  const lines: Vector3[][] = [];

  // Lines parallel to Z (constant X), spaced cellSize from origin.x going
  // through xMin..xMax. Origin counts as a line itself.
  const xs = new Set<number>();
  // Walk -X from origin
  for (let x = ox; x >= xMin - 1e-6; x -= cellSize) xs.add(+x.toFixed(4));
  // Walk +X from origin (for completeness if origin sits inside extent)
  for (let x = ox; x <= xMax + 1e-6; x += cellSize) xs.add(+x.toFixed(4));
  // Add the actual room edges so the boundary itself is outlined.
  xs.add(+xMin.toFixed(4));
  xs.add(+xMax.toFixed(4));
  for (const x of xs) {
    if (x < xMin - 1e-6 || x > xMax + 1e-6) continue;
    lines.push([new Vector3(x, y, zMin), new Vector3(x, y, zMax)]);
  }

  // Lines parallel to X (constant Z), spaced cellSize from origin.z going
  // through zMin..zMax.
  const zs = new Set<number>();
  for (let z = oz; z <= zMax + 1e-6; z += cellSize) zs.add(+z.toFixed(4));
  for (let z = oz; z >= zMin - 1e-6; z -= cellSize) zs.add(+z.toFixed(4));
  zs.add(+zMin.toFixed(4));
  zs.add(+zMax.toFixed(4));
  for (const z of zs) {
    if (z < zMin - 1e-6 || z > zMax + 1e-6) continue;
    lines.push([new Vector3(xMin, y, z), new Vector3(xMax, y, z)]);
  }

  const linesMesh = MeshBuilder.CreateLineSystem('floor-grid-lines', { lines }, scene);
  linesMesh.color = colour;
  linesMesh.parent = root;
  linesMesh.isPickable = false;

  return { root, lines: linesMesh };
}
