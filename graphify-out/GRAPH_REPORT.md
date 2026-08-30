# Graph Report - kpm-inventory-main  (2026-08-30)

## Corpus Check
- 143 files · ~738,052 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1166 nodes · 2169 edges · 81 communities (71 shown, 10 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 32 edges (avg confidence: 0.78)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `aabd3f8a`
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
- BranchWarehouseManager.jsx
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
- package.json
- MerchantSalesView.jsx
- VaultGate.jsx
- CapybaraMascot.jsx
- cross-env
- eslint-plugin-react-refresh
- postcss
- tailwindcss
- CustomerManager.jsx
- SettingsView.jsx
- undef.check.mjs
- notify
- firebase.js
- customerBrief.selfcheck.mjs
- notify
- permissions.js
- CustomerManager.jsx
- context-watch.mjs
- JourneyView.jsx
- MerchantSalesView.jsx
- dayStats.selfcheck.mjs
- VaultGate.jsx
- mixedUnits.selfcheck.mjs
- scripts
- firebase.js
- package.json
- nextStop.js
- cross-env
- eslint-plugin-react-refresh
- postcss
- tailwindcss
- @vitejs/plugin-react

## God Nodes (most connected - your core abstractions)
1. `KPMInventoryApp()` - 43 edges
2. `notify()` - 43 edges
3. `confirmAction()` - 37 edges
4. `convertToBks()` - 34 edges
5. `formatRupiah()` - 29 edges
6. `MerchantSalesView()` - 25 edges
7. `getLocalDayKey()` - 24 edges
8. `StockOpnameView()` - 22 edges
9. `storeKey()` - 22 edges
10. `AgentProfileView()` - 19 edges

## Surprising Connections (you probably didn't know these)
- `JourneyView()` --indirect_call--> `k()`  [INFERRED]
  src/JourneyView.jsx → .claude/context-watch.mjs
- `PonderOverlay()` --indirect_call--> `k()`  [INFERRED]
  src/ponder/PonderOverlay.jsx → .claude/context-watch.mjs
- `RestockVaultView()` --indirect_call--> `k()`  [INFERRED]
  src/RestockVaultView.jsx → .claude/context-watch.mjs
- `BookLab()` --indirect_call--> `t()`  [INFERRED]
  tools/ponder-lab.jsx → src/config/findDuplicates.selfcheck.mjs
- `Lab()` --indirect_call--> `t()`  [INFERRED]
  tools/ponder-lab.jsx → src/config/findDuplicates.selfcheck.mjs

## Import Cycles
- None detected.

## Communities (81 total, 10 thin omitted)

### Community 0 - "App.jsx"
Cohesion: 0.08
Nodes (23): AgentInventoryView, AgentProfileView, BranchWarehouseManager, ConsignmentFinanceView, DashboardView, EODReconciliationView, FleetCanvasManager, HistoryReportView (+15 more)

### Community 1 - "MapMissionControl.jsx"
Cohesion: 0.50
Nodes (3): F — Phone, G — Nothing old was lost, KPM Sales Terminal — test results

### Community 2 - "dependencies"
Cohesion: 0.09
Nodes (23): @emailjs/browser, firebase, idb, leaflet, lucide-react, dependencies, @emailjs/browser, firebase (+15 more)

### Community 3 - "CustomerManager.jsx"
Cohesion: 0.09
Nodes (41): arrivalsOnHand(), BranchWarehouseManager(), inTransitQty(), middle(), oldestStockDays(), productArrivals(), receiptBlocked(), receiptDisputed() (+33 more)

### Community 4 - "devDependencies"
Cohesion: 0.10
Nodes (21): autoprefixer, eslint, @eslint/js, eslint-plugin-react-hooks, globals, devDependencies, autoprefixer, eslint (+13 more)

### Community 5 - "mixedUnits.selfcheck.mjs"
Cohesion: 0.11
Nodes (16): blank, done, eightDaysAgo, far, free, HERE, minefar, near (+8 more)

### Community 6 - "savePhotoAndGetReference"
Cohesion: 0.10
Nodes (22): ConfirmHost(), BOOST, boostElement(), buildGainStage(), initSounds(), __isUnlocked(), liteModeOn(), makePool() (+14 more)

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
Cohesion: 0.22
Nodes (14): playSound(), ICONS, Library(), liteOn(), PonderBookButton(), reduced(), shade(), SPARKS (+6 more)

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
Nodes (168): allJs, allowedHex, app, appCode, appCrossed, appFiles, appSrc, archEnd (+160 more)

### Community 25 - "Sales Terminal — test list"
Cohesion: 0.13
Nodes (14): A. The shelf, B. The rail (desktop, wide window), C. The customer brief, D. Money — the part that must be exactly right, E. The merchant, F. Phone (narrow the browser, or use your phone), G. Nothing old was lost, H. Territory and duplicate outlets — built 2026-08-07 (+6 more)

### Community 26 - "LOG — newest first, older entries live in `git log` for this file"
Cohesion: 0.30
Nodes (10): PovBanner(), TierPovSwitch(), CORPORATE_TIERS, canUsePovSwitch(), previewIdentity(), TEST_ACCOUNTS, testAccountDoc(), testAccountFor() (+2 more)

### Community 27 - "check-progress.mjs"
Cohesion: 0.29
Nodes (6): hook, note, now, root, SKIP, walk()

### Community 28 - "COMPACTING NOW — what the summary must keep, and what it must drop"
Cohesion: 0.40
Nodes (4): COMPACTING NOW — what the summary must keep, and what it must drop, Drop hard — this is where the waste is, Keep, in this order, Then, immediately after compacting

### Community 29 - "customerBrief.selfcheck.mjs"
Cohesion: 0.18
Nodes (8): bgRe, byGround, edgeRe, inkRe, lines, rows, stack, tally

### Community 30 - "BiohazardTheme.jsx"
Cohesion: 0.22
Nodes (8): focusOf(), POINT, PonderOverlay(), reduced(), TONE_EDGE, TONE_RULE, getStage(), useScenePlayer()

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
Cohesion: 0.29
Nodes (5): b64(), candidates, connId, mint(), saved

### Community 35 - "useTransactionEngine.js"
Cohesion: 0.22
Nodes (6): BULAN, REEL, NotificationBell(), DETECTED_TRACKS, musicModules, MusicPlayer()

### Community 36 - "KPMInventoryApp"
Cohesion: 0.18
Nodes (10): 1. What we are copying, and what we are not, 2. 🔴 THE DECISION THAT SHAPES EVERYTHING — demo data, not live data, 3. Scene format, 4. Prerequisite refactor (small, do it first), 5. Files, 6. Traps specific to THIS codebase, 7. Checks to add with the engine, 8. Build order (+2 more)

### Community 37 - "BranchWarehouseManager.jsx"
Cohesion: 0.17
Nodes (9): SCENES, STAGES, goodsReceived, productPerformance, shipmentPlan, stockByWarehouse, SECTIONS, GoodsReceivedStage() (+1 more)

### Community 39 - "vaultGrace.selfcheck.mjs"
Cohesion: 0.33
Nodes (4): body, fnText, graceIsValid, src

### Community 40 - "CapybaraMascot.jsx"
Cohesion: 0.06
Nodes (29): app, appFiles, boundary, branch, brief, dashPanel, dashView, daystats (+21 more)

### Community 41 - "✅ THE LIGHT DUKE'S LEDGER IS BUILT — 524/524, contrast self-check passes"
Cohesion: 0.29
Nodes (6): 🟢 2026-08-27 23:50 — THE FOUR CAPTION FAULTS ARE FIXED. `8109559`, **663/663**. Tree clean., 🟢 2026-08-28 00:20 — THE HOVER VIDEO HAS BEEN WATCHED. No code changed; **663/663**., 🟢 2026-08-28 00:47 — HOVER GLOW AND THE RIBBON/COVER FIX. `1ebbabc`, **666/666**. Tree clean., 🟠 2026-08-30 08:25 — THE POV COSTUME CAN BE POSTED ANYWHERE. `b1cdcaa`, **666/666 + 831/831**. Tree clean., 🟠 2026-08-30 10:35 — THE RESTOCK QUEUE, THE BOOK, AND THE SALES ROLLUP. `20a4622` → `18062df`, **667/667 + 915/915**. Tree clean., PROGRESS — read this, search for nothing

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
Cohesion: 0.29
Nodes (6): First command, NEXT SESSION — read this, then `.claude/PROGRESS.md`. Read no code to orient., 🔴 THE ONE JOB — look at Product Performance on a real screen, then fix what the frame shows, Traps — every one has already cost time, What the sales rollup is, in four lines, Where things live

### Community 48 - "toastSeverity.selfcheck.mjs"
Cohesion: 0.28
Nodes (7): FADE, MASCOT_CHATTER, MASCOT_FAILURES, report(), STICKY, isFailure(), isSticky()

### Community 49 - "package.json"
Cohesion: 0.36
Nodes (7): getDocOfflineSafe(), KPMInventoryApp(), computeDayXP(), clearGrace(), graceIsValid(), readGrace(), touchGrace()

### Community 50 - "MerchantSalesView.jsx"
Cohesion: 0.22
Nodes (7): css, dark, light, lum(), PAIRS, ratio(), srgb()

### Community 51 - "VaultGate.jsx"
Cohesion: 0.38
Nodes (7): HistoryReportView(), clampZoom(), ReceiptPreview(), SAMPLE_ROWS, WATERMARK_STYLE, watermarkFrom(), tallySaleOp()

### Community 52 - "CapybaraMascot.jsx"
Cohesion: 0.40
Nodes (4): CapybaraMascot(), LOCKED_MESSAGES, LOGGED_IN_MESSAGES, NO_MESSAGES

### Community 53 - "cross-env"
Cohesion: 0.53
Nodes (4): DEMO_TOTALS, DEMO_WAREHOUSES, scriptedOpen(), StockStage()

### Community 54 - "eslint-plugin-react-refresh"
Cohesion: 0.14
Nodes (21): promptAction(), L, createJourneyClusterIcon(), getStoreIcon(), BorderImporter(), checkPointInGeoJSON(), compressCoords(), createCustomClusterIcon() (+13 more)

### Community 55 - "postcss"
Cohesion: 0.18
Nodes (11): react, react, MapRecenter(), BookLab(), forceHover(), Lab(), MinKirimLab(), MK_ROWS (+3 more)

### Community 56 - "tailwindcss"
Cohesion: 0.39
Nodes (5): DEMO_PLAN_BRANCHES, DEMO_PLAN_ROWS, ShipmentPlanStage(), n(), ShipmentPlanTable()

### Community 57 - "CustomerManager.jsx"
Cohesion: 0.29
Nodes (6): big, line, naive, product, size(), stripped

### Community 58 - "SettingsView.jsx"
Cohesion: 0.20
Nodes (13): k(), AuthoritySelect(), HoldButton(), PermissionMatrixEditor(), SettingsView(), writeCareerLedger(), writeLiteMode(), writePhotoStorage() (+5 more)

### Community 59 - "undef.check.mjs"
Cohesion: 0.29
Nodes (6): BASELINE, eslint, fixed, found, seen, unexpected

### Community 60 - "notify"
Cohesion: 0.31
Nodes (11): AuditVaultView(), confirmAction(), CrownTransferProtocol(), CustomerDetailView(), LandlordDashboard(), notify(), ToastHost(), t() (+3 more)

### Community 61 - "firebase.js"
Cohesion: 0.09
Nodes (29): LazyTabBoundary, LABEL, ProductPerformancePanel(), canReachInternet(), onlineListeners, setSharedOnline(), subscribeOnline(), useOfflineEngine() (+21 more)

### Community 62 - "customerBrief.selfcheck.mjs"
Cohesion: 0.16
Nodes (11): b, guarded, inventory, messy, ok, rows, sameDay, sd (+3 more)

### Community 63 - "notify"
Cohesion: 0.09
Nodes (46): AgentInventoryView(), Money(), DashboardBenchmarks(), groupDigits(), pct(), toBal(), DashboardView(), SERIES (+38 more)

### Community 64 - "permissions.js"
Cohesion: 0.30
Nodes (13): canEditFleetRoster(), canPickFromGallery(), canSeeExpectedCount(), DYNAMIC_TIERS, getCustomerAccessLevel(), hasClearance(), isFieldLevelTier(), isFleetManagementTier() (+5 more)

### Community 65 - "CustomerManager.jsx"
Cohesion: 0.37
Nodes (9): checkPointInGeoJSON(), CustomerManagement(), isPointInPolygon(), createdMillis(), findDuplicates(), groupKey(), hasCoords(), metresBetween() (+1 more)

### Community 66 - "context-watch.mjs"
Cohesion: 0.40
Nodes (4): hook, left, lines, pct

### Community 67 - "JourneyView.jsx"
Cohesion: 0.21
Nodes (10): store(), AGENT_COLORS, checkPointInGeoJSON(), getHashColor(), getStoreHierarchy(), isPointInPolygon(), JourneyView(), LocationController() (+2 more)

### Community 68 - "MerchantSalesView.jsx"
Cohesion: 0.36
Nodes (9): MerchantSalesView(), readDraft(), reorderFromLast(), agoLabel(), dayStats(), paymentLabel(), splitToUnits(), directionsUrl() (+1 more)

### Community 69 - "dayStats.selfcheck.mjs"
Cohesion: 0.20
Nodes (7): justAfterLocalMidnight, justBeforeLocalMidnight, NOW, rows, s, shuffled, withReturn

### Community 70 - "VaultGate.jsx"
Cohesion: 0.36
Nodes (8): BiohazardTheme(), easeInOut(), easeOut(), gateCanvasOn(), gateHoldMs(), gateIsRich(), rndWord(), VaultGate()

### Community 71 - "mixedUnits.selfcheck.mjs"
Cohesion: 0.25
Nodes (7): back(), bksPerUnit(), cello, custom, d, real, totalBks()

### Community 72 - "scripts"
Cohesion: 0.29
Nodes (7): scripts, build, deploy, dev, lint, lint:undef, preview

### Community 73 - "firebase.js"
Cohesion: 0.29
Nodes (6): app, auth, db, firebaseConfig, googleProvider, storage

### Community 74 - "package.json"
Cohesion: 0.40
Nodes (4): name, private, type, version

### Community 75 - "nextStop.js"
Cohesion: 0.70
Nodes (4): km(), mine(), nextStop(), visitedWithinCycle()

## Knowledge Gaps
- **519 isolated node(s):** `root`, `note`, `hook`, `now`, `hook` (+514 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **10 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `devDependencies` connect `devDependencies` to `package.json`, `cross-env`, `eslint-plugin-react-refresh`, `postcss`, `tailwindcss`, `@vitejs/plugin-react`?**
  _High betweenness centrality (0.033) - this node is a cross-community bridge._
- **Why does `dependencies` connect `dependencies` to `package.json`, `postcss`?**
  _High betweenness centrality (0.030) - this node is a cross-community bridge._
- **Why does `notify()` connect `notify` to `App.jsx`, `CustomerManager.jsx`, `permissions.js`, `CustomerManager.jsx`, `JourneyView.jsx`, `MerchantSalesView.jsx`, `toastSeverity.selfcheck.mjs`, `package.json`, `VaultGate.jsx`, `firebase.js`, `eslint-plugin-react-refresh`, `SettingsView.jsx`, `notify`, `txSize.selfcheck.mjs`?**
  _High betweenness centrality (0.025) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `KPMInventoryApp()` (e.g. with `t()` and `report()`) actually correct?**
  _`KPMInventoryApp()` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `root`, `note`, `hook` to the rest of the system?**
  _519 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `App.jsx` be split into smaller, more focused modules?**
  _Cohesion score 0.08262108262108261 - nodes in this community are weakly interconnected._
- **Should `dependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.08695652173913043 - nodes in this community are weakly interconnected._