// PBR material factory for the Reinfa Pilot Glasshouse scene.
//
// Every visible surface in the rebuilt scene (room shell, racks, equipment,
// plants, glass partition) goes through one of these factories so colour and
// roughness stay consistent.
//
// Materials are memoised per-scene — the first call creates them, every later
// call returns the same instance. Disposed automatically when the scene goes.
//
// Notes on the choices:
//   - All PBR mats set maxSimultaneousLights = 8 so we don't hit Babylon's
//     default 4-light-per-mesh limit (the room has ~14 lights: sun + hemi +
//     4 ceiling spots + 8 LED point lights). See racks.ts/lighting.ts for the
//     includedOnlyMeshes scoping that keeps each mesh under the cap.
//   - Procedural patterns use DynamicTexture (canvas API) — no shader code,
//     no external assets, no Cloudflare R2 hosting needed.
//   - Glass uses alpha blending only, not refraction — refraction is too
//     expensive for two large glass surfaces (north window + partition).
import { Color3, DynamicTexture, PBRMaterial, type Scene } from '@babylonjs/core';
// Side-effect import: attaches createDefaultEnvironment / createDefaultSkybox
// onto Scene.prototype. Without this our setupEnvironment() call is undefined
// at runtime even though TypeScript would let us call it.
import '@babylonjs/core/Helpers/sceneHelpers';

interface MaterialBundle {
  readonly tile: PBRMaterial;
  readonly paintWhite: PBRMaterial;
  readonly glass: PBRMaterial;
  readonly alumProfile: PBRMaterial;
  readonly stainless: PBRMaterial;
  readonly glossWhite: PBRMaterial;
  readonly translucentPE: PBRMaterial;
  readonly co2Cylinder: PBRMaterial;
  readonly leaf: PBRMaterial;
  readonly ledPink: PBRMaterial;
  readonly fluorescent: PBRMaterial;
  /** Hole-grid panel — white PVC plate with square holes for net cups (DFT lid). */
  readonly bedPanel: PBRMaterial;
  /** Basin — solid white PVC body that holds the nutrient solution. */
  readonly basinPVC: PBRMaterial;
  /** Basin south wall variant with Reinfa branding decal painted on. */
  readonly basinPVCBranded: PBRMaterial;
  /** Nutrient water surface — semi-transparent cyan-green plane inside the basin. */
  readonly nutrientWater: PBRMaterial;
  /** Net-pot cup — matte black PE plastic. */
  readonly netPotBlack: PBRMaterial;
  /** Reinfa brand green — used on corner caps and tier labels. */
  readonly reinfaGreen: PBRMaterial;
  /** Fan housing — dark grey/black with slight metallic edge. */
  readonly fanGrille: PBRMaterial;
  /** Rubber wheel for the rack base transport rail. */
  readonly rubberWheel: PBRMaterial;
}

const cache = new WeakMap<Scene, MaterialBundle>();

const MAX_LIGHTS = 8;

/**
 * Install a minimal procedural environment so PBR materials get sensible
 * reflections without an external HDR asset. Babylon's createDefaultEnvironment
 * generates a prefiltered cube map internally and assigns scene.environmentTexture,
 * which all PBRMaterials automatically sample for indirect diffuse + specular.
 *
 * skyboxSize: 0  -> no visible skybox mesh (we already have our own clear colour
 *                   + procedural city skyline). createGround: false for the same.
 *
 * Bundle cost: ~70KB BRDF LUT shipped by Babylon, well worth it: stainless reads
 * as metal, glass picks up edge highlights, gloss white catches a fresnel sheen.
 */
function setupEnvironment(scene: Scene): void {
  if (scene.environmentTexture) return;
  scene.createDefaultEnvironment({
    skyboxSize: 0,
    createGround: false,
    createSkybox: false,
  });
}

/** Resolve the shared material bundle for a scene, creating it on first use. */
export function getMaterials(scene: Scene): MaterialBundle {
  const existing = cache.get(scene);
  if (existing) return existing;
  setupEnvironment(scene);
  const bundle: MaterialBundle = {
    tile: makeTile(scene),
    paintWhite: makePaintWhite(scene),
    glass: makeGlass(scene),
    alumProfile: makeAlumProfile(scene),
    stainless: makeStainless(scene),
    glossWhite: makeGlossWhite(scene),
    translucentPE: makeTranslucentPE(scene),
    co2Cylinder: makeCO2Cylinder(scene),
    leaf: makeLeaf(scene),
    ledPink: makeLEDPink(scene),
    fluorescent: makeFluorescent(scene),
    bedPanel: makeBedPanel(scene),
    basinPVC: makeBasinPVC(scene),
    basinPVCBranded: makeBasinPVCBranded(scene),
    nutrientWater: makeNutrientWater(scene),
    netPotBlack: makeNetPotBlack(scene),
    reinfaGreen: makeReinfaGreen(scene),
    fanGrille: makeFanGrille(scene),
    rubberWheel: makeRubberWheel(scene),
  };
  cache.set(scene, bundle);
  return bundle;
}

function makeTile(scene: Scene): PBRMaterial {
  // Placeholder kept in the bundle for backwards compat; floors actually use
  // makeTileFloorMaterial() which sizes the cells precisely per mesh.
  return makeTileFloorMaterial(scene, 4.95, 3.55, 0.45);
}

/**
 * Plain solid-colour floor material. The visible tile grid is rendered as a
 * separate LineSystem on top of the floor (see buildFloorGrid in
 * floor-grid.ts) so the lines stay exactly N cm apart and start from a
 * world-anchored origin (e.g. the NW corner near the sink) — texture-based
 * tiling can't pin its origin precisely without per-mesh UV math.
 *
 * Signature kept (widthM/depthM/cellSizeM) so existing callers compile;
 * args are unused now.
 */
export function makeTileFloorMaterial(
  scene: Scene,
  _widthM: number,
  _depthM: number,
  _cellSizeM = 0.5,
): PBRMaterial {
  const mat = new PBRMaterial('mat-floor', scene);
  mat.albedoColor = new Color3(0.42, 0.45, 0.5);
  mat.metallic = 0.0;
  mat.roughness = 0.6;
  mat.maxSimultaneousLights = MAX_LIGHTS;
  return mat;
}

function makePaintWhite(scene: Scene): PBRMaterial {
  // Dark grey "painted" walls — a near-white albedo (0.94) was sending
  // 99 % of the LED pink straight back into the camera, flooding the room.
  // Charcoal grey lets the LED bars stay the brightest things on screen
  // while the wall surface still reads cleanly.
  const mat = new PBRMaterial('mat-paint-white', scene);
  mat.albedoColor = new Color3(0.15, 0.16, 0.18);
  mat.metallic = 0.0;
  mat.roughness = 0.9;
  mat.maxSimultaneousLights = MAX_LIGHTS;
  return mat;
}

function makeGlass(scene: Scene): PBRMaterial {
  const mat = new PBRMaterial('mat-glass', scene);
  mat.albedoColor = new Color3(0.78, 0.85, 0.92);
  mat.metallic = 0.0;
  mat.roughness = 0.08;
  mat.alpha = 0.13;
  mat.transparencyMode = PBRMaterial.PBRMATERIAL_ALPHABLEND;
  mat.backFaceCulling = false;
  mat.maxSimultaneousLights = MAX_LIGHTS;
  return mat;
}

function makeAlumProfile(scene: Scene): PBRMaterial {
  const mat = new PBRMaterial('mat-alum-profile', scene);
  mat.albedoColor = new Color3(0.55, 0.58, 0.62);
  mat.metallic = 0.9;
  mat.roughness = 0.28;
  mat.maxSimultaneousLights = MAX_LIGHTS;
  return mat;
}

function makeStainless(scene: Scene): PBRMaterial {
  const mat = new PBRMaterial('mat-stainless', scene);
  mat.albedoColor = new Color3(0.82, 0.83, 0.84);
  mat.metallic = 1.0;
  mat.roughness = 0.22;
  mat.maxSimultaneousLights = MAX_LIGHTS;
  return mat;
}

function makeGlossWhite(scene: Scene): PBRMaterial {
  const mat = new PBRMaterial('mat-gloss-white', scene);
  mat.albedoColor = new Color3(0.96, 0.96, 0.97);
  mat.metallic = 0.05;
  mat.roughness = 0.28;
  mat.clearCoat.isEnabled = true;
  mat.clearCoat.intensity = 0.4;
  mat.clearCoat.roughness = 0.15;
  mat.maxSimultaneousLights = MAX_LIGHTS;
  return mat;
}

function makeTranslucentPE(scene: Scene): PBRMaterial {
  const mat = new PBRMaterial('mat-translucent-pe', scene);
  mat.albedoColor = new Color3(0.78, 0.86, 0.92);
  mat.metallic = 0.0;
  mat.roughness = 0.45;
  mat.alpha = 0.55;
  mat.transparencyMode = PBRMaterial.PBRMATERIAL_ALPHABLEND;
  mat.backFaceCulling = false;
  mat.maxSimultaneousLights = MAX_LIGHTS;
  return mat;
}

function makeCO2Cylinder(scene: Scene): PBRMaterial {
  // Industrial CO2 — dark slate grey, slight metallic sheen.
  const mat = new PBRMaterial('mat-co2', scene);
  mat.albedoColor = new Color3(0.32, 0.34, 0.36);
  mat.metallic = 0.7;
  mat.roughness = 0.42;
  mat.maxSimultaneousLights = MAX_LIGHTS;
  return mat;
}

function makeLeaf(scene: Scene): PBRMaterial {
  // The leaf material stays a real-world green. The reddish wash visible in
  // the reference is *lighting* — magenta LED + warm sun combining on a green
  // surface. Painting leaves red here would double up that effect.
  const mat = new PBRMaterial('mat-leaf', scene);
  mat.albedoColor = new Color3(0.28, 0.62, 0.27);
  mat.metallic = 0.0;
  mat.roughness = 0.62;
  // Cheap subsurface backlight — without this leaves go black where the LED
  // hits them at a grazing angle. Faking transmission via a small emissive
  // bias keeps us off the full sub-surface scattering plugin path.
  mat.emissiveColor = new Color3(0.03, 0.08, 0.03);
  mat.twoSidedLighting = true;
  mat.backFaceCulling = false;
  mat.sheen.isEnabled = true;
  mat.sheen.intensity = 0.25;
  mat.sheen.color = new Color3(0.5, 0.85, 0.45);
  mat.maxSimultaneousLights = MAX_LIGHTS;
  return mat;
}

function makeLEDPink(scene: Scene): PBRMaterial {
  // Emissive panel — the actual point lights live in racks.ts.
  // Pumped past the bloom threshold so the bar reads as the brightest
  // thing on screen and earns a strong pink halo.
  const mat = new PBRMaterial('mat-led-pink', scene);
  mat.albedoColor = new Color3(0.95, 0.32, 0.9);
  mat.emissiveColor = new Color3(1.0, 0.45, 0.95);
  mat.emissiveIntensity = 4.5;
  mat.metallic = 0.0;
  mat.roughness = 0.4;
  mat.disableLighting = true;
  mat.maxSimultaneousLights = MAX_LIGHTS;
  return mat;
}

/**
 * Per-PPFD LED material cache. Cloned from `ledPink` and tinted with an
 * emissive intensity proportional to PPFD setpoint. Used by the demo
 * controller to dim/brighten LED bars by treatment.
 *
 * Reference scaling: PPFD 200 µmol/m²/s → emissive 2.5.
 * PPFD 400 → ~5 (saturating into bloom). PPFD 100 → ~1.25 (still glows).
 */
const ledByPPFDCache = new WeakMap<Scene, Map<number, PBRMaterial>>();

export function getLedMaterialForPPFD(scene: Scene, ppfd: number): PBRMaterial {
  let cache = ledByPPFDCache.get(scene);
  if (!cache) {
    cache = new Map();
    ledByPPFDCache.set(scene, cache);
  }
  // Quantise PPFD to nearest 50 µmol so we don't blow up the material count.
  const key = Math.max(50, Math.round(ppfd / 50) * 50);
  const cached = cache.get(key);
  if (cached) return cached;
  const base = getMaterials(scene).ledPink;
  const mat = new PBRMaterial(`mat-led-ppfd-${key}`, scene);
  mat.albedoColor = base.albedoColor.clone();
  mat.emissiveColor = base.emissiveColor.clone();
  mat.emissiveIntensity = (key / 200) * 2.5;
  mat.metallic = 0;
  mat.roughness = 0.4;
  mat.disableLighting = true;
  mat.maxSimultaneousLights = MAX_LIGHTS;
  cache.set(key, mat);
  return mat;
}

/**
 * Per-EC nutrient-water material cache. Mirrors the LED PPFD cache pattern.
 * Low EC reads as a pale aqua (depleted pool), high EC as a deeper teal
 * (fresh nutrients). Quantised to 0.2 mS/cm steps.
 *
 * Range covered: 0.5 mS/cm (depleted) → 3.0 mS/cm (very rich).
 */
const nutrientByECCache = new WeakMap<Scene, Map<number, PBRMaterial>>();

const NUTRIENT_LOW = new Color3(0.55, 0.85, 0.78); // pale aqua
const NUTRIENT_HIGH = new Color3(0.18, 0.42, 0.55); // deep teal

export function getNutrientMaterialForEC(scene: Scene, ec: number): PBRMaterial {
  let cache = nutrientByECCache.get(scene);
  if (!cache) {
    cache = new Map();
    nutrientByECCache.set(scene, cache);
  }
  // Quantise to nearest 0.2 mS/cm → ~13 cached materials over the range.
  const key = Math.max(0.5, Math.min(3.0, Math.round(ec * 5) / 5));
  const cached = cache.get(key);
  if (cached) return cached;
  // Lerp from low to high colour by normalised EC.
  const t = Math.max(0, Math.min(1, (key - 0.5) / (3.0 - 0.5)));
  const albedo = Color3.Lerp(NUTRIENT_LOW, NUTRIENT_HIGH, t);
  const mat = new PBRMaterial(`mat-nutrient-ec-${key.toFixed(1)}`, scene);
  mat.albedoColor = albedo;
  mat.emissiveColor = albedo.scale(0.15);
  mat.metallic = 0;
  mat.roughness = 0.25;
  mat.alpha = 0.85;
  mat.maxSimultaneousLights = MAX_LIGHTS;
  cache.set(key, mat);
  return mat;
}

function makeFluorescent(scene: Scene): PBRMaterial {
  const mat = new PBRMaterial('mat-fluorescent', scene);
  mat.albedoColor = new Color3(0.95, 0.96, 0.98);
  mat.emissiveColor = new Color3(0.95, 0.97, 1.0);
  // Ceiling panels — background only. Below bloom threshold so they
  // don't glow; LED bars stay the headline.
  mat.emissiveIntensity = 0.15;
  mat.metallic = 0.0;
  mat.roughness = 0.5;
  mat.disableLighting = true;
  mat.maxSimultaneousLights = MAX_LIGHTS;
  return mat;
}

function makeBedPanel(scene: Scene): PBRMaterial {
  // EPS-foam raft — SQUARE 0.75 m × 0.75 m. Fixed 3 × 3 net-pot hole grid
  // per raft. Holes are evenly spaced with a generous edge margin so the
  // raft reads as a clean square panel with 9 dark dots.
  const W = 512;
  const H = 512;
  const tex = new DynamicTexture('tex-bed-panel', { width: W, height: H }, scene, false);
  const ctx = tex.getContext();
  ctx.fillStyle = '#f0eee8'; // cream EPS-foam base
  ctx.fillRect(0, 0, W, H);

  const cols = 3;
  const rows = 3;
  const margin = 100;
  const colSpan = (W - margin * 2) / (cols - 1);
  const rowSpan = (H - margin * 2) / (rows - 1);
  const marginX = margin;
  const marginY = margin;
  const holeHalf = Math.min(colSpan, rowSpan) * 0.18;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const cx = marginX + c * colSpan;
      const cy = marginY + r * rowSpan;
      const grad = ctx.createLinearGradient(
        cx - holeHalf,
        cy - holeHalf,
        cx + holeHalf,
        cy + holeHalf,
      );
      grad.addColorStop(0, '#26262a');
      grad.addColorStop(1, '#4a4a52');
      ctx.fillStyle = grad;
      ctx.fillRect(cx - holeHalf, cy - holeHalf, holeHalf * 2, holeHalf * 2);
    }
  }
  tex.update();

  const mat = new PBRMaterial('mat-bed-panel', scene);
  mat.albedoTexture = tex;
  mat.albedoColor = new Color3(1, 1, 1);
  mat.metallic = 0.0;
  mat.roughness = 0.7;
  mat.maxSimultaneousLights = MAX_LIGHTS;
  return mat;
}

function makeBasinPVC(scene: Scene): PBRMaterial {
  // White matte PVC — open-top basin that holds the nutrient solution.
  // Roughness 0.72 reads as moulded matte plastic (real PVC is 0.65-0.75).
  const mat = new PBRMaterial('mat-basin-pvc', scene);
  mat.albedoColor = new Color3(0.93, 0.94, 0.94);
  mat.metallic = 0.0;
  mat.roughness = 0.72;
  mat.maxSimultaneousLights = MAX_LIGHTS;
  return mat;
}

function makeBasinPVCBranded(scene: Scene): PBRMaterial {
  // Reinfa-branded variant for the basin's south face — same PVC base with
  // a "Reinfa" logo decal painted in via DynamicTexture.
  const W = 1024;
  const H = 256;
  const tex = new DynamicTexture('tex-basin-branded', { width: W, height: H }, scene, false);
  const ctx = tex.getContext();

  // Same white PVC base.
  ctx.fillStyle = '#ededed';
  ctx.fillRect(0, 0, W, H);

  // Reinfa wordmark — bold sans-serif, brand green tint, centred.
  const ctxAny = ctx as unknown as CanvasRenderingContext2D;
  ctxAny.font = 'bold 84px "Helvetica Neue", Arial, sans-serif';
  ctxAny.textAlign = 'center';
  ctxAny.textBaseline = 'middle';
  ctxAny.fillStyle = '#2e8a4f'; // reinfaGreen-ish
  ctxAny.fillText('Reinfa', W / 2 + 36, H / 2);

  // Leaf icon to the left of the wordmark — simple ellipse + stem.
  const lx = W / 2 - 130;
  const ly = H / 2;
  ctxAny.fillStyle = '#2e8a4f';
  ctxAny.beginPath();
  ctxAny.ellipse(lx, ly, 38, 22, -Math.PI / 5, 0, Math.PI * 2);
  ctxAny.fill();
  ctxAny.strokeStyle = '#1f6b3a';
  ctxAny.lineWidth = 5;
  ctxAny.beginPath();
  ctxAny.moveTo(lx - 22, ly + 18);
  ctxAny.lineTo(lx + 30, ly - 16);
  ctxAny.stroke();

  tex.update();

  const mat = new PBRMaterial('mat-basin-pvc-branded', scene);
  mat.albedoTexture = tex;
  mat.albedoColor = new Color3(1, 1, 1);
  mat.metallic = 0.0;
  mat.roughness = 0.72;
  mat.maxSimultaneousLights = MAX_LIGHTS;
  return mat;
}

function makeNetPotBlack(scene: Scene): PBRMaterial {
  // Matte black PE plastic — net-pot cup.
  const mat = new PBRMaterial('mat-net-pot-black', scene);
  mat.albedoColor = new Color3(0.06, 0.06, 0.07);
  mat.metallic = 0.0;
  mat.roughness = 0.62;
  mat.maxSimultaneousLights = MAX_LIGHTS;
  return mat;
}

function makeNutrientWater(scene: Scene): PBRMaterial {
  // Nutrient solution surface — semi-transparent cyan-green tint. Mirror-like
  // roughness so the basin walls + raft underside reflect, giving the water
  // a real "wet" look. Alpha and emissive dialled back so reflection
  // dominates over emissive haze.
  const mat = new PBRMaterial('mat-nutrient-water', scene);
  mat.albedoColor = new Color3(0.18, 0.34, 0.32);
  mat.emissiveColor = new Color3(0.06, 0.15, 0.13);
  mat.emissiveIntensity = 0.15;
  mat.metallic = 0.0;
  mat.roughness = 0.04;
  mat.alpha = 0.55;
  mat.transparencyMode = PBRMaterial.PBRMATERIAL_ALPHABLEND;
  mat.maxSimultaneousLights = MAX_LIGHTS;
  return mat;
}

function makeReinfaGreen(scene: Scene): PBRMaterial {
  // Reinfa brand green — saturated grass-green with a touch of emissive so
  // the corner caps and tier labels read crisply even in shadow.
  const mat = new PBRMaterial('mat-reinfa-green', scene);
  mat.albedoColor = new Color3(0.18, 0.55, 0.32);
  mat.emissiveColor = new Color3(0.12, 0.38, 0.22);
  mat.emissiveIntensity = 0.4;
  mat.metallic = 0.0;
  mat.roughness = 0.45;
  mat.maxSimultaneousLights = MAX_LIGHTS;
  return mat;
}

function makeFanGrille(scene: Scene): PBRMaterial {
  // Side fan housing — dark grey with slight metallic edge so the small
  // boxes read as machinery rather than blank cubes.
  const mat = new PBRMaterial('mat-fan-grille', scene);
  mat.albedoColor = new Color3(0.18, 0.19, 0.21);
  mat.metallic = 0.35;
  mat.roughness = 0.5;
  mat.maxSimultaneousLights = MAX_LIGHTS;
  return mat;
}

function makeRubberWheel(scene: Scene): PBRMaterial {
  // Solid rubber wheel — matt black for the rack base trolley.
  const mat = new PBRMaterial('mat-rubber-wheel', scene);
  mat.albedoColor = new Color3(0.08, 0.08, 0.08);
  mat.metallic = 0.0;
  mat.roughness = 0.8;
  mat.maxSimultaneousLights = MAX_LIGHTS;
  return mat;
}
