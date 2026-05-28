// Room A shell — reinfa pilot glasshouse, ground floor.
// Real measurements (LOCALISATION.md uses metric / Australia uses metric):
//   Internal footprint:  4,950 mm × 3,550 mm
//   Ceiling height:      3,000 mm
//   1 Babylon unit = 1 metre.
//
// Coordinate system convention (right-handed):
//   X+ : floor-plan "right" (long axis, 4.95 m)
//   Y+ : up
//   Z+ : floor-plan "down" (short axis, 3.55 m)
//   Origin (0,0,0) = ground-level centre of the room footprint.
//
// Lighting (ceiling strips, LED grow lights, daylight) lives in lighting.ts.

import {
  Color3,
  CSG,
  type Mesh,
  MeshBuilder,
  type Scene,
  StandardMaterial,
  Vector3,
} from '@babylonjs/core';

export const ROOM_DIMS = {
  widthM: 4.95,
  depthM: 3.55,
  heightM: 3.0,
  wallThicknessM: 0.08,
} as const;

const DOOR = {
  widthM: 0.9,
  heightM: 2.1,
} as const;

const WINDOW = {
  /** Long window on the back (north) wall — that's where the city view lives. */
  widthM: 3.6,
  heightM: 1.7,
  sillM: 0.9,
} as const;

export interface BuildRoomOptions {
  /** Hide the ceiling so an arc camera can look in from above. Default false. */
  readonly ceilingVisible?: boolean;
  /**
   * Hide the wall closest to the camera so we get a cutaway / dollhouse view.
   * Set to the wall facing the camera. Default 'south' (matches the reference).
   */
  readonly cutawayWall?: 'north' | 'south' | 'east' | 'west' | 'none';
}

export interface BuiltRoom {
  readonly floor: Mesh;
  readonly ceiling: Mesh;
  readonly walls: Mesh[];
  readonly dimensions: typeof ROOM_DIMS;
}

function buildMaterials(scene: Scene): {
  floor: StandardMaterial;
  ceiling: StandardMaterial;
  wall: StandardMaterial;
} {
  // Light tiled floor — pale grey, slightly off-white.
  const floor = new StandardMaterial('mat-floor', scene);
  floor.diffuseColor = new Color3(0.78, 0.79, 0.81);
  floor.specularColor = new Color3(0.18, 0.18, 0.18);
  floor.specularPower = 64;

  // White acoustic-tile ceiling.
  const ceiling = new StandardMaterial('mat-ceiling', scene);
  ceiling.diffuseColor = new Color3(0.95, 0.96, 0.97);
  ceiling.specularColor = new Color3(0, 0, 0);

  // Painted plasterboard — warm white.
  const wall = new StandardMaterial('mat-wall', scene);
  wall.diffuseColor = new Color3(0.93, 0.93, 0.92);
  wall.specularColor = new Color3(0.04, 0.04, 0.04);
  // Ever so slight ambient so corners don't go pure black.
  wall.ambientColor = new Color3(0.25, 0.25, 0.26);

  return { floor, ceiling, wall };
}

export function buildRoom(scene: Scene, opts: BuildRoomOptions = {}): BuiltRoom {
  const { widthM: W, depthM: D, heightM: H, wallThicknessM: T } = ROOM_DIMS;
  const mats = buildMaterials(scene);
  const cutaway = opts.cutawayWall ?? 'south';

  const floor = MeshBuilder.CreateBox('room-floor', { width: W, depth: D, height: 0.05 }, scene);
  floor.position.y = -0.025;
  floor.material = mats.floor;
  floor.receiveShadows = true;

  const ceiling = MeshBuilder.CreateBox(
    'room-ceiling',
    { width: W, depth: D, height: 0.05 },
    scene,
  );
  ceiling.position.y = H + 0.025;
  ceiling.material = mats.ceiling;
  ceiling.isVisible = opts.ceilingVisible ?? true;

  // Walls. The wall on the side nearest the camera gets hidden so the
  // viewer can see in (dollhouse cut). Window goes on the back wall.

  // North wall — back of the room — gets the long window cut out.
  const wallNorthSolid = MeshBuilder.CreateBox(
    'wall-north-solid',
    { width: W, depth: T, height: H },
    scene,
  );
  wallNorthSolid.position = new Vector3(0, H / 2, -D / 2 - T / 2);
  const windowCutter = MeshBuilder.CreateBox(
    'window-cutter',
    {
      width: WINDOW.widthM,
      depth: T * 3,
      height: WINDOW.heightM,
    },
    scene,
  );
  windowCutter.position = new Vector3(0, WINDOW.sillM + WINDOW.heightM / 2, -D / 2 - T / 2);
  const wallNorthCsg = CSG.FromMesh(wallNorthSolid).subtract(CSG.FromMesh(windowCutter));
  const wallNorth = wallNorthCsg.toMesh('wall-north', mats.wall, scene, true);
  wallNorthSolid.dispose();
  windowCutter.dispose();

  // South wall — front (camera-side) — solid in geometry, hidden when cutaway.
  const wallSouth = MeshBuilder.CreateBox('wall-south', { width: W, depth: T, height: H }, scene);
  wallSouth.position = new Vector3(0, H / 2, D / 2 + T / 2);

  // East wall — door cutout.
  const wallEastSolid = MeshBuilder.CreateBox(
    'wall-east-solid',
    { width: T, depth: D, height: H },
    scene,
  );
  wallEastSolid.position = new Vector3(W / 2 + T / 2, H / 2, 0);
  const doorCutter = MeshBuilder.CreateBox(
    'door-cutter',
    { width: T * 3, depth: DOOR.widthM, height: DOOR.heightM },
    scene,
  );
  doorCutter.position = new Vector3(W / 2 + T / 2, DOOR.heightM / 2, D / 2 - DOOR.widthM / 2 - 0.1);
  const wallEastCsg = CSG.FromMesh(wallEastSolid).subtract(CSG.FromMesh(doorCutter));
  const wallEast = wallEastCsg.toMesh('wall-east', mats.wall, scene, true);
  wallEastSolid.dispose();
  doorCutter.dispose();

  const wallWest = MeshBuilder.CreateBox('wall-west', { width: T, depth: D, height: H }, scene);
  wallWest.position = new Vector3(-W / 2 - T / 2, H / 2, 0);

  const walls = [wallNorth, wallSouth, wallEast, wallWest];
  for (const w of walls) {
    w.material = mats.wall;
    w.receiveShadows = true;
  }

  // Apply cutaway — hide the wall(s) facing the viewer.
  const cutawayMap: Record<string, Mesh | null> = {
    north: wallNorth,
    south: wallSouth,
    east: wallEast,
    west: wallWest,
    none: null,
  };
  const hidden = cutawayMap[cutaway];
  if (hidden) hidden.isVisible = false;

  // Add a simple glazed window panel inside the cutout, mostly transparent,
  // so the daylight backdrop reads through it as "view".
  const glass = new StandardMaterial('mat-glass', scene);
  glass.diffuseColor = new Color3(0.7, 0.8, 0.9);
  glass.alpha = 0.18;
  glass.specularColor = new Color3(0.6, 0.6, 0.7);
  glass.specularPower = 96;
  glass.backFaceCulling = false;
  const windowGlass = MeshBuilder.CreatePlane(
    'window-glass',
    { width: WINDOW.widthM, height: WINDOW.heightM },
    scene,
  );
  windowGlass.position = new Vector3(0, WINDOW.sillM + WINDOW.heightM / 2, -D / 2 - T / 2);
  windowGlass.rotation.y = Math.PI;
  windowGlass.material = glass;

  return {
    floor,
    ceiling,
    walls,
    dimensions: ROOM_DIMS,
  };
}
