# Graph Report - kpm-inventory-main  (2026-09-26)

## Corpus Check
- 171 files · ~966,226 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1880 nodes · 3403 edges · 120 communities (90 shown, 30 thin omitted)
- Extraction: 97% EXTRACTED · 3% INFERRED · 0% AMBIGUOUS · INFERRED: 99 edges (avg confidence: 0.77)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `8adb7773`
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
- WarehouseDeskNav.jsx
- 🟠 2026-09-08 09:38 — consignment is now shop-only, strict. `83f5041`
- 🟠 2026-09-10 07:55 — prices consolidated into one page; business track closed
- 🟠 2026-09-11 — the red alarm is an adoption failure, not a threshold bug
- convertToBks
- 🟠 2026-09-10 18:11 — his screenshot found a better bug than the brief did
- lab-firestore-stub.js
- StockByWarehouseTable.jsx
- PonderPad.jsx
- k
- HistoryReportView.jsx
- AcceptanceReceipt.jsx
- playSound
- eslint-plugin-react-refresh
- ShipmentPlanStage.jsx
- StubAudio
- context-watch.mjs
- LazyTabBoundary

## God Nodes (most connected - your core abstractions)
1. `PROGRESS — read this, search for nothing` - 146 edges
2. `KPMInventoryApp()` - 55 edges
3. `notify()` - 46 edges
4. `convertToBks()` - 46 edges
5. `confirmAction()` - 41 edges
6. `The one job` - 35 edges
7. `formatRupiah()` - 34 edges
8. `MerchantSalesView()` - 30 edges
9. `t()` - 29 edges
10. `storeKey()` - 27 edges

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

## Communities (120 total, 30 thin omitted)

### Community 0 - "App.jsx"
Cohesion: 0.07
Nodes (27): AgentInventoryView, AgentProfileView, BranchWarehouseManager, ConsignmentFinanceView, DashboardView, EODReconciliationView, FleetCanvasManager, getDocOfflineSafe() (+19 more)

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
Nodes (21): autoprefixer, eslint, @eslint/js, eslint-plugin-react-hooks, globals, devDependencies, autoprefixer, eslint (+13 more)

### Community 5 - "mixedUnits.selfcheck.mjs"
Cohesion: 0.10
Nodes (30): ArrivalScanner(), arrivalsOnHand(), BranchWarehouseManager(), inTransitQty(), middle(), oldestStockDays(), productArrivals(), receiptBlocked() (+22 more)

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
Cohesion: 0.13
Nodes (9): found(), getDoc(), getDocs(), onSnapshot(), record(), runTransaction(), snap(), updateDoc() (+1 more)

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
Cohesion: 0.15
Nodes (10): SCENES, STAGES, goodsReceived, productPerformance, regionalWarehouse, shipmentPlan, stockByWarehouse, SECTIONS (+2 more)

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
Cohesion: 0.24
Nodes (12): canReachInternet(), onlineListeners, setSharedOnline(), subscribeOnline(), useOfflineEngine(), applySaleToCanvas(), useTransactionEngine(), stripCartItemForStorage() (+4 more)

### Community 31 - "eslint-plugin-react-refresh"
Cohesion: 0.11
Nodes (30): BADGE_CATEGORIES, createImage(), DynamicIconMap, getCroppedImg(), AchievementTester(), BASE_STATS, buildFakeCareer(), fmtValue() (+22 more)

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
Nodes (24): ShipmentLabel(), LOOKS, LAB_AGENT_TXNS, LAB_CUSTOMERS, LAB_FLEET, LAB_FLEET_CUSTOMERS, LAB_FLEET_TITIP, LAB_MOTORISTS (+16 more)

### Community 36 - "KPMInventoryApp"
Cohesion: 0.18
Nodes (10): 1. What we are copying, and what we are not, 2. 🔴 THE DECISION THAT SHAPES EVERYTHING — demo data, not live data, 3. Scene format, 4. Prerequisite refactor (small, do it first), 5. Files, 6. Traps specific to THIS codebase, 7. Checks to add with the engine, 8. Build order (+2 more)

### Community 37 - "MapMissionControl.jsx"
Cohesion: 0.12
Nodes (26): k(), AgentInventoryView(), Money(), FolderCard(), DIGITS, NixieCount(), formatSampleQty(), SampleEntryModal() (+18 more)

### Community 39 - "vaultGrace.selfcheck.mjs"
Cohesion: 0.33
Nodes (4): body, fnText, graceIsValid, src

### Community 40 - "CapybaraMascot.jsx"
Cohesion: 0.01
Nodes (195): aA, aB, acceptBody, ACCEPTED, acFrom, acTo, aiv, AIV_ROSTER (+187 more)

### Community 41 - "✅ THE LIGHT DUKE'S LEDGER IS BUILT — 524/524, contrast self-check passes"
Cohesion: 0.02
Nodes (132): ⚪ 2026-09-02 15:48 — SIDE SESSION (7 Days to Die). Notes moved OUT of this repo., ⚪ 2026-09-02 15:54 — SIDE SESSION (7 Days to Die). Nothing here changed., ⚪ 2026-09-02 20:55 — SIDE SESSION (7 Days to Die). No KPM file touched., 🔧 2026-09-04 17:35 — 7DTD track. No KPM work. Nothing here changed where KPM stands., 🔧 2026-09-04 17:55 — 7DTD track. The Stop hook fired on a file this track never touched., 🔧 2026-09-04 18:07 — 7DTD track. Hook fired on a KPM file again; nothing here is mine., 🟢 2026-09-04 18:40 — Regional Warehouse ponder REBUILT: it shows what it explains. `78eee2a`, 🟢 2026-09-04 19:30 — Stock by Warehouse split, and it was hiding a live bug. `f21b3d3` · 722/722 (+124 more)

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
Nodes (44): Appearance — deferred on purpose, last, Business track — CLOSED and PARKED, do not reopen, Closed — do not reopen, FIXED 2026-09-20 00:05 — the folder's leaving mark outlived its page (`6379364`) — CONFIRMED 00:15 (*"approve, continue"*), and d7f2193 with it, How to measure and propose — the recipe is settled, do not re-derive it, Job 4: AGENT PROFILE on the phone — mount first (2026-09-20 00:20, nothing built yet), Paste this to start the next session, Phone — the lab instruments that exist now (+36 more)

### Community 48 - "toastSeverity.selfcheck.mjs"
Cohesion: 0.17
Nodes (9): b, guarded, inventory, messy, ok, rows, sameDay, sd (+1 more)

### Community 49 - "notify"
Cohesion: 0.18
Nodes (22): ProofCamera(), t(), StoreBottomSheet(), TierAutomationEngine(), MerchantSalesView(), readDraft(), briefSeconds(), customerBrief() (+14 more)

### Community 50 - "MerchantSalesView.jsx"
Cohesion: 0.22
Nodes (7): css, dark, light, lum(), PAIRS, ratio(), srgb()

### Community 51 - "VaultGate.jsx"
Cohesion: 0.50
Nodes (5): inheritedBy(), ownerMap(), refusedRows(), storeK(), visibleTo()

### Community 53 - "helpers.js"
Cohesion: 0.38
Nodes (9): LABEL, ProductPerformancePanel(), isSale(), monthOf(), monthsInRange(), rangeDays(), RANGES, SALE_TYPES (+1 more)

### Community 54 - "RestockVaultView.jsx"
Cohesion: 0.16
Nodes (22): AuditVaultView(), AuthoritySelect(), BiohazardTheme(), confirmAction(), CrownTransferProtocol(), HoldButton(), LandlordDashboard(), PermissionMatrixEditor() (+14 more)

### Community 55 - "postcss"
Cohesion: 0.19
Nodes (14): asLeaves(), buildPages(), facingPage(), maxTurnOf(), turnFor(), ICONS, Library(), liteOn() (+6 more)

### Community 57 - "StockOpnameView.jsx"
Cohesion: 0.15
Nodes (8): DataInduk(), DEMO_HEAD, DEMO_TABS, PANELS, RegionalWarehouseStage(), rp(), TAB_OF_PREFIX, tabForStep()

### Community 59 - "undef.check.mjs"
Cohesion: 0.29
Nodes (6): BASELINE, eslint, fixed, found, seen, unexpected

### Community 60 - "StockOpnameView.jsx"
Cohesion: 0.29
Nodes (7): scripts, build, deploy, dev, lint, lint:undef, preview

### Community 61 - "firebase.js"
Cohesion: 0.13
Nodes (17): dailySeries(), CUSTOMERS, day(), MOTORISTS, PRODUCTS, put(), run(), TRANSACTIONS (+9 more)

### Community 62 - "MerchantSalesView.jsx"
Cohesion: 0.10
Nodes (20): blank, done, eightDaysAgo, far, free, HERE, minefar, near (+12 more)

### Community 63 - "confirmAction"
Cohesion: 0.10
Nodes (23): ConfirmHost(), ToastHost(), BOOST, boostElement(), buildGainStage(), initSounds(), __isUnlocked(), liteModeOn() (+15 more)

### Community 64 - "PonderOverlay.jsx"
Cohesion: 0.16
Nodes (24): DashboardBenchmarks(), groupDigits(), pct(), toBal(), DashboardView(), SERIES, share(), PaceChart() (+16 more)

### Community 65 - "RegionalWarehouseStage.jsx"
Cohesion: 0.54
Nodes (7): derive(), hashSecret(), hex(), needsRehash(), subtle(), unhex(), verifySecret()

### Community 66 - "context-watch.mjs"
Cohesion: 0.40
Nodes (4): name, private, type, version

### Community 67 - "MerchantSalesView.jsx"
Cohesion: 0.35
Nodes (9): PovBanner(), TierPovSwitch(), canUsePovSwitch(), previewIdentity(), TEST_ACCOUNTS, testAccountDoc(), testAccountFor(), testAccountName() (+1 more)

### Community 68 - "VaultGate.jsx"
Cohesion: 0.22
Nodes (21): pickerShows(), branchIsDelegated(), canApproveHandoffFrom(), canEditFleetRoster(), canHandOffAcrossRegions(), defaultFleetAccess(), DYNAMIC_TIERS, FLEET_EDIT_PERMS (+13 more)

### Community 69 - "helpers.js"
Cohesion: 0.67
Nodes (3): AP_ROSTER, apPanel(), apQueue()

### Community 70 - "RestockVaultView.jsx"
Cohesion: 0.50
Nodes (4): 🟠 2026-09-10 05:45 — the legal research is closed, with a source per number, Correction on file, Deliberately not written, The three findings that change what he does

### Community 71 - "toastSeverity.selfcheck.mjs"
Cohesion: 0.32
Nodes (6): FADE, MASCOT_CHATTER, MASCOT_FAILURES, STICKY, isFailure(), isSticky()

### Community 72 - "supply.js"
Cohesion: 0.67
Nodes (3): MP_SHOPS, mpFocus(), mpKey()

### Community 73 - "HistoryReportView.jsx"
Cohesion: 0.19
Nodes (10): focusOf(), liteOn(), POINT, PonderOverlay(), reduced(), TONE_EDGE, TONE_RING, TONE_RULE (+2 more)

### Community 74 - "notify"
Cohesion: 0.17
Nodes (14): formatAdvancedStock(), ItemInspector(), ResidentEvilInventory(), back(), bksPerUnit(), cello, custom, d (+6 more)

### Community 75 - "MerchantSalesView.jsx"
Cohesion: 0.07
Nodes (46): checkPointInGeoJSON(), CustomerDetailView(), CustomerManagement(), isPointInPolygon(), center(), MoreKey(), L, store() (+38 more)

### Community 76 - "useTransactionEngine.js"
Cohesion: 0.12
Nodes (12): data, inside(), photo(), PQ, Q, shot, deskewAngle(), homography() (+4 more)

### Community 78 - "customerBrief.selfcheck.mjs"
Cohesion: 0.67
Nodes (3): 🔵 2026-09-07 12:05 — 7DTD mod track only. NO KPM CODE TOUCHED THIS SESSION., ⚠️ A standing rule was broken this session, What the 7DTD track settled (details in `AppData/Roaming/7DaysToDie/MODS-NOTES.md`)

### Community 79 - "supply.js"
Cohesion: 0.67
Nodes (3): 🟠 2026-09-10 06:20 — 50-100 users, and every price in the vault was computed for 10-30, The numbers, What actually got riskier, and it is not the price

### Community 82 - "haResolve"
Cohesion: 0.67
Nodes (3): haApprove(), haKey(), haResolve()

### Community 84 - "formatRupiah"
Cohesion: 0.43
Nodes (7): easeInOut(), easeOut(), gateCanvasOn(), gateHoldMs(), gateIsRich(), rndWord(), VaultGate()

### Community 86 - "dayStats.selfcheck.mjs"
Cohesion: 0.20
Nodes (7): justAfterLocalMidnight, justBeforeLocalMidnight, NOW, rows, s, shuffled, withReturn

### Community 87 - "career.js"
Cohesion: 0.39
Nodes (5): DEMO_PERFORMANCE_ROWS, ProductPerformanceStage(), n(), ProductPerformanceTable(), rp()

### Community 89 - "mixedUnits.selfcheck.mjs"
Cohesion: 0.23
Nodes (20): KPMInventoryApp(), promptAction(), BAR, initialsOf(), PART_ORDER, PlayerCard(), PlayerCardHead(), computeDayXP() (+12 more)

### Community 90 - "🟠 2026-09-10 07:30 — 25-30 users, and the number has now moved twice in one day"
Cohesion: 0.67
Nodes (3): 🟠 2026-09-10 07:30 — 25-30 users, and the number has now moved twice in one day, The fairness answer he asked for — four independent yardsticks, same place, The structural finding, which matters more than the price

### Community 91 - "txSize.selfcheck.mjs"
Cohesion: 0.12
Nodes (13): BULAN, REEL, NotificationBell(), app, auth, db, firebaseConfig, googleProvider (+5 more)

### Community 101 - "WarehouseDeskNav.jsx"
Cohesion: 0.36
Nodes (7): Lamp(), CornerSheet(), PhotoField(), WarehouseDeskNav(), findPaper(), loadNotaPhoto(), scanNotaToBase64()

### Community 105 - "convertToBks"
Cohesion: 0.18
Nodes (20): BYPASS_WORD, CUT_WHY, fmt(), inRect(), LoadingBay(), MOTE_COLORS, moteVars(), motionOK() (+12 more)

### Community 107 - "lab-firestore-stub.js"
Cohesion: 0.29
Nodes (7): react, react, MapTouchGate(), BookLab(), forceHover(), Lab(), MinKirimLab()

### Community 108 - "StockByWarehouseTable.jsx"
Cohesion: 0.28
Nodes (14): canSeeExpectedCount(), DAMAGE_REASONS, damageBlocked(), damageSorted(), isLeak(), recountState(), samePass(), shortageStreak() (+6 more)

### Community 109 - "PonderPad.jsx"
Cohesion: 0.29
Nodes (13): playSound(), instant(), liteOn(), pad2(), PonderPad(), reduced(), useDecode(), getScene() (+5 more)

### Community 110 - "k"
Cohesion: 0.40
Nodes (4): CapybaraMascot(), LOCKED_MESSAGES, LOGGED_IN_MESSAGES, NO_MESSAGES

### Community 111 - "HistoryReportView.jsx"
Cohesion: 0.38
Nodes (7): HistoryReportView(), clampZoom(), ReceiptPreview(), SAMPLE_ROWS, WATERMARK_STYLE, watermarkFrom(), tallySaleOp()

### Community 112 - "AcceptanceReceipt.jsx"
Cohesion: 0.18
Nodes (15): AgentProfileView(), AcceptanceReceipt(), Money(), canHandleDelivery(), canManageRegistry(), canPickFromGallery(), hasClearance(), num() (+7 more)

### Community 113 - "playSound"
Cohesion: 0.29
Nodes (6): big, line, naive, product, size(), stripped

### Community 115 - "ShipmentPlanStage.jsx"
Cohesion: 0.22
Nodes (8): FILE, IR, N, OUT, pack, recording(), render(), SET

### Community 117 - "context-watch.mjs"
Cohesion: 0.40
Nodes (4): hook, left, lines, pct

## Knowledge Gaps
- **960 isolated node(s):** `root`, `note`, `brief`, `hook`, `now` (+955 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **30 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `dependencies` connect `dependencies` to `HistoryReportView.jsx`, `context-watch.mjs`, `lab-firestore-stub.js`, `react-leaflet-cluster`?**
  _High betweenness centrality (0.029) - this node is a cross-community bridge._
- **Why does `react` connect `lab-firestore-stub.js` to `dependencies`, `MerchantSalesView.jsx`, `useTransactionEngine.js`, `MerchantSalesView.jsx`, `useTransactionEngine.js`, `notify`, `RestockVaultView.jsx`, `mixedUnits.selfcheck.mjs`, `StockOpnameView.jsx`?**
  _High betweenness centrality (0.025) - this node is a cross-community bridge._
- **Why does `devDependencies` connect `devDependencies` to `@vitejs/plugin-basic-ssl`, `context-watch.mjs`, `@types/react-dom`, `JourneyView.jsx`, `eslint-plugin-react-refresh`, `StubAudio`?**
  _High betweenness centrality (0.024) - this node is a cross-community bridge._
- **Are the 5 inferred relationships involving `KPMInventoryApp()` (e.g. with `getDocOfflineSafe()` and `t()`) actually correct?**
  _`KPMInventoryApp()` has 5 INFERRED edges - model-reasoned connections that need verification._
- **What connects `root`, `note`, `brief` to the rest of the system?**
  _960 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `App.jsx` be split into smaller, more focused modules?**
  _Cohesion score 0.07386363636363637 - nodes in this community are weakly interconnected._
- **Should `dependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.08695652173913043 - nodes in this community are weakly interconnected._