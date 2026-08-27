/* The one import site for scenes and stages.

   A `?` chip names a scene by string id. If that string is ever wrong — a typo, a renamed
   panel — the app must not render a dead button that opens nothing; the integration audit
   fails instead. That is what group 56 asserts, and it is the reason every scene arrives
   here through an explicit import rather than a glob. */
import { stockByWarehouse } from './scenes/stock-by-warehouse.js';
import PlaceholderStage from './stages/PlaceholderStage.jsx';

export const SCENES = {
  'stock-by-warehouse': stockByWarehouse,
};

/* A stage is the little fixed world a scene plays inside. Scenes name one by string so that a
   scene file stays DATA and never imports React — writing a new scene must never mean writing
   a component. */
export const STAGES = {
  placeholder: PlaceholderStage,
};

export const getScene = (id) => SCENES[id] || null;
export const getStage = (id) => STAGES[id] || null;
