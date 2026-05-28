// Room A shell — reinfa pilot glasshouse, ground floor.
// Real measurements (LOCALISATION.md uses metric / Australia uses metric):
//   Internal footprint:  4,950 mm × 3,550 mm
//   Ceiling height:      3,000 mm
//   1 Babylon unit = 1 metre.
//
// PR 33 is the geometric shell only. Lighting, doors and the window get
// PR-level fidelity in PRs 34–36. Furniture and equipment land from PR 41.
//
// Coordinate system convention (right-handed):
//   X+ : floor-plan "right" (long axis, 4.95 m)
//   Y+ : up
//   Z+ : floor-plan "down" (short axis, 3.55 m)
//   Origin (0,0,0) = ground-level centre of the room footprint.

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
  /** Long axis (X). */
  widthM: 4.95,
  /** Short axis (Z). */
  depthM: 3.55,
  /** Ceiling height (Y). */
  heightM: 3.0,
  /** Wall thickness — visual only; not load-bearing in the twin. */
  wallThicknessM: 0.1,
} as const;

const DOOR = {
  /** Standard AU internal doorway. */
  widthM: 0.9,
  heightM: 2.1,
} as const;

const WINDOW = {
  /** Long window on the back wall, sill ~0.9 m off the floor. */
  widthM: 3.0,
  heightM: 1.5,
  sillM: 0.9,
} as const;

export interface BuildRoomOptions {
  /** Hide the ceiling so an arc camera can look in from above. Default false. */
  readonly ceilingVisible?: boolean;
}

export interface BuiltRoom {
  readonly floor: Mesh;
  readonly ceiling: Mesh;
  readonly walls: Mesh[];
  readonly dimensions: typeof ROOM_DIMS;
}

/**
 * Materials. Kept inline so they're discoverable; they'll get promoted to
 * `@via-farm-lab/materials` in PR 48 when PBR materials replace these.
 */
function buildMaterials(scene: Scene): {
  floor: StandardMaterial;
  ceiling: StandardMaterial;
  wall: StandardMaterial;
} {
  const floor = new StandardMaterial('mat-floor', scene);
  floor.diffuseColor = new Color3(0.36, 0.36, 0.38); // raw concrete
  floor.specularColor = new Color3(0.05, 0.05, 0.05);

  const ceiling = new StandardMaterial('mat-ceiling', scene);
  ceiling.diffuseColor = new Color3(0.92, 0.93, 0.94); // acoustic tile white
  ceiling.specularColor = new Color3(0, 0, 0);

  const wall = new StandardMaterial('mat-wall', scene);
  wall.diffuseColor = new Color3(0.86, 0.87, 0.89); // painted plasterboard
  wall.specularColor = new Color3(0.03, 0.03, 0.03);

  return { floor, ceiling, wall };
}

/**
 * Build the room shell. Returns the assembled meshes; the caller decides
 * where to add a camera, lights, etc.
 */
export function buildRoom(scene: Scene, opts: BuildRoomOptions = {}): BuiltRoom {
  const { widthM: W, depthM: D, heightM: H, wallThicknessM: T } = ROOM_DIMS;
  const mats = buildMaterials(scene);

  // Floor — 50 mm slab visualised as a thin box so it has thickness in section.
  const floor = MeshBuilder.CreateBox('room-floor', { width: W, depth: D, height: 0.05 }, scene);
  floor.position.y = -0.025;
  floor.material = mats.floor;
  floor.receiveShadows = true;

  // Ceiling — same slab construction, optional.
  const ceiling = MeshBuilder.CreateBox(
    'room-ceiling',
    { width: W, depth: D, height: 0.05 },
    scene,
  );
  ceiling.position.y = H + 0.025;
  ceiling.material = mats.ceiling;
  ceiling.isVisible = opts.ceilingVisible ?? false;

  // Walls — four sides, thin boxes. We cut a door + window via CSG.
  const wallNorth = MeshBuilder.CreateBox('wall-north', { width: W, depth: T, height: H }, scene);
  wallNorth.position = new Vector3(0, H / 2, -D / 2 - T / 2);

  // Back wall — gets the long window cut out.
  const wallSouth = MeshBuilder.CreateBox(
    'wall-south-solid',
    { width: W, depth: T, height: H },
    scene,
  );
  wallSouth.position = new Vector3(0, H / 2, D / 2 + T / 2);
  const windowCutter = MeshBuilder.CreateBox(
    'window-cutter',
    {
      width: WINDOW.widthM,
      depth: T * 3,
      height: WINDOW.heightM,
    },
    scene,
  );
  windowCutter.position = new Vector3(0, WINDOW.sillM + WINDOW.heightM / 2, D / 2 + T / 2);
  const wallSouthCsg = CSG.FromMesh(wallSouth).subtract(CSG.FromMesh(windowCutter));
  const wallSouthCut = wallSouthCsg.toMesh('wall-south', mats.wall, scene, true);
  wallSouth.dispose();
  windowCutter.dispose();

  // East wall — gets a door cut at the right-hand end (matches Room A drawing).
  const wallEast = MeshBuilder.CreateBox(
    'wall-east-solid',
    { width: T, depth: D, height: H },
    scene,
  );
  wallEast.position = new Vector3(W / 2 + T / 2, H / 2, 0);
  const doorCutter = MeshBuilder.CreateBox(
    'door-cutter',
    { width: T * 3, depth: DOOR.widthM, height: DOOR.heightM },
    scene,
  );
  doorCutter.position = new Vector3(W / 2 + T / 2, DOOR.heightM / 2, D / 2 - DOOR.widthM / 2 - 0.1);
  const wallEastCsg = CSG.FromMesh(wallEast).subtract(CSG.FromMesh(doorCutter));
  const wallEastCut = wallEastCsg.toMesh('wall-east', mats.wall, scene, true);
  wallEast.dispose();
  doorCutter.dispose();

  const wallWest = MeshBuilder.CreateBox('wall-west', { width: T, depth: D, height: H }, scene);
  wallWest.position = new Vector3(-W / 2 - T / 2, H / 2, 0);

  for (const w of [wallNorth, wallSouthCut, wallEastCut, wallWest]) {
    w.material = mats.wall;
    w.receiveShadows = true;
  }

  return {
    floor,
    ceiling,
    walls: [wallNorth, wallSouthCut, wallEastCut, wallWest],
    dimensions: ROOM_DIMS,
  };
}
