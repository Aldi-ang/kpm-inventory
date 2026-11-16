# The one job - the demo guide: the capybara walks the sidebar first, then every beat rings something visible

His words (2026-11-16 15:30): *"dont forget the tutorial capybara still shows the wrong screen, not entirely wrong but like he should give step by step tutorial starting from the sidebar first and what it use then to the next"*.

State 2026-11-16 21:20 WIB: Fleet & Roster pick A is LIVE c497b4c1 (focus panel + veil, phone More). Nothing of the guide is built yet.

FIRST: read Antigravity's Task 7 Result in `.claude/ANTIGRAVITY-TASK.md` (every GUIDE beat whose `at` selector can hit a hidden element, PC 1280 and phone 390). Still OPEN -> build step 1 below and leave the per-beat list for its answer.

Known (Antigravity Task 3, DONE, read 2026-11-16): `aim()` in `src/components/DemoMission.jsx` (~L147) rings the FIRST element matching a beat's `at` selector even when it is invisible; on the PC step 1 rings the hidden `<button data-mark="restock_vault">` instead of the visible rail item `.kpm-rail-totem`. The 8 steps: `GUIDE` in `src/config/demoMission.js`.

Build, in order:
1. `aim()`: skip matches with no visible box (zero size, opacity 0, visibility hidden, display none) and take the next match. One change for every beat; Task 7 says which beats still need their own selector. Prove it RED first: a lab frame of step 1 on the PC ringing nothing he can see.
2. The sidebar tour: before step 1 the capybara walks the sidebar item by item - one beat per menu item the current tier can see, ringing that item, with Task 5's line (17 items, Indonesian, tier column: ANTIGRAVITY-TASK.md Task 5 Result). PC: the rail items. Phone: the drawer must be OPEN for a ring to land -> 🔴 DECIDE to him with frames side by side (open the drawer for the tour, or the line only with no ring).
3. Then step 1 as today.

TRAPS
- Guide copy never says "kamu" (audit check 667). New UI labels are English; the guide lines are Indonesian (Task 5).
- The guide veil `.kpm-mx-veil` (z 400) lives OUTSIDE the shell's z-10 box; the Fleet focus veil (z 15) is inside it - they never fight. FrontPanel portals at z 480, above the guide veil.
- skip12.js (Raw/2026-11-16-fleet-build) marks guide steps done in the guide's own localStorage record - use it instead of re-walking.
- A lab reload drops the lab back to the owner with the guide open: talk.js, SWITCH, HENDRA, --gate-only 8 again.
- A motion fix is not done until sampled on the page (veil.js / motion.js are the pattern: per-frame opacity + x, baseline at rest).

LAB: launch demo-emulator, demo-api-emulator, demo-app-emulator (5176); `node tools/demo-reset-emulator.mjs`. A fresh emulator has NO invites (404): write `demo_invites/walker.pc@gmail.com` and `walker@gmail.com` by REST - POST `http://127.0.0.1:8080/v1/projects/kpm-demo-f4d74/databases/(default)/documents/demo_invites?documentId=<email>`, header `Authorization: Bearer owner`, body `{fields:{by:{stringValue:'lab'}}}`. Then from A-Brain `Raw/2026-11-15-journey-review`: `node walk5176.mjs --pc --gate-only 8`, `node jp.mjs tap 'text=SWITCH' --pc=9557`, `tap 'text=HENDRA'`, `--gate-only 8` again, `node jp.mjs eval talk.js --pc=9557`. Shooter in `Raw/2026-11-16-fleet-build`: `node fs.mjs <pc|phone> <prefix> [--noopen] [--eval=x.js] [--after=count.js] [--quiet]`. CRLF files (FleetCanvasManager.jsx, theme.css, vanBay.js): edit with scratchpad `rep.mjs` (//@@FIND //@@WITH //@@END, each FIND must match once). Stop the servers before `npm run build`.

BEFORE ANY PUSH: `git log origin/phase0-solid-ground..HEAD`; any `Antigravity:` commit gets `git show` (only .claude/ANTIGRAVITY-TASK.md) and the gates re-run. Gates: logicFixes, npm run build, integration.audit, every *.selfcheck.mjs by exit code; a patch note en + id.

ANTIGRAVITY: Tasks 6, 7, 8 OPEN. Keep at least 2 OPEN, refill unasked, and end every reply that queues or closes work with the paste-ready prompt (CLAUDE.md, his 2026-11-16).

AFTER THIS JOB (next brief, not now): the Retur audit's 6 OPEN holes as 🔴 DECIDEs (Task 6 drafts them) - money, never fixed unasked. Then Task 8's overlay findings (which pop-ups can open cut under the demo bars).

STILL OWED BY HIM: his test of pick A live (PC: press a name -> the rest dims and blurs, 8 products; press the dimmed part -> closes; phone: More); his test of 63abfb93; phone SWITCH twice -> "fast" or "slow".
