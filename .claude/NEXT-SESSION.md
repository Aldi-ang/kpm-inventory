# The one job - finish the professional Fleet & Roster: it is BUILT and lab-proven, the checks and the push are left

State 2026-11-16 ~09:25 WIB: built in the WORKING TREE of phase0-solid-ground, NOT committed, NOT pushed, nothing live. `npx vite build` passed after the last big edit. His pick: A Ledger table · 1 Load sheet · Y Slide-over panel + "smooth and elegant and not flickering".

WHAT IS IN THE TREE (do not rebuild; `git status` shows it)
- src/components/LoadSheet.jsx (NEW): tabs Load / Return + extra tabs from Fleet, one ruled line per product, − n + (one slop a press, typed number too), Fill suggested / Usual load / Copy a teammate / Save as usual load, pinned foot with gold "Load van · X Bks" (data-ponder="go"), report block (SURAT JALAN / BUKTI KEMBALI no), CountUp on In van.
- src/FleetCanvasManager.jsx: rosterRow (replaces stageCard), day strip, area chips, leaders on top incl. FLEET_CAPTAIN, panel `<aside key={sel.id} className="kpm-fleet-panel" data-mission="3">`, closePanel, fitH (the Sales Terminal's window-fit), soldByAgent / lastDay. LoadingBay import, handleSaveLayout, rosterPage, showHistory, combinedItems, the community block and the permission chips are gone on purpose. LoadingBay.jsx itself is untouched (Agent Inventory + ponder scenes use it).
- src/utils/vanBay.js: soldBks, lastDaySold, suggestBks (Fill suggested = last working day's sales − in van now, never below 0; cut to the warehouse when filled).
- src/styles/theme.css: the block "THE ROSTER LEDGER + THE PERSON PANEL" replaced the whole ROSTER STAGE block (kpm-stage / kpm-actor rules deleted); `.kpm-fleet-acts button.demo-locked` renamed from kpm-stage-acts.
- src/config/demoMission.js step 3: `.kpm-fleet-row[data-agent]`, Dika's row, `[data-mission="3"] [data-guide="load-plus"]`, then `[data-ponder="go"]` ("Tekan Load van.").

PROVEN IN THE LAB (dev server 5176, big demo company, T4 Hendra; frames + scripts in A-Brain Raw/2026-11-16-fleet-build/)
- PC 1280 + phone 390 frames: pc-list-0, pc-open-0, ph-list-0, ph-open-0 (ph-list-0 has a toast over the title: reshoot for the board).
- Motion sampled (motion.js): open = 1 animation kpmFleetSlide, x 24 -> 0, opacity 0 -> 1; five + presses = same node, 0 panel animations, moved 0 px, line height 58 -> 58; another person = 1 new entrance.
- Real load (load.js): warehouse 1.000 -> 980, In van 0 -> 20 counted up, row Not loaded -> Loaded, strip 8 of 9 -> 9 of 9, toast + SJ number.
- Guide step 3 (guide3.js; skip12.js marks steps 1-2 done in localStorage): 390 and 1280, every ring in view and over the right control; on the PC the Load van press ticked the guide to 4/8.

2026-11-16 14:05: the build is now LOCAL commit 48c5081e (not pushed). Steps 1-2 below are ANTIGRAVITY'S TASK (.claude/ANTIGRAVITY-TASK.md, Status OPEN, the 39 reds listed there with an old->new map). Next session: if it says DONE, read its Result table, `git show` its "Antigravity:" commit, check every LOST row, re-run the gates, then go on with step 3. If still OPEN, do step 4 (frames) meanwhile - it does not touch the check file.

LEFT TO DO, in order
1. `node src/config/logicFixes.selfcheck.mjs` - reds are EXPECTED. Rewrite each pinned check to the new markup on purpose, list every changed check in the commit, never delete one silently. Known pins (line numbers before today's edits): ~3339 `<LoadingBay ... canEdit` (now `<LoadSheet`), ~8541 the three writers (onLayout is gone), ~8600-8645 the ROSTER section (slices by the comments `{/* LEFT PANEL: FLEET ROSTER` / `{/* RIGHT PANEL: THE LOADING DOCK */}` - new markers are `{/* THE ROSTER LEDGER` and `{/* THE PERSON PANEL`; stageCard -> rosterRow; rank map now 4/3/2/1 with FLEET_CAPTAIN; PER_STAGE pages gone; "the community today" gone), ~8673 onPreset, ~8697 `.kpm-stage-hint`, ~8732-8790 FAR AND NEAR + DEPLOYMENT HEADER sections (stage CSS gone: replace with "the stage is gone, tag game-edition-v1 keeps it" + ledger checks), ~8894-8899 gold bar / snap, ~9036 ROSTER SLIDES FREELY, ~12277 liveBeat for g3 (new selectors, 3 beats after nav).
2. Add NEW checks: suggestBks / lastDaySold / soldBks on real numbers (sold 180, in van 300 -> 0; sold 200, in van 20 -> 180; a pure buyback and an IOU exchange line do not count; the newest day BEFORE today wins); the panel is keyed by the person and its CSS animation has no `infinite`; LoadSheet defines no component inside a render; CountUp floors k at 0 (the lab showed "-4" for one frame before the fix).
3. `npm run build` (stop the 3 preview servers first), `node src/config/integration.audit.mjs`, all 14 `*.selfcheck.mjs` by exit code.
4. Not yet looked at: the owner's view with area chips (SWITCH to T2 Hartono, vault password admin123), the Return tab, the extra tabs (Damaged / Consignment / Requests / Activity), light theme, Lite Mode. Shoot each once; the right-bottom corner mascot (`.kpm-merch-float`, right 44px bottom 8px) must not sit on the Load key.
5. Patch note en + id in src/config/patchNotes.js. Today-vs-built board to him (today frames: A-Brain Raw/2026-11-15-fleet-review/). `graphify update .`.
6. Commit (say in it: Fill suggested rule; one press = one slop; permission chips dropped from the head, Details shows them; Surat Jalan moved beside Details), push, hash to him. `git stash drop` the "fleet-review trial 2026-11-15" stash after it lands. Vault: taste file + Brainstorm note + Log.

TRAPS
- FleetCanvasManager.jsx and theme.css are CRLF on disk: the Edit tool fails on multi-line matches. Use scratchpad `rep.mjs <file> <ops file>` (//@@FIND / //@@WITH blocks) or re-create it.
- Lab sign-in: a stale session answers "demo sign-in refused 401". Run A-Brain Raw/2026-11-16-fleet-build/clear-pc.mjs, then jp.mjs tap 'text=SWITCH' / 'text=HARTONO' --pc=9557, tap 'text=UNLOCK SYSTEM', `walk5176.mjs --pc --gate-only 8`. The full guide walker sticks on step 1's menu beat at 1280 (the ring sits on the dashboard, not a menu key) - not looked into, may be a real guide bug on the PC.
- The lab's dev server at 800 px high shows 3 products in the sheet; that is why the title and the day numbers share one row on the PC.

STILL OWED BY HIM: phone test of the live demo - SWITCH twice -> "fast" or "slow".
