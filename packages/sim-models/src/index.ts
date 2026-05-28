// @via-farm-lab/sim-models — public API.
// Each model exported as a subpath for tree-shaking; the index re-exports
// only the most-used pieces so apps can `import { BiomassModel } from
// '@via-farm-lab/sim-models'` without thinking about layout.
export {
  BUTTER_LETTUCE_DEFAULT,
  BiomassModel,
  biomassAt,
  type BiomassParams,
  type BiomassState,
} from './biomass';
