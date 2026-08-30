/* The Shipment Plan stage: the REAL panel, fed the fixed demo world.

   Same contract as `StockStage` — it mounts the component the screen mounts, so the tutorial
   cannot drift from the thing it teaches. There is no `act` to replay here because this panel has
   no state to open or close: it is one table, all of it visible at once, which is the whole point
   of a panel you reach for when you have to split a short production run in a hurry. */
import React from 'react';
import ShipmentPlanTable from './ShipmentPlanTable.jsx';
import { DEMO_PLAN_ROWS, DEMO_PLAN_BRANCHES } from '../demo/shipmentPlan.js';

export default function ShipmentPlanStage() {
  return (
    <div className="py-5">
      <ShipmentPlanTable rows={DEMO_PLAN_ROWS} branches={DEMO_PLAN_BRANCHES} />
    </div>
  );
}
