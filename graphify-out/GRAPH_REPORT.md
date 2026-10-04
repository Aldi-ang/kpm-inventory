# Graph Report - kpm-inventory-main  (2026-10-04)

## Corpus Check
- 195 files · ~1,009,891 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 2085 nodes · 3903 edges · 118 communities (99 shown, 19 thin omitted)
- Extraction: 97% EXTRACTED · 3% INFERRED · 0% AMBIGUOUS · INFERRED: 127 edges (avg confidence: 0.77)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `28ca12da`
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
- RegionalWarehouseStage.jsx
- context-watch.mjs
- MerchantSalesView.jsx
- VaultGate.jsx
- helpers.js
- BiohazardTheme.jsx
- toastSeverity.selfcheck.mjs
- supply.js
- HistoryReportView.jsx
- AgentProfileView.jsx
- MerchantSalesView.jsx
- useTransactionEngine.js
- react-leaflet-cluster
- customerBrief.selfcheck.mjs
- WarehouseChest.jsx
- @types/react-dom
- LoadingBayStage.jsx
- haResolve
- KPMInventoryApp
- t
- PonderPad.jsx
- VaultGate.jsx
- CapybaraMascot.jsx
- SamplingManager.jsx
- StubAudio
- salesRollup.js
- FleetCanvasManager.jsx
- StockStage.jsx
- CustomerManager.jsx
- SamplingManager.jsx
- nmKey
- cross-env
- @vitejs/plugin-basic-ssl
- vgRestore
- dayStats.selfcheck.mjs
- @types/react
- toastSeverity.selfcheck.mjs
- HistoryReportView.jsx
- expedition.js
- firebase.js
- txSize.selfcheck.mjs
- vaultGrace.js
- scanNotaToBase64
- PonderPad.jsx
- playSound
- SamplingManager.jsx
- ShipmentPlanStage.jsx
- StockStage.jsx
- toastSeverity.selfcheck.mjs
- framer-motion
- eslint

## God Nodes (most connected - your core abstractions)
1. `PROGRESS — read this, search for nothing` - 120 edges
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
- `stampsOwed()` --indirect_call--> `val()`  [INFERRED]
  src/config/logicFixes.selfcheck.mjs → tools/seed-emulator.mjs
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

## Communities (118 total, 19 thin omitted)

### Community 0 - "App.jsx"
Cohesion: 0.07
Nodes (38): AgentInventoryView, AgentProfileView, AuditVaultView, BranchWarehouseManager, ConsignmentFinanceView, CustomerManagement, DashboardView, EODReconciliationView (+30 more)

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
Cohesion: 0.15
Nodes (8): DataInduk(), DEMO_HEAD, DEMO_TABS, PANELS, RegionalWarehouseStage(), rp(), TAB_OF_PREFIX, tabForStep()

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
Nodes (34): hook, k(), left, lines, pct, AuthoritySelect(), dailySeries(), deleteDoc() (+26 more)

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
Cohesion: 0.06
Nodes (65): AcceptanceReceipt(), Money(), arrivalsOnHand(), BranchWarehouseManager(), inTransitQty(), middle(), oldestStockDays(), productArrivals() (+57 more)

### Community 31 - "eslint-plugin-react-refresh"
Cohesion: 0.14
Nodes (27): AuditVaultView(), confirmAction(), HistoryReportView(), LandlordDashboard(), notify(), t(), ConsignmentFinanceView(), HandoffOffer() (+19 more)

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
Nodes (24): ArrivalScanner(), ShipmentLabel(), LOOKS, LAB_AGENT_TXNS, LAB_CUSTOMERS, LAB_FLEET, LAB_FLEET_CUSTOMERS, LAB_FLEET_TITIP (+16 more)

### Community 36 - "KPMInventoryApp"
Cohesion: 0.18
Nodes (10): 1. What we are copying, and what we are not, 2. 🔴 THE DECISION THAT SHAPES EVERYTHING — demo data, not live data, 3. Scene format, 4. Prerequisite refactor (small, do it first), 5. Files, 6. Traps specific to THIS codebase, 7. Checks to add with the engine, 8. Build order (+2 more)

### Community 37 - "MapMissionControl.jsx"
Cohesion: 0.18
Nodes (28): BAR, initialsOf(), PART_ORDER, PlayerCard(), PlayerCardHead(), SamplingCartView(), computeDayXP(), report() (+20 more)

### Community 39 - "vaultGrace.selfcheck.mjs"
Cohesion: 0.33
Nodes (4): body, fnText, graceIsValid, src

### Community 40 - "CapybaraMascot.jsx"
Cohesion: 0.01
Nodes (193): aA, aB, acceptBody, ACCEPTED, acFrom, acTo, aiv, AIV_ROSTER (+185 more)

### Community 41 - "✅ THE LIGHT DUKE'S LEDGER IS BUILT — 524/524, contrast self-check passes"
Cohesion: 0.02
Nodes (120): 🟡 2026-09-28 17:45 — KPM: two new asks - vault passwords per account, and a biohazard quarantine box, 🟡 2026-09-28 17:50 — KPM: his pick A - a vault password for every person, 🟢 2026-09-28 19:45 — KPM: a vault password for every person, built `7b85941`, 🟡 2026-09-28 20:05 — KPM: his follow-up - T1/T2 reset a person's vault password (double confirm, never set it) + LOCK a person's account, 🟡 2026-09-28 20:59 — KPM: vault reset + account lock BUILT, NOT COMMITTED; he stops for the night, 🟢 2026-09-29 08:25 — KPM: vault reset + account lock COMMITTED `56801d9` (local, not pushed), 🟡 2026-09-29 08:30 — KPM: the biohazard box - three looks on the prototype, his pick owed, 🟡 2026-09-29 08:42 — KPM: look C picked; warehouse quarantine + Gmail move read (no code) (+112 more)

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
Cohesion: 0.11
Nodes (26): CapybaraMascot(), LOCKED_MESSAGES, LOGGED_IN_MESSAGES, NO_MESSAGES, fmtTime(), MissedRow(), NotificationBell(), addMissed() (+18 more)

### Community 47 - "nextStop.js"
Cohesion: 0.04
Nodes (45): Appearance — deferred on purpose, last, Business track — CLOSED and PARKED, do not reopen, Closed — do not reopen, FIXED 2026-09-20 00:05 — the folder's leaving mark outlived its page (`6379364`) — CONFIRMED 00:15 (*"approve, continue"*), and d7f2193 with it, History - facts only, NOT a prompt to copy, How to measure and propose — the recipe is settled, do not re-derive it, Job 4: AGENT PROFILE on the phone — mount first (2026-09-20 00:20, nothing built yet), Paste this to start the next session (+37 more)

### Community 48 - "toastSeverity.selfcheck.mjs"
Cohesion: 0.15
Nodes (19): arrowAt(), cachedIcon(), count(), esc(), ExpeditionLayer(), ExpeditionMini(), ExpeditionPanel(), ExpeditionPeople() (+11 more)

### Community 49 - "notify"
Cohesion: 0.11
Nodes (34): AgentProfileView(), BADGE_CATEGORIES, createImage(), DynamicIconMap, getCroppedImg(), AchievementTester(), BASE_STATS, buildFakeCareer() (+26 more)

### Community 50 - "MerchantSalesView.jsx"
Cohesion: 0.22
Nodes (7): css, dark, light, lum(), PAIRS, ratio(), srgb()

### Community 51 - "VaultGate.jsx"
Cohesion: 0.50
Nodes (5): inheritedBy(), ownerMap(), refusedRows(), storeK(), visibleTo()

### Community 53 - "helpers.js"
Cohesion: 0.12
Nodes (12): data, inside(), photo(), PQ, Q, shot, deskewAngle(), homography() (+4 more)

### Community 54 - "RestockVaultView.jsx"
Cohesion: 0.11
Nodes (16): blank, done, eightDaysAgo, far, free, HERE, minefar, near (+8 more)

### Community 55 - "postcss"
Cohesion: 0.19
Nodes (14): asLeaves(), buildPages(), facingPage(), maxTurnOf(), turnFor(), ICONS, Library(), liteOn() (+6 more)

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
Cohesion: 0.13
Nodes (21): store(), useWide(), act(), AGENT_COLORS, checkPointInGeoJSON(), createJourneyClusterIcon(), getHashColor(), getStoreHierarchy() (+13 more)

### Community 62 - "MerchantSalesView.jsx"
Cohesion: 0.15
Nodes (19): ProofCamera(), back(), bksPerUnit(), cello, custom, d, real, totalBks() (+11 more)

### Community 63 - "confirmAction"
Cohesion: 0.13
Nodes (20): BOOST, boostElement(), buildGainStage(), initSounds(), __isUnlocked(), liteModeOn(), makePool(), MUMBLES (+12 more)

### Community 64 - "PonderOverlay.jsx"
Cohesion: 0.08
Nodes (32): ARMS, at(), BACK, BOARD5, BODY5, darker(), figClass(), figs (+24 more)

### Community 65 - "RegionalWarehouseStage.jsx"
Cohesion: 0.26
Nodes (11): HoldButton(), PermissionMatrixEditor(), SettingsView(), writeCareerLedger(), writeLiteMode(), writePhotoStorage(), CUSTOMER_EDIT_PERMS, injectDynamicPermissions() (+3 more)

### Community 66 - "context-watch.mjs"
Cohesion: 0.40
Nodes (4): name, private, type, version

### Community 67 - "MerchantSalesView.jsx"
Cohesion: 0.39
Nodes (6): FolderCard(), formatSampleQty(), SampleEntryModal(), SamplingAnalyticsView(), SamplingFolderView(), getCurrentDate()

### Community 68 - "VaultGate.jsx"
Cohesion: 0.13
Nodes (11): DIR, legacy, outsider, owner, RULES, superA, t2, t2x (+3 more)

### Community 69 - "helpers.js"
Cohesion: 0.67
Nodes (3): AP_ROSTER, apPanel(), apQueue()

### Community 70 - "BiohazardTheme.jsx"
Cohesion: 0.22
Nodes (9): DEMO_BAY, DEMO_BAY_FAILED, DEMO_BAY_PLAN, DEMO_BAY_PRESET, U, landed(), LINES, LoadingBayStage() (+1 more)

### Community 71 - "toastSeverity.selfcheck.mjs"
Cohesion: 0.31
Nodes (12): DashboardView(), SERIES, share(), MONTHS, periodDays(), periodMeta(), periodWindow(), txDate() (+4 more)

### Community 72 - "supply.js"
Cohesion: 0.67
Nodes (3): MP_SHOPS, mpFocus(), mpKey()

### Community 73 - "HistoryReportView.jsx"
Cohesion: 0.19
Nodes (10): focusOf(), liteOn(), POINT, PonderOverlay(), reduced(), TONE_EDGE, TONE_RING, TONE_RULE (+2 more)

### Community 74 - "AgentProfileView.jsx"
Cohesion: 0.30
Nodes (12): LABEL, ProductPerformancePanel(), countsAsRevenue(), isTitip(), outstandingTitip(), revenueOf(), soldLinesOf(), monthOf() (+4 more)

### Community 75 - "MerchantSalesView.jsx"
Cohesion: 0.17
Nodes (11): DIR, expect(), LIST, locked, log(), owner, RULES, stranger (+3 more)

### Community 76 - "useTransactionEngine.js"
Cohesion: 0.27
Nodes (9): ConfirmHost(), UpdateStatus(), onRegisteredSW(), SOUND_GESTURES, getRegistration(), setRegistration(), UPDATE_LABEL, updateState() (+1 more)

### Community 78 - "customerBrief.selfcheck.mjs"
Cohesion: 0.25
Nodes (5): BULAN, REEL, DETECTED_TRACKS, musicModules, MusicPlayer()

### Community 79 - "WarehouseChest.jsx"
Cohesion: 0.53
Nodes (4): formatAdvancedStock(), isPhone(), ItemInspector(), ResidentEvilInventory()

### Community 81 - "LoadingBayStage.jsx"
Cohesion: 0.23
Nodes (14): promptAction(), isFieldLevelTier(), resolveTierOneId(), FleetCanvasManager(), convertToBks(), isSafeDocIdEmail(), damagedInVan(), quarantineOf() (+6 more)

### Community 82 - "haResolve"
Cohesion: 0.67
Nodes (3): haApprove(), haKey(), haResolve()

### Community 83 - "KPMInventoryApp"
Cohesion: 0.23
Nodes (12): DashboardBenchmarks(), groupDigits(), pct(), toBal(), PaceChart(), VB, LAMP, SafetyStatus() (+4 more)

### Community 84 - "t"
Cohesion: 0.06
Nodes (59): AgentInventoryView(), Money(), BYPASS_WORD, c3(), center(), Cube(), CUT_WHY, fmt() (+51 more)

### Community 86 - "VaultGate.jsx"
Cohesion: 0.36
Nodes (8): BiohazardTheme(), easeInOut(), easeOut(), gateCanvasOn(), gateHoldMs(), gateIsRich(), rndWord(), VaultGate()

### Community 87 - "CapybaraMascot.jsx"
Cohesion: 0.14
Nodes (11): COUNTERS, DIR, legacy, owner, RULES, stranger, superA, t2 (+3 more)

### Community 88 - "SamplingManager.jsx"
Cohesion: 0.16
Nodes (11): b, guarded, inventory, messy, ok, rows, sameDay, sd (+3 more)

### Community 90 - "salesRollup.js"
Cohesion: 0.30
Nodes (10): PovBanner(), TierPovSwitch(), CORPORATE_TIERS, canUsePovSwitch(), previewIdentity(), TEST_ACCOUNTS, testAccountDoc(), testAccountFor() (+2 more)

### Community 91 - "FleetCanvasManager.jsx"
Cohesion: 0.12
Nodes (11): DIR, legacy, LOCK, NEW, owner, rina, RULES, t2 (+3 more)

### Community 92 - "StockStage.jsx"
Cohesion: 0.17
Nodes (12): react, react, MapTouchGate(), BookLab(), forceHover(), Lab(), labEodReports(), labSamplings() (+4 more)

### Community 93 - "CustomerManager.jsx"
Cohesion: 0.20
Nodes (17): checkPointInGeoJSON(), CustomerDetailView(), CustomerManagement(), isPointInPolygon(), MoreKey(), getCustomerAccessLevel(), clearBorderCache(), loadBorderCache() (+9 more)

### Community 94 - "SamplingManager.jsx"
Cohesion: 0.33
Nodes (5): DEMO_PLAN_BRANCHES, DEMO_PLAN_ROWS, ShipmentPlanStage(), n(), ShipmentPlanTable()

### Community 99 - "dayStats.selfcheck.mjs"
Cohesion: 0.18
Nodes (9): justAfterLocalMidnight, justBeforeLocalMidnight, NOW, rows, s, shuffled, withReturn, agoLabel() (+1 more)

### Community 101 - "toastSeverity.selfcheck.mjs"
Cohesion: 0.16
Nodes (15): LazyTabBoundary, canReachInternet(), onlineListeners, setSharedOnline(), subscribeOnline(), useOfflineEngine(), applySaleToCanvas(), useTransactionEngine() (+7 more)

### Community 102 - "HistoryReportView.jsx"
Cohesion: 0.46
Nodes (5): clampZoom(), ReceiptPreview(), SAMPLE_ROWS, WATERMARK_STYLE, watermarkFrom()

### Community 103 - "expedition.js"
Cohesion: 0.36
Nodes (9): eodDay(), expedition(), his(), initials(), metres(), pin(), km(), isSale() (+1 more)

### Community 105 - "firebase.js"
Cohesion: 0.25
Nodes (7): app, auth, db, firebaseConfig, googleProvider, PROXIED_AUTH_HOSTS, storage

### Community 106 - "txSize.selfcheck.mjs"
Cohesion: 0.29
Nodes (6): big, line, naive, product, size(), stripped

### Community 107 - "vaultGrace.js"
Cohesion: 0.53
Nodes (5): KEY, clearGrace(), graceIsValid(), readGrace(), touchGrace()

### Community 108 - "scanNotaToBase64"
Cohesion: 0.67
Nodes (5): CornerSheet(), PhotoField(), findPaper(), loadNotaPhoto(), scanNotaToBase64()

### Community 109 - "PonderPad.jsx"
Cohesion: 0.44
Nodes (8): instant(), liteOn(), pad2(), PonderPad(), reduced(), useDecode(), getScene(), padKey()

### Community 110 - "playSound"
Cohesion: 0.60
Nodes (5): playSound(), bookClose(), bookOpen(), bookPage(), bookPick()

### Community 112 - "SamplingManager.jsx"
Cohesion: 0.39
Nodes (5): DEMO_PERFORMANCE_ROWS, ProductPerformanceStage(), n(), ProductPerformanceTable(), rp()

### Community 115 - "ShipmentPlanStage.jsx"
Cohesion: 0.22
Nodes (8): FILE, IR, N, OUT, pack, recording(), render(), SET

### Community 116 - "StockStage.jsx"
Cohesion: 0.53
Nodes (4): DEMO_TOTALS, DEMO_WAREHOUSES, scriptedOpen(), StockStage()

### Community 117 - "toastSeverity.selfcheck.mjs"
Cohesion: 0.28
Nodes (6): ToastHost(), FAILURE_STRIPS, MASCOT_CHATTER, MASCOT_FAILURES, SUCCESSES, isFailure()

## Knowledge Gaps
- **1016 isolated node(s):** `root`, `note`, `brief`, `hook`, `now` (+1011 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **19 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `convertToBks()` connect `LoadingBayStage.jsx` to `App.jsx`, `MapMissionControl.jsx`, `HistoryReportView.jsx`, `toastSeverity.selfcheck.mjs`, `toastSeverity.selfcheck.mjs`, `AgentProfileView.jsx`, `WarehouseChest.jsx`, `KPMInventoryApp`, `t`, `notify`, `MerchantSalesView.jsx`, `eslint-plugin-react-refresh`?**
  _High betweenness centrality (0.020) - this node is a cross-community bridge._
- **Why does `formatRupiah()` connect `eslint-plugin-react-refresh` to `App.jsx`, `dayStats.selfcheck.mjs`, `MapMissionControl.jsx`, `HistoryReportView.jsx`, `toastSeverity.selfcheck.mjs`, `WarehouseChest.jsx`, `KPMInventoryApp`, `t`, `notify`?**
  _High betweenness centrality (0.019) - this node is a cross-community bridge._
- **Why does `KPMInventoryApp()` connect `App.jsx` to `RegionalWarehouseStage.jsx`, `docChanges.selfcheck.mjs`, `MerchantSalesView.jsx`, `MapMissionControl.jsx`, `toastSeverity.selfcheck.mjs`, `toastSeverity.selfcheck.mjs`, `vaultGrace.js`, `useTransactionEngine.js`, `dayStats.selfcheck.mjs`, `LoadingBayStage.jsx`, `notify`, `toastSeverity.selfcheck.mjs`, `VaultGate.jsx`, `salesRollup.js`, `StockStage.jsx`, `confirmAction`, `notify`, `eslint-plugin-react-refresh`?**
  _High betweenness centrality (0.019) - this node is a cross-community bridge._
- **Are the 5 inferred relationships involving `KPMInventoryApp()` (e.g. with `getDocOfflineSafe()` and `t()`) actually correct?**
  _`KPMInventoryApp()` has 5 INFERRED edges - model-reasoned connections that need verification._
- **What connects `root`, `note`, `brief` to the rest of the system?**
  _1016 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `App.jsx` be split into smaller, more focused modules?**
  _Cohesion score 0.0707070707070707 - nodes in this community are weakly interconnected._
- **Should `dependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.08695652173913043 - nodes in this community are weakly interconnected._