# Graph Report - kpm-inventory-main  (2026-09-06)

## Corpus Check
- 154 files · ~822,026 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1502 nodes · 2659 edges · 83 communities (62 shown, 21 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 60 edges (avg confidence: 0.75)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `82e9eca2`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- App.jsx
- MapMissionControl.jsx
- dependencies
- CustomerManager.jsx
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
- vite.config.js
- Animation prompts — Pip-Boy style, capybara merchant
- dayStats.selfcheck.mjs
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
- useTransactionEngine.js
- KPMInventoryApp
- StockOpnameView.jsx
- customerBrief.selfcheck.mjs
- vaultGrace.selfcheck.mjs
- CapybaraMascot.jsx
- ✅ THE LIGHT DUKE'S LEDGER IS BUILT — 524/524, contrast self-check passes
- check
- 🔴 LOG 00:37 WIB — superseded: 4 blockers found, now all fixed.
- ✅ LOG 08:36 WIB — the rules question is ANSWERED, and G6 is HALF done. One question owed.
- dev-proxy.mjs
- nextStop.js
- toastSeverity.selfcheck.mjs
- registry.js
- MerchantSalesView.jsx
- VaultGate.jsx
- CapybaraMascot.jsx
- StubAudio
- lucide-react
- postcss
- PonderOverlay.jsx
- CustomerManager.jsx
- ShipmentPlanStage.jsx
- undef.check.mjs
- StockOpnameView.jsx
- firebase.js
- MerchantSalesView.jsx
- notify
- PonderOverlay.jsx
- context-watch.mjs
- txSize.selfcheck.mjs
- JourneyView.jsx
- KPMInventoryApp
- eslint
- 🟠 2026-09-05 08:00 — The bell is a first-class fault, not a footnote. Scope locked. Still no code.
- react-leaflet-cluster
- @types/react
- @types/react-dom
- @vitejs/plugin-basic-ssl
- 🟠 2026-09-06 07:30 — hand-off eligibility shipped (`dace958`). Approval matrix waits on one answer.
- framer-motion
- MerchantSalesView.jsx
- supply.js
- dayStats.selfcheck.mjs
- dayStats.selfcheck.mjs
- 🟠 2026-09-06 08:15 — picker hides instead of greying; and the demo link was never reaching his friends.
- 🟠 2026-09-06 15:05 — he found a real flaw in the approval matrix. Rebuilt per-person.

## God Nodes (most connected - your core abstractions)
1. `PROGRESS — read this, search for nothing` - 104 edges
2. `KPMInventoryApp()` - 48 edges
3. `notify()` - 43 edges
4. `confirmAction()` - 37 edges
5. `convertToBks()` - 36 edges
6. `formatRupiah()` - 29 edges
7. `MerchantSalesView()` - 25 edges
8. `RestockVaultView()` - 24 edges
9. `getLocalDayKey()` - 24 edges
10. `StockOpnameView()` - 23 edges

## Surprising Connections (you probably didn't know these)
- `ownerMap()` --indirect_call--> `k()`  [INFERRED]
  src/config/logicFixes.selfcheck.mjs → .claude/context-watch.mjs
- `JourneyView()` --indirect_call--> `k()`  [INFERRED]
  src/JourneyView.jsx → .claude/context-watch.mjs
- `PonderOverlay()` --indirect_call--> `k()`  [INFERRED]
  src/ponder/PonderOverlay.jsx → .claude/context-watch.mjs
- `RestockVaultView()` --indirect_call--> `k()`  [INFERRED]
  src/RestockVaultView.jsx → .claude/context-watch.mjs
- `onSnapshot()` --indirect_call--> `k()`  [INFERRED]
  tools/lab-firestore-stub.js → .claude/context-watch.mjs

## Import Cycles
- None detected.

## Communities (83 total, 21 thin omitted)

### Community 0 - "App.jsx"
Cohesion: 0.08
Nodes (25): AgentInventoryView, AgentProfileView, BranchWarehouseManager, ConsignmentFinanceView, DashboardView, EODReconciliationView, FleetCanvasManager, HistoryReportView (+17 more)

### Community 1 - "MapMissionControl.jsx"
Cohesion: 0.50
Nodes (3): F — Phone, G — Nothing old was lost, KPM Sales Terminal — test results

### Community 2 - "dependencies"
Cohesion: 0.09
Nodes (23): @emailjs/browser, firebase, idb, jsbarcode, leaflet, lucide-react, dependencies, @emailjs/browser (+15 more)

### Community 3 - "CustomerManager.jsx"
Cohesion: 0.06
Nodes (50): react, react, AcceptanceReceipt(), Money(), ArrivalScanner(), arrivalsOnHand(), BranchWarehouseManager(), inTransitQty() (+42 more)

### Community 4 - "devDependencies"
Cohesion: 0.10
Nodes (21): autoprefixer, @eslint/js, eslint-plugin-react-hooks, eslint-plugin-react-refresh, globals, devDependencies, autoprefixer, @eslint/js (+13 more)

### Community 5 - "mixedUnits.selfcheck.mjs"
Cohesion: 0.36
Nodes (8): BiohazardTheme(), easeInOut(), easeOut(), gateCanvasOn(), gateHoldMs(), gateIsRich(), rndWord(), VaultGate()

### Community 6 - "savePhotoAndGetReference"
Cohesion: 0.05
Nodes (30): DEMO_PERFORMANCE_ROWS, DEMO_PLAN_BRANCHES, DEMO_PLAN_ROWS, DEMO_TOTALS, DEMO_WAREHOUSES, SCENES, STAGES, goodsReceived (+22 more)

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
Cohesion: 0.05
Nodes (59): ConfirmHost(), BOOST, boostElement(), buildGainStage(), initSounds(), __isUnlocked(), liteModeOn(), makePool() (+51 more)

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

### Community 22 - "dayStats.selfcheck.mjs"
Cohesion: 0.06
Nodes (34): ?, ?, ?, ?, ?, ?, ?, ? (+26 more)

### Community 23 - "JourneyView.jsx"
Cohesion: 0.16
Nodes (9): app, convertToBks(), dash, djisam, isLowStock(), MIN_STOCK_UNITS, minStockBks(), s3bal (+1 more)

### Community 24 - "hasClearance"
Cohesion: 0.01
Nodes (204): allJs, allowedHex, app, appCode, appCrossed, appFiles, appSrc, archEnd (+196 more)

### Community 25 - "Sales Terminal — test list"
Cohesion: 0.13
Nodes (14): A. The shelf, B. The rail (desktop, wide window), C. The customer brief, D. Money — the part that must be exactly right, E. The merchant, F. Phone (narrow the browser, or use your phone), G. Nothing old was lost, H. Territory and duplicate outlets — built 2026-08-07 (+6 more)

### Community 26 - "LOG — newest first, older entries live in `git log` for this file"
Cohesion: 0.40
Nodes (8): PovBanner(), TierPovSwitch(), previewIdentity(), TEST_ACCOUNTS, testAccountDoc(), testAccountFor(), testAccountName(), tierLabel()

### Community 27 - "check-progress.mjs"
Cohesion: 0.22
Nodes (8): brief, hook, note, noteTime, now, root, SKIP, walk()

### Community 28 - "COMPACTING NOW — what the summary must keep, and what it must drop"
Cohesion: 0.40
Nodes (4): COMPACTING NOW — what the summary must keep, and what it must drop, Drop hard — this is where the waste is, Keep, in this order, Then, immediately after compacting

### Community 29 - "customerBrief.selfcheck.mjs"
Cohesion: 0.18
Nodes (8): bgRe, byGround, edgeRe, inkRe, lines, rows, stack, tally

### Community 30 - "BiohazardTheme.jsx"
Cohesion: 0.08
Nodes (46): hook, k(), left, lines, pct, AuthoritySelect(), HoldButton(), clampZoom() (+38 more)

### Community 31 - "txSize.selfcheck.mjs"
Cohesion: 0.12
Nodes (31): AgentProfileView(), BADGE_CATEGORIES, createImage(), DynamicIconMap, getCroppedImg(), AchievementTester(), BASE_STATS, buildFakeCareer() (+23 more)

### Community 32 - "dayStats.selfcheck.mjs"
Cohesion: 0.08
Nodes (43): EODAgentFlow(), summaryRow(), clampLine(), EODCardDeck(), HINTS, ICONS, receiptActual(), toNum() (+35 more)

### Community 33 - "docChanges.selfcheck.mjs"
Cohesion: 0.19
Nodes (4): useDatabaseSync(), applyDocChanges(), base, baseState

### Community 34 - "plan-quota.mjs"
Cohesion: 0.17
Nodes (8): b64(), candidates, connId, mint(), saved, sUsed, weekly, wUsed

### Community 35 - "useTransactionEngine.js"
Cohesion: 0.12
Nodes (13): BULAN, REEL, NotificationBell(), app, auth, db, firebaseConfig, googleProvider (+5 more)

### Community 36 - "KPMInventoryApp"
Cohesion: 0.18
Nodes (10): 1. What we are copying, and what we are not, 2. 🔴 THE DECISION THAT SHAPES EVERYTHING — demo data, not live data, 3. Scene format, 4. Prerequisite refactor (small, do it first), 5. Files, 6. Traps specific to THIS codebase, 7. Checks to add with the engine, 8. Build order (+2 more)

### Community 37 - "StockOpnameView.jsx"
Cohesion: 0.21
Nodes (10): LazyTabBoundary, canReachInternet(), onlineListeners, setSharedOnline(), subscribeOnline(), useOfflineEngine(), applySaleToCanvas(), useTransactionEngine() (+2 more)

### Community 39 - "vaultGrace.selfcheck.mjs"
Cohesion: 0.33
Nodes (4): body, fnText, graceIsValid, src

### Community 40 - "CapybaraMascot.jsx"
Cohesion: 0.02
Nodes (95): aA, aB, acceptBody, ACCEPTED, acFrom, acTo, ANDI, apFrom (+87 more)

### Community 41 - "✅ THE LIGHT DUKE'S LEDGER IS BUILT — 524/524, contrast self-check passes"
Cohesion: 0.02
Nodes (98): 🟢 2026-08-27 23:50 — THE FOUR CAPTION FAULTS ARE FIXED. `8109559`, **663/663**. Tree clean., 🟢 2026-08-28 00:20 — THE HOVER VIDEO HAS BEEN WATCHED. No code changed; **663/663**., 🟢 2026-08-28 00:47 — HOVER GLOW AND THE RIBBON/COVER FIX. `1ebbabc`, **666/666**. Tree clean., 🟠 2026-08-30 08:25 — THE POV COSTUME CAN BE POSTED ANYWHERE. `b1cdcaa`, **666/666 + 831/831**. Tree clean., 🟠 2026-08-30 10:35 — THE RESTOCK QUEUE, THE BOOK, AND THE SALES ROLLUP. `20a4622` → `18062df`, **667/667 + 915/915**. Tree clean., 🟠 2026-08-31 08:30 — THE PANEL WAS LOOKED AT, AND THE TUTORIAL IS BROKEN ON A PHONE. `e5d7e76`, **667/667 + 915/915**. Tree clean., 🟠 2026-08-31 09:05 — THE TUTORIAL CAMERA NEVER MOVED ON A PHONE. `aef7f03` + `8f3f438`, **669/669 + 915/915**. Tree clean., 🟠 2026-08-31 09:11 — THE BOOK COMES BACK TO SHUT ITSELF. `1efeb11`, **671/671 + 915/915**. Tree clean. (+90 more)

### Community 42 - "check"
Cohesion: 0.67
Nodes (3): check(), inCss(), inJs()

### Community 43 - "🔴 LOG 00:37 WIB — superseded: 4 blockers found, now all fixed."
Cohesion: 0.33
Nodes (5): assets, css, html, out, out_name

### Community 44 - "✅ LOG 08:36 WIB — the rules question is ANSWERED, and G6 is HALF done. One question owed."
Cohesion: 0.40
Nodes (3): PORT, ROOT, TYPES

### Community 47 - "nextStop.js"
Cohesion: 0.25
Nodes (7): 7 Days to Die track — separate repo, A — Journey Plan reassigns stores by itself, Aldi's own list, Bug 2 — PROMOTED, it is the job above., Bug 3 — the tutorial book: white line, and the close button does nothing, C — damaged goods handed back are still billed, Next session — one job

### Community 48 - "toastSeverity.selfcheck.mjs"
Cohesion: 0.25
Nodes (7): back(), bksPerUnit(), cello, custom, d, real, totalBks()

### Community 49 - "registry.js"
Cohesion: 0.70
Nodes (4): km(), mine(), nextStop(), visitedWithinCycle()

### Community 50 - "MerchantSalesView.jsx"
Cohesion: 0.22
Nodes (7): css, dark, light, lum(), PAIRS, ratio(), srgb()

### Community 51 - "VaultGate.jsx"
Cohesion: 0.50
Nodes (5): inheritedBy(), ownerMap(), refusedRows(), storeK(), visibleTo()

### Community 53 - "StubAudio"
Cohesion: 0.27
Nodes (9): getDocOfflineSafe(), KPMInventoryApp(), computeDayXP(), canUsePovSwitch(), absentForSure(), clearGrace(), graceIsValid(), readGrace() (+1 more)

### Community 55 - "postcss"
Cohesion: 0.05
Nodes (90): AgentInventoryView(), Money(), AuditVaultView(), confirmAction(), promptAction(), CrownTransferProtocol(), checkPointInGeoJSON(), CustomerDetailView() (+82 more)

### Community 57 - "CustomerManager.jsx"
Cohesion: 0.13
Nodes (6): FIXTURES, getDocs(), noop(), onSnapshot(), runTransaction(), snap()

### Community 59 - "undef.check.mjs"
Cohesion: 0.29
Nodes (6): BASELINE, eslint, fixed, found, seen, unexpected

### Community 60 - "StockOpnameView.jsx"
Cohesion: 0.29
Nodes (7): scripts, build, deploy, dev, lint, lint:undef, preview

### Community 61 - "firebase.js"
Cohesion: 0.23
Nodes (15): LABEL, ProductPerformancePanel(), dayOf(), isSale(), monthOf(), monthsInRange(), rangeDays(), RANGES (+7 more)

### Community 62 - "MerchantSalesView.jsx"
Cohesion: 0.11
Nodes (17): blank, done, eightDaysAgo, far, free, HERE, minefar, near (+9 more)

### Community 63 - "notify"
Cohesion: 0.16
Nodes (27): DashboardBenchmarks(), groupDigits(), pct(), toBal(), DashboardView(), SERIES, share(), PaceChart() (+19 more)

### Community 64 - "PonderOverlay.jsx"
Cohesion: 0.36
Nodes (8): add(), at(), buf(), env(), finish(), noise(), SOUNDS, tone()

### Community 66 - "context-watch.mjs"
Cohesion: 0.40
Nodes (4): name, private, type, version

### Community 68 - "txSize.selfcheck.mjs"
Cohesion: 0.29
Nodes (6): big, line, naive, product, size(), stripped

### Community 73 - "KPMInventoryApp"
Cohesion: 0.28
Nodes (7): FADE, MASCOT_CHATTER, MASCOT_FAILURES, report(), STICKY, isFailure(), isSticky()

### Community 84 - "MerchantSalesView.jsx"
Cohesion: 0.36
Nodes (9): MerchantSalesView(), readDraft(), reorderFromLast(), agoLabel(), dayStats(), paymentLabel(), splitToUnits(), directionsUrl() (+1 more)

### Community 86 - "supply.js"
Cohesion: 0.16
Nodes (11): b, guarded, inventory, messy, ok, rows, sameDay, sd (+3 more)

### Community 90 - "dayStats.selfcheck.mjs"
Cohesion: 0.20
Nodes (7): justAfterLocalMidnight, justBeforeLocalMidnight, NOW, rows, s, shuffled, withReturn

## Knowledge Gaps
- **743 isolated node(s):** `root`, `note`, `brief`, `hook`, `now` (+738 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **21 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `dependencies` connect `dependencies` to `CustomerManager.jsx`, `context-watch.mjs`, `framer-motion`, `react-leaflet-cluster`?**
  _High betweenness centrality (0.028) - this node is a cross-community bridge._
- **Why does `react` connect `CustomerManager.jsx` to `dependencies`, `savePhotoAndGetReference`, `MerchantSalesView.jsx`, `StubAudio`, `LOG — newest first, older entries live in `git log` for this file`, `BiohazardTheme.jsx`?**
  _High betweenness centrality (0.023) - this node is a cross-community bridge._
- **Why does `devDependencies` connect `devDependencies` to `context-watch.mjs`, `JourneyView.jsx`, `eslint`, `@types/react`, `@types/react-dom`, `@vitejs/plugin-basic-ssl`?**
  _High betweenness centrality (0.022) - this node is a cross-community bridge._
- **Are the 3 inferred relationships involving `KPMInventoryApp()` (e.g. with `t()` and `report()`) actually correct?**
  _`KPMInventoryApp()` has 3 INFERRED edges - model-reasoned connections that need verification._
- **What connects `root`, `note`, `brief` to the rest of the system?**
  _743 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `App.jsx` be split into smaller, more focused modules?**
  _Cohesion score 0.07635467980295567 - nodes in this community are weakly interconnected._
- **Should `dependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.08695652173913043 - nodes in this community are weakly interconnected._