// The "배합" (blend) physics: convert a commanded target into the stock
// volumes that must be dosed, and (inverse) the EC/pH a recipe will produce.
// recipeForTarget ∘ expected{EC,pH} round-trips to the original target.

import { COMMISSION_PARAMS, type CommissionTarget, type Recipe } from './state';

const { ecK, baseVolumeL } = COMMISSION_PARAMS;

/** Stock volumes needed to reach a target EC/pH in `volumeL` of water. */
export function recipeForTarget(target: CommissionTarget, volumeL: number): Recipe {
  const r = target.abRatio > 0 ? target.abRatio : 1;
  // total stock mL such that expectedEC === target.EC
  const totalStock_mL = (target.EC * volumeL) / ecK;
  const stockA_mL = (totalStock_mL * r) / (1 + r);
  const stockB_mL = totalStock_mL / (1 + r);
  // pH-acid heuristic (mirrors experiment-runner buildPoolTarget), volume-scaled.
  const pHAcid_mL = Math.max(0, (7 - target.pH) * 2 * (volumeL / baseVolumeL));
  return { stockA_mL, stockB_mL, pHAcid_mL };
}

/** EC a blended recipe produces in `volumeL` of water (mS/cm). */
export function expectedEC(recipe: Recipe, volumeL: number): number {
  if (volumeL <= 0) return 0;
  return ((recipe.stockA_mL + recipe.stockB_mL) * ecK) / volumeL;
}

/** pH a recipe produces in `volumeL` of water (acid pulls pH down from 7). */
export function expectedPH(recipe: Recipe, volumeL: number): number {
  if (volumeL <= 0) return 7;
  return 7 - recipe.pHAcid_mL / (volumeL / baseVolumeL) / 2;
}
