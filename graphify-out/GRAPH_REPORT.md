# Graph Report - kpm-inventory-main  (2026-10-04)

## Corpus Check
- 195 files · ~1,014,919 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 2097 nodes · 3917 edges · 116 communities (98 shown, 18 thin omitted)
- Extraction: 97% EXTRACTED · 3% INFERRED · 0% AMBIGUOUS · INFERRED: 127 edges (avg confidence: 0.77)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `1eb9cbdf`
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
- dayStats.selfcheck.mjs
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
- salesRollup.js
- context-watch.mjs
- MerchantSalesView.jsx
- VaultGate.jsx
- helpers.js
- BiohazardTheme.jsx
- notify
- supply.js
- PonderBook.jsx
- AgentProfileView.jsx
- MerchantSalesView.jsx
- useTransactionEngine.js
- react-leaflet-cluster
- customerBrief.selfcheck.mjs
- playSound
- @types/react-dom
- LoadingBayStage.jsx
- haResolve
- KPMInventoryApp
- t
- PonderPad.jsx
- VaultGate.jsx
- CapybaraMascot.jsx
- SamplingManager.jsx
- PonderOverlay.jsx
- salesRollup.js
- FleetCanvasManager.jsx
- ConsignmentFinanceView.jsx
- CustomerManager.jsx
- SamplingManager.jsx
- nmKey
- cross-env
- @vitejs/plugin-basic-ssl
- vgRestore
- dayStats.selfcheck.mjs
- @types/react
- t
- expedition.js
- expedition.js
- firebase.js
- ResidentEvilInventory.jsx
- scanNotaToBase64
- SamplingManager.jsx
- CrownTransferProtocol.jsx
- ShipmentPlanStage.jsx
- StockStage.jsx
- toastSeverity.selfcheck.mjs
- framer-motion
- eslint

## God Nodes (most connected - your core abstractions)
1. `PROGRESS — read this, search for nothing` - 127 edges
2. `KPMInventoryApp()` - 62 edges
3. `notify()` - 48 edges
4. `convertToBks()` - 46 edges
5. `confirmAction()` - 41 edges
6. `formatRupiah()` - 36 edges
7. `The one job` - 36 edges
8. `t()` - 35 edges
9. `MerchantSalesView()` - 30 edges
10. `storeKey()` - 29 edges

## Surprising Connections (you probably didn't know these)
- `AuthoritySelect()` --indirect_call--> `k()`  [INFERRED]
  src/components/AuthoritySelect.jsx → .claude/context-watch.mjs
- `EODAgentFlow()` --indirect_call--> `k()`  [INFERRED]
  src/components/EODAgentFlow.jsx → .claude/context-watch.mjs
- `LoadingBay()` --indirect_call--> `k()`  [INFERRED]
  src/components/LoadingBay.jsx → .claude/context-watch.mjs
- `NotificationBell()` --indirect_call--> `k()`  [INFERRED]
  src/components/NotificationBell.jsx → .claude/context-watch.mjs
- `TodayBook()` --indirect_call--> `k()`  [INFERRED]
  src/components/TodayBook.jsx → .claude/context-watch.mjs

## Import Cycles
- None detected.

## Communities (116 total, 18 thin omitted)

### Community 0 - "App.jsx"
Cohesion: 0.06
Nodes (33): AgentInventoryView, AgentProfileView, AuditVaultView, BranchWarehouseManager, ConsignmentFinanceView, CustomerManagement, DashboardView, EODReconciliationView (+25 more)

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
Cohesion: 0.12
Nodes (20): stampsOwed(), dailySeries(), CUSTOMERS, day(), fields(), MOTORISTS, PRODUCTS, put() (+12 more)

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
Cohesion: 0.13
Nodes (12): SCENES, STAGES, agentChest, goodsReceived, loadingBay, productPerformance, regionalWarehouse, shipmentPlan (+4 more)

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
Cohesion: 0.18
Nodes (22): arrivalsOnHand(), BranchWarehouseManager(), inTransitQty(), middle(), oldestStockDays(), productArrivals(), receiptBlocked(), receiptDisputed() (+14 more)

### Community 31 - "eslint-plugin-react-refresh"
Cohesion: 0.11
Nodes (22): center(), L, getStoreIcon(), MapRecenter(), checkPointInGeoJSON(), compressCoords(), createCustomClusterIcon(), DraggableAddMarker() (+14 more)

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
Nodes (30): ArrivalScanner(), ShipmentLabel(), LOOKS, LAB_AGENT_TXNS, LAB_CUSTOMERS, LAB_FLEET, LAB_FLEET_CUSTOMERS, LAB_FLEET_TITIP (+22 more)

### Community 36 - "KPMInventoryApp"
Cohesion: 0.18
Nodes (10): 1. What we are copying, and what we are not, 2. 🔴 THE DECISION THAT SHAPES EVERYTHING — demo data, not live data, 3. Scene format, 4. Prerequisite refactor (small, do it first), 5. Files, 6. Traps specific to THIS codebase, 7. Checks to add with the engine, 8. Build order (+2 more)

### Community 37 - "MapMissionControl.jsx"
Cohesion: 0.24
Nodes (6): AcceptanceReceipt(), Money(), n(), StockByWarehouseTable(), HQ_LOCATIONS, locationOf()

### Community 39 - "vaultGrace.selfcheck.mjs"
Cohesion: 0.33
Nodes (4): body, fnText, graceIsValid, src

### Community 40 - "CapybaraMascot.jsx"
Cohesion: 0.01
Nodes (193): aA, aB, acceptBody, ACCEPTED, acFrom, acTo, aiv, AIV_ROSTER (+185 more)

### Community 41 - "✅ THE LIGHT DUKE'S LEDGER IS BUILT — 524/524, contrast self-check passes"
Cohesion: 0.02
Nodes (127): 🟡 2026-09-28 17:45 — KPM: two new asks - vault passwords per account, and a biohazard quarantine box, 🟡 2026-09-28 17:50 — KPM: his pick A - a vault password for every person, 🟢 2026-09-28 19:45 — KPM: a vault password for every person, built `7b85941`, 🟡 2026-09-28 20:05 — KPM: his follow-up - T1/T2 reset a person's vault password (double confirm, never set it) + LOCK a person's account, 🟡 2026-09-28 20:59 — KPM: vault reset + account lock BUILT, NOT COMMITTED; he stops for the night, 🟢 2026-09-29 08:25 — KPM: vault reset + account lock COMMITTED `56801d9` (local, not pushed), 🟡 2026-09-29 08:30 — KPM: the biohazard box - three looks on the prototype, his pick owed, 🟡 2026-09-29 08:42 — KPM: look C picked; warehouse quarantine + Gmail move read (no code) (+119 more)

### Community 42 - "check"
Cohesion: 0.67
Nodes (3): check(), inCss(), inJs()

### Community 43 - "🔴 LOG 00:37 WIB — superseded: 4 blockers found, now all fixed."
Cohesion: 0.33
Nodes (5): assets, css, html, out, out_name

### Community 44 - "✅ LOG 08:36 WIB — the rules question is ANSWERED, and G6 is HALF done. One question owed."
Cohesion: 0.40
Nodes (3): PORT, ROOT, TYPES

### Community 46 - "dayStats.selfcheck.mjs"
Cohesion: 0.13
Nodes (21): fmtTime(), MissedRow(), NotificationBell(), addMissed(), bindMissed(), clearMissed(), EMPTY, getMissed() (+13 more)

### Community 47 - "nextStop.js"
Cohesion: 0.04
Nodes (45): Appearance — deferred on purpose, last, Business track — CLOSED and PARKED, do not reopen, Closed — do not reopen, FIXED 2026-09-20 00:05 — the folder's leaving mark outlived its page (`6379364`) — CONFIRMED 00:15 (*"approve, continue"*), and d7f2193 with it, History - facts only, NOT a prompt to copy, How to measure and propose — the recipe is settled, do not re-derive it, Job 4: AGENT PROFILE on the phone — mount first (2026-09-20 00:20, nothing built yet), Paste this to start the next session (+37 more)

### Community 48 - "toastSeverity.selfcheck.mjs"
Cohesion: 0.19
Nodes (15): arrowAt(), cachedIcon(), count(), esc(), ExpeditionLayer(), ExpeditionMini(), ExpeditionPanel(), ExpeditionPeople() (+7 more)

### Community 49 - "notify"
Cohesion: 0.11
Nodes (30): BADGE_CATEGORIES, createImage(), DynamicIconMap, getCroppedImg(), AchievementTester(), BASE_STATS, buildFakeCareer(), fmtValue() (+22 more)

### Community 50 - "MerchantSalesView.jsx"
Cohesion: 0.22
Nodes (7): css, dark, light, lum(), PAIRS, ratio(), srgb()

### Community 51 - "VaultGate.jsx"
Cohesion: 0.50
Nodes (5): inheritedBy(), ownerMap(), refusedRows(), storeK(), visibleTo()

### Community 53 - "helpers.js"
Cohesion: 0.13
Nodes (15): CornerSheet(), PhotoField(), data, inside(), photo(), PQ, Q, shot (+7 more)

### Community 54 - "RestockVaultView.jsx"
Cohesion: 0.11
Nodes (17): blank, done, eightDaysAgo, far, free, HERE, minefar, near (+9 more)

### Community 55 - "postcss"
Cohesion: 0.19
Nodes (26): BAR, initialsOf(), PART_ORDER, PlayerCard(), PlayerCardHead(), computeDayXP(), rankLadder(), report() (+18 more)

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
Cohesion: 0.16
Nodes (16): useWide(), act(), AGENT_COLORS, checkPointInGeoJSON(), createJourneyClusterIcon(), getHashColor(), getStoreHierarchy(), isPointInPolygon() (+8 more)

### Community 62 - "MerchantSalesView.jsx"
Cohesion: 0.25
Nodes (7): back(), bksPerUnit(), cello, custom, d, real, totalBks()

### Community 63 - "confirmAction"
Cohesion: 0.07
Nodes (31): ConfirmHost(), ToastHost(), UpdateStatus(), BOOST, boostElement(), buildGainStage(), initSounds(), __isUnlocked() (+23 more)

### Community 64 - "PonderOverlay.jsx"
Cohesion: 0.08
Nodes (35): ARMS, at(), BACK, BOARD5, BODY5, chestHtml(), crowdHtml(), darker() (+27 more)

### Community 65 - "salesRollup.js"
Cohesion: 0.18
Nodes (22): LABEL, ProductPerformancePanel(), StoreFocus(), dayStats(), txSeconds(), storeKey(), countsAsRevenue(), isTitip() (+14 more)

### Community 66 - "context-watch.mjs"
Cohesion: 0.40
Nodes (4): name, private, type, version

### Community 67 - "MerchantSalesView.jsx"
Cohesion: 0.33
Nodes (7): FolderCard(), formatSampleQty(), SampleEntryModal(), SamplingAnalyticsView(), SamplingCartView(), SamplingFolderView(), getCurrentDate()

### Community 68 - "VaultGate.jsx"
Cohesion: 0.13
Nodes (11): DIR, legacy, outsider, owner, RULES, superA, t2, t2x (+3 more)

### Community 69 - "helpers.js"
Cohesion: 0.67
Nodes (3): AP_ROSTER, apPanel(), apQueue()

### Community 70 - "BiohazardTheme.jsx"
Cohesion: 0.17
Nodes (16): AgentInventoryView(), Money(), DIGITS, NixieCount(), GLYPHS, hhmm(), isWide(), packs() (+8 more)

### Community 71 - "notify"
Cohesion: 0.23
Nodes (15): AuditVaultView(), confirmAction(), HistoryReportView(), clampZoom(), ReceiptPreview(), SAMPLE_ROWS, notify(), WATERMARK_STYLE (+7 more)

### Community 72 - "supply.js"
Cohesion: 0.67
Nodes (3): MP_SHOPS, mpFocus(), mpKey()

### Community 73 - "PonderBook.jsx"
Cohesion: 0.19
Nodes (14): asLeaves(), buildPages(), facingPage(), maxTurnOf(), turnFor(), ICONS, Library(), liteOn() (+6 more)

### Community 74 - "AgentProfileView.jsx"
Cohesion: 0.25
Nodes (13): ProofCamera(), MerchantSalesView(), readDraft(), reorderFromLast(), agoLabel(), paymentLabel(), splitToUnits(), directionsUrl() (+5 more)

### Community 75 - "MerchantSalesView.jsx"
Cohesion: 0.17
Nodes (11): DIR, expect(), LIST, locked, log(), owner, RULES, stranger (+3 more)

### Community 76 - "useTransactionEngine.js"
Cohesion: 0.20
Nodes (10): LazyTabBoundary, canReachInternet(), onlineListeners, setSharedOnline(), subscribeOnline(), useOfflineEngine(), applySaleToCanvas(), useTransactionEngine() (+2 more)

### Community 78 - "customerBrief.selfcheck.mjs"
Cohesion: 0.13
Nodes (21): KEY, getDocOfflineSafe(), KPMInventoryApp(), BiohazardTheme(), BULAN, REEL, easeInOut(), easeOut() (+13 more)

### Community 79 - "playSound"
Cohesion: 0.29
Nodes (13): playSound(), instant(), liteOn(), pad2(), PonderPad(), reduced(), useDecode(), getScene() (+5 more)

### Community 81 - "LoadingBayStage.jsx"
Cohesion: 0.23
Nodes (14): promptAction(), LandlordDashboard(), DYNAMIC_TIERS, isFieldLevelTier(), tierWord(), FleetCanvasManager(), isSafeDocIdEmail(), damagedInVan() (+6 more)

### Community 82 - "haResolve"
Cohesion: 0.67
Nodes (3): haApprove(), haKey(), haResolve()

### Community 83 - "KPMInventoryApp"
Cohesion: 0.16
Nodes (27): DashboardBenchmarks(), groupDigits(), pct(), toBal(), DashboardView(), SERIES, share(), PaceChart() (+19 more)

### Community 84 - "t"
Cohesion: 0.06
Nodes (52): BYPASS_WORD, c3(), Cube(), CUT_WHY, fmt(), inRect(), items(), LoadingBay() (+44 more)

### Community 86 - "VaultGate.jsx"
Cohesion: 0.18
Nodes (20): AuthoritySelect(), HoldButton(), PermissionMatrixEditor(), SettingsView(), writeCareerLedger(), writeLiteMode(), writePhotoStorage(), canEditFleetRoster() (+12 more)

### Community 87 - "CapybaraMascot.jsx"
Cohesion: 0.14
Nodes (11): COUNTERS, DIR, legacy, owner, RULES, stranger, superA, t2 (+3 more)

### Community 88 - "SamplingManager.jsx"
Cohesion: 0.16
Nodes (11): b, guarded, inventory, messy, ok, rows, sameDay, sd (+3 more)

### Community 89 - "PonderOverlay.jsx"
Cohesion: 0.19
Nodes (10): focusOf(), liteOn(), POINT, PonderOverlay(), reduced(), TONE_EDGE, TONE_RING, TONE_RULE (+2 more)

### Community 90 - "salesRollup.js"
Cohesion: 0.30
Nodes (10): PovBanner(), TierPovSwitch(), CORPORATE_TIERS, canUsePovSwitch(), previewIdentity(), TEST_ACCOUNTS, testAccountDoc(), testAccountFor() (+2 more)

### Community 91 - "FleetCanvasManager.jsx"
Cohesion: 0.12
Nodes (11): DIR, legacy, LOCK, NEW, owner, rina, RULES, t2 (+3 more)

### Community 92 - "ConsignmentFinanceView.jsx"
Cohesion: 0.29
Nodes (13): judge(), pickerShows(), branchIsDelegated(), canApproveHandoffFrom(), canHandOffAcrossRegions(), handoffApprovers(), handoffEligibility(), normalizeRegion() (+5 more)

### Community 93 - "CustomerManager.jsx"
Cohesion: 0.24
Nodes (13): checkPointInGeoJSON(), CustomerDetailView(), CustomerManagement(), isPointInPolygon(), MoreKey(), getCustomerAccessLevel(), createdMillis(), findDuplicates() (+5 more)

### Community 94 - "SamplingManager.jsx"
Cohesion: 0.33
Nodes (5): DEMO_PLAN_BRANCHES, DEMO_PLAN_ROWS, ShipmentPlanStage(), n(), ShipmentPlanTable()

### Community 99 - "dayStats.selfcheck.mjs"
Cohesion: 0.20
Nodes (7): justAfterLocalMidnight, justBeforeLocalMidnight, NOW, rows, s, shuffled, withReturn

### Community 101 - "t"
Cohesion: 0.25
Nodes (11): react, react, t(), MapTouchGate(), BookLab(), forceHover(), Lab(), MinKirimLab() (+3 more)

### Community 102 - "expedition.js"
Cohesion: 0.39
Nodes (8): eodDay(), expedition(), his(), initials(), metres(), pin(), isSale(), SALE_TYPES

### Community 103 - "expedition.js"
Cohesion: 0.29
Nodes (6): big, line, naive, product, size(), stripped

### Community 105 - "firebase.js"
Cohesion: 0.10
Nodes (15): hook, k(), left, lines, pct, deleteDoc(), found(), getDoc() (+7 more)

### Community 106 - "ResidentEvilInventory.jsx"
Cohesion: 0.53
Nodes (4): formatAdvancedStock(), isPhone(), ItemInspector(), ResidentEvilInventory()

### Community 108 - "scanNotaToBase64"
Cohesion: 0.25
Nodes (16): AgentProfileView(), DAMAGE_REASONS, damageBlocked(), damageSorted(), isLeak(), recountState(), samePass(), shortageStreak() (+8 more)

### Community 112 - "SamplingManager.jsx"
Cohesion: 0.39
Nodes (5): DEMO_PERFORMANCE_ROWS, ProductPerformanceStage(), n(), ProductPerformanceTable(), rp()

### Community 113 - "CrownTransferProtocol.jsx"
Cohesion: 0.42
Nodes (8): CrownTransferProtocol(), derive(), hashSecret(), hex(), needsRehash(), subtle(), unhex(), verifySecret()

### Community 115 - "ShipmentPlanStage.jsx"
Cohesion: 0.22
Nodes (8): FILE, IR, N, OUT, pack, recording(), render(), SET

### Community 116 - "StockStage.jsx"
Cohesion: 0.53
Nodes (4): DEMO_TOTALS, DEMO_WAREHOUSES, scriptedOpen(), StockStage()

### Community 117 - "toastSeverity.selfcheck.mjs"
Cohesion: 0.18
Nodes (10): CapybaraMascot(), LOCKED_MESSAGES, LOGGED_IN_MESSAGES, NO_MESSAGES, FAILURE_STRIPS, MASCOT_CHATTER, MASCOT_FAILURES, SUCCESSES (+2 more)

## Knowledge Gaps
- **1024 isolated node(s):** `root`, `note`, `brief`, `hook`, `now` (+1019 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **18 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `KPMInventoryApp()` connect `customerBrief.selfcheck.mjs` to `App.jsx`, `CustomerManager.jsx`, `notify`, `docChanges.selfcheck.mjs`, `dayStats.selfcheck.mjs`, `notify`, `postcss`, `confirmAction`, `salesRollup.js`, `MerchantSalesView.jsx`, `notify`, `useTransactionEngine.js`, `LoadingBayStage.jsx`, `KPMInventoryApp`, `VaultGate.jsx`, `salesRollup.js`, `ConsignmentFinanceView.jsx`, `t`, `scanNotaToBase64`, `CrownTransferProtocol.jsx`, `toastSeverity.selfcheck.mjs`?**
  _High betweenness centrality (0.019) - this node is a cross-community bridge._
- **Why does `t()` connect `t` to `CustomerManager.jsx`, `notify`, `dayStats.selfcheck.mjs`, `useTransactionEngine.js`, `dayStats.selfcheck.mjs`, `toastSeverity.selfcheck.mjs`, `VaultGate.jsx`, `postcss`, `firebase.js`, `confirmAction`, `salesRollup.js`, `MerchantSalesView.jsx`, `notify`, `PonderBook.jsx`, `AgentProfileView.jsx`, `customerBrief.selfcheck.mjs`, `playSound`, `LoadingBayStage.jsx`, `KPMInventoryApp`, `t`, `ConsignmentFinanceView.jsx`, `CustomerManager.jsx`, `expedition.js`, `scanNotaToBase64`?**
  _High betweenness centrality (0.018) - this node is a cross-community bridge._
- **Why does `devDependencies` connect `devDependencies` to `cross-env`, `@vitejs/plugin-basic-ssl`, `context-watch.mjs`, `@types/react`, `@types/react-dom`, `eslint`?**
  _High betweenness centrality (0.017) - this node is a cross-community bridge._
- **Are the 5 inferred relationships involving `KPMInventoryApp()` (e.g. with `getDocOfflineSafe()` and `t()`) actually correct?**
  _`KPMInventoryApp()` has 5 INFERRED edges - model-reasoned connections that need verification._
- **What connects `root`, `note`, `brief` to the rest of the system?**
  _1024 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `App.jsx` be split into smaller, more focused modules?**
  _Cohesion score 0.0620782726045884 - nodes in this community are weakly interconnected._
- **Should `dependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.08695652173913043 - nodes in this community are weakly interconnected._