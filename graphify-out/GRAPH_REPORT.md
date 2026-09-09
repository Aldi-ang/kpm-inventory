# Graph Report - kpm-inventory-main  (2026-09-09)

## Corpus Check
- 157 files · ~832,995 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1592 nodes · 2825 edges · 102 communities (82 shown, 20 thin omitted)
- Extraction: 97% EXTRACTED · 3% INFERRED · 0% AMBIGUOUS · INFERRED: 81 edges (avg confidence: 0.76)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `dc15cae5`
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
- CustomerManager.jsx
- txSize.selfcheck.mjs
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
- registry.js
- MerchantSalesView.jsx
- VaultGate.jsx
- CapybaraMascot.jsx
- playSound
- RestockVaultView.jsx
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
- RegionalWarehouseStage.jsx
- context-watch.mjs
- MerchantSalesView.jsx
- playSound
- helpers.js
- RestockVaultView.jsx
- customerBrief.selfcheck.mjs
- supply.js
- HistoryReportView.jsx
- ProductPerformanceStage.jsx
- StockStage.jsx
- useTransactionEngine.js
- react-leaflet-cluster
- customerBrief.selfcheck.mjs
- povPreview.js
- @types/react-dom
- JourneyView.jsx
- haResolve
- eslint
- MerchantSalesView.jsx
- PonderPad.jsx
- ShipmentPlanStage.jsx
- KPMInventoryApp
- firebase.js
- playSound
- txSize.selfcheck.mjs
- txSize.selfcheck.mjs
- cross-env
- nextStop.js
- StubAudio
- nmKey
- ShipmentPlanTable.jsx
- @vitejs/plugin-basic-ssl
- vgRestore
- StockByWarehouseTable.jsx
- eslint-plugin-react-refresh
- cross-env

## God Nodes (most connected - your core abstractions)
1. `KPMInventoryApp()` - 49 edges
2. `notify()` - 44 edges
3. `confirmAction()` - 37 edges
4. `convertToBks()` - 36 edges
5. `PROGRESS — read this, search for nothing` - 36 edges
6. `formatRupiah()` - 30 edges
7. `MerchantSalesView()` - 27 edges
8. `storeKey()` - 25 edges
9. `RestockVaultView()` - 24 edges
10. `getLocalDayKey()` - 24 edges

## Surprising Connections (you probably didn't know these)
- `ownerMap()` --indirect_call--> `k()`  [INFERRED]
  src/config/logicFixes.selfcheck.mjs → .claude/context-watch.mjs
- `JourneyView()` --indirect_call--> `k()`  [INFERRED]
  src/JourneyView.jsx → .claude/context-watch.mjs
- `PonderOverlay()` --indirect_call--> `k()`  [INFERRED]
  src/ponder/PonderOverlay.jsx → .claude/context-watch.mjs
- `RestockVaultView()` --indirect_call--> `k()`  [INFERRED]
  src/RestockVaultView.jsx → .claude/context-watch.mjs
- `AgentInventoryView()` --indirect_call--> `val()`  [INFERRED]
  src/AgentInventoryView.jsx → tools/seed-emulator.mjs

## Import Cycles
- None detected.

## Communities (102 total, 20 thin omitted)

### Community 0 - "App.jsx"
Cohesion: 0.09
Nodes (21): AgentInventoryView, AgentProfileView, BranchWarehouseManager, ConsignmentFinanceView, DashboardView, EODReconciliationView, FleetCanvasManager, HistoryReportView (+13 more)

### Community 1 - "MapMissionControl.jsx"
Cohesion: 0.50
Nodes (3): F — Phone, G — Nothing old was lost, KPM Sales Terminal — test results

### Community 2 - "dependencies"
Cohesion: 0.09
Nodes (23): @emailjs/browser, firebase, idb, jsbarcode, leaflet, lucide-react, dependencies, @emailjs/browser (+15 more)

### Community 3 - "CustomerManager.jsx"
Cohesion: 0.31
Nodes (13): AuditVaultView(), confirmAction(), CrownTransferProtocol(), HistoryReportView(), LandlordDashboard(), notify(), ToastHost(), t() (+5 more)

### Community 4 - "devDependencies"
Cohesion: 0.10
Nodes (21): autoprefixer, @eslint/js, eslint-plugin-react-hooks, eslint-plugin-react-refresh, globals, devDependencies, autoprefixer, @eslint/js (+13 more)

### Community 5 - "mixedUnits.selfcheck.mjs"
Cohesion: 0.28
Nodes (14): DAMAGE_REASONS, damageBlocked(), damageSorted(), isLeak(), recountState(), samePass(), shortageStreak(), StockOpnameView() (+6 more)

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

### Community 11 - "AgentProfileView.jsx"
Cohesion: 0.22
Nodes (12): HoldButton(), PermissionMatrixEditor(), SettingsView(), writeCareerLedger(), writeLiteMode(), writePhotoStorage(), stampsOwed(), CUSTOMER_EDIT_PERMS (+4 more)

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
Cohesion: 0.19
Nodes (14): asLeaves(), buildPages(), facingPage(), maxTurnOf(), turnFor(), ICONS, Library(), liteOn() (+6 more)

### Community 27 - "check-progress.mjs"
Cohesion: 0.22
Nodes (8): brief, hook, note, noteTime, now, root, SKIP, walk()

### Community 28 - "COMPACTING NOW — what the summary must keep, and what it must drop"
Cohesion: 0.40
Nodes (4): COMPACTING NOW — what the summary must keep, and what it must drop, Drop hard — this is where the waste is, Keep, in this order, Then, immediately after compacting

### Community 29 - "customerBrief.selfcheck.mjs"
Cohesion: 0.18
Nodes (8): bgRe, byGround, edgeRe, inkRe, lines, rows, stack, tally

### Community 30 - "CustomerManager.jsx"
Cohesion: 0.21
Nodes (17): promptAction(), checkPointInGeoJSON(), CustomerDetailView(), CustomerManagement(), isPointInPolygon(), MapMissionControl(), clearBorderCache(), loadBorderCache() (+9 more)

### Community 31 - "txSize.selfcheck.mjs"
Cohesion: 0.11
Nodes (33): AgentProfileView(), BADGE_CATEGORIES, createImage(), DynamicIconMap, getCroppedImg(), AchievementTester(), BASE_STATS, buildFakeCareer() (+25 more)

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
Cohesion: 0.09
Nodes (19): react, react, ArrivalScanner(), MapRecenter(), SCENES, BookLab(), forceHover(), Lab() (+11 more)

### Community 36 - "KPMInventoryApp"
Cohesion: 0.18
Nodes (10): 1. What we are copying, and what we are not, 2. 🔴 THE DECISION THAT SHAPES EVERYTHING — demo data, not live data, 3. Scene format, 4. Prerequisite refactor (small, do it first), 5. Files, 6. Traps specific to THIS codebase, 7. Checks to add with the engine, 8. Build order (+2 more)

### Community 37 - "MapMissionControl.jsx"
Cohesion: 0.15
Nodes (14): L, createJourneyClusterIcon(), getStoreIcon(), checkPointInGeoJSON(), compressCoords(), createCustomClusterIcon(), DraggableAddMarker(), getIcon() (+6 more)

### Community 39 - "vaultGrace.selfcheck.mjs"
Cohesion: 0.33
Nodes (4): body, fnText, graceIsValid, src

### Community 40 - "CapybaraMascot.jsx"
Cohesion: 0.01
Nodes (192): aA, aB, acceptBody, ACCEPTED, acFrom, acTo, aiv, AIV_ROSTER (+184 more)

### Community 41 - "✅ THE LIGHT DUKE'S LEDGER IS BUILT — 524/524, contrast self-check passes"
Cohesion: 0.04
Nodes (45): ⚪ 2026-09-02 15:48 — SIDE SESSION (7 Days to Die). Notes moved OUT of this repo., ⚪ 2026-09-02 15:54 — SIDE SESSION (7 Days to Die). Nothing here changed., ⚪ 2026-09-02 20:55 — SIDE SESSION (7 Days to Die). No KPM file touched., 🔧 2026-09-04 17:35 — 7DTD track. No KPM work. Nothing here changed where KPM stands., 🔧 2026-09-04 17:55 — 7DTD track. The Stop hook fired on a file this track never touched., 🔧 2026-09-04 18:07 — 7DTD track. Hook fired on a KPM file again; nothing here is mine., 🟢 2026-09-04 18:40 — Regional Warehouse ponder REBUILT: it shows what it explains. `78eee2a`, 🟢 2026-09-04 19:30 — Stock by Warehouse split, and it was hiding a live bug. `f21b3d3` · 722/722 (+37 more)

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
Cohesion: 0.15
Nodes (12): Appearance — he deferred this, it is last on purpose, Day one — from the 2026-09-09 walk, ranked, unblocked, Done when, Money — ANSWERED and CLOSED 2026-09-09, do not reopen, Phone, at 375x812, Shipped 2026-09-09, Still owed from earlier sessions, The one job (+4 more)

### Community 48 - "toastSeverity.selfcheck.mjs"
Cohesion: 0.13
Nodes (21): ConfirmHost(), BOOST, boostElement(), buildGainStage(), initSounds(), __isUnlocked(), liteModeOn(), makePool() (+13 more)

### Community 49 - "registry.js"
Cohesion: 0.17
Nodes (28): judge(), pickerShows(), writeApproval(), branchIsDelegated(), canApproveHandoffFrom(), canEditFleetRoster(), canHandleDelivery(), canHandOffAcrossRegions() (+20 more)

### Community 50 - "MerchantSalesView.jsx"
Cohesion: 0.22
Nodes (7): css, dark, light, lum(), PAIRS, ratio(), srgb()

### Community 51 - "VaultGate.jsx"
Cohesion: 0.50
Nodes (5): inheritedBy(), ownerMap(), refusedRows(), storeK(), visibleTo()

### Community 53 - "playSound"
Cohesion: 0.32
Nodes (12): arrivalsOnHand(), BranchWarehouseManager(), middle(), oldestStockDays(), productArrivals(), receiptBlocked(), receiptDisputed(), receiptLines() (+4 more)

### Community 54 - "RestockVaultView.jsx"
Cohesion: 0.15
Nodes (8): DataInduk(), DEMO_HEAD, DEMO_TABS, PANELS, RegionalWarehouseStage(), rp(), TAB_OF_PREFIX, tabForStep()

### Community 57 - "CustomerManager.jsx"
Cohesion: 0.05
Nodes (30): hook, k(), left, lines, pct, AuthoritySelect(), dailySeries(), FIXTURES (+22 more)

### Community 59 - "undef.check.mjs"
Cohesion: 0.29
Nodes (6): BASELINE, eslint, fixed, found, seen, unexpected

### Community 60 - "StockOpnameView.jsx"
Cohesion: 0.29
Nodes (7): scripts, build, deploy, dev, lint, lint:undef, preview

### Community 61 - "firebase.js"
Cohesion: 0.15
Nodes (28): DashboardBenchmarks(), groupDigits(), pct(), toBal(), DashboardView(), SERIES, share(), PaceChart() (+20 more)

### Community 62 - "MerchantSalesView.jsx"
Cohesion: 0.11
Nodes (16): blank, done, eightDaysAgo, far, free, HERE, minefar, near (+8 more)

### Community 63 - "notify"
Cohesion: 0.24
Nodes (7): AcceptanceReceipt(), Money(), n(), StockByWarehouseTable(), HQ_LOCATIONS, locationOf(), supplyByProduct()

### Community 64 - "PonderOverlay.jsx"
Cohesion: 0.17
Nodes (18): AgentInventoryView(), Money(), formatAdvancedStock(), ItemInspector(), ResidentEvilInventory(), formatSampleQty(), SampleEntryModal(), SamplingAnalyticsView() (+10 more)

### Community 65 - "RegionalWarehouseStage.jsx"
Cohesion: 0.16
Nodes (9): STAGES, goodsReceived, productPerformance, regionalWarehouse, shipmentPlan, stockByWarehouse, SECTIONS, GoodsReceivedStage() (+1 more)

### Community 66 - "context-watch.mjs"
Cohesion: 0.40
Nodes (4): name, private, type, version

### Community 67 - "MerchantSalesView.jsx"
Cohesion: 0.19
Nodes (10): focusOf(), liteOn(), POINT, PonderOverlay(), reduced(), TONE_EDGE, TONE_RING, TONE_RULE (+2 more)

### Community 68 - "playSound"
Cohesion: 0.50
Nodes (7): instant(), liteOn(), pad2(), PonderPad(), reduced(), useDecode(), getScene()

### Community 69 - "helpers.js"
Cohesion: 0.67
Nodes (3): AP_ROSTER, apPanel(), apQueue()

### Community 70 - "RestockVaultView.jsx"
Cohesion: 0.21
Nodes (11): inTransitQty(), SETTLED, ShipmentLabel(), canManageRegistry(), num(), REQ_RANK, RestockVaultView(), rp() (+3 more)

### Community 71 - "customerBrief.selfcheck.mjs"
Cohesion: 0.28
Nodes (7): FADE, MASCOT_CHATTER, MASCOT_FAILURES, report(), STICKY, isFailure(), isSticky()

### Community 72 - "supply.js"
Cohesion: 0.67
Nodes (3): MP_SHOPS, mpFocus(), mpKey()

### Community 73 - "HistoryReportView.jsx"
Cohesion: 0.46
Nodes (5): clampZoom(), ReceiptPreview(), SAMPLE_ROWS, WATERMARK_STYLE, watermarkFrom()

### Community 74 - "ProductPerformanceStage.jsx"
Cohesion: 0.14
Nodes (24): LABEL, ProductPerformancePanel(), DEMO_PERFORMANCE_ROWS, ProductPerformanceStage(), n(), ProductPerformanceTable(), rp(), countsAsRevenue() (+16 more)

### Community 75 - "StockStage.jsx"
Cohesion: 0.53
Nodes (4): DEMO_TOTALS, DEMO_WAREHOUSES, scriptedOpen(), StockStage()

### Community 76 - "useTransactionEngine.js"
Cohesion: 0.27
Nodes (6): LazyTabBoundary, canReachInternet(), onlineListeners, setSharedOnline(), subscribeOnline(), useOfflineEngine()

### Community 78 - "customerBrief.selfcheck.mjs"
Cohesion: 0.17
Nodes (9): b, guarded, inventory, messy, ok, rows, sameDay, sd (+1 more)

### Community 79 - "povPreview.js"
Cohesion: 0.35
Nodes (9): PovBanner(), TierPovSwitch(), CORPORATE_TIERS, previewIdentity(), TEST_ACCOUNTS, testAccountDoc(), testAccountFor(), testAccountName() (+1 more)

### Community 82 - "haResolve"
Cohesion: 0.67
Nodes (3): haApprove(), haKey(), haResolve()

### Community 84 - "MerchantSalesView.jsx"
Cohesion: 0.21
Nodes (16): ProofCamera(), MerchantSalesView(), readDraft(), briefSeconds(), customerBrief(), reorderFromLast(), agoLabel(), dayStats() (+8 more)

### Community 86 - "ShipmentPlanStage.jsx"
Cohesion: 0.39
Nodes (5): DEMO_PLAN_BRANCHES, DEMO_PLAN_ROWS, ShipmentPlanStage(), n(), ShipmentPlanTable()

### Community 87 - "KPMInventoryApp"
Cohesion: 0.27
Nodes (9): getDocOfflineSafe(), KPMInventoryApp(), computeDayXP(), canUsePovSwitch(), absentForSure(), clearGrace(), graceIsValid(), readGrace() (+1 more)

### Community 88 - "firebase.js"
Cohesion: 0.19
Nodes (11): store(), AGENT_COLORS, checkPointInGeoJSON(), getHashColor(), getStoreHierarchy(), isPointInPolygon(), JourneyView(), LocationController() (+3 more)

### Community 89 - "playSound"
Cohesion: 0.52
Nodes (6): playSound(), bookClose(), bookOpen(), bookPage(), bookPick(), padKey()

### Community 90 - "txSize.selfcheck.mjs"
Cohesion: 0.22
Nodes (9): big, line, naive, product, size(), stripped, applySaleToCanvas(), useTransactionEngine() (+1 more)

### Community 91 - "txSize.selfcheck.mjs"
Cohesion: 0.12
Nodes (13): BULAN, REEL, NotificationBell(), app, auth, db, firebaseConfig, googleProvider (+5 more)

### Community 92 - "cross-env"
Cohesion: 0.40
Nodes (4): CapybaraMascot(), LOCKED_MESSAGES, LOGGED_IN_MESSAGES, NO_MESSAGES

### Community 93 - "nextStop.js"
Cohesion: 0.20
Nodes (7): justAfterLocalMidnight, justBeforeLocalMidnight, NOW, rows, s, shuffled, withReturn

### Community 96 - "ShipmentPlanTable.jsx"
Cohesion: 0.36
Nodes (8): BiohazardTheme(), easeInOut(), easeOut(), gateCanvasOn(), gateHoldMs(), gateIsRich(), rndWord(), VaultGate()

### Community 99 - "StockByWarehouseTable.jsx"
Cohesion: 0.25
Nodes (7): back(), bksPerUnit(), cello, custom, d, real, totalBks()

## Knowledge Gaps
- **783 isolated node(s):** `root`, `note`, `brief`, `hook`, `now` (+778 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **20 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `dependencies` connect `dependencies` to `context-watch.mjs`, `useTransactionEngine.js`, `react-leaflet-cluster`, `postcss`?**
  _High betweenness centrality (0.032) - this node is a cross-community bridge._
- **Why does `react` connect `useTransactionEngine.js` to `dependencies`, `AgentProfileView.jsx`, `povPreview.js`, `MerchantSalesView.jsx`, `RestockVaultView.jsx`, `KPMInventoryApp`?**
  _High betweenness centrality (0.028) - this node is a cross-community bridge._
- **Why does `MerchantSalesView()` connect `MerchantSalesView.jsx` to `PonderOverlay.jsx`, `CustomerManager.jsx`, `StockByWarehouseTable.jsx`, `useTransactionEngine.js`, `mixedUnits.selfcheck.mjs`, `AgentProfileView.jsx`, `toastSeverity.selfcheck.mjs`, `registry.js`, `playSound`, `firebase.js`?**
  _High betweenness centrality (0.027) - this node is a cross-community bridge._
- **Are the 4 inferred relationships involving `KPMInventoryApp()` (e.g. with `t()` and `report()`) actually correct?**
  _`KPMInventoryApp()` has 4 INFERRED edges - model-reasoned connections that need verification._
- **What connects `root`, `note`, `brief` to the rest of the system?**
  _783 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `App.jsx` be split into smaller, more focused modules?**
  _Cohesion score 0.09057971014492754 - nodes in this community are weakly interconnected._
- **Should `dependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.08695652173913043 - nodes in this community are weakly interconnected._