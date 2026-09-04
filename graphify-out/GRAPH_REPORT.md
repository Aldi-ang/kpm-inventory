# Graph Report - kpm-inventory-main  (2026-09-04)

## Corpus Check
- 153 files · ~801,426 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1390 nodes · 2499 edges · 87 communities (75 shown, 12 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 55 edges (avg confidence: 0.75)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `e45a6397`
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
- cross-env
- eslint-plugin-react-refresh
- postcss
- PonderOverlay.jsx
- CustomerManager.jsx
- JourneyView.jsx
- undef.check.mjs
- StockOpnameView.jsx
- firebase.js
- MerchantSalesView.jsx
- notify
- PonderOverlay.jsx
- StockOpnameView.jsx
- context-watch.mjs
- MerchantSalesView.jsx
- PonderPad.jsx
- L
- firebase.js
- JourneyView.jsx
- dayStats.selfcheck.mjs
- KPMInventoryApp
- eslint
- ShipmentPlanStage.jsx
- framer-motion
- react-leaflet-cluster
- StockStage.jsx
- @types/react
- @types/react-dom
- @vitejs/plugin-basic-ssl
- useSound.selfcheck.mjs
- HistoryReportView.jsx
- supply.js
- txSize.selfcheck.mjs
- nextStop.js

## God Nodes (most connected - your core abstractions)
1. `PROGRESS — read this, search for nothing` - 80 edges
2. `KPMInventoryApp()` - 45 edges
3. `notify()` - 43 edges
4. `confirmAction()` - 37 edges
5. `convertToBks()` - 36 edges
6. `formatRupiah()` - 29 edges
7. `MerchantSalesView()` - 25 edges
8. `RestockVaultView()` - 24 edges
9. `getLocalDayKey()` - 24 edges
10. `StockOpnameView()` - 23 edges

## Surprising Connections (you probably didn't know these)
- `AuthoritySelect()` --indirect_call--> `k()`  [INFERRED]
  src/components/AuthoritySelect.jsx → .claude/context-watch.mjs
- `JourneyView()` --indirect_call--> `k()`  [INFERRED]
  src/JourneyView.jsx → .claude/context-watch.mjs
- `PonderOverlay()` --indirect_call--> `k()`  [INFERRED]
  src/ponder/PonderOverlay.jsx → .claude/context-watch.mjs
- `RestockVaultView()` --indirect_call--> `k()`  [INFERRED]
  src/RestockVaultView.jsx → .claude/context-watch.mjs
- `KPMInventoryApp()` --indirect_call--> `writeBatch()`  [INFERRED]
  src/App.jsx → tools/lab-firestore-stub.js

## Import Cycles
- None detected.

## Communities (87 total, 12 thin omitted)

### Community 0 - "App.jsx"
Cohesion: 0.08
Nodes (27): AgentInventoryView, AgentProfileView, BranchWarehouseManager, ConsignmentFinanceView, DashboardView, EODReconciliationView, FleetCanvasManager, HistoryReportView (+19 more)

### Community 1 - "MapMissionControl.jsx"
Cohesion: 0.50
Nodes (3): F — Phone, G — Nothing old was lost, KPM Sales Terminal — test results

### Community 2 - "dependencies"
Cohesion: 0.09
Nodes (23): @emailjs/browser, firebase, idb, jsbarcode, leaflet, lucide-react, dependencies, @emailjs/browser (+15 more)

### Community 3 - "CustomerManager.jsx"
Cohesion: 0.08
Nodes (19): react, react, ArrivalScanner(), ShipmentLabel(), MapRecenter(), BookLab(), forceHover(), Lab() (+11 more)

### Community 4 - "devDependencies"
Cohesion: 0.10
Nodes (21): autoprefixer, @eslint/js, eslint-plugin-react-hooks, eslint-plugin-react-refresh, globals, devDependencies, autoprefixer, @eslint/js (+13 more)

### Community 5 - "mixedUnits.selfcheck.mjs"
Cohesion: 0.15
Nodes (23): AuthoritySelect(), HoldButton(), PermissionMatrixEditor(), SettingsView(), writeCareerLedger(), writeLiteMode(), writePhotoStorage(), canEditFleetRoster() (+15 more)

### Community 6 - "savePhotoAndGetReference"
Cohesion: 0.16
Nodes (16): ConfirmHost(), BOOST, boostElement(), buildGainStage(), initSounds(), liteModeOn(), makePool(), MUMBLES (+8 more)

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
Cohesion: 0.20
Nodes (13): asLeaves(), buildPages(), facingPage(), maxTurnOf(), turnFor(), ICONS, Library(), liteOn() (+5 more)

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
Cohesion: 0.32
Nodes (10): PovBanner(), TierPovSwitch(), CORPORATE_TIERS, tierWord(), previewIdentity(), TEST_ACCOUNTS, testAccountDoc(), testAccountFor() (+2 more)

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
Cohesion: 0.17
Nodes (19): AgentInventoryView(), Money(), formatAdvancedStock(), ItemInspector(), ResidentEvilInventory(), formatSampleQty(), SampleEntryModal(), SamplingCartView() (+11 more)

### Community 31 - "txSize.selfcheck.mjs"
Cohesion: 0.12
Nodes (32): AgentProfileView(), BADGE_CATEGORIES, createImage(), DynamicIconMap, getCroppedImg(), AchievementTester(), BASE_STATS, buildFakeCareer() (+24 more)

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
Cohesion: 0.15
Nodes (14): BiohazardTheme(), BULAN, REEL, NotificationBell(), easeInOut(), easeOut(), gateCanvasOn(), gateHoldMs() (+6 more)

### Community 36 - "KPMInventoryApp"
Cohesion: 0.18
Nodes (10): 1. What we are copying, and what we are not, 2. 🔴 THE DECISION THAT SHAPES EVERYTHING — demo data, not live data, 3. Scene format, 4. Prerequisite refactor (small, do it first), 5. Files, 6. Traps specific to THIS codebase, 7. Checks to add with the engine, 8. Build order (+2 more)

### Community 37 - "StockOpnameView.jsx"
Cohesion: 0.30
Nodes (13): DAMAGE_REASONS, damageBlocked(), damageSorted(), isLeak(), recountState(), samePass(), shortageStreak(), StockOpnameView() (+5 more)

### Community 39 - "vaultGrace.selfcheck.mjs"
Cohesion: 0.33
Nodes (4): body, fnText, graceIsValid, src

### Community 40 - "CapybaraMascot.jsx"
Cohesion: 0.04
Nodes (43): app, appFiles, boundary, branch, brief, bwm17, comboEnd, comboStart (+35 more)

### Community 41 - "✅ THE LIGHT DUKE'S LEDGER IS BUILT — 524/524, contrast self-check passes"
Cohesion: 0.02
Nodes (80): 🟢 2026-08-27 23:50 — THE FOUR CAPTION FAULTS ARE FIXED. `8109559`, **663/663**. Tree clean., 🟢 2026-08-28 00:20 — THE HOVER VIDEO HAS BEEN WATCHED. No code changed; **663/663**., 🟢 2026-08-28 00:47 — HOVER GLOW AND THE RIBBON/COVER FIX. `1ebbabc`, **666/666**. Tree clean., 🟠 2026-08-30 08:25 — THE POV COSTUME CAN BE POSTED ANYWHERE. `b1cdcaa`, **666/666 + 831/831**. Tree clean., 🟠 2026-08-30 10:35 — THE RESTOCK QUEUE, THE BOOK, AND THE SALES ROLLUP. `20a4622` → `18062df`, **667/667 + 915/915**. Tree clean., 🟠 2026-08-31 08:30 — THE PANEL WAS LOOKED AT, AND THE TUTORIAL IS BROKEN ON A PHONE. `e5d7e76`, **667/667 + 915/915**. Tree clean., 🟠 2026-08-31 09:05 — THE TUTORIAL CAMERA NEVER MOVED ON A PHONE. `aef7f03` + `8f3f438`, **669/669 + 915/915**. Tree clean., 🟠 2026-08-31 09:11 — THE BOOK COMES BACK TO SHUT ITSELF. `1efeb11`, **671/671 + 915/915**. Tree clean. (+72 more)

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
Cohesion: 0.33
Nodes (5): 7 Days to Die track — separate, not this repo, Next session — copy the block below, paste it, go, Sound thread — CLOSED, do not reopen, The rest of the ponder sweep, in the order the numbers rank them, Then the Backlog — do not invent a job

### Community 48 - "toastSeverity.selfcheck.mjs"
Cohesion: 0.18
Nodes (23): arrivalsOnHand(), BranchWarehouseManager(), inTransitQty(), middle(), oldestStockDays(), productArrivals(), receiptBlocked(), receiptDisputed() (+15 more)

### Community 49 - "registry.js"
Cohesion: 0.15
Nodes (10): SCENES, STAGES, goodsReceived, productPerformance, regionalWarehouse, shipmentPlan, stockByWarehouse, SECTIONS (+2 more)

### Community 50 - "MerchantSalesView.jsx"
Cohesion: 0.22
Nodes (7): css, dark, light, lum(), PAIRS, ratio(), srgb()

### Community 51 - "VaultGate.jsx"
Cohesion: 0.26
Nodes (15): AuditVaultView(), confirmAction(), CrownTransferProtocol(), HistoryReportView(), LandlordDashboard(), notify(), isFieldLevelTier(), ConsignmentFinanceView() (+7 more)

### Community 52 - "CapybaraMascot.jsx"
Cohesion: 0.40
Nodes (4): CapybaraMascot(), LOCKED_MESSAGES, LOGGED_IN_MESSAGES, NO_MESSAGES

### Community 53 - "cross-env"
Cohesion: 0.28
Nodes (7): FADE, MASCOT_CHATTER, MASCOT_FAILURES, report(), STICKY, isFailure(), isSticky()

### Community 54 - "eslint-plugin-react-refresh"
Cohesion: 0.47
Nodes (6): createdMillis(), findDuplicates(), groupKey(), hasCoords(), metresBetween(), normaliseName()

### Community 55 - "postcss"
Cohesion: 0.13
Nodes (24): promptAction(), checkPointInGeoJSON(), CustomerDetailView(), CustomerManagement(), isPointInPolygon(), L, BorderImporter(), checkPointInGeoJSON() (+16 more)

### Community 56 - "PonderOverlay.jsx"
Cohesion: 0.19
Nodes (10): focusOf(), liteOn(), POINT, PonderOverlay(), reduced(), TONE_EDGE, TONE_RING, TONE_RULE (+2 more)

### Community 57 - "CustomerManager.jsx"
Cohesion: 0.09
Nodes (11): hook, k(), left, lines, pct, FIXTURES, getDocs(), noop() (+3 more)

### Community 58 - "JourneyView.jsx"
Cohesion: 0.21
Nodes (11): AGENT_COLORS, checkPointInGeoJSON(), createJourneyClusterIcon(), getHashColor(), getStoreHierarchy(), getStoreIcon(), isPointInPolygon(), JourneyView() (+3 more)

### Community 59 - "undef.check.mjs"
Cohesion: 0.29
Nodes (6): BASELINE, eslint, fixed, found, seen, unexpected

### Community 60 - "StockOpnameView.jsx"
Cohesion: 0.29
Nodes (7): scripts, build, deploy, dev, lint, lint:undef, preview

### Community 61 - "firebase.js"
Cohesion: 0.15
Nodes (21): LABEL, ProductPerformancePanel(), DEMO_PERFORMANCE_ROWS, ProductPerformanceStage(), n(), ProductPerformanceTable(), rp(), dayOf() (+13 more)

### Community 62 - "MerchantSalesView.jsx"
Cohesion: 0.11
Nodes (17): blank, done, eightDaysAgo, far, free, HERE, minefar, near (+9 more)

### Community 63 - "notify"
Cohesion: 0.11
Nodes (34): DashboardBenchmarks(), groupDigits(), pct(), toBal(), DashboardView(), SERIES, share(), PaceChart() (+26 more)

### Community 64 - "PonderOverlay.jsx"
Cohesion: 0.36
Nodes (8): add(), at(), buf(), env(), finish(), noise(), SOUNDS, tone()

### Community 65 - "StockOpnameView.jsx"
Cohesion: 0.16
Nodes (11): b, guarded, inventory, messy, ok, rows, sameDay, sd (+3 more)

### Community 66 - "context-watch.mjs"
Cohesion: 0.40
Nodes (4): name, private, type, version

### Community 67 - "MerchantSalesView.jsx"
Cohesion: 0.13
Nodes (10): Lamp(), WarehouseDeskNav(), DataInduk(), DEMO_HEAD, DEMO_TABS, PANELS, RegionalWarehouseStage(), rp() (+2 more)

### Community 68 - "PonderPad.jsx"
Cohesion: 0.21
Nodes (17): SamplingAnalyticsView(), ToastHost(), t(), playSound(), PonderBookButton(), instant(), liteOn(), pad2() (+9 more)

### Community 69 - "L"
Cohesion: 0.36
Nodes (10): MerchantSalesView(), readDraft(), reorderFromLast(), agoLabel(), dayStats(), paymentLabel(), splitToUnits(), storeKey() (+2 more)

### Community 70 - "firebase.js"
Cohesion: 0.27
Nodes (6): LazyTabBoundary, canReachInternet(), onlineListeners, setSharedOnline(), subscribeOnline(), useOfflineEngine()

### Community 72 - "dayStats.selfcheck.mjs"
Cohesion: 0.20
Nodes (7): justAfterLocalMidnight, justBeforeLocalMidnight, NOW, rows, s, shuffled, withReturn

### Community 73 - "KPMInventoryApp"
Cohesion: 0.27
Nodes (9): getDocOfflineSafe(), KPMInventoryApp(), computeDayXP(), canUsePovSwitch(), absentForSure(), clearGrace(), graceIsValid(), readGrace() (+1 more)

### Community 75 - "ShipmentPlanStage.jsx"
Cohesion: 0.39
Nodes (5): DEMO_PLAN_BRANCHES, DEMO_PLAN_ROWS, ShipmentPlanStage(), n(), ShipmentPlanTable()

### Community 78 - "StockStage.jsx"
Cohesion: 0.36
Nodes (6): DEMO_TOTALS, DEMO_WAREHOUSES, n(), StockByWarehouseTable(), scriptedOpen(), StockStage()

### Community 82 - "useSound.selfcheck.mjs"
Cohesion: 0.22
Nodes (6): __isUnlocked(), __reset(), ctx(), makeDoc(), played, StubAudio

### Community 83 - "HistoryReportView.jsx"
Cohesion: 0.46
Nodes (5): clampZoom(), ReceiptPreview(), SAMPLE_ROWS, WATERMARK_STYLE, watermarkFrom()

### Community 84 - "supply.js"
Cohesion: 0.33
Nodes (4): AcceptanceReceipt(), Money(), HQ_LOCATIONS, locationOf()

### Community 85 - "txSize.selfcheck.mjs"
Cohesion: 0.29
Nodes (6): big, line, naive, product, size(), stripped

### Community 86 - "nextStop.js"
Cohesion: 0.70
Nodes (4): km(), mine(), nextStop(), visitedWithinCycle()

## Knowledge Gaps
- **660 isolated node(s):** `root`, `note`, `brief`, `hook`, `now` (+655 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **12 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `dependencies` connect `dependencies` to `context-watch.mjs`, `CustomerManager.jsx`, `framer-motion`, `react-leaflet-cluster`?**
  _High betweenness centrality (0.030) - this node is a cross-community bridge._
- **Why does `react` connect `CustomerManager.jsx` to `dependencies`, `MerchantSalesView.jsx`, `L`, `mixedUnits.selfcheck.mjs`, `KPMInventoryApp`, `LOG — newest first, older entries live in `git log` for this file`?**
  _High betweenness centrality (0.026) - this node is a cross-community bridge._
- **Why does `devDependencies` connect `devDependencies` to `context-watch.mjs`, `JourneyView.jsx`, `eslint`, `@types/react`, `@types/react-dom`, `@vitejs/plugin-basic-ssl`?**
  _High betweenness centrality (0.024) - this node is a cross-community bridge._
- **Are the 3 inferred relationships involving `KPMInventoryApp()` (e.g. with `t()` and `report()`) actually correct?**
  _`KPMInventoryApp()` has 3 INFERRED edges - model-reasoned connections that need verification._
- **What connects `root`, `note`, `brief` to the rest of the system?**
  _660 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `App.jsx` be split into smaller, more focused modules?**
  _Cohesion score 0.07741935483870968 - nodes in this community are weakly interconnected._
- **Should `dependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.08695652173913043 - nodes in this community are weakly interconnected._