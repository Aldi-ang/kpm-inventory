# Graph Report - kpm-inventory-main  (2026-08-14)

## Corpus Check
- 92 files · ~594,534 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 769 nodes · 1312 edges · 55 communities (50 shown, 5 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 24 edges (avg confidence: 0.79)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `f6c5dbe9`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- App.jsx
- MapMissionControl.jsx
- dependencies
- permissions.js
- devDependencies
- mixedUnits.selfcheck.mjs
- savePhotoAndGetReference
- getCurrentDate
- manifest.json
- KPM Inventory — Manual Test Checklist
- Firestore Security Rules — Deployment Checklist
- AgentProfileView.jsx
- test-batch1.mjs
- test-batch2.mjs
- React + Vite
- Duke3D.jsx
- CLAUDE.md
- Animation prompts — Pip-Boy style, capybara merchant
- savePhotoAndGetReference
- JourneyView.jsx
- hasClearance
- Sales Terminal — test list
- LOG — newest first, older entries live in `git log` for this file
- check-progress.mjs
- COMPACTING NOW — what the summary must keep, and what it must drop
- customerBrief.selfcheck.mjs
- BiohazardTheme.jsx
- txSize.selfcheck.mjs
- dayStats.selfcheck.mjs
- docChanges.selfcheck.mjs
- plan-quota.mjs
- MerchantSalesView.jsx
- KPMInventoryApp
- toastSeverity.selfcheck.mjs
- mixedUnits.selfcheck.mjs
- vaultGrace.selfcheck.mjs
- CapybaraMascot.jsx
- 🔴 LOG 2026-08-13 08:15 WIB — QUOTA 100%. Architect redesign UNFINISHED. Fire sprite done, uncommitted. (KPM app session)
- check
- 🔴 LOG 00:37 WIB — superseded: 4 blockers found, now all fixed.
- ✅ LOG 08:36 WIB — the rules question is ANSWERED, and G6 is HALF done. One question owed.
- ✅ LOG 07:24 WIB — round 2 produced NO report. Two bugs found by hand, fixed, vault committed.
- ✅ 13:20 — THE FREEZE'S BIGGEST CAUSE IS FIXED. ~100 outlets was the number that decided it.
- ✅ LOG 01:05 WIB — ALL 15 FIXED. Lancelot.gs is ready to paste (1511 lines, 43 checks).
- customerBrief.selfcheck.mjs
- dayStats.selfcheck.mjs
- MerchantSalesView.jsx
- dayStats.selfcheck.mjs
- VaultGate.jsx
- 🔴 LOG 08:02 WIB — superseded by the 13:20 log. Tab audit's report died; findings salvaged since.
- ✅ LOG 2026-08-14 06:25 WIB — drawer gone while signed out, panel in the gate's FORMAT. 358/358. (KPM app session)

## God Nodes (most connected - your core abstractions)
1. `PROGRESS — read this, search for nothing` - 90 edges
2. `notify()` - 43 edges
3. `confirmAction()` - 37 edges
4. `KPMInventoryApp()` - 28 edges
5. `formatRupiah()` - 23 edges
6. `MerchantSalesView()` - 20 edges
7. `convertToBks()` - 18 edges
8. `AgentProfileView()` - 15 edges
9. `CustomerManagement()` - 14 edges
10. `commitInChunks()` - 14 edges

## Surprising Connections (you probably didn't know these)
- `JourneyView()` --indirect_call--> `k()`  [INFERRED]
  src/JourneyView.jsx → .claude/context-watch.mjs
- `AgentProfileView()` --indirect_call--> `k()`  [INFERRED]
  src/AgentProfileView.jsx → .claude/context-watch.mjs
- `KPMInventoryApp()` --references--> `react`  [EXTRACTED]
  src/App.jsx → package.json
- `MapRecenter()` --references--> `react`  [EXTRACTED]
  src/JourneyView.jsx → package.json
- `MerchantSalesView()` --references--> `react`  [EXTRACTED]
  src/MerchantSalesView.jsx → package.json

## Import Cycles
- None detected.

## Communities (55 total, 5 thin omitted)

### Community 0 - "App.jsx"
Cohesion: 0.09
Nodes (21): AgentInventoryView, AgentProfileView, BranchWarehouseManager, ConsignmentFinanceView, DashboardView, EODReconciliationView, FleetCanvasManager, HistoryReportView (+13 more)

### Community 1 - "MapMissionControl.jsx"
Cohesion: 0.50
Nodes (3): F — Phone, G — Nothing old was lost, KPM Sales Terminal — test results

### Community 2 - "dependencies"
Cohesion: 0.06
Nodes (33): @emailjs/browser, firebase, idb, leaflet, lucide-react, dependencies, @emailjs/browser, firebase (+25 more)

### Community 3 - "permissions.js"
Cohesion: 0.47
Nodes (6): createdMillis(), findDuplicates(), groupKey(), hasCoords(), metresBetween(), normaliseName()

### Community 4 - "devDependencies"
Cohesion: 0.06
Nodes (31): autoprefixer, cross-env, eslint, @eslint/js, eslint-plugin-react-hooks, eslint-plugin-react-refresh, globals, devDependencies (+23 more)

### Community 5 - "mixedUnits.selfcheck.mjs"
Cohesion: 0.11
Nodes (16): blank, done, eightDaysAgo, far, free, HERE, minefar, near (+8 more)

### Community 6 - "savePhotoAndGetReference"
Cohesion: 0.11
Nodes (23): ConfirmHost(), BOOST, boostElement(), buildGainStage(), initSounds(), __isUnlocked(), liteModeOn(), makePool() (+15 more)

### Community 7 - "getCurrentDate"
Cohesion: 0.17
Nodes (11): 0. Behaviour spec — what the assets have to serve, 1. PROMPT — 2D sprite art (paste this), 2. PROMPT — 3D model, only if Aldi wants a rotating merchant, 3. PROMPT — voiceover (paste this), 4. Wiring, once assets exist, 5. Aldi's own art — what it needs before it can ship, Hard technical limits, Lines to record — original writing, not from any game (+3 more)

### Community 8 - "manifest.json"
Cohesion: 0.22
Nodes (8): A-Brain — `D:\APP DEVELOPMENT\kpm inventory main FILES\A-Brain`, Caveman mode — always on, full intensity, If Aldi does not remember where things stood, Karpathy discipline, Standing rules — kpm-inventory, Talking to Aldi, Two traps that each cost a session, What actually costs Aldi money — measured, not guessed

### Community 9 - "KPM Inventory — Manual Test Checklist"
Cohesion: 0.12
Nodes (16): After deploying a Firestore Security Rules change specifically, 🚨 Before you say "done" or commit anything — do this EVERY time, 🔴 Business-critical — test every single release, 🟠 Data integrity — test after any related change, 🟡 Edge cases — test when touching that specific code, KPM Inventory — Manual Test Checklist, 🚨 READ THIS BEFORE YOU TOUCH THE CAREER LEDGER TOGGLE, Round 2 — fixes for the bugs you found on the first local test (+8 more)

### Community 10 - "Firestore Security Rules — Deployment Checklist"
Cohesion: 0.29
Nodes (6): After a successful deploy, Before deploying, Firestore Security Rules — Deployment Checklist, If something breaks, Immediately after deploying — test this for real, not just trust the emulator, The deploy itself

### Community 11 - "AgentProfileView.jsx"
Cohesion: 0.10
Nodes (36): hook, k(), left, lines, pct, AgentProfileView(), BADGE_CATEGORIES, createImage() (+28 more)

### Community 12 - "test-batch1.mjs"
Cohesion: 0.53
Nodes (5): ctxFor(), expect(), RULES, run(), seed()

### Community 13 - "test-batch2.mjs"
Cohesion: 0.53
Nodes (5): ctxFor(), expect(), RULES, run(), seed()

### Community 14 - "React + Vite"
Cohesion: 0.50
Nodes (3): Expanding the ESLint configuration, React Compiler, React + Vite

### Community 21 - "Animation prompts — Pip-Boy style, capybara merchant"
Cohesion: 0.29
Nodes (6): Animation prompts — Pip-Boy style, capybara merchant, How a sprite sheet gets wired (already possible today), PROMPT — 2D animation sprite sheet (paste this), PROMPT — 3D, only if a rotating merchant is ever wanted, When Aldi generates more images, Why this reference is a good fit

### Community 22 - "savePhotoAndGetReference"
Cohesion: 0.46
Nodes (6): directionsUrl(), km(), metresLabel(), mine(), nextStop(), visitedWithinCycle()

### Community 23 - "JourneyView.jsx"
Cohesion: 0.29
Nodes (7): 2026-08-10 11:44 WIB — his 8 phone items are all built. A-Brain backfilled. One self-inflicted break, fixed., 2026-08-10 11:52 WIB — Hermes → alucard. Not app work. Quota died mid-sweep., 2026-08-10 15:11 WIB — he finished the round, 64/64. G5 broken. Two questions open., 2026-08-10 21:11 WIB — the iPhone silence is fixed. `8c502f7`. Audit 217/217., 2026-08-10 — ✅ HIS PHONE CAN LOG IN NOW. Dev is HTTPS. `b1aee4e`, 2026-08-11 03:12 WIB — the strip names the last order; the IOU bug is a TENANT bug, LOG — newest first, older entries live in `git log` for this file

### Community 24 - "hasClearance"
Cohesion: 0.03
Nodes (62): allJs, appCode, appFiles, appSrc, archEnd, archStart, beforeNota, bellSrc (+54 more)

### Community 25 - "Sales Terminal — test list"
Cohesion: 0.13
Nodes (14): A. The shelf, B. The rail (desktop, wide window), C. The customer brief, D. Money — the part that must be exactly right, E. The merchant, F. Phone (narrow the browser, or use your phone), G. Nothing old was lost, H. Territory and duplicate outlets — built 2026-08-07 (+6 more)

### Community 26 - "LOG — newest first, older entries live in `git log` for this file"
Cohesion: 0.03
Nodes (79): ✅ 11:20 WIB — the PC sidebar shipped in the format his VIDEO asks for. `16c8ff9`, 362/362., ✅ 11:43 WIB — the sidebar no longer paints over the vault gate. `06f299b`, 363/363., 🔑 12:40 WIB — BROWSER ACCESS IS FIXED. It found two real bugs in an hour. `c53025b` + `a611857`, 364/364., 🕐 12:45 WIB — model switched to Sonnet 5, no code touched this turn, ✅ 13:20 WIB — his four screenshot reports. Three fixed (`9e975aa`, 364/364), the fourth is a DECISION., 🟢 13:51 WIB (Lancelot session) — no file changes this turn; those `src/**` edits are the app's, ✅ 13:55 WIB — the dock floats and moves to the corner. `93b5c2f`, 364/364. HIS TWO DECISIONS, BOTH ANSWERED., ✅ 14:40 WIB — the specificity tie that shipped twice, and the skills were installed all along. (+71 more)

### Community 27 - "check-progress.mjs"
Cohesion: 0.29
Nodes (6): hook, note, now, root, SKIP, walk()

### Community 28 - "COMPACTING NOW — what the summary must keep, and what it must drop"
Cohesion: 0.40
Nodes (4): COMPACTING NOW — what the summary must keep, and what it must drop, Drop hard — this is where the waste is, Keep, in this order, Then, immediately after compacting

### Community 29 - "customerBrief.selfcheck.mjs"
Cohesion: 0.33
Nodes (6): ⚠️ F7 — "all the SFX is gone, animation is gone, animation when sign manifest happen also gone", 🔴 G5 IS BROKEN — the IOU banner never appears. His words:, G6 — NOO registration froze his phone, 🔴 HIS FULL ROUND RESULT — 2026-08-10, 64/64 answered. Source: `kpm-test-results.md` on his Desktop, NOT A BUG, do not "fix" it, Spotted in passing, NOT in scope and NOT touched

### Community 30 - "BiohazardTheme.jsx"
Cohesion: 0.18
Nodes (10): NotificationBell(), app, auth, db, firebaseConfig, googleProvider, storage, DETECTED_TRACKS (+2 more)

### Community 31 - "txSize.selfcheck.mjs"
Cohesion: 0.14
Nodes (16): formatSampleQty(), SampleEntryModal(), SamplingAnalyticsView(), SamplingCartView(), SamplingFolderView(), big, line, naive (+8 more)

### Community 32 - "dayStats.selfcheck.mjs"
Cohesion: 0.33
Nodes (6): 🔴 LOG 20:05 WIB — STOPPED AT PLAN QUOTA 100%. Lancelot v8 written but NOT pasted. 3 real bugs found., The exact next command, The three bugs — CONFIRMED against the source, all still in the file, Trust level on the hunt, WAITING ON ALDI, What is live in his sheet right now

### Community 33 - "docChanges.selfcheck.mjs"
Cohesion: 0.19
Nodes (4): useDatabaseSync(), applyDocChanges(), base, baseState

### Community 34 - "plan-quota.mjs"
Cohesion: 0.29
Nodes (5): b64(), candidates, connId, mint(), saved

### Community 35 - "MerchantSalesView.jsx"
Cohesion: 0.19
Nodes (11): AgentInventoryView(), getCurrentDate(), DashboardBenchmarks(), CustomTooltip(), DashboardView(), formatAdvancedStock(), ItemInspector(), ResidentEvilInventory() (+3 more)

### Community 36 - "KPMInventoryApp"
Cohesion: 0.24
Nodes (10): getDocOfflineSafe(), KPMInventoryApp(), computeDayXP(), report(), EODReconciliationView(), getLocalDayKey(), clearGrace(), graceIsValid() (+2 more)

### Community 37 - "toastSeverity.selfcheck.mjs"
Cohesion: 0.32
Nodes (6): FADE, MASCOT_CHATTER, MASCOT_FAILURES, STICKY, isFailure(), isSticky()

### Community 38 - "mixedUnits.selfcheck.mjs"
Cohesion: 0.27
Nodes (10): back(), bksPerUnit(), cello, custom, d, real, totalBks(), MerchantSalesView() (+2 more)

### Community 39 - "vaultGrace.selfcheck.mjs"
Cohesion: 0.33
Nodes (4): body, fnText, graceIsValid, src

### Community 40 - "CapybaraMascot.jsx"
Cohesion: 0.40
Nodes (4): CapybaraMascot(), LOCKED_MESSAGES, LOGGED_IN_MESSAGES, NO_MESSAGES

### Community 41 - "🔴 LOG 2026-08-13 08:15 WIB — QUOTA 100%. Architect redesign UNFINISHED. Fire sprite done, uncommitted. (KPM app session)"
Cohesion: 0.33
Nodes (6): ✅ CONFIRMED BY ALDI, 🔴 HIS ACTUAL ASK, verbatim — the architect redesign is NOT a repaint, 🔴 LOG 2026-08-13 08:15 WIB — QUOTA 100%. Architect redesign UNFINISHED. Fire sprite done, uncommitted. (KPM app session), ❓ STILL OWED BY ALDI, 🔵 THE ALCOVE FIRE — asset is DONE, nothing wired yet, ⏸️ WHERE THE REDESIGN STOPPED

### Community 42 - "check"
Cohesion: 0.67
Nodes (3): check(), inCss(), inJs()

### Community 43 - "🔴 LOG 00:37 WIB — superseded: 4 blockers found, now all fixed."
Cohesion: 0.50
Nodes (4): Decision Aldi owes (not code), Fixed this session (7), 🔴 LOG 00:37 WIB — superseded: 4 blockers found, now all fixed., NOT fixed — next job, in this order

### Community 44 - "✅ LOG 08:36 WIB — the rules question is ANSWERED, and G6 is HALF done. One question owed."
Cohesion: 0.67
Nodes (3): 1. The salesman→boss customer write IS allowed by the rules — with two named exceptions, 2. G6 — the convenience shipped, the freeze did not, ✅ LOG 08:36 WIB — the rules question is ANSWERED, and G6 is HALF done. One question owed.

### Community 45 - "✅ LOG 07:24 WIB — round 2 produced NO report. Two bugs found by hand, fixed, vault committed."
Cohesion: 0.67
Nodes (3): ✅ LOG 07:24 WIB — round 2 produced NO report. Two bugs found by hand, fixed, vault committed., New feature he asked for this morning: the PESAN tab (A-Brain `d367f2f`), Second feature: the TANYA tab + the clock (A-Brain `07975bf`)

### Community 48 - "customerBrief.selfcheck.mjs"
Cohesion: 0.14
Nodes (14): b, guarded, inventory, messy, ok, rows, sameDay, sd (+6 more)

### Community 49 - "dayStats.selfcheck.mjs"
Cohesion: 0.07
Nodes (65): react, react, AuditVaultView(), BranchWarehouseManager(), confirmAction(), promptAction(), CrownTransferProtocol(), checkPointInGeoJSON() (+57 more)

### Community 50 - "MerchantSalesView.jsx"
Cohesion: 0.24
Nodes (7): css, dark, light, lum(), PAIRS, ratio(), srgb()

### Community 51 - "dayStats.selfcheck.mjs"
Cohesion: 0.19
Nodes (10): justAfterLocalMidnight, justBeforeLocalMidnight, NOW, rows, s, shuffled, withReturn, agoLabel() (+2 more)

### Community 52 - "VaultGate.jsx"
Cohesion: 0.36
Nodes (8): BiohazardTheme(), easeInOut(), easeOut(), gateCanvasOn(), gateHoldMs(), gateIsRich(), rndWord(), VaultGate()

### Community 54 - "✅ LOG 2026-08-14 06:25 WIB — drawer gone while signed out, panel in the gate's FORMAT. 358/358. (KPM app session)"
Cohesion: 0.20
Nodes (10): 06:35 — HE MEANT THE PC DRAWER. Both halves built, `git log -1`., 06:50 — THE DESK IS AN 88px STRIP. `20193bd`, 360/360. Vault `df3fd39`., 07:10 — HIS 8-ITEM LIST. 3 built (`cedd779`), 4 parked in the vault backlog, 1 is a workflow fix., 07:35 — ALL OF HIS LIST BUILT EXCEPT THE TOP PANEL. `d248017`, 360/360. **STOP HERE: quota 80%.**, 🔴 07:50 — THE PC SIDEBAR IS THE WRONG FORMAT. NOT STARTED, quota 91%. Spec + video in A-Brain., 📱 07:55 — "did the phone URL change?" — NO. It is the LAN IP, and the ROUTER changes that., 📱 08:00 — `auth/unauthorized-domain` on the phone. HIS console job, and it is the SAME cause., 📝 08:05 — NEW TO-DO: the phone ribbon's position must survive logout. Vault item written. (+2 more)

## Knowledge Gaps
- **388 isolated node(s):** `root`, `note`, `hook`, `now`, `hook` (+383 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **5 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `devDependencies` connect `devDependencies` to `dependencies`?**
  _High betweenness centrality (0.042) - this node is a cross-community bridge._
- **Why does `notify()` connect `dayStats.selfcheck.mjs` to `App.jsx`, `KPMInventoryApp`, `toastSeverity.selfcheck.mjs`, `mixedUnits.selfcheck.mjs`, `AgentProfileView.jsx`, `customerBrief.selfcheck.mjs`, `savePhotoAndGetReference`, `txSize.selfcheck.mjs`?**
  _High betweenness centrality (0.035) - this node is a cross-community bridge._
- **Why does `dependencies` connect `dependencies` to `dayStats.selfcheck.mjs`?**
  _High betweenness centrality (0.032) - this node is a cross-community bridge._
- **What connects `root`, `note`, `hook` to the rest of the system?**
  _388 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `App.jsx` be split into smaller, more focused modules?**
  _Cohesion score 0.09057971014492754 - nodes in this community are weakly interconnected._
- **Should `dependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.058823529411764705 - nodes in this community are weakly interconnected._
- **Should `devDependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.06451612903225806 - nodes in this community are weakly interconnected._