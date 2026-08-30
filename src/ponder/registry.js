/* The one import site for scenes, stages and the book's contents.

   A `?` chip and a book entry both name a scene by string id. If that string is ever wrong — a
   typo, a renamed panel — the app must not render a control that opens nothing; the integration
   audit fails instead. That is what group 56 asserts, and it is the reason every scene arrives
   here through an explicit import rather than a glob. */
import { stockByWarehouse } from './scenes/stock-by-warehouse.js';
import { goodsReceived } from './scenes/goods-received.js';
import { shipmentPlan } from './scenes/shipment-plan.js';
import StockStage from './stages/StockStage.jsx';
import GoodsReceivedStage from './stages/GoodsReceivedStage.jsx';
import ShipmentPlanStage from './stages/ShipmentPlanStage.jsx';

export const SCENES = {
  'goods-received': goodsReceived,
  'stock-by-warehouse': stockByWarehouse,
  'shipment-plan': shipmentPlan,
};

/* A stage is the little fixed world a scene plays inside. Scenes name one by string so that a
   scene file stays DATA and never imports React — writing a new scene must never mean writing
   a component. */
export const STAGES = {
  'stock-table': StockStage,
  'goods-received': GoodsReceivedStage,
  'shipment-plan': ShipmentPlanStage,
};

/* The book's table of contents is data, so it lives in its own file — see sections.js for why
   that split is not cosmetic. Re-exported here so the book has one import site like everything
   else in this folder. */
export { SECTIONS } from './sections.js';

export const getScene = (id) => SCENES[id] || null;
export const getStage = (id) => STAGES[id] || null;
