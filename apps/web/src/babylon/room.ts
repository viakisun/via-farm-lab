// Room shell — Reinfa pilot glasshouse, ground floor.
//
// Authoritative spec: [_reference/2d_layout.pdf](../../../../_reference/2d_layout.pdf) — B안.
// Main room dimensions (single room footprint):
//   Internal footprint:  4,950 mm × 3,550 mm
//   Ceiling height:      3,000 mm
//   1 Babylon unit = 1 metre.
//
// Coordinate convention (right-handed):
//   X+ : floor-plan "right" (4.95 m long axis)
//   Y+ : up
//   Z+ : floor-plan "down" (3.55 m depth axis. South wall at +Z, North wall at -Z.)
//   Origin (0,0,0) = ground-level centre of the MAIN room footprint.
//
// The annex (2,900 × 3,550) sits to the east of the main room with a dividing
// wall between them; built separately by `buildAnnex` in this same file.
//
// Lighting (sun, hemi, ceiling spots) lives in lighting.ts.
// Materials come from materials.ts (PBR factory).
import { CSG, type Mesh, MeshBuilder, type Scene, Vector3 } from '@babylonjs/core';

import { getMaterials, makeTileFloorMaterial } from './materials';

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

export interface BuildRoomOptions {
  /** Hide the ceiling so an arc camera can look in from above. Default true (visible). */
  readonly ceilingVisible?: boolean;
  /**
   * Wall to hide for the dollhouse cutaway. Locked to 'south' by convention —
   * the south wall is the office-facing glass wall (where the 43" TV mounts),
   * and the camera frames the room through it. Override only for inspector use.
   */
  readonly cutawayWall?: 'north' | 'south' | 'east' | 'west' | 'none';
  /**
   * If true, cut a door opening in the east wall near the south end. Used when
   * the annex is attached to the east — the door connects the two rooms.
   */
  readonly eastDoor?: boolean;
  /**
   * If true, cut a door opening in the west wall near the south end. Mirror of
   * eastDoor — used when the annex is attached to the west side instead.
   */
  readonly westDoor?: boolean;
  /**
   * If true, render the south wall as a glass pane (with TV bezel decoration)
   * instead of hiding it. Default true — matches the spec where the office-
   * facing front is glass + a touch-TV mounted on it.
   */
  readonly southGlass?: boolean;
  /**
   * If true, render the west wall as glass (boundary towards the adjacent
   * 재배실B that's out of current scope but visible through the glass).
   */
  readonly westGlass?: boolean;
  /**
   * If true, cut a door opening in the south wall at the dividing-wall (-X)
   * end. Used for the main-room's external entrance per 2D B안.
   */
  readonly southDoor?: boolean;
}

export interface BuiltRoom {
  readonly floor: Mesh;
  readonly ceiling: Mesh;
  readonly walls: Mesh[];
  /** All shell meshes (floor + ceiling + visible walls) — for light scoping. */
  readonly shellMeshes: Mesh[];
  readonly dimensions: typeof ROOM_DIMS;
}

export function buildRoom(scene: Scene, opts: BuildRoomOptions = {}): BuiltRoom {
  const { widthM: W, depthM: D, heightM: H, wallThicknessM: T } = ROOM_DIMS;
  const mats = getMaterials(scene);
  const cutaway = opts.cutawayWall ?? 'south';

  const floor = MeshBuilder.CreateBox('room-floor', { width: W, depth: D, height: 0.05 }, scene);
  floor.position.y = -0.025;
  // 45 cm porcelain tiles — exact cell size, edge tiles allowed to clip.
  floor.material = makeTileFloorMaterial(scene, W, D, 0.45);
  floor.receiveShadows = true;

  const ceiling = MeshBuilder.CreateBox(
    'room-ceiling',
    { width: W, depth: D, height: 0.05 },
    scene,
  );
  ceiling.position.y = H + 0.025;
  ceiling.material = mats.paintWhite;
  // Default hidden so the dollhouse interior is always readable; the spec
  // wants the "lid" always transparent. Override via opts only when needed.
  ceiling.isVisible = opts.ceilingVisible ?? false;

  // North wall — solid (no window in the B안 2D plan).
  const wallNorth = MeshBuilder.CreateBox('wall-north', { width: W, depth: T, height: H }, scene);
  wallNorth.position = new Vector3(0, H / 2, -D / 2 - T / 2);

  // South wall — solid in geometry. By default it's the office-facing glass
  // front (southGlass=true) so it stays visible; cutawayWall hides it only
  // if explicitly requested via opts.southGlass=false.
  // If opts.southDoor is true, a door opening is cut at the dividing-wall
  // (-X) end before the wall is registered downstream — matches 2D B안.
  let wallSouth: Mesh;
  if (opts.southDoor) {
    const solid = MeshBuilder.CreateBox(
      'wall-south-solid',
      { width: W, depth: T, height: H },
      scene,
    );
    solid.position = new Vector3(0, H / 2, D / 2 + T / 2);
    const doorCutter = MeshBuilder.CreateBox(
      'south-door-cutter',
      { width: DOOR.widthM, depth: T * 3, height: DOOR.heightM },
      scene,
    );
    // Door anchored flush to the dividing-wall (-X) edge — matches the 2D B안
    // layout where the doors sit immediately next to the partition.
    doorCutter.position = new Vector3(-W / 2 + DOOR.widthM / 2, DOOR.heightM / 2, D / 2 + T / 2);
    const csg = CSG.FromMesh(solid).subtract(CSG.FromMesh(doorCutter));
    wallSouth = csg.toMesh('wall-south', mats.paintWhite, scene, true);
    solid.dispose();
    doorCutter.dispose();
  } else {
    wallSouth = MeshBuilder.CreateBox('wall-south', { width: W, depth: T, height: H }, scene);
    wallSouth.position = new Vector3(0, H / 2, D / 2 + T / 2);
  }

  // East wall — optionally has a door cut for the annex pass-through.
  let wallEast: Mesh;
  if (opts.eastDoor) {
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
    doorCutter.position = new Vector3(
      W / 2 + T / 2,
      DOOR.heightM / 2,
      D / 2 - DOOR.widthM / 2 - 0.15,
    );
    const wallEastCsg = CSG.FromMesh(wallEastSolid).subtract(CSG.FromMesh(doorCutter));
    wallEast = wallEastCsg.toMesh('wall-east', mats.paintWhite, scene, true);
    wallEastSolid.dispose();
    doorCutter.dispose();
  } else {
    wallEast = MeshBuilder.CreateBox('wall-east', { width: T, depth: D, height: H }, scene);
    wallEast.position = new Vector3(W / 2 + T / 2, H / 2, 0);
  }

  let wallWest: Mesh;
  if (opts.westDoor) {
    const wallWestSolid = MeshBuilder.CreateBox(
      'wall-west-solid',
      { width: T, depth: D, height: H },
      scene,
    );
    wallWestSolid.position = new Vector3(-W / 2 - T / 2, H / 2, 0);
    const doorCutter = MeshBuilder.CreateBox(
      'west-door-cutter',
      { width: T * 3, depth: DOOR.widthM, height: DOOR.heightM },
      scene,
    );
    doorCutter.position = new Vector3(
      -W / 2 - T / 2,
      DOOR.heightM / 2,
      D / 2 - DOOR.widthM / 2 - 0.15,
    );
    const wallWestCsg = CSG.FromMesh(wallWestSolid).subtract(CSG.FromMesh(doorCutter));
    wallWest = wallWestCsg.toMesh('wall-west', mats.paintWhite, scene, true);
    wallWestSolid.dispose();
    doorCutter.dispose();
  } else {
    wallWest = MeshBuilder.CreateBox('wall-west', { width: T, depth: D, height: H }, scene);
    wallWest.position = new Vector3(-W / 2 - T / 2, H / 2, 0);
  }

  const walls = [wallNorth, wallSouth, wallEast, wallWest];
  for (const w of walls) {
    w.material = mats.paintWhite;
    w.receiveShadows = true;
  }

  // South wall material — glass by default (office-facing front).
  const southGlass = opts.southGlass ?? true;
  if (southGlass) {
    wallSouth.material = mats.glass;
  }

  // West wall — when westGlass is true, swap the material so the boundary
  // towards 재배실B (out-of-scope adjacent room) reads as a partition pane.
  const westGlass = opts.westGlass ?? false;
  if (westGlass) {
    wallWest.material = mats.glass;
  }

  // Apply cutaway only to truly hidden walls. South wall is glass-visible.
  const cutawayMap: Record<string, Mesh | null> = {
    north: wallNorth,
    south: southGlass ? null : wallSouth,
    east: wallEast,
    west: wallWest,
    none: null,
  };
  const hidden = cutawayMap[cutaway];
  if (hidden) hidden.isVisible = false;

  const shellMeshes: Mesh[] = [floor, ceiling, ...walls.filter((w) => w.isVisible)];

  return {
    floor,
    ceiling,
    walls,
    shellMeshes,
    dimensions: ROOM_DIMS,
  };
}

// ── Annex room ────────────────────────────────────────────────────────────

export const ANNEX_DIMS = {
  widthM: 2.9,
  depthM: 3.55,
  heightM: 3.0,
  wallThicknessM: 0.08,
} as const;

export interface BuildAnnexOptions {
  readonly cutawayWall?: 'north' | 'south' | 'east' | 'west' | 'none';
  readonly ceilingVisible?: boolean;
  /**
   * Which side of the main room the annex sits on. Default 'west' to match
   * the office-side viewer convention (looking from +Z, +X reads as screen
   * left). 'east' is kept for backwards compatibility.
   */
  readonly side?: 'east' | 'west';
  /**
   * If true (default), the annex's south wall renders as a glass pane to
   * match the main room's office-facing front. Setting it false reverts
   * to opaque paint (the wall will then be hidden by cutawayWall='south').
   */
  readonly southGlass?: boolean;
}

export interface BuiltAnnex {
  readonly floor: Mesh;
  readonly ceiling: Mesh;
  readonly walls: Mesh[];
  readonly shellMeshes: Mesh[];
  readonly dimensions: typeof ANNEX_DIMS;
}

/**
 * Annex room — attached to the east of the main room. The annex's west wall is
 * the same plane as the main room's east wall; both rooms share the dividing
 * wall (we build it as the main room's east wall + annex's west wall on the
 * annex side is implicit; door cut is on the main-room side via eastDoor:true).
 *
 * Annex origin in world space: centred at (mainW/2 + T + annexW/2, 0, 0).
 */
export function buildAnnex(scene: Scene, opts: BuildAnnexOptions = {}): BuiltAnnex {
  const { widthM: aW, depthM: aD, heightM: aH, wallThicknessM: aT } = ANNEX_DIMS;
  const mats = getMaterials(scene);
  const cutaway = opts.cutawayWall ?? 'south';
  const side = opts.side ?? 'west';

  const mainHalf = ROOM_DIMS.widthM / 2;
  const sideSign = side === 'west' ? -1 : 1;
  const annexCenterX = sideSign * (mainHalf + ROOM_DIMS.wallThicknessM + aW / 2);

  const floor = MeshBuilder.CreateBox('annex-floor', { width: aW, depth: aD, height: 0.05 }, scene);
  floor.position = new Vector3(annexCenterX, -0.025, 0);
  // 45 cm porcelain tiles, sized per the annex footprint so cells stay 45 cm.
  floor.material = makeTileFloorMaterial(scene, aW, aD, 0.45);
  floor.receiveShadows = true;

  const ceiling = MeshBuilder.CreateBox(
    'annex-ceiling',
    { width: aW, depth: aD, height: 0.05 },
    scene,
  );
  ceiling.position = new Vector3(annexCenterX, aH + 0.025, 0);
  ceiling.material = mats.paintWhite;
  // Default to hidden — the spec calls for an always-open dollhouse view so
  // the camera can read the room interior from above. Toggle on only for
  // debugging.
  ceiling.isVisible = opts.ceilingVisible ?? false;

  // North wall.
  const wallNorth = MeshBuilder.CreateBox(
    'annex-wall-north',
    { width: aW, depth: aT, height: aH },
    scene,
  );
  wallNorth.position = new Vector3(annexCenterX, aH / 2, -aD / 2 - aT / 2);

  // South wall — has external door near the east end.
  const wallSouthSolid = MeshBuilder.CreateBox(
    'annex-wall-south-solid',
    { width: aW, depth: aT, height: aH },
    scene,
  );
  wallSouthSolid.position = new Vector3(annexCenterX, aH / 2, aD / 2 + aT / 2);
  const doorCutter = MeshBuilder.CreateBox(
    'annex-south-door-cutter',
    { width: DOOR.widthM, depth: aT * 3, height: DOOR.heightM },
    scene,
  );
  // External door on the south wall, anchored at the **dividing-wall side**
  // of the annex (the edge adjacent to the main room) — per 2D B안 the two
  // external doors sit side by side across the dividing wall.
  // For side='west', the dividing wall is at the annex's +X edge → sideSign = -1,
  // and the door X = annexCenterX + (-sideSign) * (aW/2 - door margins).
  const towardMain = -sideSign;
  // Door flush against the dividing wall (no margin) — matches the 2D B안
  // where the two external doors sit on opposite sides of the partition.
  doorCutter.position = new Vector3(
    annexCenterX + towardMain * (aW / 2 - DOOR.widthM / 2),
    DOOR.heightM / 2,
    aD / 2 + aT / 2,
  );
  const wallSouthCsg = CSG.FromMesh(wallSouthSolid).subtract(CSG.FromMesh(doorCutter));
  const wallSouth = wallSouthCsg.toMesh('annex-wall-south', mats.paintWhite, scene, true);
  wallSouthSolid.dispose();
  doorCutter.dispose();

  // Outer wall (away from main room) — its sign matches `sideSign`.
  // The opposite wall (adjacent to main room) is skipped to avoid z-fighting
  // with the main room's east/west wall, which already separates the spaces.
  const wallOuter = MeshBuilder.CreateBox(
    side === 'west' ? 'annex-wall-west' : 'annex-wall-east',
    { width: aT, depth: aD, height: aH },
    scene,
  );
  wallOuter.position = new Vector3(annexCenterX + sideSign * (aW / 2 + aT / 2), aH / 2, 0);

  const walls = [wallNorth, wallSouth, wallOuter];
  for (const w of walls) {
    w.material = mats.paintWhite;
    w.receiveShadows = true;
  }

  // South wall = glass to match the main room's office-facing front.
  const southGlass = opts.southGlass ?? true;
  if (southGlass) {
    wallSouth.material = mats.glass;
  }

  // wallOuter sits on the side opposite to the main room. With side='west'
  // that's the annex's west wall; with side='east' it's the east wall.
  // The south wall is glass + always visible, so we skip its cutaway entry.
  const cutawayMap: Record<string, Mesh | null> = {
    north: wallNorth,
    south: southGlass ? null : wallSouth,
    east: side === 'east' ? wallOuter : null,
    west: side === 'west' ? wallOuter : null,
    none: null,
  };
  const hidden = cutawayMap[cutaway];
  if (hidden) hidden.isVisible = false;

  const shellMeshes: Mesh[] = [floor, ceiling, ...walls.filter((w) => w.isVisible)];

  return {
    floor,
    ceiling,
    walls,
    shellMeshes,
    dimensions: ANNEX_DIMS,
  };
}
