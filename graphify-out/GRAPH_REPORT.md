# Graph Report - kpm-inventory-main  (2026-09-27)

## Corpus Check
- 177 files · ~918,602 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1752 nodes · 3317 edges · 105 communities (83 shown, 22 thin omitted)
- Extraction: 97% EXTRACTED · 3% INFERRED · 0% AMBIGUOUS · INFERRED: 100 edges (avg confidence: 0.77)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `4f44e3d0`
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
- CustomerManager.jsx
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
- notify
- eslint-plugin-react-refresh
- dayStats.selfcheck.mjs
- docChanges.selfcheck.mjs
- plan-quota.mjs
- useTransactionEngine.js
- KPMInventoryApp
- MapMissionControl.jsx
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
- notify
- MerchantSalesView.jsx
- VaultGate.jsx
- CapybaraMascot.jsx
- helpers.js
- RestockVaultView.jsx
- postcss
- PonderOverlay.jsx
- StockOpnameView.jsx
- ShipmentPlanStage.jsx
- undef.check.mjs
- StockOpnameView.jsx
- firebase.js
- MerchantSalesView.jsx
- confirmAction
- PonderOverlay.jsx
- RegionalWarehouseStage.jsx
- context-watch.mjs
- MerchantSalesView.jsx
- VaultGate.jsx
- helpers.js
- RestockVaultView.jsx
- toastSeverity.selfcheck.mjs
- supply.js
- HistoryReportView.jsx
- notify
- MerchantSalesView.jsx
- useTransactionEngine.js
- react-leaflet-cluster
- customerBrief.selfcheck.mjs
- supply.js
- @types/react-dom
- JourneyView.jsx
- haResolve
- mixedUnits.selfcheck.mjs
- formatRupiah
- PonderPad.jsx
- dayStats.selfcheck.mjs
- career.js
- HistoryReportView.jsx
- mixedUnits.selfcheck.mjs
- txSize.selfcheck.mjs
- nmKey
- @vitejs/plugin-basic-ssl
- vgRestore
- WarehouseDeskNav.jsx
- convertToBks
- StockByWarehouseTable.jsx
- PonderPad.jsx
- k
- StockByWarehouseTable.jsx
- AcceptanceReceipt.jsx
- ShipmentPlanStage.jsx
- StubAudio
- context-watch.mjs

## God Nodes (most connected - your core abstractions)
1. `KPMInventoryApp()` - 55 edges
2. `notify()` - 46 edges
3. `convertToBks()` - 46 edges
4. `confirmAction()` - 41 edges
5. `The one job` - 36 edges
6. `formatRupiah()` - 34 edges
7. `MerchantSalesView()` - 30 edges
8. `t()` - 29 edges
9. `storeKey()` - 27 edges
10. `RestockVaultView()` - 26 edges

## Surprising Connections (you probably didn't know these)
- `stampsOwed()` --indirect_call--> `val()`  [INFERRED]
  src/config/logicFixes.selfcheck.mjs → tools/seed-emulator.mjs
- `AuthoritySelect()` --indirect_call--> `k()`  [INFERRED]
  src/components/AuthoritySelect.jsx → .claude/context-watch.mjs
- `EODAgentFlow()` --indirect_call--> `k()`  [INFERRED]
  src/components/EODAgentFlow.jsx → .claude/context-watch.mjs
- `LoadingBay()` --indirect_call--> `k()`  [INFERRED]
  src/components/LoadingBay.jsx → .claude/context-watch.mjs
- `ownerMap()` --indirect_call--> `k()`  [INFERRED]
  src/config/logicFixes.selfcheck.mjs → .claude/context-watch.mjs

## Import Cycles
- None detected.

## Communities (105 total, 22 thin omitted)

### Community 0 - "App.jsx"
Cohesion: 0.08
Nodes (22): AgentInventoryView, AgentProfileView, BranchWarehouseManager, ConsignmentFinanceView, DashboardView, EODReconciliationView, FleetCanvasManager, HistoryReportView (+14 more)

### Community 1 - "MapMissionControl.jsx"
Cohesion: 0.50
Nodes (3): F — Phone, G — Nothing old was lost, KPM Sales Terminal — test results

### Community 2 - "dependencies"
Cohesion: 0.09
Nodes (23): @emailjs/browser, firebase, framer-motion, idb, jsbarcode, leaflet, dependencies, @emailjs/browser (+15 more)

### Community 3 - "CustomerManager.jsx"
Cohesion: 0.33
Nodes (5): auth, db, googleProvider, PROXIED_AUTH_HOSTS, storage

### Community 4 - "devDependencies"
Cohesion: 0.10
Nodes (21): autoprefixer, @eslint/js, eslint-plugin-react-hooks, eslint-plugin-react-refresh, globals, devDependencies, autoprefixer, @eslint/js (+13 more)

### Community 5 - "mixedUnits.selfcheck.mjs"
Cohesion: 0.17
Nodes (24): arrivalsOnHand(), BranchWarehouseManager(), inTransitQty(), middle(), oldestStockDays(), productArrivals(), receiptBlocked(), receiptDisputed() (+16 more)

### Community 6 - "savePhotoAndGetReference"
Cohesion: 0.40
Nodes (5): RS_ROSTER, RS_STORES, rsChain(), rsNameOf(), rsOf()

### Community 7 - "getCurrentDate"
Cohesion: 0.17
Nodes (11): 0. Behaviour spec — what the assets have to serve, 1. PROMPT — 2D sprite art (paste this), 2. PROMPT — 3D model, only if Aldi wants a rotating merchant, 3. PROMPT — voiceover (paste this), 4. Wiring, once assets exist, 5. Aldi's own art — what it needs before it can ship, Hard technical limits, Lines to record — original writing, not from any game (+3 more)

### Community 8 - "manifest.json"
Cohesion: 0.22
Nodes (8): A-Brain — `D:\APP DEVELOPMENT\kpm inventory main FILES\A-Brain`, Caveman mode — always on, full intensity, If Aldi does not remember where things stood, Karpathy discipline, Standing rules — kpm-inventory, Talking to Aldi, Two traps that each cost a session, What actually costs Aldi money — measured, not guessed

### Community 9 - "KPM Inventory — Manual Test Checklist"
Cohesion: 0.11
Nodes (17): After deploying a Firestore Security Rules change specifically, 🚨 Before you say "done" or commit anything — do this EVERY time, 🔴 Business-critical — test every single release, 🟠 Data integrity — test after any related change, 🟡 Edge cases — test when touching that specific code, KPM Inventory — Manual Test Checklist, 🚨 READ THIS BEFORE YOU TOUCH THE CAREER LEDGER TOGGLE, Round 2 — fixes for the bugs you found on the first local test (+9 more)

### Community 10 - "Firestore Security Rules — Deployment Checklist"
Cohesion: 0.29
Nodes (6): After a successful deploy, Before deploying, Firestore Security Rules — Deployment Checklist, If something breaks, Immediately after deploying — test this for real, not just trust the emulator, The deploy itself

### Community 11 - "CustomerManager.jsx"
Cohesion: 0.06
Nodes (32): hook, k(), left, lines, pct, dailySeries(), found(), getDoc() (+24 more)

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
Cohesion: 0.15
Nodes (10): adopters, app, convertToBks(), dash, djisam, isLowStock(), MIN_STOCK_UNITS, minStockBks() (+2 more)

### Community 24 - "hasClearance"
Cohesion: 0.01
Nodes (204): allJs, allowedHex, app, appCode, appCrossed, appFiles, appSrc, archEnd (+196 more)

### Community 25 - "Sales Terminal — test list"
Cohesion: 0.13
Nodes (14): A. The shelf, B. The rail (desktop, wide window), C. The customer brief, D. Money — the part that must be exactly right, E. The merchant, F. Phone (narrow the browser, or use your phone), G. Nothing old was lost, H. Territory and duplicate outlets — built 2026-08-07 (+6 more)

### Community 26 - "LOG — newest first, older entries live in `git log` for this file"
Cohesion: 0.06
Nodes (28): DEMO_PERFORMANCE_ROWS, DEMO_TOTALS, DEMO_WAREHOUSES, SCENES, STAGES, agentChest, goodsReceived, loadingBay (+20 more)

### Community 27 - "check-progress.mjs"
Cohesion: 0.22
Nodes (8): brief, hook, note, noteTime, now, root, SKIP, walk()

### Community 28 - "COMPACTING NOW — what the summary must keep, and what it must drop"
Cohesion: 0.40
Nodes (4): COMPACTING NOW — what the summary must keep, and what it must drop, Drop hard — this is where the waste is, Keep, in this order, Then, immediately after compacting

### Community 29 - "customerBrief.selfcheck.mjs"
Cohesion: 0.18
Nodes (8): bgRe, byGround, edgeRe, inkRe, lines, rows, stack, tally

### Community 30 - "notify"
Cohesion: 0.17
Nodes (23): LABEL, ProductPerformancePanel(), dayStats(), txSeconds(), countsAsRevenue(), debtCredit(), isTitip(), outstandingTitip() (+15 more)

### Community 31 - "eslint-plugin-react-refresh"
Cohesion: 0.07
Nodes (62): AgentProfileView(), BADGE_CATEGORIES, createImage(), DynamicIconMap, getCroppedImg(), AchievementTester(), BASE_STATS, buildFakeCareer() (+54 more)

### Community 32 - "dayStats.selfcheck.mjs"
Cohesion: 0.08
Nodes (47): EODAgentFlow(), readDraft(), summaryRow(), writeDraft(), clampLine(), EODCardDeck(), HINTS, ICONS (+39 more)

### Community 33 - "docChanges.selfcheck.mjs"
Cohesion: 0.19
Nodes (4): useDatabaseSync(), applyDocChanges(), base, baseState

### Community 34 - "plan-quota.mjs"
Cohesion: 0.17
Nodes (8): b64(), candidates, connId, mint(), saved, sUsed, weekly, wUsed

### Community 35 - "useTransactionEngine.js"
Cohesion: 0.07
Nodes (25): ArrivalScanner(), ShipmentLabel(), LOOKS, LAB_AGENT_TXNS, LAB_CUSTOMERS, LAB_FLEET, LAB_FLEET_CUSTOMERS, LAB_FLEET_TITIP (+17 more)

### Community 36 - "KPMInventoryApp"
Cohesion: 0.18
Nodes (10): 1. What we are copying, and what we are not, 2. 🔴 THE DECISION THAT SHAPES EVERYTHING — demo data, not live data, 3. Scene format, 4. Prerequisite refactor (small, do it first), 5. Files, 6. Traps specific to THIS codebase, 7. Checks to add with the engine, 8. Build order (+2 more)

### Community 37 - "MapMissionControl.jsx"
Cohesion: 0.32
Nodes (12): DAMAGE_REASONS, damageBlocked(), damageSorted(), isLeak(), recountState(), samePass(), shortageStreak(), StockOpnameView() (+4 more)

### Community 39 - "vaultGrace.selfcheck.mjs"
Cohesion: 0.33
Nodes (4): body, fnText, graceIsValid, src

### Community 40 - "CapybaraMascot.jsx"
Cohesion: 0.01
Nodes (193): aA, aB, acceptBody, ACCEPTED, acFrom, acTo, aiv, AIV_ROSTER (+185 more)

### Community 41 - "✅ THE LIGHT DUKE'S LEDGER IS BUILT — 524/524, contrast self-check passes"
Cohesion: 0.29
Nodes (6): 🟢 2026-09-26 08:50 — the boss's EOD list by night (`293798c`; local, not pushed), 🟢 2026-09-26 09:05 — the salesman sees his own late EOD (`dd94f8b`; local, not pushed), 🟢 2026-09-26 10:10 — I tested it myself: 17/17 in the lab (`48d50bc`; local, not pushed), 🟢 2026-09-26 10:15 — APPROVED: *"test approve continue your work"*, 🟢 2026-09-26 10:35 — the Loading Bay ponder page, self-tested 9/9 (`fcaad9c` `13f34fb` `1a5647d`; local, not pushed), PROGRESS — read this, search for nothing

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
Cohesion: 0.04
Nodes (45): Appearance — deferred on purpose, last, Business track — CLOSED and PARKED, do not reopen, Closed — do not reopen, FIXED 2026-09-20 00:05 — the folder's leaving mark outlived its page (`6379364`) — CONFIRMED 00:15 (*"approve, continue"*), and d7f2193 with it, History - facts only, NOT a prompt to copy, How to measure and propose — the recipe is settled, do not re-derive it, Job 4: AGENT PROFILE on the phone — mount first (2026-09-20 00:20, nothing built yet), Paste this to start the next session (+37 more)

### Community 48 - "toastSeverity.selfcheck.mjs"
Cohesion: 0.17
Nodes (9): b, guarded, inventory, messy, ok, rows, sameDay, sd (+1 more)

### Community 49 - "notify"
Cohesion: 0.32
Nodes (8): react, react, t(), BookLab(), forceHover(), Lab(), MinKirimLab(), ToastLab()

### Community 50 - "MerchantSalesView.jsx"
Cohesion: 0.22
Nodes (7): css, dark, light, lum(), PAIRS, ratio(), srgb()

### Community 51 - "VaultGate.jsx"
Cohesion: 0.50
Nodes (5): inheritedBy(), ownerMap(), refusedRows(), storeK(), visibleTo()

### Community 53 - "helpers.js"
Cohesion: 0.24
Nodes (15): AuditVaultView(), confirmAction(), CrownTransferProtocol(), HistoryReportView(), LandlordDashboard(), SamplingCartView(), notify(), LocationController() (+7 more)

### Community 54 - "RestockVaultView.jsx"
Cohesion: 0.22
Nodes (15): ProofCamera(), MerchantSalesView(), readDraft(), briefSeconds(), customerBrief(), reorderFromLast(), agoLabel(), paymentLabel() (+7 more)

### Community 55 - "postcss"
Cohesion: 0.18
Nodes (15): asLeaves(), buildPages(), facingPage(), maxTurnOf(), turnFor(), ICONS, Library(), liteOn() (+7 more)

### Community 57 - "StockOpnameView.jsx"
Cohesion: 0.19
Nodes (20): DashboardView(), SERIES, share(), formatAdvancedStock(), ItemInspector(), ResidentEvilInventory(), applySaleToCanvas(), useTransactionEngine() (+12 more)

### Community 59 - "undef.check.mjs"
Cohesion: 0.29
Nodes (6): BASELINE, eslint, fixed, found, seen, unexpected

### Community 60 - "StockOpnameView.jsx"
Cohesion: 0.29
Nodes (7): scripts, build, deploy, dev, lint, lint:undef, preview

### Community 61 - "firebase.js"
Cohesion: 0.46
Nodes (5): clampZoom(), ReceiptPreview(), SAMPLE_ROWS, WATERMARK_STYLE, watermarkFrom()

### Community 62 - "MerchantSalesView.jsx"
Cohesion: 0.11
Nodes (16): blank, done, eightDaysAgo, far, free, HERE, minefar, near (+8 more)

### Community 63 - "confirmAction"
Cohesion: 0.10
Nodes (23): ConfirmHost(), ToastHost(), BOOST, boostElement(), buildGainStage(), initSounds(), __isUnlocked(), liteModeOn() (+15 more)

### Community 64 - "PonderOverlay.jsx"
Cohesion: 0.08
Nodes (33): BYPASS_WORD, CUT_WHY, fmt(), inRect(), LoadingBay(), MOTE_COLORS, moteVars(), motionOK() (+25 more)

### Community 65 - "RegionalWarehouseStage.jsx"
Cohesion: 0.21
Nodes (15): getDocOfflineSafe(), KPMInventoryApp(), canUsePovSwitch(), absentForSure(), derive(), hashSecret(), hex(), needsRehash() (+7 more)

### Community 66 - "context-watch.mjs"
Cohesion: 0.40
Nodes (4): name, private, type, version

### Community 67 - "MerchantSalesView.jsx"
Cohesion: 0.35
Nodes (9): PovBanner(), TierPovSwitch(), CORPORATE_TIERS, previewIdentity(), TEST_ACCOUNTS, testAccountDoc(), testAccountFor(), testAccountName() (+1 more)

### Community 68 - "VaultGate.jsx"
Cohesion: 0.19
Nodes (16): DashboardBenchmarks(), groupDigits(), pct(), toBal(), PaceChart(), VB, LAMP, SafetyStatus() (+8 more)

### Community 69 - "helpers.js"
Cohesion: 0.67
Nodes (3): AP_ROSTER, apPanel(), apQueue()

### Community 70 - "RestockVaultView.jsx"
Cohesion: 0.14
Nodes (16): FolderCard(), center(), MoreKey(), store(), AGENT_COLORS, checkPointInGeoJSON(), getHashColor(), getStoreHierarchy() (+8 more)

### Community 71 - "toastSeverity.selfcheck.mjs"
Cohesion: 0.26
Nodes (10): AuthoritySelect(), HoldButton(), PermissionMatrixEditor(), SettingsView(), writeCareerLedger(), writeLiteMode(), writePhotoStorage(), CUSTOMER_EDIT_PERMS (+2 more)

### Community 72 - "supply.js"
Cohesion: 0.67
Nodes (3): MP_SHOPS, mpFocus(), mpKey()

### Community 73 - "HistoryReportView.jsx"
Cohesion: 0.19
Nodes (10): focusOf(), liteOn(), POINT, PonderOverlay(), reduced(), TONE_EDGE, TONE_RING, TONE_RULE (+2 more)

### Community 74 - "notify"
Cohesion: 0.25
Nodes (7): back(), bksPerUnit(), cello, custom, d, real, totalBks()

### Community 75 - "MerchantSalesView.jsx"
Cohesion: 0.15
Nodes (19): L, createJourneyClusterIcon(), BorderImporter(), checkPointInGeoJSON(), compressCoords(), createCustomClusterIcon(), DraggableAddMarker(), getIcon() (+11 more)

### Community 76 - "useTransactionEngine.js"
Cohesion: 0.12
Nodes (17): CornerSheet(), PhotoField(), data, inside(), photo(), PQ, Q, shot (+9 more)

### Community 78 - "customerBrief.selfcheck.mjs"
Cohesion: 0.28
Nodes (12): promptAction(), checkPointInGeoJSON(), CustomerDetailView(), CustomerManagement(), isPointInPolygon(), createdMillis(), findDuplicates(), groupKey() (+4 more)

### Community 79 - "supply.js"
Cohesion: 0.32
Nodes (6): FADE, MASCOT_CHATTER, MASCOT_FAILURES, STICKY, isFailure(), isSticky()

### Community 82 - "haResolve"
Cohesion: 0.67
Nodes (3): haApprove(), haKey(), haResolve()

### Community 84 - "formatRupiah"
Cohesion: 0.53
Nodes (5): formatSampleQty(), SampleEntryModal(), SamplingAnalyticsView(), SamplingFolderView(), getCurrentDate()

### Community 86 - "dayStats.selfcheck.mjs"
Cohesion: 0.20
Nodes (7): justAfterLocalMidnight, justBeforeLocalMidnight, NOW, rows, s, shuffled, withReturn

### Community 91 - "txSize.selfcheck.mjs"
Cohesion: 0.12
Nodes (13): BULAN, REEL, NotificationBell(), app, auth, db, firebaseConfig, googleProvider (+5 more)

### Community 101 - "WarehouseDeskNav.jsx"
Cohesion: 0.17
Nodes (14): BiohazardTheme(), easeInOut(), easeOut(), gateCanvasOn(), gateHoldMs(), gateIsRich(), rndWord(), VaultGate() (+6 more)

### Community 105 - "convertToBks"
Cohesion: 0.27
Nodes (6): LazyTabBoundary, canReachInternet(), onlineListeners, setSharedOnline(), subscribeOnline(), useOfflineEngine()

### Community 109 - "PonderPad.jsx"
Cohesion: 0.29
Nodes (13): playSound(), instant(), liteOn(), pad2(), PonderPad(), reduced(), useDecode(), getScene() (+5 more)

### Community 110 - "k"
Cohesion: 0.40
Nodes (4): CapybaraMascot(), LOCKED_MESSAGES, LOGGED_IN_MESSAGES, NO_MESSAGES

### Community 112 - "AcceptanceReceipt.jsx"
Cohesion: 0.39
Nodes (5): DEMO_PLAN_BRANCHES, DEMO_PLAN_ROWS, ShipmentPlanStage(), n(), ShipmentPlanTable()

### Community 115 - "ShipmentPlanStage.jsx"
Cohesion: 0.22
Nodes (8): FILE, IR, N, OUT, pack, recording(), render(), SET

### Community 117 - "context-watch.mjs"
Cohesion: 0.12
Nodes (36): AgentInventoryView(), Money(), judge(), pickerShows(), writeApproval(), branchIsDelegated(), canApproveHandoffFrom(), canEditFleetRoster() (+28 more)

## Knowledge Gaps
- **819 isolated node(s):** `root`, `note`, `brief`, `hook`, `now` (+814 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **22 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `dependencies` connect `dependencies` to `HistoryReportView.jsx`, `notify`, `context-watch.mjs`, `react-leaflet-cluster`?**
  _High betweenness centrality (0.033) - this node is a cross-community bridge._
- **Why does `react` connect `notify` to `RegionalWarehouseStage.jsx`, `dependencies`, `MerchantSalesView.jsx`, `useTransactionEngine.js`, `RestockVaultView.jsx`, `toastSeverity.selfcheck.mjs`, `useTransactionEngine.js`, `RestockVaultView.jsx`, `LOG — newest first, older entries live in `git log` for this file`?**
  _High betweenness centrality (0.028) - this node is a cross-community bridge._
- **Why does `devDependencies` connect `devDependencies` to `@vitejs/plugin-basic-ssl`, `context-watch.mjs`, `StockByWarehouseTable.jsx`, `@types/react-dom`, `JourneyView.jsx`, `StubAudio`?**
  _High betweenness centrality (0.027) - this node is a cross-community bridge._
- **Are the 5 inferred relationships involving `KPMInventoryApp()` (e.g. with `getDocOfflineSafe()` and `t()`) actually correct?**
  _`KPMInventoryApp()` has 5 INFERRED edges - model-reasoned connections that need verification._
- **What connects `root`, `note`, `brief` to the rest of the system?**
  _819 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `App.jsx` be split into smaller, more focused modules?**
  _Cohesion score 0.08262108262108261 - nodes in this community are weakly interconnected._
- **Should `dependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.08695652173913043 - nodes in this community are weakly interconnected._