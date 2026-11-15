# The one job

Journey Plan fixes from the big-company phone test (2026-11-15 08:43) - his pick of A-F decides. Board: A-Brain Raw/2026-11-15-journey-big/board.png. Every finding with its numbers: A-Brain Brainstorm/2026-11-15_journey-plan-big-company-test.md.

FIRST - two answers owed by him:
1. His phone test of the live demo after 00:05 WIB on 2026-11-16 (the big company starts with that reset): press SWITCH twice -> "fast" or "slow". The lab says the vault gate takes 23.5 s on a first visit on the PRODUCTION build (22.9 s on the dev server), so the wait is real. "slow" -> E comes before A-D. DEMO_SIZE=small on the demo's Vercel project undoes the big company without code.
2. Which of A-F, in what order. My pick: A, B, C, D in one job; E its own job; F only if he wants it.

THE FIXES - each one: trial first, one line in src/config/logicFixes.selfcheck.mjs, frames on the phone. None was tried yet.
A. The full map is taller than an Android screen. src/JourneyView.jsx:1200 gives it `fixed inset-0`; in an Android Chrome tab that resolves to the large viewport: 839 px on a 783 px screen (412 wide), 773 on 717 (390). The six bottom keys (nav[aria-label="Map keys"], expedition.css .kx-dock) lose their names below the edge; their top halves still take a tap. Candidate: 100dvh (or the small viewport). The iPhone home-screen app already fits (dock 719-787 of 844) - keep it so.
B. Find a shop while a salesman is pressed shows empty streets and no message. JourneyView.jsx:848 `hideOthers` keeps only his shops; goToShop (:890-897) warns only when the shop is off the day's round. Two ways: let go of him and fly (all shops back), or keep him and notify "Toko X is not on AW's road". Others hide because of his 2026-10 "just show the stores that is being assigned for him" - ask which, or take notify (smaller, changes nothing he chose).
C. The full map's top row (salesman chips, zoom +) sits under the DEMO bar and the guide line: y 13 on Android, y 60 on the iPhone (elementFromPoint = kpm-demo-bar). Demo build only.
D. Demo data: api/_demoCompany.js:345-359 sets a shop's lastVisit only from visit reports, so the top says 36/600 visited while the Team box says 228/588 done. A real sale sets it (MerchantSalesView.jsx:1445). Let today's sales set lastVisit too; it shows after the next reset; `node tools/demo-reset-emulator.mjs` must stay 34/34.
E. Vault gate speed on a first visit, big company: 23.5 s. App.jsx ~1369 awaits updateDoc(adminDocRef) while isUnlocking - LIKELY the phone's cache saving ~3,000 docs first; not proven. A diagnosis job of its own.
F. A 46 px empty band between the day row and the small map (day row bottom 360, map top 406 at 412) - the closed Find / Team fold.
Also seen, not a fix yet: the capybara's "WELCOME BACK, BOSS!" stands over the full map's Exit corner on Android (Exit still takes the tap). Journey Plan opens in 1.8-2.2 s on the production build (settled 3.3-3.9 s); its profile: garbage collection ~1 s, Leaflet re-making marker icons 0.32 s.

THE LAB (as of 2026-11-15):
1. preview_start "demo-emulator"; `node tools/demo-reset-emulator.mjs` (big by default, 35 s, no app connected); invites: FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 + firebase-admin, set demo_invites/walker@gmail.com and walker.pc@gmail.com ({ by: 'lab', at: new Date() }).
2. Phone: boot kpm_phone (A-Brain Wiki/Concepts/Looking at the App.md). To LOOK at a fix, the dev server is fine: "demo-app-emulator" 5176 + "demo-api-emulator" 5177, adb reverse 5176 5177 8080 9099. For SPEED only the production lab build counts - recipe in Looking at the App, "SPEED IS MEASURED ON A PRODUCTION BUILD"; the dev server reads 4-8x slower (React dev timers).
3. Tools in A-Brain Raw/2026-11-15-journey-big: jp.mjs (state / tap / shot / journey timing; taps scroll to off-screen keys), prof.mjs + callers.mjs (CPU profile of the open), notch.mjs (iPhone 13 home-screen notch, one process), fresh.mjs (first-time visitor), hush.mjs (the capybara intro), walk4195.mjs (sign-in + vault gate on 4195), board.mjs (gold marks + a drawn notch).
4. 390 px: `adb shell wm size 1170x2532` + `wm density 480` (the page reloads and the capybara intro replays - hush.mjs); `wm size reset` + `wm density reset` after.
5. Stop the preview servers before any build.

OPEN (not this job): step 8 "Count this one again" (StockOpnameView ~1855) - the guide does not say a count that differs must be typed twice.

THEN (his order): 1. The Q2 mark looks round (A-Brain Raw/2026-11-14-day-replay-mark/; DayReplay.jsx:217-220 sets `picked`; expedition.css has no `.picked` rule since 7a3dc370). 2. Ask him whether anything else keeps Journey Plan from looking its best, then Fleet & Roster (src/FleetCanvasManager.jsx). 3. Last (his split): the capybara tutorial + the demo door on the newest app.

Antigravity: the Retur audit task (.claude/ANTIGRAVITY-TASK.md) is OPEN, waiting for him to run it.

TRAPS
- launch.json "demo-build" (4195) serves dist-demo, a build on the LIVE demo project: never sign in there. `grep -l __kpmEmulatorAuth dist-demo/assets/*.js` names a file only for a lab build. After a lab build, rebuild dist-demo the normal way and run `node src/config/demoBuild.check.mjs`.
- Before any push: `git log origin/phase0-solid-ground..HEAD`; an `Antigravity:` commit gets `git show` + the gates re-run, or the push waits.
- A-Brain pushes need no ask (his 2026-11-15 "u should upload every information to A brain"); its remote also gets "Nolan A-Brain" tobacco commits, so pull --rebase --autostash first when a push is refused.
- .claude/launch.json, graphify-out/ and .claude/skills/alucard/lessons.md were modified before this job - never commit them with it.

KEEP THIS FILE UNDER 7,000 CHARACTERS - ONE job. When a job is done, move its text to the top of NEXT-SESSION-archive.md and write the next one here.
