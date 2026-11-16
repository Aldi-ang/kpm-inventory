# The one job - Fleet & Roster: build the bigger load panel he picks (A, B or C)

State 2026-11-16 18:00 WIB: LIVE 63abfb93 - pressing the open name closes the panel, the PC close slides out (kpmFleetOut, unmounts on onAnimationEnd -> finishClose), the panel's own surface + 2px gold edge, a heavier rule above SALESMEN, FrontPanel through createPortal (Add personnel's head was under the mission strip), LoadSheet tabs locked while busy + goLock, promo-only van label. The bigger panel was NOT built: the board went to him 17:47 (A-Brain `Raw/2026-11-16-fleet-build/board.png`, note `Brainstorm/2026-11-16_fleet-bigger-load-panel.md`).

FIRST: his letter. The board is an artifact now: https://claude.ai/artifact/Bow3FxZoZmXjwSxBZEZiF7 (his ask 20:15, "so that i can decide better"). Not in chat yet -> ask once: "🔴 DECIDE: which bigger load panel - A (8 products, the top dims and blurs, the name panel stays sharp), B (4, covers the day strip) or C (5, nothing hidden)?" Then build ONLY that one + the phone fold (same for all).

Measured (count.js, real app, Hendra opening Bagus): PC 1280x800 today 3 · A 8 · B 4 · C 5 products in view. Phone 390x844 today 3 -> 5. Cause: name 69 + person keys 57 + tabs 41 + tools 50 + column head 35 + foot 57 = 309 of 497 px.

PORT THE LAB CSS, do not redesign: `Raw/2026-11-16-fleet-build/opt-lib.js` holds the exact rules that drew each frame.
- W (A and C): panel `display: grid` - head full width (padding 8), row 2 = `.kpm-fleet-tabs` left + `.kpm-fleet-acts` right (keys 30 px), body, foot. Tool keys 30 px. Product line on one line: `minmax(0,1fr) 88px 72px 104px 132px`, padding 6, `.n` flex: name with ellipsis + "sold today N" beside it (45 px a line).
- A: lab geometry fixed top 160 / bottom 32 / left 300 / right 25 - in the build derive it: under the app header to the bottom, left edge = the list's left + ~275 px (the name column). Veil = fixed inset 0, z 15, rgba(8,7,6,.55) + blur(3px), appended INSIDE `.kpm-fleet`; `.kpm-fleet-list { position: relative; z-index: 16 }` keeps the whole name panel sharp and pressable ("name" = his NAME PANEL). Decide what a press on the veil does (close is the natural answer) and say it.
- B: fixed top 181 / bottom 57, width 640 (covers the strip; hides Sold today, Override requests, Offers, Add).
- C: absolute `left: 275px; right: 0; width: auto`, today's height.
- Phone (all): head grid `auto 1fr auto` = ‹ + name + a More key; role line spans; the 3 numbers inline (label + 14 px number); the person keys move behind More - needs a REAL menu (Surat Jalan, Details, Edit, Delete + the T1/T2 keys), every key reports, no native dialog; tools on one row (nowrap, scroll, 38 px keys); product line: "today N · " joins the start of `.ph` in JSX (the lab rewrote textContent - not shippable).

TRAPS
- A's blur: integration.audit G30 fails any blur/filter/shadow after `.kpm-mod {` in theme.css -> a NAMED exemption like the demo veils (`BLUR_EXEMPT` near integration.audit.mjs L2035) + a Lite Mode rule (no blur, dim .8), and the check asserts both, as it does for `.kpm-mx-veil`. logicFixes "the ledger and the panel use no shadow, no filter" (~L8785) bans `filter:` inside the ROSTER LEDGER block: keep the veil outside that block or name the exception there too.
- Checks that pin today's geometry: logicFixes ~L8813 (`.kpm-fleet-panel { position: absolute;` in the lg block) and the round-2 block at the end (`--panel: var(--raised); background: var(--raised); border-left: 2px solid var(--accent-edge);`, kpmFleetOut, onAnimationEnd).
- `position: fixed` is safe today: no transform/filter ancestor (probe.js: `.kpm-fleet` overflow hidden, the scroller, the shell `relative z-10`). A veil inside the shell box cannot cover the demo bars - fine.
- After the build, resample: toggle.js (close 1 -> 0, 0 -> 24 px, then gone), motion.js (open 1, presses 0, next person 1), cut-add.js (Add personnel head is the panel's own). Frames dark + light (light.js / unlight.js), PC + phone, products counted with count.js.
- The phone's 30 px keys are PC-only: G30 checks the 44 px touch minimum.

LAB: launch demo-emulator, demo-api-emulator, demo-app-emulator (5176); `node tools/demo-reset-emulator.mjs`. A fresh emulator has NO invites (404): write `demo_invites/walker.pc@gmail.com` and `walker@gmail.com` by REST - POST `http://127.0.0.1:8080/v1/projects/kpm-demo-f4d74/databases/(default)/documents/demo_invites?documentId=<email>`, header `Authorization: Bearer owner`, body `{fields:{by:{stringValue:'lab'}}}`. Then from A-Brain `Raw/2026-11-15-journey-review`: `node walk5176.mjs --pc --gate-only 8`, `node jp.mjs tap 'text=SWITCH' --pc=9557`, `tap 'text=HENDRA'`, `--gate-only 8` again, `node jp.mjs eval talk.js --pc=9557`. Shooter in `Raw/2026-11-16-fleet-build`: `node fs.mjs <pc|phone> <prefix> [--noopen] [--eval=x.js] [--after=count.js] [--quiet]`. CRLF files (FleetCanvasManager.jsx, theme.css, vanBay.js): edit with scratchpad `rep.mjs` (//@@FIND //@@WITH //@@END, each FIND must match once). Stop the servers before `npm run build`.

BEFORE ANY PUSH: `git log origin/phase0-solid-ground..HEAD`; any `Antigravity:` commit gets `git show` (only .claude/ANTIGRAVITY-TASK.md) and the gates re-run. Gates: logicFixes, npm run build, integration.audit, every *.selfcheck.mjs by exit code; a patch note en + id.

AFTER THIS JOB (next brief, not now): the demo guide - Antigravity Task 3 (aim() rings the hidden `<button data-mark="restock_vault">`, not `.kpm-rail-totem`), the capybara walks the sidebar item by item (Task 5's 17 lines), Task 7 (every beat aiming at something hidden). Then the Retur audit's 6 OPEN holes as 🔴 DECIDEs (Task 6) - money, never fixed unasked.

ANTIGRAVITY: Tasks 6, 7, 8 OPEN (8 = the other overlays cut audit, 20:15). DONE -> read its Result, review the commit, push, log it, and write the next task unasked: keep at least 2 OPEN until HE says its quota is out (his 2026-11-16 20:15).

THE OTHER 15 OVERLAYS (Antigravity Task 4 list): inside the same z-10 box, so under the demo bars by construction; a cut shows only when the content is taller than the screen minus 71 px. Not measured; Antigravity Task 8 audits them (read-only). Fleet's Surat Jalan was measured: fine (title y 96 PC / 82 phone).

STILL OWED BY HIM: his test of 63abfb93 on the live demo; phone test - SWITCH twice -> "fast" or "slow".
