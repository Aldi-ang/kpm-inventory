# Graph Report - kpm-inventory-main  (2026-09-16)

## Corpus Check
- 160 files · ~868,349 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1685 nodes · 2973 edges · 109 communities (81 shown, 28 thin omitted)
- Extraction: 97% EXTRACTED · 3% INFERRED · 0% AMBIGUOUS · INFERRED: 86 edges (avg confidence: 0.76)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `892f8224`
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
- dayStats.selfcheck.mjs
- helpers.js
- RestockVaultView.jsx
- customerBrief.selfcheck.mjs
- supply.js
- HistoryReportView.jsx
- StockStage.jsx
- useTransactionEngine.js
- react-leaflet-cluster
- customerBrief.selfcheck.mjs
- supply.js
- @types/react-dom
- JourneyView.jsx
- haResolve
- mixedUnits.selfcheck.mjs
- MerchantSalesView.jsx
- PonderPad.jsx
- HistoryReportView.jsx
- txSize.selfcheck.mjs
- 🟠 2026-09-10 07:30 — 25-30 users, and the number has now moved twice in one day
- txSize.selfcheck.mjs
- 🟠 2026-09-06 08:40 — the hand-off approval matrix is built. Feature complete, both halves.
- 🟠 2026-09-06 15:05 — he found a real flaw in the approval matrix. Rebuilt per-person.
- 🟠 2026-09-06 15:35 — the deployed login was blocked by the browser, not by a setting.
- nmKey
- 🟠 2026-09-06 15:45 — session closed. Everything shipped; nothing seen on screen.
- @vitejs/plugin-basic-ssl
- vgRestore
- StockByWarehouseTable.jsx
- 🟠 2026-09-08 09:23 — the hand-off bug was a SALE bug. `967e447`
- 🟠 2026-09-08 09:38 — consignment is now shop-only, strict. `83f5041`
- 🟠 2026-09-10 07:55 — prices consolidated into one page; business track closed
- 🟠 2026-09-11 — the red alarm is an adoption failure, not a threshold bug
- CapybaraMascot.jsx
- 🟠 2026-09-10 18:11 — his screenshot found a better bug than the brief did
- lab-firestore-stub.js
- vaultGrace.js
- cross-env
- StubAudio
- StockStage.jsx
- vaultGrace.js

## God Nodes (most connected - your core abstractions)
1. `PROGRESS — read this, search for nothing` - 83 edges
2. `KPMInventoryApp()` - 49 edges
3. `notify()` - 46 edges
4. `confirmAction()` - 39 edges
5. `convertToBks()` - 36 edges
6. `formatRupiah()` - 30 edges
7. `MerchantSalesView()` - 28 edges
8. `t()` - 26 edges
9. `RestockVaultView()` - 25 edges
10. `storeKey()` - 25 edges

## Surprising Connections (you probably didn't know these)
- `stampsOwed()` --indirect_call--> `val()`  [INFERRED]
  src/config/logicFixes.selfcheck.mjs → tools/seed-emulator.mjs
- `ownerMap()` --indirect_call--> `k()`  [INFERRED]
  src/config/logicFixes.selfcheck.mjs → .claude/context-watch.mjs
- `JourneyView()` --indirect_call--> `k()`  [INFERRED]
  src/JourneyView.jsx → .claude/context-watch.mjs
- `PonderOverlay()` --indirect_call--> `k()`  [INFERRED]
  src/ponder/PonderOverlay.jsx → .claude/context-watch.mjs
- `RestockVaultView()` --indirect_call--> `k()`  [INFERRED]
  src/RestockVaultView.jsx → .claude/context-watch.mjs

## Import Cycles
- None detected.

## Communities (109 total, 28 thin omitted)

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
Cohesion: 0.33
Nodes (5): auth, db, googleProvider, PROXIED_AUTH_HOSTS, storage

### Community 4 - "devDependencies"
Cohesion: 0.10
Nodes (21): autoprefixer, @eslint/js, eslint-plugin-react-hooks, eslint-plugin-react-refresh, globals, devDependencies, autoprefixer, @eslint/js (+13 more)

### Community 5 - "mixedUnits.selfcheck.mjs"
Cohesion: 0.19
Nodes (25): judge(), pickerShows(), writeApproval(), branchIsDelegated(), canApproveHandoffFrom(), canEditFleetRoster(), canHandleDelivery(), canHandOffAcrossRegions() (+17 more)

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
Cohesion: 0.22
Nodes (16): AchievementTester(), BASE_STATS, buildFakeCareer(), fmtValue(), LIVE_ONLY_STATS, ROOT_STATS, careerXP(), checkBadges() (+8 more)

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
Cohesion: 0.05
Nodes (51): DEMO_PLAN_BRANCHES, DEMO_PLAN_ROWS, asLeaves(), buildPages(), facingPage(), maxTurnOf(), turnFor(), ICONS (+43 more)

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
Cohesion: 0.27
Nodes (10): HoldButton(), PermissionMatrixEditor(), SettingsView(), writeCareerLedger(), writeLiteMode(), writePhotoStorage(), CUSTOMER_EDIT_PERMS, injectDynamicPermissions() (+2 more)

### Community 31 - "txSize.selfcheck.mjs"
Cohesion: 0.12
Nodes (21): AgentProfileView(), BADGE_CATEGORIES, createImage(), DynamicIconMap, getCroppedImg(), AcceptanceReceipt(), Money(), CareerDevTools() (+13 more)

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
Cohesion: 0.10
Nodes (12): ArrivalScanner(), ShipmentLabel(), LAB_MOTORISTS, LAB_PROCUREMENTS, LAB_PRODUCTS, LAB_SHIPMENT, MK_ROWS, NOTA (+4 more)

### Community 36 - "KPMInventoryApp"
Cohesion: 0.18
Nodes (10): 1. What we are copying, and what we are not, 2. 🔴 THE DECISION THAT SHAPES EVERYTHING — demo data, not live data, 3. Scene format, 4. Prerequisite refactor (small, do it first), 5. Files, 6. Traps specific to THIS codebase, 7. Checks to add with the engine, 8. Build order (+2 more)

### Community 37 - "MapMissionControl.jsx"
Cohesion: 0.09
Nodes (30): L, store(), AGENT_COLORS, checkPointInGeoJSON(), createJourneyClusterIcon(), getHashColor(), getStoreHierarchy(), getStoreIcon() (+22 more)

### Community 39 - "vaultGrace.selfcheck.mjs"
Cohesion: 0.33
Nodes (4): body, fnText, graceIsValid, src

### Community 40 - "CapybaraMascot.jsx"
Cohesion: 0.01
Nodes (193): aA, aB, acceptBody, ACCEPTED, acFrom, acTo, aiv, AIV_ROSTER (+185 more)

### Community 41 - "✅ THE LIGHT DUKE'S LEDGER IS BUILT — 524/524, contrast self-check passes"
Cohesion: 0.03
Nodes (69): ⚪ 2026-09-02 15:48 — SIDE SESSION (7 Days to Die). Notes moved OUT of this repo., ⚪ 2026-09-02 15:54 — SIDE SESSION (7 Days to Die). Nothing here changed., ⚪ 2026-09-02 20:55 — SIDE SESSION (7 Days to Die). No KPM file touched., 🔧 2026-09-04 17:35 — 7DTD track. No KPM work. Nothing here changed where KPM stands., 🔧 2026-09-04 17:55 — 7DTD track. The Stop hook fired on a file this track never touched., 🔧 2026-09-04 18:07 — 7DTD track. Hook fired on a KPM file again; nothing here is mine., 🟢 2026-09-04 18:40 — Regional Warehouse ponder REBUILT: it shows what it explains. `78eee2a`, 🟢 2026-09-04 19:30 — Stock by Warehouse split, and it was hiding a live bug. `f21b3d3` · 722/722 (+61 more)

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
Cohesion: 0.12
Nodes (15): Appearance — deferred on purpose, last, Business track — CLOSED and PARKED, do not reopen, Closed — do not reopen, Paste this to start the next session, Phone — the lab instruments that exist now, Promoted and parked behind the sweep, Rebuild sales totals — DONE, stop asking, Shipped 2026-09-14 — `2af2dd9` — CONFIRMED by Aldi (+7 more)

### Community 48 - "toastSeverity.selfcheck.mjs"
Cohesion: 0.16
Nodes (18): ConfirmHost(), ToastHost(), BOOST, boostElement(), buildGainStage(), initSounds(), liteModeOn(), makePool() (+10 more)

### Community 49 - "registry.js"
Cohesion: 0.21
Nodes (20): AuditVaultView(), confirmAction(), promptAction(), CrownTransferProtocol(), checkPointInGeoJSON(), CustomerDetailView(), CustomerManagement(), isPointInPolygon() (+12 more)

### Community 50 - "MerchantSalesView.jsx"
Cohesion: 0.22
Nodes (7): css, dark, light, lum(), PAIRS, ratio(), srgb()

### Community 51 - "VaultGate.jsx"
Cohesion: 0.50
Nodes (5): inheritedBy(), ownerMap(), refusedRows(), storeK(), visibleTo()

### Community 53 - "playSound"
Cohesion: 0.47
Nodes (6): createdMillis(), findDuplicates(), groupKey(), hasCoords(), metresBetween(), normaliseName()

### Community 54 - "RestockVaultView.jsx"
Cohesion: 0.15
Nodes (8): DataInduk(), DEMO_HEAD, DEMO_TABS, PANELS, RegionalWarehouseStage(), rp(), TAB_OF_PREFIX, tabForStep()

### Community 55 - "postcss"
Cohesion: 0.21
Nodes (12): react, react, t(), homography(), warpQuad(), BookLab(), forceHover(), Lab() (+4 more)

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
Cohesion: 0.20
Nodes (20): arrivalsOnHand(), BranchWarehouseManager(), inTransitQty(), middle(), oldestStockDays(), productArrivals(), receiptBlocked(), receiptDisputed() (+12 more)

### Community 62 - "MerchantSalesView.jsx"
Cohesion: 0.11
Nodes (16): blank, done, eightDaysAgo, far, free, HERE, minefar, near (+8 more)

### Community 63 - "notify"
Cohesion: 0.20
Nodes (17): AgentInventoryView(), Money(), formatSampleQty(), SampleEntryModal(), SamplingAnalyticsView(), SamplingCartView(), SamplingFolderView(), HandoffOffer() (+9 more)

### Community 64 - "PonderOverlay.jsx"
Cohesion: 0.07
Nodes (52): DashboardBenchmarks(), groupDigits(), pct(), toBal(), DashboardView(), SERIES, share(), PaceChart() (+44 more)

### Community 65 - "RegionalWarehouseStage.jsx"
Cohesion: 0.35
Nodes (11): DAMAGE_REASONS, damageBlocked(), damageSorted(), isLeak(), recountState(), samePass(), shortageStreak(), StockOpnameView() (+3 more)

### Community 66 - "context-watch.mjs"
Cohesion: 0.40
Nodes (4): name, private, type, version

### Community 67 - "MerchantSalesView.jsx"
Cohesion: 0.35
Nodes (9): PovBanner(), TierPovSwitch(), CORPORATE_TIERS, previewIdentity(), TEST_ACCOUNTS, testAccountDoc(), testAccountFor(), testAccountName() (+1 more)

### Community 68 - "dayStats.selfcheck.mjs"
Cohesion: 0.36
Nodes (8): BiohazardTheme(), easeInOut(), easeOut(), gateCanvasOn(), gateHoldMs(), gateIsRich(), rndWord(), VaultGate()

### Community 69 - "helpers.js"
Cohesion: 0.67
Nodes (3): AP_ROSTER, apPanel(), apQueue()

### Community 70 - "RestockVaultView.jsx"
Cohesion: 0.50
Nodes (4): 🟠 2026-09-10 05:45 — the legal research is closed, with a source per number, Correction on file, Deliberately not written, The three findings that change what he does

### Community 71 - "customerBrief.selfcheck.mjs"
Cohesion: 0.29
Nodes (11): ProofCamera(), MerchantSalesView(), readDraft(), reorderFromLast(), paymentLabel(), directionsUrl(), km(), metresLabel() (+3 more)

### Community 72 - "supply.js"
Cohesion: 0.67
Nodes (3): MP_SHOPS, mpFocus(), mpKey()

### Community 75 - "StockStage.jsx"
Cohesion: 0.17
Nodes (7): data, inside(), photo(), PQ, Q, shot, NotaScanLab()

### Community 76 - "useTransactionEngine.js"
Cohesion: 0.27
Nodes (6): LazyTabBoundary, canReachInternet(), onlineListeners, setSharedOnline(), subscribeOnline(), useOfflineEngine()

### Community 78 - "customerBrief.selfcheck.mjs"
Cohesion: 0.67
Nodes (3): 🔵 2026-09-07 12:05 — 7DTD mod track only. NO KPM CODE TOUCHED THIS SESSION., ⚠️ A standing rule was broken this session, What the 7DTD track settled (details in `AppData/Roaming/7DaysToDie/MODS-NOTES.md`)

### Community 79 - "supply.js"
Cohesion: 0.67
Nodes (3): 🟠 2026-09-10 06:20 — 50-100 users, and every price in the vault was computed for 10-30, The numbers, What actually got riskier, and it is not the price

### Community 82 - "haResolve"
Cohesion: 0.67
Nodes (3): haApprove(), haKey(), haResolve()

### Community 83 - "mixedUnits.selfcheck.mjs"
Cohesion: 0.09
Nodes (35): LABEL, ProductPerformancePanel(), justAfterLocalMidnight, justBeforeLocalMidnight, NOW, rows, s, shuffled (+27 more)

### Community 84 - "MerchantSalesView.jsx"
Cohesion: 0.16
Nodes (11): b, guarded, inventory, messy, ok, rows, sameDay, sd (+3 more)

### Community 88 - "HistoryReportView.jsx"
Cohesion: 0.42
Nodes (6): HistoryReportView(), clampZoom(), ReceiptPreview(), SAMPLE_ROWS, WATERMARK_STYLE, watermarkFrom()

### Community 89 - "txSize.selfcheck.mjs"
Cohesion: 0.28
Nodes (7): FADE, MASCOT_CHATTER, MASCOT_FAILURES, report(), STICKY, isFailure(), isSticky()

### Community 90 - "🟠 2026-09-10 07:30 — 25-30 users, and the number has now moved twice in one day"
Cohesion: 0.67
Nodes (3): 🟠 2026-09-10 07:30 — 25-30 users, and the number has now moved twice in one day, The fairness answer he asked for — four independent yardsticks, same place, The structural finding, which matters more than the price

### Community 91 - "txSize.selfcheck.mjs"
Cohesion: 0.12
Nodes (13): BULAN, REEL, NotificationBell(), app, auth, db, firebaseConfig, googleProvider (+5 more)

### Community 105 - "CapybaraMascot.jsx"
Cohesion: 0.40
Nodes (4): CapybaraMascot(), LOCKED_MESSAGES, LOGGED_IN_MESSAGES, NO_MESSAGES

### Community 108 - "vaultGrace.js"
Cohesion: 0.27
Nodes (9): Lamp(), CornerSheet(), PhotoField(), WarehouseDeskNav(), deskewAngle(), findPaper(), loadNotaPhoto(), scanNotaToBase64() (+1 more)

### Community 110 - "StubAudio"
Cohesion: 0.22
Nodes (6): __isUnlocked(), __reset(), ctx(), makeDoc(), played, StubAudio

### Community 112 - "StockStage.jsx"
Cohesion: 0.36
Nodes (6): DEMO_TOTALS, DEMO_WAREHOUSES, n(), StockByWarehouseTable(), scriptedOpen(), StockStage()

### Community 113 - "vaultGrace.js"
Cohesion: 0.31
Nodes (8): getDocOfflineSafe(), KPMInventoryApp(), canUsePovSwitch(), absentForSure(), clearGrace(), graceIsValid(), readGrace(), touchGrace()

## Knowledge Gaps
- **847 isolated node(s):** `root`, `note`, `brief`, `hook`, `now` (+842 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **28 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `dependencies` connect `dependencies` to `HistoryReportView.jsx`, `context-watch.mjs`, `react-leaflet-cluster`, `postcss`?**
  _High betweenness centrality (0.031) - this node is a cross-community bridge._
- **Why does `react` connect `postcss` to `dependencies`, `MerchantSalesView.jsx`, `MapMissionControl.jsx`, `customerBrief.selfcheck.mjs`, `StockStage.jsx`, `vaultGrace.js`, `RestockVaultView.jsx`, `notify`?**
  _High betweenness centrality (0.026) - this node is a cross-community bridge._
- **Why does `devDependencies` connect `devDependencies` to `@vitejs/plugin-basic-ssl`, `context-watch.mjs`, `lab-firestore-stub.js`, `cross-env`, `@types/react-dom`, `JourneyView.jsx`?**
  _High betweenness centrality (0.025) - this node is a cross-community bridge._
- **Are the 5 inferred relationships involving `KPMInventoryApp()` (e.g. with `getDocOfflineSafe()` and `t()`) actually correct?**
  _`KPMInventoryApp()` has 5 INFERRED edges - model-reasoned connections that need verification._
- **What connects `root`, `note`, `brief` to the rest of the system?**
  _847 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `App.jsx` be split into smaller, more focused modules?**
  _Cohesion score 0.09057971014492754 - nodes in this community are weakly interconnected._
- **Should `dependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.08695652173913043 - nodes in this community are weakly interconnected._