// The "배합" (blend) physics: convert a commanded target into the stock
// volumes that must be dosed, and (inverse) the EC/pH a recipe will produce.
// recipeForTarget ∘ expected{EC,pH} round-trips to the original target.
// The mix coefficients come from the rig's config (overridable at runtime).

import { DEFAULT_RIG_CONFIG, type CommissionTarget, type Recipe, type RigConfig } from './state';

type MixCfg = Pick<RigConfig, 'ecK' | 'baseVolumeL'>;

/** Stock volumes needed to reach a target EC/pH in `volumeL` of water. */
export function recipeForTarget(target: CommissionTarget, volumeL: number, cfg: MixCfg = DEFAULT_RIG_CONFIG): Recipe {
  const r = target.abRatio > 0 ? target.abRatio : 1;
  const totalStock_mL = (target.EC * volumeL) / cfg.ecK;
  const stockA_mL = (totalStock_mL * r) / (1 + r);
  const stockB_mL = totalStock_mL / (1 + r);
  const pHAcid_mL = Math.max(0, (7 - target.pH) * 2 * (volumeL / cfg.baseVolumeL));
  return { stockA_mL, stockB_mL, pHAcid_mL };
}

/** EC a blended recipe produces in `volumeL` of water (mS/cm). */
export function expectedEC(recipe: Recipe, volumeL: number, cfg: MixCfg = DEFAULT_RIG_CONFIG): number {
  if (volumeL <= 0) return 0;
  return ((recipe.stockA_mL + recipe.stockB_mL) * cfg.ecK) / volumeL;
}

/** pH a recipe produces in `volumeL` of water (acid pulls pH down from 7). */
export function expectedPH(recipe: Recipe, volumeL: number, cfg: MixCfg = DEFAULT_RIG_CONFIG): number {
  if (volumeL <= 0) return 7;
  return 7 - recipe.pHAcid_mL / (volumeL / cfg.baseVolumeL) / 2;
}
