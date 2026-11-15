# The one job

Test Journey Plan on the BIG demo company in the Android emulator (notch included), then send him frames, not a test list. Aldi, 2026-11-14: "all this test could be done in android since they both share the same ui as long as their resolution fir the iphone and android it should be fine, dont forget that some phone have notch as well like iphone". Why the big company: "u could simulate as its a big company having a lot of sales and revenue to view".

FIRST - the switch is IN (kpm 6eea6e92, 2026-11-15 07:55). His yes: "yes, to make sure that there is no problem when big company want to use my system is simulate it big". The live demo is the big company from the next 00:05 WIB reset; DEMO_SIZE=small on the demo's Vercel project undoes it without code. His test owed: on his phone, SWITCH twice in the live demo -> "fast" or "slow". His reason makes the slow vault (OPEN below) a product problem a real big customer would hit: if he says slow, the speed comes before this job.

THE LAB (as of 2026-11-15):
1. preview_start "demo-emulator"; `node tools/demo-reset-emulator.mjs` (the big company is the default now, `--small` for the small one; 34 checks; run it with no app connected - with the phone's app listening one reset took 305 s and 3 checks failed); invite: FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 + firebase-admin, set demo_invites/walker@gmail.com (and walker.pc@gmail.com).
2. preview_start "demo-api-emulator" (5177) and "demo-app-emulator" (5176).
3. Android: boot kpm_phone (A-Brain Wiki/Concepts/Looking at the App.md); adb reverse 5176 5177 8080 9099; open http://localhost:5176/ ONCE - `am start` opens a new tab each time and a background tab is frozen (a probe never answers): `node tabs.mjs` keeps one. The phone keeps its storage across boots; `node clear.mjs` makes a first-time visitor.
4. Tools in A-Brain Raw/2026-11-14-big-demo-walk: walk.mjs (the guide walk: --tag= --tier= --pc --gate-only), probe.mjs / tap.mjs (one look / one tap), board.mjs (a board from frames). Sign-in on the emulator: window.__kpmEmulatorAuth (walk.mjs signIn).
5. Sizes: `adb shell wm size 1170x2532` + `wm density 480` = the iPhone 13's 390x844 CSS px (460 gives 407). Notch: index.html has viewport-fit=cover + black-translucent, so the iPhone home-screen app draws under the notch; PC Chrome 157 fakes it with CDP Emulation.setSafeAreaInsetsOverride { insets: { top: 47, bottom: 34 } } at 390x844 - label those frames a simulation. On Android, read env(safe-area-inset-top) in a Chrome tab before claiming either way.
6. Stop the preview servers before any `npm run build`.

JOURNEY PLAN (src/JourneyView.jsx, src/components/DayReplay.jsx): menu mark [data-mark="journey"]; controls by aria-label: "Team", "Day" (2 pickers), "Map keys", "Find a shop", "Replay" / "Day Replay", "Camera", replay keys (Play/Pause, Restart, Previous stop, Next stop, Speed, Time of day), "Close". As T2 (Owner). Frames: open, a salesman picked, Day Replay playing, Find a shop - at 412 (Pixel 7), 390 (iPhone 13 size) and the iPhone notch simulation. Time how long the map takes to show its shops.

OPEN (found by the walk, not fixed):
- Step 8 "Count this one again" (StockOpnameView ~1855): a count that differs from the stock must be typed twice; the guide does not say so, so a visitor who types any number is stuck at Submit ("Count these again before submitting").
- Speed on the lab phone: vault open ~9.5 s on a first visit (small) vs 18-22 s after a SWITCH and 33 s+ on a first visit (big); PROSES RETUR busy 16 s, EOD send 12.8 s, approve 7.8 s (big). The unlock awaits updateDoc(adminDocRef) (App.jsx ~1369) while isUnlocking - LIKELY the phone's cache saving ~3,000 docs first; not proven.

THEN (his order):
1. The Q2 mark looks round (he said "sure"): A-Brain Raw/2026-11-14-day-replay-mark/; DayReplay.jsx:217-220 sets `picked`; expedition.css has no `.picked` rule since 7a3dc370.
2. Ask him whether anything else keeps Journey Plan from looking its best. Then Fleet & Roster (src/FleetCanvasManager.jsx).
3. Last (his split): the capybara tutorial + the demo door on the newest app, once the redesigns are done.

Antigravity: the Retur audit task (.claude/ANTIGRAVITY-TASK.md) is OPEN, waiting for him to run it.

TRAPS
- Before any push: `git log origin/phase0-solid-ground..HEAD`; an `Antigravity:` commit gets `git show` + the gates re-run, or the push waits.
- A-Brain pushes need no ask (his 2026-11-15 "u should upload every information to A brain"); its remote also gets "Nolan A-Brain" tobacco commits, so pull --rebase --autostash first when a push is refused.
- .claude/launch.json, graphify-out/ and .claude/skills/alucard/lessons.md were modified before this job - never commit them with it.

KEEP THIS FILE UNDER 7,000 CHARACTERS - ONE job. When a job is done, move its text to the top of NEXT-SESSION-archive.md and write the next one here.
