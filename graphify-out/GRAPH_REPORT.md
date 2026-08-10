# Graph Report - kpm-inventory-main  (2026-08-10)

## Corpus Check
- 88 files · ~547,550 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 616 nodes · 1148 edges · 40 communities (38 shown, 2 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 22 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `01dfdb04`
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
- HallOfFameView.jsx
- test-batch1.mjs
- test-batch2.mjs
- React + Vite
- Duke3D.jsx
- CLAUDE.md
- Animation prompts — Pip-Boy style, capybara merchant
- savePhotoAndGetReference
- customerBrief.selfcheck.mjs
- hasClearance
- Sales Terminal — test list
- LOG — newest first, older entries live in `git log` for this file
- check-progress.mjs
- COMPACTING NOW — what the summary must keep, and what it must drop
- CustomerManager.jsx
- dayStats.selfcheck.mjs
- txSize.selfcheck.mjs
- MerchantSalesView
- MerchantSalesView.jsx
- plan-quota.mjs
- MerchantSalesView.jsx
- dayStats.selfcheck.mjs
- MerchantSalesView.jsx
- mixedUnits.selfcheck.mjs
- vaultGrace.selfcheck.mjs

## God Nodes (most connected - your core abstractions)
1. `notify()` - 43 edges
2. `confirmAction()` - 37 edges
3. `KPMInventoryApp()` - 28 edges
4. `formatRupiah()` - 23 edges
5. `MerchantSalesView()` - 20 edges
6. `convertToBks()` - 18 edges
7. `LOG — newest first, older entries live in `git log` for this file` - 17 edges
8. `AgentProfileView()` - 15 edges
9. `CustomerManagement()` - 14 edges
10. `commitInChunks()` - 14 edges

## Surprising Connections (you probably didn't know these)
- `AgentProfileView()` --indirect_call--> `k()`  [INFERRED]
  src/AgentProfileView.jsx → .claude/context-watch.mjs
- `JourneyView()` --indirect_call--> `k()`  [INFERRED]
  src/JourneyView.jsx → .claude/context-watch.mjs
- `KPMInventoryApp()` --references--> `react`  [EXTRACTED]
  src/App.jsx → package.json
- `PermissionMatrixEditor()` --references--> `react`  [EXTRACTED]
  src/components/SettingsView.jsx → package.json
- `SettingsView()` --references--> `react`  [EXTRACTED]
  src/components/SettingsView.jsx → package.json

## Import Cycles
- None detected.

## Communities (40 total, 2 thin omitted)

### Community 0 - "App.jsx"
Cohesion: 0.08
Nodes (23): AgentInventoryView, AgentProfileView, BranchWarehouseManager, ConsignmentFinanceView, DashboardView, EODReconciliationView, FleetCanvasManager, HistoryReportView (+15 more)

### Community 1 - "MapMissionControl.jsx"
Cohesion: 0.11
Nodes (26): checkPointInGeoJSON(), CustomerDetailView(), CustomerManagement(), isPointInPolygon(), getCustomerAccessLevel(), BorderImporter(), checkPointInGeoJSON(), compressCoords() (+18 more)

### Community 2 - "dependencies"
Cohesion: 0.05
Nodes (36): @emailjs/browser, firebase, idb, leaflet, lucide-react, dependencies, @emailjs/browser, firebase (+28 more)

### Community 3 - "permissions.js"
Cohesion: 0.11
Nodes (40): AgentInventoryView(), getCurrentDate(), AuditVaultView(), BranchWarehouseManager(), confirmAction(), CrownTransferProtocol(), DashboardBenchmarks(), CustomTooltip() (+32 more)

### Community 4 - "devDependencies"
Cohesion: 0.06
Nodes (31): autoprefixer, cross-env, eslint, @eslint/js, eslint-plugin-react-hooks, eslint-plugin-react-refresh, globals, devDependencies (+23 more)

### Community 5 - "mixedUnits.selfcheck.mjs"
Cohesion: 0.11
Nodes (16): blank, done, eightDaysAgo, far, free, HERE, minefar, near (+8 more)

### Community 6 - "savePhotoAndGetReference"
Cohesion: 0.12
Nodes (20): ConfirmHost(), BOOST, boostElement(), initSounds(), __isUnlocked(), liteModeOn(), makePool(), MUMBLES (+12 more)

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

### Community 11 - "HallOfFameView.jsx"
Cohesion: 0.12
Nodes (31): AgentProfileView(), BADGE_CATEGORIES, createImage(), DynamicIconMap, getCroppedImg(), AchievementTester(), BASE_STATS, buildFakeCareer() (+23 more)

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
Cohesion: 0.09
Nodes (26): hook, k(), left, lines, pct, promptAction(), PermissionMatrixEditor(), store() (+18 more)

### Community 23 - "customerBrief.selfcheck.mjs"
Cohesion: 0.16
Nodes (11): b, guarded, inventory, messy, ok, rows, sameDay, sd (+3 more)

### Community 24 - "hasClearance"
Cohesion: 0.04
Nodes (43): allJs, appCode, appFiles, appSrc, beforeNota, boxLeft, BS, CENSUS (+35 more)

### Community 25 - "Sales Terminal — test list"
Cohesion: 0.13
Nodes (14): A. The shelf, B. The rail (desktop, wide window), C. The customer brief, D. Money — the part that must be exactly right, E. The merchant, F. Phone (narrow the browser, or use your phone), G. Nothing old was lost, H. Territory and duplicate outlets — built 2026-08-07 (+6 more)

### Community 26 - "LOG — newest first, older entries live in `git log` for this file"
Cohesion: 0.07
Nodes (29): 2026-08-09 20:10 WIB — ✅ THE VAULT GATE DESIGN IS SIGNED OFF. Next job is the PORT., 2026-08-09 20:25 WIB — the ring ignored its own slider, and he saw it before I did, 2026-08-09 20:35 WIB — ✅ GATE DESIGN CLOSED. One clock, 3s wave. Next session: port it., 2026-08-09 20:45 WIB — the palette law reached the other four gate modes. `6a3aaca`, 2026-08-09 20:50 WIB — quest log sorted at last, and the mascot got his voice, 2026-08-10 01:47 WIB — ✅ JOB 6 IS BUILT. The gate is in the app. `784f5cc`, 2026-08-10 02:01 WIB — he looked at the gate, and the port had done half the job. `ae341e7`, 2026-08-10 02:15 WIB — the gate is VERIFIED IN THE RUNNING APP. `036ead3` (+21 more)

### Community 27 - "check-progress.mjs"
Cohesion: 0.29
Nodes (6): hook, note, now, root, SKIP, walk()

### Community 28 - "COMPACTING NOW — what the summary must keep, and what it must drop"
Cohesion: 0.40
Nodes (4): COMPACTING NOW — what the summary must keep, and what it must drop, Drop hard — this is where the waste is, Keep, in this order, Then, immediately after compacting

### Community 29 - "CustomerManager.jsx"
Cohesion: 0.16
Nodes (12): BiohazardTheme(), NotificationBell(), app, auth, db, firebaseConfig, googleProvider, storage (+4 more)

### Community 30 - "dayStats.selfcheck.mjs"
Cohesion: 0.28
Nodes (7): FADE, MASCOT_CHATTER, MASCOT_FAILURES, report(), STICKY, isFailure(), isSticky()

### Community 31 - "txSize.selfcheck.mjs"
Cohesion: 0.21
Nodes (10): big, line, naive, product, size(), stripped, canReachInternet(), useOfflineEngine() (+2 more)

### Community 32 - "MerchantSalesView"
Cohesion: 0.36
Nodes (7): getDocOfflineSafe(), KPMInventoryApp(), computeDayXP(), clearGrace(), graceIsValid(), readGrace(), touchGrace()

### Community 33 - "MerchantSalesView.jsx"
Cohesion: 0.43
Nodes (7): easeInOut(), easeOut(), gateCanvasOn(), gateHoldMs(), gateIsRich(), rndWord(), VaultGate()

### Community 34 - "plan-quota.mjs"
Cohesion: 0.29
Nodes (5): b64(), candidates, connId, mint(), saved

### Community 35 - "MerchantSalesView.jsx"
Cohesion: 0.40
Nodes (4): CapybaraMascot(), LOCKED_MESSAGES, LOGGED_IN_MESSAGES, NO_MESSAGES

### Community 36 - "dayStats.selfcheck.mjs"
Cohesion: 0.19
Nodes (9): justAfterLocalMidnight, justBeforeLocalMidnight, NOW, rows, s, shuffled, withReturn, dayStats() (+1 more)

### Community 37 - "MerchantSalesView.jsx"
Cohesion: 0.35
Nodes (10): MerchantSalesView(), reorderFromLast(), agoLabel(), splitToUnits(), directionsUrl(), km(), metresLabel(), mine() (+2 more)

### Community 38 - "mixedUnits.selfcheck.mjs"
Cohesion: 0.25
Nodes (7): back(), bksPerUnit(), cello, custom, d, real, totalBks()

### Community 39 - "vaultGrace.selfcheck.mjs"
Cohesion: 0.33
Nodes (4): body, fnText, graceIsValid, src

## Knowledge Gaps
- **266 isolated node(s):** `root`, `note`, `hook`, `now`, `hook` (+261 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **2 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `devDependencies` connect `devDependencies` to `dependencies`?**
  _High betweenness centrality (0.064) - this node is a cross-community bridge._
- **Why does `notify()` connect `permissions.js` to `App.jsx`, `MapMissionControl.jsx`, `MerchantSalesView`, `MerchantSalesView.jsx`, `HallOfFameView.jsx`, `savePhotoAndGetReference`, `dayStats.selfcheck.mjs`, `txSize.selfcheck.mjs`?**
  _High betweenness centrality (0.052) - this node is a cross-community bridge._
- **Are the 3 inferred relationships involving `MerchantSalesView()` (e.g. with `t()` and `back()`) actually correct?**
  _`MerchantSalesView()` has 3 INFERRED edges - model-reasoned connections that need verification._
- **What connects `root`, `note`, `hook` to the rest of the system?**
  _266 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `App.jsx` be split into smaller, more focused modules?**
  _Cohesion score 0.082010582010582 - nodes in this community are weakly interconnected._
- **Should `MapMissionControl.jsx` be split into smaller, more focused modules?**
  _Cohesion score 0.10526315789473684 - nodes in this community are weakly interconnected._
- **Should `dependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.05405405405405406 - nodes in this community are weakly interconnected._