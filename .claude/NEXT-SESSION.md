# The one job - Fleet & Roster: the two faults Antigravity found (Task 11); its exact code is Task 15

State 2026-11-17 06:35 WIB: LIVE 04a6bed2 - the demo guide's menu tour (PC + phone) and a ring only on drawn items. Nothing of this job is built.

BEFORE this job: PROGRESS's WAITING ON ALDI holds his 🔴 A/C pick for step 3 (his "dika syahputra is not even there": Fleet & Roster opens on BANDUNG for the owner and his T1, Dika is under HEADQUARTERS - root cause and options in A-Brain Wiki/Concepts/Demo Guide on the Phone.md). If he has answered, build that first, with Antigravity Task 17's two copy fixes (the Settings tour line is wrong for T4/T6; six screen names in GO / nav() must be the menu's tr() names - its Result has the table).

Antigravity Task 11 (read 2026-11-16 22:00) found two faults in the PC person panel of Fleet & Roster (`src/FleetCanvasManager.jsx`, CRLF - edit with a rep script, see LAB). Task 15 (DONE, not read yet) wrote the exact proposed code for both: `.claude/ANTIGRAVITY-TASK.md`, "## Task 15", its Result. Read it in full and check it against the code before using any of it - Task 13's "ready to paste" block would have frozen the guide (no `done`, no way forward).

1. MED - the keyboard behind the veil. With a person's panel open on the PC, Tab still reaches the dimmed keys behind the veil (`.kpm-fleet-top`: Offers, Add personnel), and Escape does not close the panel. Smallest fix: `inert` on `.kpm-fleet-top` while a person is open, and Escape -> `closePanel`. Trap: FrontPanel has its own Escape (FleetCanvasManager.jsx ~L28) and the Surat Jalan is a portal on document.body - Escape must close only the top-most thing (the Surat Jalan first when it is open).
2. LOW - a close during the entrance. Closing inside the first ~300 ms of the panel's entrance snaps it to opacity 1 before `kpmFleetOut` plays (the keyframe swap restarts from the out-animation's first frame). Smallest fix: drive open/close with transitions instead of two keyframe animations, so a close mid-entrance reverses from where it is.

Done when: (1) lab PC: a person open, Tab never lands on Offers / Add personnel (log document.activeElement per Tab), Escape closes the panel, Escape with the Surat Jalan open closes only the Surat Jalan; (2) motion sampled on the page: a close at 120 ms -> opacity goes DOWN from its sampled value, never up to 1 (veil.js / motion.js in Raw/2026-11-16-fleet-build are the pattern: per-frame opacity + x, baseline at rest). Each fix: one regression + one behaviour line in logicFixes.selfcheck.mjs.

TRAPS
- A motion fix is not done until sampled on the page; a frame from the Browser pane freezes animations.
- FleetCanvasManager.jsx, theme.css, vanBay.js are CRLF.
- The PC panel and its veil (z 15) live inside the shell's z-10 box; FrontPanel portals at z 480; the guide veil is z 400.
- `inert` on a parent also blocks presses. His pick A: pressing the dimmed part closes the panel - put inert only on the keys row, never on what closes it (check where the veil sits in the tree first).

LAB: launch demo-emulator, demo-api-emulator, demo-app-emulator (5176); `node tools/demo-reset-emulator.mjs`. A fresh emulator has NO invites: POST `http://127.0.0.1:8080/v1/projects/kpm-demo-f4d74/databases/(default)/documents/demo_invites?documentId=walker.pc@gmail.com`, header `Authorization: Bearer owner`, body `{"fields":{"by":{"stringValue":"lab"}}}`. From A-Brain `Raw/2026-11-15-journey-review`: `node walk5176.mjs --pc --gate-only 8`, then `node ../2026-11-16-fleet-build/clear-pc.mjs` (a sign-in kept from an older emulator gets 401), then `--gate-only 8` again. A person: from `Raw/2026-11-17-menu-tour`, `node g.mjs eval:owner.js` (T2 Hartono; Hendra = T4 regional admin), then `--gate-only 8`. g.mjs steps: `eval:<file> shot:<name> move:x,y click:x,y tapring wait:ms size:390x844m` - a size override lives only as long as that run, so give size: in the same run as the shots. Stop the servers before `npm run build`.

BEFORE ANY PUSH: `git log origin/phase0-solid-ground..HEAD`; any `Antigravity:` commit gets `git show` (only .claude/ANTIGRAVITY-TASK.md) and the gates re-run. Gates: logicFixes, npm run build, integration.audit, every *.selfcheck.mjs by exit code; dist-demo rebuilt + demoBuild.check when the demo changed; a patch note en + id.

ANTIGRAVITY: Task 15 DONE (not read - it is this job's data). 16 DONE, read 07:15 (the 18 AT RISK overlays: 12 can share one body portal, ImageCropper needs z 500, the 5 printing ones need the print traps handled). 17 DONE, read 07:15 (see BEFORE above; a press on the ringed item keeps the tour on that item - no bug). 18-19 OPEN (every guide beat: is its target on the page in the doer's and T1's default view - the Dika class of bug). Keep at least 2 OPEN, refill unasked, end every reply that queues or closes work with the paste-ready prompt.

AFTER THIS JOB (next brief, not now): Task 17's findings (tour line fixes, name mismatches); then the Retur audit's 6 OPEN holes as 🔴 DECIDEs (Task 6 drafts them, Task 12 has a failing check per hole) - money, never fixed unasked; then Task 16's overlay plan.

STILL OWED BY HIM: his test of the menu tour (04a6bed2); his test of pick A live; his test of 63abfb93; phone SWITCH twice -> "fast" or "slow".
