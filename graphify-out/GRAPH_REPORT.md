# Graph Report - kpm-inventory-main  (2026-09-28)

## Corpus Check
- 180 files · ~930,723 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1781 nodes · 3367 edges · 110 communities (89 shown, 21 thin omitted)
- Extraction: 97% EXTRACTED · 3% INFERRED · 0% AMBIGUOUS · INFERRED: 102 edges (avg confidence: 0.77)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `d3a17e2c`
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
- useTransactionEngine.js
- PonderPad.jsx
- dayStats.selfcheck.mjs
- StockOpnameView.jsx
- SamplingManager.jsx
- HistoryReportView.jsx
- firebase.js
- FleetCanvasManager.jsx
- StockStage.jsx
- nextStop.js
- rankBorders.jsx
- nmKey
- framer-motion
- @vitejs/plugin-basic-ssl
- vgRestore
- CapybaraMascot.jsx
- vaultGrace.js
- LazyTabBoundary
- convertToBks
- StockByWarehouseTable.jsx
- PonderPad.jsx
- AcceptanceReceipt.jsx
- ShipmentPlanStage.jsx
- StubAudio
- context-watch.mjs

## God Nodes (most connected - your core abstractions)
1. `KPMInventoryApp()` - 58 edges
2. `notify()` - 46 edges
3. `convertToBks()` - 46 edges
4. `confirmAction()` - 41 edges
5. `formatRupiah()` - 36 edges
6. `The one job` - 36 edges
7. `MerchantSalesView()` - 30 edges
8. `t()` - 29 edges
9. `storeKey()` - 27 edges
10. `RestockVaultView()` - 26 edges

## Surprising Connections (you probably didn't know these)
- `EODAgentFlow()` --indirect_call--> `k()`  [INFERRED]
  src/components/EODAgentFlow.jsx → .claude/context-watch.mjs
- `LoadingBay()` --indirect_call--> `k()`  [INFERRED]
  src/components/LoadingBay.jsx → .claude/context-watch.mjs
- `TodayBook()` --indirect_call--> `k()`  [INFERRED]
  src/components/TodayBook.jsx → .claude/context-watch.mjs
- `ownerMap()` --indirect_call--> `k()`  [INFERRED]
  src/config/logicFixes.selfcheck.mjs → .claude/context-watch.mjs
- `EODReconciliationView()` --indirect_call--> `k()`  [INFERRED]
  src/EODReconciliationView.jsx → .claude/context-watch.mjs

## Import Cycles
- None detected.

## Communities (110 total, 21 thin omitted)

### Community 0 - "App.jsx"
Cohesion: 0.08
Nodes (24): AgentInventoryView, AgentProfileView, BranchWarehouseManager, ConsignmentFinanceView, DashboardView, EODReconciliationView, FleetCanvasManager, HistoryReportView (+16 more)

### Community 1 - "MapMissionControl.jsx"
Cohesion: 0.50
Nodes (3): F — Phone, G — Nothing old was lost, KPM Sales Terminal — test results

### Community 2 - "dependencies"
Cohesion: 0.09
Nodes (23): @emailjs/browser, firebase, idb, jsbarcode, leaflet, lucide-react, dependencies, @emailjs/browser (+15 more)

### Community 3 - "CustomerManager.jsx"
Cohesion: 0.33
Nodes (5): auth, db, googleProvider, PROXIED_AUTH_HOSTS, storage

### Community 4 - "devDependencies"
Cohesion: 0.10
Nodes (21): autoprefixer, @eslint/js, eslint-plugin-react-hooks, eslint-plugin-react-refresh, globals, devDependencies, autoprefixer, @eslint/js (+13 more)

### Community 5 - "mixedUnits.selfcheck.mjs"
Cohesion: 0.13
Nodes (10): Lamp(), WarehouseDeskNav(), DataInduk(), DEMO_HEAD, DEMO_TABS, PANELS, RegionalWarehouseStage(), rp() (+2 more)

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
Cohesion: 0.05
Nodes (33): hook, k(), left, lines, pct, AuthoritySelect(), dailySeries(), found() (+25 more)

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
Cohesion: 0.16
Nodes (9): SCENES, STAGES, agentChest, goodsReceived, loadingBay, productPerformance, regionalWarehouse, shipmentPlan (+1 more)

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
Cohesion: 0.22
Nodes (9): DEMO_BAY, DEMO_BAY_FAILED, DEMO_BAY_PLAN, DEMO_BAY_PRESET, U, landed(), LINES, LoadingBayStage() (+1 more)

### Community 31 - "eslint-plugin-react-refresh"
Cohesion: 0.13
Nodes (26): AgentProfileView(), BADGE_CATEGORIES, createImage(), DynamicIconMap, getCroppedImg(), AchievementTester(), BASE_STATS, buildFakeCareer() (+18 more)

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
Cohesion: 0.06
Nodes (35): react, react, ArrivalScanner(), ShipmentLabel(), t(), LOOKS, BookLab(), forceHover() (+27 more)

### Community 36 - "KPMInventoryApp"
Cohesion: 0.18
Nodes (10): 1. What we are copying, and what we are not, 2. 🔴 THE DECISION THAT SHAPES EVERYTHING — demo data, not live data, 3. Scene format, 4. Prerequisite refactor (small, do it first), 5. Files, 6. Traps specific to THIS codebase, 7. Checks to add with the engine, 8. Build order (+2 more)

### Community 37 - "MapMissionControl.jsx"
Cohesion: 0.17
Nodes (24): arrivalsOnHand(), BranchWarehouseManager(), inTransitQty(), middle(), oldestStockDays(), productArrivals(), receiptBlocked(), receiptDisputed() (+16 more)

### Community 39 - "vaultGrace.selfcheck.mjs"
Cohesion: 0.33
Nodes (4): body, fnText, graceIsValid, src

### Community 40 - "CapybaraMascot.jsx"
Cohesion: 0.01
Nodes (192): aA, aB, acceptBody, ACCEPTED, acFrom, acTo, aiv, AIV_ROSTER (+184 more)

### Community 41 - "✅ THE LIGHT DUKE'S LEDGER IS BUILT — 524/524, contrast self-check passes"
Cohesion: 0.13
Nodes (14): 🟢 2026-09-26 10:15 — APPROVED: *"test approve continue your work"*, 🟢 2026-09-26 10:35 — the Loading Bay ponder page, self-tested 9/9 (`fcaad9c` `13f34fb` `1a5647d`; local, not pushed), 🟢 2026-09-27 09:52 — the Agent Inventory chest (`4f44e3d`; local, not pushed), 🟢 2026-09-27 10:20 — self-tested 24/25; his PC ask became prototype v4, 🟢 2026-09-27 13:09 — Agent Inventory v4: two chests and one book (`f0ec63d`; local, not pushed), 🟢 2026-09-27 14:40 — v4 proven; the Vercel push waits on his yes, 🟢 2026-09-27 14:50 — LIVE on Vercel (`a43a9f2`), 🟡 2026-09-27 15:10 — the chest placement: three layouts to pick from (answered: A, 2026-09-28) (+6 more)

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
Cohesion: 0.16
Nodes (12): b, guarded, inventory, messy, ok, rows, sameDay, sd (+4 more)

### Community 49 - "notify"
Cohesion: 0.28
Nodes (6): AcceptanceReceipt(), Money(), CareerDevTools(), DEFAULT_RANKS, formatNumber(), parseGroupedNumber()

### Community 50 - "MerchantSalesView.jsx"
Cohesion: 0.22
Nodes (7): css, dark, light, lum(), PAIRS, ratio(), srgb()

### Community 51 - "VaultGate.jsx"
Cohesion: 0.50
Nodes (5): inheritedBy(), ownerMap(), refusedRows(), storeK(), visibleTo()

### Community 53 - "helpers.js"
Cohesion: 0.27
Nodes (14): AuditVaultView(), confirmAction(), CrownTransferProtocol(), HistoryReportView(), LandlordDashboard(), notify(), BorderImporter(), TierAutomationEngine() (+6 more)

### Community 54 - "RestockVaultView.jsx"
Cohesion: 0.38
Nodes (8): ProofCamera(), MerchantSalesView(), readDraft(), agoLabel(), dayStats(), paymentLabel(), storeKey(), metresLabel()

### Community 55 - "postcss"
Cohesion: 0.18
Nodes (15): asLeaves(), buildPages(), facingPage(), maxTurnOf(), turnFor(), ICONS, Library(), liteOn() (+7 more)

### Community 57 - "StockOpnameView.jsx"
Cohesion: 0.25
Nodes (4): LAYOUT, PEOPLE, RULES, VANS

### Community 59 - "undef.check.mjs"
Cohesion: 0.29
Nodes (6): BASELINE, eslint, fixed, found, seen, unexpected

### Community 60 - "StockOpnameView.jsx"
Cohesion: 0.29
Nodes (7): scripts, build, deploy, dev, lint, lint:undef, preview

### Community 61 - "firebase.js"
Cohesion: 0.15
Nodes (14): BiohazardTheme(), BULAN, REEL, NotificationBell(), easeInOut(), easeOut(), gateCanvasOn(), gateHoldMs() (+6 more)

### Community 62 - "MerchantSalesView.jsx"
Cohesion: 0.11
Nodes (16): blank, done, eightDaysAgo, far, free, HERE, minefar, near (+8 more)

### Community 63 - "confirmAction"
Cohesion: 0.10
Nodes (23): ConfirmHost(), ToastHost(), BOOST, boostElement(), buildGainStage(), initSounds(), __isUnlocked(), liteModeOn() (+15 more)

### Community 64 - "PonderOverlay.jsx"
Cohesion: 0.06
Nodes (65): AgentInventoryView(), Money(), DashboardBenchmarks(), groupDigits(), pct(), toBal(), DashboardView(), SERIES (+57 more)

### Community 65 - "RegionalWarehouseStage.jsx"
Cohesion: 0.54
Nodes (7): derive(), hashSecret(), hex(), needsRehash(), subtle(), unhex(), verifySecret()

### Community 66 - "context-watch.mjs"
Cohesion: 0.40
Nodes (4): name, private, type, version

### Community 67 - "MerchantSalesView.jsx"
Cohesion: 0.30
Nodes (10): PovBanner(), TierPovSwitch(), CORPORATE_TIERS, canUsePovSwitch(), previewIdentity(), TEST_ACCOUNTS, testAccountDoc(), testAccountFor() (+2 more)

### Community 68 - "VaultGate.jsx"
Cohesion: 0.17
Nodes (18): DIGITS, NixieCount(), SamplingCartView(), stampsOwed(), EODReconciliationView(), HIST_LEVELS, plural(), XpGain() (+10 more)

### Community 69 - "helpers.js"
Cohesion: 0.67
Nodes (3): AP_ROSTER, apPanel(), apQueue()

### Community 71 - "toastSeverity.selfcheck.mjs"
Cohesion: 0.23
Nodes (13): HoldButton(), PermissionMatrixEditor(), SettingsView(), writeCareerLedger(), writeLiteMode(), writePhotoStorage(), canEditFleetRoster(), CUSTOMER_EDIT_PERMS (+5 more)

### Community 72 - "supply.js"
Cohesion: 0.67
Nodes (3): MP_SHOPS, mpFocus(), mpKey()

### Community 73 - "HistoryReportView.jsx"
Cohesion: 0.19
Nodes (10): focusOf(), liteOn(), POINT, PonderOverlay(), reduced(), TONE_EDGE, TONE_RING, TONE_RULE (+2 more)

### Community 74 - "notify"
Cohesion: 0.22
Nodes (8): back(), bksPerUnit(), cello, custom, d, real, totalBks(), splitToUnits()

### Community 75 - "MerchantSalesView.jsx"
Cohesion: 0.07
Nodes (47): checkPointInGeoJSON(), CustomerDetailView(), CustomerManagement(), isPointInPolygon(), center(), MoreKey(), L, store() (+39 more)

### Community 76 - "useTransactionEngine.js"
Cohesion: 0.16
Nodes (15): CornerSheet(), PhotoField(), data, inside(), photo(), PQ, Q, shot (+7 more)

### Community 78 - "customerBrief.selfcheck.mjs"
Cohesion: 0.21
Nodes (20): getDocOfflineSafe(), KPMInventoryApp(), promptAction(), BAR, initialsOf(), PART_ORDER, PlayerCard(), PlayerCardHead() (+12 more)

### Community 79 - "supply.js"
Cohesion: 0.31
Nodes (6): FADE, MASCOT_CHATTER, MASCOT_FAILURES, STICKY, isFailure(), isSticky()

### Community 82 - "haResolve"
Cohesion: 0.67
Nodes (3): haApprove(), haKey(), haResolve()

### Community 84 - "useTransactionEngine.js"
Cohesion: 0.16
Nodes (15): big, line, naive, product, size(), stripped, canReachInternet(), onlineListeners (+7 more)

### Community 86 - "dayStats.selfcheck.mjs"
Cohesion: 0.20
Nodes (7): justAfterLocalMidnight, justBeforeLocalMidnight, NOW, rows, s, shuffled, withReturn

### Community 87 - "StockOpnameView.jsx"
Cohesion: 0.26
Nodes (15): DAMAGE_REASONS, damageBlocked(), damageSorted(), isLeak(), recountState(), samePass(), shortageStreak(), StockOpnameView() (+7 more)

### Community 88 - "SamplingManager.jsx"
Cohesion: 0.39
Nodes (6): FolderCard(), formatSampleQty(), SampleEntryModal(), SamplingAnalyticsView(), SamplingFolderView(), getCurrentDate()

### Community 89 - "HistoryReportView.jsx"
Cohesion: 0.46
Nodes (5): clampZoom(), ReceiptPreview(), SAMPLE_ROWS, WATERMARK_STYLE, watermarkFrom()

### Community 90 - "firebase.js"
Cohesion: 0.25
Nodes (7): app, auth, db, firebaseConfig, googleProvider, PROXIED_AUTH_HOSTS, storage

### Community 91 - "FleetCanvasManager.jsx"
Cohesion: 0.46
Nodes (7): DYNAMIC_TIERS, isFieldLevelTier(), tierWord(), FleetCanvasManager(), swipeTarget(), damagedInVan(), titipOf()

### Community 92 - "StockStage.jsx"
Cohesion: 0.36
Nodes (6): DEMO_TOTALS, DEMO_WAREHOUSES, n(), StockByWarehouseTable(), scriptedOpen(), StockStage()

### Community 93 - "nextStop.js"
Cohesion: 0.53
Nodes (5): directionsUrl(), km(), mine(), nextStop(), visitedWithinCycle()

### Community 94 - "rankBorders.jsx"
Cohesion: 0.40
Nodes (5): BORDER_LOAD, FRAME_HTML, FrameFilters(), RANK_BORDERS, RankBorder()

### Community 99 - "CapybaraMascot.jsx"
Cohesion: 0.40
Nodes (4): CapybaraMascot(), LOCKED_MESSAGES, LOGGED_IN_MESSAGES, NO_MESSAGES

### Community 100 - "vaultGrace.js"
Cohesion: 0.50
Nodes (4): clearGrace(), graceIsValid(), readGrace(), touchGrace()

### Community 105 - "convertToBks"
Cohesion: 0.14
Nodes (23): LABEL, ProductPerformancePanel(), DEMO_PERFORMANCE_ROWS, ProductPerformanceStage(), n(), ProductPerformanceTable(), rp(), countsAsRevenue() (+15 more)

### Community 109 - "PonderPad.jsx"
Cohesion: 0.29
Nodes (13): playSound(), instant(), liteOn(), pad2(), PonderPad(), reduced(), useDecode(), getScene() (+5 more)

### Community 112 - "AcceptanceReceipt.jsx"
Cohesion: 0.39
Nodes (5): DEMO_PLAN_BRANCHES, DEMO_PLAN_ROWS, ShipmentPlanStage(), n(), ShipmentPlanTable()

### Community 115 - "ShipmentPlanStage.jsx"
Cohesion: 0.22
Nodes (8): FILE, IR, N, OUT, pack, recording(), render(), SET

### Community 117 - "context-watch.mjs"
Cohesion: 0.27
Nodes (17): judge(), pickerShows(), writeApproval(), branchIsDelegated(), canApproveHandoffFrom(), canHandleDelivery(), canHandOffAcrossRegions(), canPickFromGallery() (+9 more)

## Knowledge Gaps
- **832 isolated node(s):** `root`, `note`, `brief`, `hook`, `now` (+827 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **21 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `dependencies` connect `dependencies` to `framer-motion`, `context-watch.mjs`, `useTransactionEngine.js`, `react-leaflet-cluster`?**
  _High betweenness centrality (0.032) - this node is a cross-community bridge._
- **Why does `react` connect `useTransactionEngine.js` to `dependencies`, `MerchantSalesView.jsx`, `mixedUnits.selfcheck.mjs`, `toastSeverity.selfcheck.mjs`, `MerchantSalesView.jsx`, `customerBrief.selfcheck.mjs`, `RestockVaultView.jsx`?**
  _High betweenness centrality (0.029) - this node is a cross-community bridge._
- **Why does `devDependencies` connect `devDependencies` to `@vitejs/plugin-basic-ssl`, `context-watch.mjs`, `StockByWarehouseTable.jsx`, `@types/react-dom`, `JourneyView.jsx`, `StubAudio`?**
  _High betweenness centrality (0.026) - this node is a cross-community bridge._
- **Are the 5 inferred relationships involving `KPMInventoryApp()` (e.g. with `getDocOfflineSafe()` and `t()`) actually correct?**
  _`KPMInventoryApp()` has 5 INFERRED edges - model-reasoned connections that need verification._
- **What connects `root`, `note`, `brief` to the rest of the system?**
  _832 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `App.jsx` be split into smaller, more focused modules?**
  _Cohesion score 0.07586206896551724 - nodes in this community are weakly interconnected._
- **Should `dependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.08695652173913043 - nodes in this community are weakly interconnected._