// Procedural butter-lettuce plants — one merged base mesh of leaves around a
// small inner sphere, instanced via Babylon thinInstance buffers so we can
// render ~50 heads across 8 plots without per-plant draw calls.
//
// Fidelity ceiling: this is a procedural pompom of leaves, not a Blender
// butter-lettuce. From the orbit camera it reads as a lettuce head; up close
// it would not. The real Blender glTF lands in PR 80 (PLAN.md Phase 2E) and
// will slot in by swapping `buildLeafBaseMesh` for an imported asset and
// reusing the same thinInstance buffer plumbing.
//
// Plot ↔ bed mapping (BFF emits 8 plot IDs, see plants-singleton.ts):
//   r01 = left rack, r02 = right rack.
//   p1 = tier 0, front bed.   p2 = tier 0, back bed.
//   p3 = tier 1, front bed.   p4 = tier 1, back bed.
import {
  Matrix,
  Mesh,
  MeshBuilder,
  Quaternion,
  type Scene,
  type TransformNode,
  Vector3,
} from '@babylonjs/core';

import { getMaterials } from './materials';

export interface PlantsAccessor {
  /** Update the cluster mesh for a given plot based on canopy fraction (0..1). */
  setFraction: (plotId: string, fraction: number) => void;
  /**
   * Update per-plot colour-health tint (0..1). 1 = vivid green, 0 = chlorotic
   * yellow. Stored in a per-instance colour buffer applied at draw time.
   */
  setColorHealth: (plotId: string, value: number) => void;
  /**
   * Scenario focus pivot. Scales the colour-buffer RGB *around the
   * neutral 0.5 midpoint*: `v' = 0.5 + (v − 0.5) × mul`.
   *   mul = 1 → unchanged
   *   mul > 1 (e.g. 1.3) → contrast boost: vivid plots become more
   *     vivid, chlorotic plots become more chlorotic. Used by the
   *     crop-compare scenario to make per-plot differences pop.
   *   mul < 1 (e.g. 0.5) → contrast collapses toward neutral grey.
   * Re-applies to every plot using its last setColorHealth value.
   */
  setFocusPivot: (mul: number) => void;
  /** All plant root meshes — pass to LED PointLight.includedOnlyMeshes. */
  readonly plantMeshes: readonly Mesh[];
  /** Dispose every mesh. Used on scene teardown. */
  dispose: () => void;
}

export interface BuildPlantsOptions {
  /**
   * Per-rack bed anchors, keyed by rack id ('r01', 'r02').
   * bedAnchors[rackId][tier][bedIndex] = world-space TransformNode at the bed
   * surface centre. Provided by racks.ts.
   */
  readonly anchorsByRack: ReadonlyMap<string, readonly TransformNode[][]>;
}

/**
 * Plot suffix → (tier, slotX) inside its rack. Phase 2 (experimental
 * platform): 24 plots per scene (2 racks × 2 growing tiers × 6 plots along
 * the bed length). Tier 0 (bottom) remains storage — no plants.
 *
 * Plot ID shape: `pilot.syd.a.{rackId}.{bedKey}.{plotKey}` where
 *   - bedKey ∈ { 'b1' (= middle tier 1), 'b2' (= top tier 2) }
 *   - plotKey ∈ { 'p1', ..., 'p6' } (six plots along bed X length)
 *
 * The map key is the suffix `{bedKey}.{plotKey}`.
 */
const PLOT_SUFFIX_TO_SLOT: ReadonlyMap<string, { readonly tier: number; readonly slotX: number }> =
  new Map([
    ['b1.p1', { tier: 1, slotX: 0 }],
    ['b1.p2', { tier: 1, slotX: 1 }],
    ['b1.p3', { tier: 1, slotX: 2 }],
    ['b1.p4', { tier: 1, slotX: 3 }],
    ['b1.p5', { tier: 1, slotX: 4 }],
    ['b1.p6', { tier: 1, slotX: 5 }],
    ['b2.p1', { tier: 2, slotX: 0 }],
    ['b2.p2', { tier: 2, slotX: 1 }],
    ['b2.p3', { tier: 2, slotX: 2 }],
    ['b2.p4', { tier: 2, slotX: 3 }],
    ['b2.p5', { tier: 2, slotX: 4 }],
    ['b2.p6', { tier: 2, slotX: 5 }],
  ]);

const RACK_IDS = ['r01', 'r02'] as const;

const BED_WIDTH_M = 3.2;
const PLOTS_PER_BED = 6;
const PLOT_SLOT_WIDTH_M = BED_WIDTH_M / PLOTS_PER_BED; // ≈ 0.533

// 6 plants per plot in a 3 × 2 grid (3 along bed length × 2 across depth).
const PLANTS_PER_PLOT = 6;
const GRID_COLS = 3;
const GRID_ROWS = 2;
const COL_SPACING_M = 0.15;
const ROW_SPACING_M = 0.3;

// Demo-scale: real butter lettuce caps at ~14 cm canopy, but at the room
// orbit distance that would render as a few pixels. We render bigger so a
// non-touring viewer can see the growth signal clearly. Photo-real scale
// returns with the Blender mesh in PR 80 paired with a closer subscriber
// camera (PLAN.md Phase 6).
const SEED_SCALE = 0.45;
const FULL_CANOPY_SCALE = 1.2;

// Fraction used at scene boot so plants read as ~16-day mid-growth lettuce
// before any BFF tick arrives. Once tick data flows in, setFraction()
// overrides this with the simulator's value.
const INITIAL_FRACTION = 0.55;

interface PerPlotState {
  /** Matrices in world space for this plot's instances. */
  matrices: Float32Array;
  /** Per-instance RGBA colour buffer (4 floats per instance). */
  colours: Float32Array;
  /** Base (no-scale) position+rotation transforms, kept for fast scale updates. */
  baseTransforms: { pos: Vector3; rot: Quaternion; jitterScale: number }[];
  /** Index offset into the global thinInstance buffer (in matrix slots, 16 floats each). */
  bufferOffset: number;
  /** Same offset but in colour-buffer slots (4 floats each). */
  colourOffset: number;
  /** Last colour-health value applied — needed to re-derive RGB when
   *  setFocusPivot changes the contrast multiplier. */
  lastHealth: number;
}

/**
 * Build the merged base mesh — a small icosphere (the inner cluster) with a
 * fan of slightly-tilted leaf discs around its equator. All in metres.
 */
function buildLeafBaseMesh(scene: Scene): Mesh {
  // All dimensions in metres. The base mesh approximates a 16-day butter
  // lettuce head at ~10-12 cm canopy diameter; setFraction() scales it
  // between SEED_SCALE and FULL_CANOPY_SCALE on top of that.
  // A small black-ish "net-pot cup" sits underneath the leaves so each
  // plant reads as growing out of a hydroponic net pot rather than a bare
  // disc. The cup shares the merged leaf mesh so it scales with the plant.
  const inner = MeshBuilder.CreateIcoSphere(
    'plant-core',
    { radius: 0.025, subdivisions: 2 },
    scene,
  );

  const netPot = MeshBuilder.CreateCylinder(
    'plant-net-pot',
    { diameter: 0.04, height: 0.025, tessellation: 12 },
    scene,
  );
  netPot.position = new Vector3(0, -0.02, 0);

  const leafCount = 16;
  const leafMeshes: Mesh[] = [inner, netPot];
  for (let i = 0; i < leafCount; i++) {
    const leaf = MeshBuilder.CreateDisc(
      `plant-leaf-${i}`,
      { radius: 0.06, tessellation: 7 },
      scene,
    );
    const t = i / leafCount;
    const yaw = t * Math.PI * 2;
    const outerRing = i % 2 === 0;
    const ringRadius = outerRing ? 0.045 : 0.028;
    const liftY = outerRing ? 0.006 : 0.022;
    const tilt = outerRing ? Math.PI / 2.3 : Math.PI / 3.2;
    leaf.position = new Vector3(Math.cos(yaw) * ringRadius, liftY, Math.sin(yaw) * ringRadius);
    leaf.rotation = new Vector3(tilt, yaw, 0);
    leafMeshes.push(leaf);
  }

  const merged = Mesh.MergeMeshes(leafMeshes, true, true, undefined, false, true);
  if (!merged) throw new Error('plants: failed to merge leaf base mesh');
  merged.name = 'plant-base';
  merged.isVisible = false; // hidden source — thinInstances do the work
  return merged;
}

function mulberry32(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function writeMatrix(
  out: Float32Array,
  offset: number,
  position: Vector3,
  rotation: Quaternion,
  scale: number,
): void {
  const m = Matrix.Compose(new Vector3(scale, scale, scale), rotation, position);
  m.copyToArray(out, offset);
}

export function buildPlants(scene: Scene, opts: BuildPlantsOptions): PlantsAccessor {
  const mats = getMaterials(scene);

  // One merged base mesh per rack (so we can scope each rack's LED PointLight
  // to that rack's instances). Two roots total → still way cheaper than 48
  // individual lettuce meshes.
  const plantMeshes: Mesh[] = [];
  const plotStates = new Map<string, PerPlotState>();
  /** Scenario focus contrast pivot — see PlantsAccessor.setFocusPivot. */
  let focusPivotMul = 1;

  /** Compute the RGB this plot should display given its last health value
   *  AND the current focus pivot, then write into the colour buffer. The
   *  caller is responsible for `thinInstanceBufferUpdated('color')`. */
  function writePlotColour(state: PerPlotState, _plotId: string): void {
    const v = state.lastHealth;
    // value=1 → green tint (1,1,1) (neutral)
    // value=0 → chlorotic yellow (1.4, 1.2, 0.55) — boosts R, lowers G/B
    const r0 = 1.0 + (1 - v) * 0.4;
    const g0 = 1.0 + (1 - v) * 0.2;
    const b0 = 1.0 - (1 - v) * 0.45;
    // Mid-point pivot scale around 0.5 — focusPivotMul=1 is identity.
    const r = 0.5 + (r0 - 0.5) * focusPivotMul;
    const g = 0.5 + (g0 - 0.5) * focusPivotMul;
    const b = 0.5 + (b0 - 0.5) * focusPivotMul;
    for (let i = 0; i < state.baseTransforms.length; i++) {
      const off = state.colourOffset + i * 4;
      state.colours[off] = r;
      state.colours[off + 1] = g;
      state.colours[off + 2] = b;
      state.colours[off + 3] = 1;
    }
  }

  for (const rackId of RACK_IDS) {
    const base = buildLeafBaseMesh(scene);
    base.name = `plant-base-${rackId}`;
    base.material = mats.leaf;
    base.isVisible = true;
    plantMeshes.push(base);

    const anchorsByTier = opts.anchorsByRack.get(rackId);
    if (!anchorsByTier) continue;

    // Allocate buffer for all instances in this rack.
    // 12 plots per rack (2 growing tiers × 6 plots/bed) × PLANTS_PER_PLOT each.
    const plotsInRack = PLOT_SUFFIX_TO_SLOT.size;
    const totalInstances = plotsInRack * PLANTS_PER_PLOT;
    const matrices = new Float32Array(totalInstances * 16);
    const colours = new Float32Array(totalInstances * 4);
    // Initialise to white (1,1,1,1) — leaf material multiplies through.
    for (let i = 0; i < totalInstances; i++) {
      colours[i * 4] = 1;
      colours[i * 4 + 1] = 1;
      colours[i * 4 + 2] = 1;
      colours[i * 4 + 3] = 1;
    }

    const rng = mulberry32(rackId === 'r01' ? 0xa1b2c3d4 : 0x5e6f7081);

    let slotIndex = 0;
    for (const [plotSuffix, { tier, slotX }] of PLOT_SUFFIX_TO_SLOT) {
      const tierAnchors = anchorsByTier[tier];
      const anchor = tierAnchors?.[0];
      if (!anchor) continue;

      anchor.computeWorldMatrix(true);
      const anchorWorldPos = anchor.getAbsolutePosition();
      const slotCentreX = (slotX - (PLOTS_PER_BED - 1) / 2) * PLOT_SLOT_WIDTH_M;
      const baseTransforms: PerPlotState['baseTransforms'] = [];
      const bufferOffset = slotIndex * 16;
      const colourOffset = slotIndex * 4;

      for (let g = 0; g < PLANTS_PER_PLOT; g++) {
        const col = g % GRID_COLS;
        const row = Math.floor(g / GRID_COLS);
        const localX = (col - (GRID_COLS - 1) / 2) * COL_SPACING_M;
        const localZ = (row - (GRID_ROWS - 1) / 2) * ROW_SPACING_M;
        const jitterX = (rng() - 0.5) * 0.04;
        const jitterZ = (rng() - 0.5) * 0.03;
        const jitterRotY = (rng() - 0.5) * Math.PI;
        const jitterScale = 0.9 + rng() * 0.2;
        const pos = new Vector3(
          anchorWorldPos.x + slotCentreX + localX + jitterX,
          anchorWorldPos.y,
          anchorWorldPos.z + localZ + jitterZ,
        );
        const rot = Quaternion.RotationAxis(new Vector3(0, 1, 0), jitterRotY);
        baseTransforms.push({ pos, rot, jitterScale });

        const initialScale =
          (SEED_SCALE + (FULL_CANOPY_SCALE - SEED_SCALE) * INITIAL_FRACTION) * jitterScale;
        writeMatrix(matrices, slotIndex * 16, pos, rot, initialScale);
        slotIndex += 1;
      }

      const plotId = `pilot.syd.a.${rackId}.${plotSuffix}`;
      plotStates.set(plotId, {
        matrices,
        colours,
        baseTransforms,
        bufferOffset,
        colourOffset,
        lastHealth: 1,
      });
    }

    base.thinInstanceSetBuffer('matrix', matrices, 16, false);
    base.thinInstanceSetBuffer('color', colours, 4, false);
    base.hasVertexAlpha = false;
    base.thinInstanceEnablePicking = false;
  }

  return {
    plantMeshes,
    setFraction(plotId, fraction) {
      const state = plotStates.get(plotId);
      if (!state) return;
      const clamped = Math.max(0, Math.min(1, fraction));
      const scaleBase = SEED_SCALE + (FULL_CANOPY_SCALE - SEED_SCALE) * clamped;
      for (let g = 0; g < state.baseTransforms.length; g++) {
        const t = state.baseTransforms[g];
        if (!t) continue;
        writeMatrix(
          state.matrices,
          state.bufferOffset + g * 16,
          t.pos,
          t.rot,
          scaleBase * t.jitterScale,
        );
      }
      // Need to identify the base mesh that owns this buffer — both rack
      // bases share their plot's plotId scheme. The first state-keyed plot
      // for r01 ends with .r01.* and for r02 with .r02.*.
      const isR02 = plotId.includes('.r02.');
      const baseMesh = plantMeshes[isR02 ? 1 : 0];
      if (baseMesh) {
        baseMesh.thinInstanceBufferUpdated('matrix');
      }
    },
    setColorHealth(plotId, value) {
      const state = plotStates.get(plotId);
      if (!state) return;
      state.lastHealth = Math.max(0, Math.min(1, value));
      writePlotColour(state, plotId);
      const isR02 = plotId.includes('.r02.');
      const baseMesh = plantMeshes[isR02 ? 1 : 0];
      if (baseMesh) baseMesh.thinInstanceBufferUpdated('color');
    },
    setFocusPivot(mul) {
      focusPivotMul = Math.max(0, mul);
      // Re-derive every plot's colour buffer with the new contrast pivot.
      // Two thinInstance buffer updates (one per rack base mesh) — cheap.
      const touchedR01 = plantMeshes[0];
      const touchedR02 = plantMeshes[1];
      for (const [plotId, state] of plotStates) writePlotColour(state, plotId);
      touchedR01?.thinInstanceBufferUpdated('color');
      touchedR02?.thinInstanceBufferUpdated('color');
    },
    dispose() {
      for (const m of plantMeshes) m.dispose();
      plantMeshes.length = 0;
      plotStates.clear();
    },
  };
}
