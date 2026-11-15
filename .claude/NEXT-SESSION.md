# The one job - Journey Plan review board (today vs proposed) + the Q2 mark, one lab run

He asked 2026-11-15 13:40: *"does u think journey plan now is the most efficient end most effective UI that we can do right now? if u have any suggestion as all the users for this app then tell me and show me the solution"*. Answer given: not yet, six findings - table with numbers in A-Brain Brainstorm/2026-11-15_journey-plan-big-company-test.md, "REVIEW 2026-11-15 13:45". SHOW him: one board, today vs proposed, phone 390 AND PC 1280 (his habit: phone one thing, PC everything), plus the salesman's own Journey Plan on the phone (not checked yet) and the Q2 mark's look. Proposed frames = trial in the working tree on the dev server (5176), shot, then `git stash` it back - nothing committed before his pick. Load the design stack first (skill section 1a). Respect: the 160 px strip (his A) and the fold (his B) stay. Then build what he keeps, gates, push.

Journey fixes A-D are LIVE (9352941a, 2026-11-15 12:50 WIB). Finished jobs are in NEXT-SESSION-archive.md.

FIRST - two answers owed by him:
1. ANSWERED 2026-11-15 13:21: *"whatever the order as long as all done, efficiently and effectively"* -> the order is mine: the Q2 mark (small; this job), then Fleet & Roster, then the demo tutorial + door. Also asked him: does anything else in Journey Plan bother him? No answer -> straight to Fleet & Roster after the Q2 mark; do not ask again.
2. His phone test of the live demo after 00:05 WIB on 2026-11-16 (the big company starts with that reset): press SWITCH twice -> "fast" or "slow". The lab says the vault gate takes 23.5 s on a first visit (production build). "slow" -> E (below) comes before everything else. DEMO_SIZE=small on the demo's Vercel project undoes the big company without code.

HIS ORDER (set before 2026-11-15):
1. The Q2 mark looks round. Files: A-Brain Raw/2026-11-14-day-replay-mark/ (board + his pick); src/components/DayReplay.jsx:217-220 sets `picked`; src/styles/expedition.css has had no `.picked` rule since 7a3dc370, so the picked mark draws like any other. Start by reading that folder's board and his answer, then trial, one check in src/config/logicFixes.selfcheck.mjs, frames on the phone (412 + 390).
2. Ask him whether anything else keeps Journey Plan from looking its best, then Fleet & Roster (src/FleetCanvasManager.jsx).
3. Last (his split): the capybara tutorial + the demo door on the newest app.

STILL OPEN from the big-company test (A-Brain Brainstorm/2026-11-15_journey-plan-big-company-test.md):
E. Vault gate speed on a first visit, big company: 23.5 s. App.jsx ~1369 awaits updateDoc(adminDocRef) while isUnlocking - LIKELY the phone's cache saving ~3,000 docs first; not proven. A diagnosis job of its own; his "slow" makes it first.
F. A 46 px empty band between the day row and the small map (the closed Find / Team fold, opened by the "Today's Route" header). Not picked.
Also seen: the capybara's "WELCOME BACK, BOSS!" stands over the full map's Exit corner on Android (Exit still takes the tap).
OPEN (not this job): step 8 "Count this one again" (StockOpnameView ~1855) - the guide does not say a count that differs must be typed twice.

THE LAB (worked 2026-11-15 12:35-12:47):
1. preview_start "demo-emulator", "demo-app-emulator" (5176), "demo-api-emulator" (5177); `node tools/demo-reset-emulator.mjs` (big, 35 s, 34/34); invites from the repo folder: `FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 node --input-type=module -e` with firebase-admin, projectId kpm-demo-f4d74, set demo_invites/walker@gmail.com and walker.pc@gmail.com ({ by: 'lab', at: new Date() }).
2. Phone: ANDROID_HOME=C:/Users/ASUS/AppData/Local/Android/Sdk; `emulator -avd kpm_phone -no-window -no-audio -no-boot-anim -no-snapshot-save -gpu swiftshader_indirect` in the background; adb (platform-tools/adb.exe, not on PATH) reverse 5176 5177 8080 9099. 390 px: `wm size 1170x2532` + `wm density 480`; `wm size reset` + `wm density reset` after; `adb emu kill` at the end.
3. Tools in A-Brain Raw/2026-11-15-journey-big: jp.mjs (state / tap / shot / type / key / eval / journey), walk4195.mjs (sign-in + vault gate; for the dev server run a copy with 4195 -> 5176), notch.mjs (iPhone 13 home-screen sim; copy with URL0 -> 5176 and a new frame prefix so the old frames stay), board.mjs <spec.json> <out.png>.
4. For SPEED only the production lab build counts (A-Brain Wiki/Concepts/Looking at the App.md, "SPEED IS MEASURED ON A PRODUCTION BUILD").
5. Stop the preview servers before any build.

TRAPS
- `am start` with a URL opens a SECOND Chrome tab on the phone; the hidden one freezes every CDP script. Close it: /json/close/<id> of the tab whose document.visibilityState is not "visible".
- jp.mjs `text=^X` never matches a control without an aria-label (the match string starts with a space): drop the ^.
- A toast is gone ~3 s after it shows: shoot right after the key that raises it.
- launch.json "demo-build" (4195) serves dist-demo, a build on the LIVE demo project: never sign in there. `grep -l __kpmEmulatorAuth dist-demo/assets/*.js` names a file only for a lab build; after one, rebuild dist-demo the normal way and run `node src/config/demoBuild.check.mjs`.
- Before any push: `git log origin/phase0-solid-ground..HEAD`; an `Antigravity:` commit gets `git show` + the gates re-run, or the push waits.
- A-Brain pushes need no ask; its remote also gets "Nolan A-Brain" tobacco commits, so pull --rebase --autostash first when a push is refused.
- .claude/launch.json, graphify-out/ and .claude/skills/alucard/lessons.md were modified before this job - never commit them with it.

Antigravity: the Retur audit task (.claude/ANTIGRAVITY-TASK.md) is OPEN, waiting for him to run it.

KEEP THIS FILE UNDER 7,000 CHARACTERS - one job; move finished jobs to the top of NEXT-SESSION-archive.md.
