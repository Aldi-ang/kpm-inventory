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

/* v4.1: one chest open at a time - opening one shuts the other, as on the screen */
function chestOpen(scene, stepIndex) {
  let open = { van: true, q: false };
  for (let i = 0; i <= stepIndex; i++) {
    const act = scene?.steps?.[i]?.act;
    if (act === 'shut:van') open = { ...open, van: false };
    else if (act === 'open:van') open = { van: true, q: false };
    else if (act === 'shut:q') open = { ...open, q: false };
    else if (act === 'open:q') open = { van: false, q: true };
  }
  return open;
}

const noop = () => {};

export default function AgentChestStage({ scene, stepIndex = 0 }) {
  const open = useMemo(() => chestOpen(scene, stepIndex), [scene, stepIndex]);
  const { sales, samples, ...bay } = DEMO_CHEST;
  return (
    /* the panels float ABOVE the chest row (v4.1); on the screen the Manifest is under them, here the room is kept empty */
    <div className="pt-[360px] sm:pt-[430px] pb-5" onPointerDownCapture={(e) => e.stopPropagation()}
      onClickCapture={(e) => { if (e.target.closest('[data-ponder="book"]')) e.stopPropagation(); }}>
      <LoadingBay vanOnly key={open.van + '-' + open.q} {...bay} canEdit pose={{ open: { wh: false, van: open.van, q: open.q } }} onLayout={noop} />
      <TodayBook sales={sales} samples={samples} inventory={bay.stock} />
    </div>
  );
}
