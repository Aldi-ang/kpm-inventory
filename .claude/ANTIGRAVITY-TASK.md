# Antigravity's task, written by Claude

Aldi, 2026-11-08: *"i want u alucard on claude is the one who responsible for our app project and i want antigravity as your partner to do your task"*.
Claude writes ONE task here. Antigravity does it, writes the Result, sets Status to DONE. Status is OPEN, DONE or NONE.

**Status:** OPEN
**Written:** 2026-11-16 14:05 WIB, by Claude.
**Your jobs are THINKING jobs** (Aldi, 2026-11-10): reading code, audits, reviews, self-contained fixes. Never a browser, never a click-through.

**The Retur audit (written 2026-11-14) is parked, not cancelled:** it comes back as your next task after this one. Its full text is in git commit f3ff4b4b. This one goes first because it blocks a push Aldi is waiting for.

## Task: rewrite the self-checks that still describe the OLD Fleet & Roster

Aldi replaced the game-look Fleet & Roster (3D cards on a stage, a gold bar, two Minecraft chests) with a professional one (his pick 2026-11-15: "Team list A Ledger table · Loading 1 Load sheet · PC Y Slide-over panel"). Claude built it in commit **48c5081e** (local, not pushed). Read that commit first: `git show 48c5081e --stat` then the diff of `src/FleetCanvasManager.jsx` and the new `src/components/LoadSheet.jsx`.

`node src/config/logicFixes.selfcheck.mjs` now says **2942 passed, 39 failed**. Every one of the 39 pins the old markup. Your job: make each one check the SAME PROMISE against the NEW code.

**The 39 (names as the run prints them):** and both doors are hidden as well as guarded · Fleet & Roster mounts the bay with the three writers and the edit gate · the layout is its own field, written on its own, never inside activeCanvas · the left panel was found · view for everyone; edit and remove only behind the fleet gate, remove still wears data-kpm-del · the add key is behind the same gate and still resets the form · the search reads the same five fields · people keep their rank order (admin, area admin, agent) · areas become tabs over the stage only when more than one place is in view, and a search puts every match on it · seven cards a page, pages 1 2 3 when there are more · the bar lights once per pick, never on a loop · a card names the tier in his words and says what the van holds, in packs · picking a card goes through the muatan guard, by pointer or by key · a card is visible at rest and lifts only on a pointer or a key · the blue standby is gone; nobody picked shows the community · every empty-roster cause still names itself · the usual load is its own field on the person's record · the team is the other people in THIS place · ONE matcher for a person's override requests · the company-wide PENDING queue stays at the top of the screen · the six FAR AND NEAR checks (one card pointed at ... Lite Mode keeps every card whole) · the six DEPLOYMENT HEADER checks (the big "Active Deployment Terminal" header ... one column on the phone, one line on the PC) · Fleet hands the rows to the bay AFTER bypasses · gold bar on the phone: one column · the roster snaps a person to the middle · no code takes the swipe any more · Fleet & Roster reads it off rows it already listens to - no new listener, one prop · REGRESSION: the guide walks all eight steps (missing: data-guide="load-plus") · BEHAVIOUR: the loading bay - Dika picked ... (guide step 3).

**Old → new, so you do not have to guess** (all in src/FleetCanvasManager.jsx unless named):
| Old | New |
|---|---|
| slices `{/* LEFT PANEL: FLEET ROSTER` .. `{/* RIGHT PANEL: THE LOADING DOCK */}` | `{/* THE ROSTER LEDGER (2026-11-16)` (top bar + ledger) .. `{/* THE PERSON PANEL` (panel to the end) |
| `const stageCard = (m) =>` | `const rosterRow = (m) =>` (ends at `const handleWhatsAppShare`) |
| rank `{ 'ADMIN': 3, 'AREA_ADMIN': 2, 'AGENT': 1 }` | `{ 'ADMIN': 4, 'AREA_ADMIN': 3, 'FLEET_CAPTAIN': 2, 'AGENT': 1 }`, then A-Z by name; `isLeader` = ADMIN, AREA_ADMIN, FLEET_CAPTAIN |
| area tabs `kpm-stage-tab`, pages `PER_STAGE = 7` | chips `kpm-fleet-chip` (`role="tab" aria-selected={k === place}`); no pages any more |
| gold bar `kpm-stage-bar` with Details / Edit / Delete / vault / lock | the panel's `<span className="kpm-fleet-acts">` - the SAME buttons and gates, plus Surat Jalan |
| Initial / Sold / Current | `[['Loaded', left + sold], ['Sold today', sold], ['Left in van', left]]`; sold comes from `soldByAgent` = vanBay `soldBks` (skips a RETUR that is not Tukar Ganti, and a Tukar Ganti line with fulfillment IOU - the same two skips) |
| permission chips in the bar | gone from the head on purpose (Details shows them) |
| `<LoadingBay ... onLoad onReturn onLayout onPreset canEdit>` | `<LoadSheet ... canEdit={canEditFleet} onLoad={handleLoadCanvas} onReturn={handleReturnToWarehouse} onPreset={handleSavePreset} onDirty={setBayLines} onClear={handleClearCanvas}>` |
| `handleSaveLayout` / `vanLayout` from Fleet | deleted on purpose: the sheet has no squares. LoadingBay.jsx still exists for Agent Inventory - do not touch its checks |
| `{canEditFleet && <button onClick={handleClearCanvas}` | LoadSheet: `{canEdit && ret && vanBks > 0 && <button ... onClick={onClear}>Reconcile &amp; clear` (the handler's own guard is unchanged) |
| `data-mission="3"` on a div round the bay | on `<aside key={sel.id} className="kpm-fleet-panel" ... data-mission="3">` |
| stage CSS `/* ── THE ROSTER STAGE` .. `/* ── END OF THE ROSTER STAGE` (theme.css) | `/* ── THE ROSTER LEDGER + THE PERSON PANEL` .. `/* ── END OF THE ROSTER LEDGER`; the panel's one entrance `kpmFleetSlide 260ms`, `.lite-mode .kpm-fleet-panel { animation: none; ...}`, a reduced-motion rule, no `infinite` |
| guide step 3 (src/config/demoMission.js) | nav to `.kpm-fleet-row[data-agent]` → Dika's row (done `.kpm-fleet-row.on[data-agent="demo-agent-2"]`) → `[data-mission="3"] [data-guide="load-plus"]` (in LoadSheet.jsx) → `[data-mission="3"] [data-ponder="go"]` |

**How to rewrite:**
- A promise that still holds → rewrite the check to test it on the new code. Keep the old name when the promise is the same; rename it when the words name things that are gone (cards, stage, bar).
- A promise about something removed ON PURPOSE (3D cards, far/near, the stage lamp, the swipe, pages, the layout field, the community block) → ONE check per removed thing that says it is gone and that tag `game-edition-v1` keeps it. Never delete a check without a replacement line in the Result.
- **If the new code broke a promise that should still hold** (a guard missing, a sum that changed, a door gone): do NOT weaken the check. Leave it red and write it in the Result as LOST with file:line. Claude fixes the app, not you.
- Then ADD these behaviour checks on real numbers (vanBay is plain JS, import it like the file's other behaviour checks do): `suggestBks(180, 300) === 0`, `suggestBks(200, 20) === 180`, `suggestBks(undefined, 5) === 0`; `soldBks` skips a pure buyback and an IOU exchange line but counts a sale; `lastDaySold` returns the newest day BEFORE today that has a sale, never today; the panel is keyed by the person (`<aside key={sel.id} className="kpm-fleet-panel"`); `kpmFleetSlide` is never `infinite`; LoadSheet.jsx defines no component inside `LoadSheet(` (CountUp is top-level); CountUp floors the progress at 0 (`Math.max(0,`).

## Never
Edit app code (anything in src/ other than the one check file), rules or A-Brain. Build, deploy or push. Open a browser. Touch a check that was green before this task.

**Touch only:** `src/config/logicFixes.selfcheck.mjs` and this file (the Result below).

**Done when:** `node src/config/logicFixes.selfcheck.mjs` ends with 0 failed, OR every remaining red is written below as LOST; the Result is ONE table (Old check | What you did: rewritten / renamed / replaced-by-a-gone-check / LOST | New check name | one sentence), plus the list of new behaviour checks and the final "N passed, M failed" line; Status here is DONE. Commit ONLY these two files, message starting "Antigravity:". Never push.

**Result:**

