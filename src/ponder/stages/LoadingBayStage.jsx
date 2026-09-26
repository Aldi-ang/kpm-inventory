/* The Loading Bay stage: the REAL bay, fed the fixed demo world.

   Same contract as `StockStage`: it mounts the component Fleet & Roster mounts (components/LoadingBay.jsx), so the page
   cannot drift from the thing it teaches. The bay keeps its chests, tabs and muatan in its own state, so a beat's pose
   goes in as a STARTING state and the bay is mounted again (a new `key`) whenever the pose changes. The pose is DERIVED
   by replaying every `act` from beat 0, like StockStage's drawer, so seeking backwards costs nothing.

   Acts: `shut:wh` / `shut:van` / `open:…` (a chest closed by hand shows its tabs) · `tab:wh:team`, `tab:van:titip`, …
   (which tab is showing) · `lines:plan` / `lines:preset` / `lines:failed` / `lines:none` (what sits in the muatan).

   🔴 A DRAG IS SWALLOWED HERE. The bay's HOW MANY sheet and the carried box sit at z 60-75 and the book at 9000, so a drag
   inside the book would open a sheet nobody can see. A tap still works: a chest opens and shuts, a tab turns, a tap on a
   part of the bay jumps to its beat. onLoad / onReturn are stubs - Muat van inside the book writes nothing anywhere. */
import React, { useMemo } from 'react';
import LoadingBay from '../../components/LoadingBay.jsx';
import { DEMO_BAY, DEMO_BAY_PLAN, DEMO_BAY_FAILED, DEMO_BAY_PRESET } from '../demo/loadingBay.js';

const LINES = { none: [], plan: DEMO_BAY_PLAN, failed: DEMO_BAY_FAILED, preset: DEMO_BAY_PRESET };

function scriptedPose(scene, stepIndex) {
  const pose = { open: { wh: true, van: true }, tabs: { wh: 'preset', van: 'geo' }, lines: 'none' };
  for (let i = 0; i <= stepIndex; i++) {
    const [verb, side, tab] = String(scene?.steps?.[i]?.act || '').split(':');
    if (verb === 'shut' || verb === 'open') pose.open = { ...pose.open, [side]: verb === 'open' };
    else if (verb === 'tab') pose.tabs = { ...pose.tabs, [side]: tab };
    else if (verb === 'lines') pose.lines = side;
  }
  return pose;
}

const landed = async () => ({ ok: true });
const noop = () => {};

export default function LoadingBayStage({ scene, stepIndex = 0 }) {
  const pose = useMemo(() => scriptedPose(scene, stepIndex), [scene, stepIndex]);
  return (
    <div className="py-5" onPointerDownCapture={(e) => e.stopPropagation()}>
      <LoadingBay key={JSON.stringify(pose)} {...DEMO_BAY} canEdit pose={{ ...pose, lines: LINES[pose.lines] || [] }}
        onLoad={landed} onReturn={landed} onLayout={noop} onPreset={noop} />
    </div>
  );
}
