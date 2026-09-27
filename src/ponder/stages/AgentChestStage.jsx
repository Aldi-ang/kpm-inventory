/* The Agent Chest stage: the REAL chest, fed the fixed demo world.

   Same contract as `LoadingBayStage`: it mounts the component Agent Inventory mounts for a regional admin and above -
   the bay's own van chest, `LoadingBay vanOnly` - so the page cannot drift from the thing it teaches. The only act is
   `shut:van` / `open:van`, replayed from beat 0 so seeking backwards costs nothing, and the bay is mounted again (a new
   `key`) whenever it changes.

   v4 (2026-09-27): the quarantine crate stands beside the van chest (open from the start) and the book of the day sits
   under them - the REAL TodayBook. A press on the book is swallowed here: its open pages would sit behind the page.

   🔴 A DRAG IS SWALLOWED HERE, for the bay page's reason: the carried box sits at z 75 and the book at 9000. A tap on the
   chest still opens and shuts it, and onLayout is a stub - a tidy-up inside the book writes nothing anywhere. */
import React, { useMemo } from 'react';
import LoadingBay from '../../components/LoadingBay.jsx';
import TodayBook from '../../components/TodayBook.jsx';
import { DEMO_CHEST } from '../demo/agentInventory.js';

function chestOpen(scene, stepIndex) {
  let open = true;
  for (let i = 0; i <= stepIndex; i++) {
    const act = scene?.steps?.[i]?.act;
    if (act === 'shut:van') open = false;
    else if (act === 'open:van') open = true;
  }
  return open;
}

const noop = () => {};

export default function AgentChestStage({ scene, stepIndex = 0 }) {
  const open = useMemo(() => chestOpen(scene, stepIndex), [scene, stepIndex]);
  const { sales, samples, ...bay } = DEMO_CHEST;
  return (
    <div className="py-5" onPointerDownCapture={(e) => e.stopPropagation()}
      onClickCapture={(e) => { if (e.target.closest('[data-ponder="book"]')) e.stopPropagation(); }}>
      <LoadingBay vanOnly key={String(open)} {...bay} canEdit pose={{ open: { wh: false, van: open, q: true } }} onLayout={noop} />
      <TodayBook sales={sales} samples={samples} inventory={bay.stock} />
    </div>
  );
}
