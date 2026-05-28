// Procedural plant placeholders (PR 25).
//
// We render each plot as a low-poly cluster — a flattened sphere mesh
// that scales horizontally with the canopy fraction (0..1). Lighting
// from the room shell already gives it depth. Photoreal butter lettuce
// modelling lands in PR 80 (Blender glTF) and uses thinInstance.
//
// Layout: 2 rows × 4 columns on the floor of Room A. Real bed positions
// arrive when Console plot data wires in (PR 36 area). Until then this
// hardcoded grid matches what plants-singleton.ts seeds.
import {
  Color3,
  type Mesh,
  MeshBuilder,
  type Scene,
  StandardMaterial,
  Vector3,
} from '@babylonjs/core';

import { ROOM_DIMS } from './room';

export interface PlantsAccessor {
  /** Update the cluster mesh for a given plot based on canopy fraction (0..1). */
  setFraction: (plotId: string, fraction: number) => void;
  /** Dispose every mesh. Used on scene teardown. */
  dispose: () => void;
}

const PLOT_LAYOUT = [
  { id: 'pilot.syd.a.r01.b1.p1', col: 0, row: 0 },
  { id: 'pilot.syd.a.r01.b1.p2', col: 1, row: 0 },
  { id: 'pilot.syd.a.r01.b1.p3', col: 2, row: 0 },
  { id: 'pilot.syd.a.r01.b1.p4', col: 3, row: 0 },
  { id: 'pilot.syd.a.r02.b1.p1', col: 0, row: 1 },
  { id: 'pilot.syd.a.r02.b1.p2', col: 1, row: 1 },
  { id: 'pilot.syd.a.r02.b1.p3', col: 2, row: 1 },
  { id: 'pilot.syd.a.r02.b1.p4', col: 3, row: 1 },
] as const;

const PLOT_SPACING = {
  /** X distance between plots within a bed. */
  colM: 0.7,
  /** Z distance between the two rack rows. */
  rowM: 1.2,
  /** Bed surface height above the floor (matches future rack tier 1). */
  surfaceY: 0.85,
} as const;

// NOTE: these are demo-scale, not photo-real. Real butter lettuce maxes
// out at ~14 cm canopy radius — far too small to read at room-level zoom.
// Once Babylon PBR materials + LOD textures land (PR 48 area) we drop these
// down to true scale and rely on the close-up "subscriber" camera for detail.
const CANOPY_MAX_RADIUS_M = 0.28; // 2× real for demo legibility
const SEED_RADIUS_M = 0.04;

export function buildPlants(scene: Scene): PlantsAccessor {
  const mat = new StandardMaterial('mat-butter-lettuce', scene);
  mat.diffuseColor = new Color3(0.28, 0.62, 0.27); // mid-green butter lettuce
  mat.specularColor = new Color3(0.05, 0.1, 0.05);
  mat.ambientColor = new Color3(0.18, 0.4, 0.18);

  const meshes = new Map<string, Mesh>();

  for (const slot of PLOT_LAYOUT) {
    const mesh = MeshBuilder.CreateSphere(`plant-${slot.id}`, { diameter: 1, segments: 16 }, scene);
    mesh.material = mat;
    // Flatten the sphere into a head-of-lettuce dome shape.
    mesh.scaling = new Vector3(SEED_RADIUS_M * 2, SEED_RADIUS_M * 1.2, SEED_RADIUS_M * 2);
    // Centre the bed grid in the room (X = 0, Z = 0 = room centre).
    const totalCols = 4;
    const totalRows = 2;
    const x = (slot.col - (totalCols - 1) / 2) * PLOT_SPACING.colM;
    const z = (slot.row - (totalRows - 1) / 2) * PLOT_SPACING.rowM;
    mesh.position = new Vector3(x, PLOT_SPACING.surfaceY, z);
    meshes.set(slot.id, mesh);
  }

  // Bed surfaces underneath — single boxes per row. Replaced by the real
  // rack model in PR 41.
  const bedMat = new StandardMaterial('mat-bed', scene);
  bedMat.diffuseColor = new Color3(0.22, 0.24, 0.28);
  bedMat.specularColor = new Color3(0, 0, 0);

  for (let row = 0; row < 2; row++) {
    const bed = MeshBuilder.CreateBox(
      `bed-row-${row}`,
      {
        width: PLOT_SPACING.colM * 4 + 0.4,
        depth: PLOT_SPACING.colM,
        height: 0.05,
      },
      scene,
    );
    bed.position = new Vector3(0, PLOT_SPACING.surfaceY - 0.03, (row - 0.5) * PLOT_SPACING.rowM);
    bed.material = bedMat;
    // Cap aspect ratio so the bed reads as a rectangle, not a tray.
    bed.scaling.z = 0.7;
  }

  // Sanity check the room is wide enough for the layout.
  const required = PLOT_SPACING.colM * 4 + 0.4;
  if (required > ROOM_DIMS.widthM) {
    console.warn(
      `[plants] bed width ${required.toFixed(2)}m exceeds room width ${ROOM_DIMS.widthM}m`,
    );
  }

  return {
    setFraction(plotId: string, fraction: number): void {
      const mesh = meshes.get(plotId);
      if (!mesh) return;
      const clamped = Math.max(0, Math.min(1, fraction));
      // Interpolate between seed and full-canopy.
      const radius = SEED_RADIUS_M + (CANOPY_MAX_RADIUS_M - SEED_RADIUS_M) * clamped;
      // Vertical dome height grows roughly half as fast as horizontal radius.
      const height = radius * 0.8;
      mesh.scaling.set(radius * 2, height * 2, radius * 2);
    },
    dispose(): void {
      for (const mesh of meshes.values()) {
        mesh.dispose();
      }
      meshes.clear();
      mat.dispose();
      bedMat.dispose();
    },
  };
}
