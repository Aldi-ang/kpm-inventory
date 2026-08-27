/* The Stock by Warehouse stage: the REAL table, fed the fixed demo world.

   The drawer is not toggled by an effect. It is DERIVED by replaying every `act` from beat 0 up to
   the current beat, which keeps the whole stage a pure function of the step index — the property
   the engine is built on, and the reason seeking backwards costs nothing here where Create's
   Ponder has to rebuild its world to do the same thing.

   A viewer can still click a warehouse open themselves. That is deliberate: Ponder freezes so you
   can poke at the world, and a tutorial you are allowed to touch is the one people remember. Their
   click stands until the next beat that has an opinion. */
import React, { useMemo, useState, useEffect } from 'react';
import StockByWarehouseTable from './StockByWarehouseTable.jsx';
import { DEMO_WAREHOUSES, DEMO_TOTALS } from '../demo/warehouses.js';

function scriptedOpen(scene, stepIndex) {
  let v = null;
  for (let i = 0; i <= stepIndex; i++) {
    const a = scene?.steps?.[i]?.act;
    if (typeof a === 'string' && a.startsWith('open:')) v = a.slice(5);
    else if (a === 'close') v = null;
  }
  return v;
}

export default function StockStage({ scene, stepIndex = 0 }) {
  const scripted = useMemo(() => scriptedOpen(scene, stepIndex), [scene, stepIndex]);
  const [manual, setManual] = useState(undefined);

  /* A new beat wins over whatever the viewer had open — otherwise the beat that says "open a
     warehouse" would silently do nothing for anyone who had already opened a different one. */
  useEffect(() => { setManual(undefined); }, [stepIndex]);

  const open = manual === undefined ? scripted : manual;

  return (
    <div className="py-5">
      <StockByWarehouseTable
        rows={DEMO_WAREHOUSES}
        totals={DEMO_TOTALS}
        openGudang={open}
        onToggle={(name) => setManual(name)}
      />
    </div>
  );
}
