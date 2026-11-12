# Graph Report - kpm-inventory-main  (2026-11-12)

## Corpus Check
- 292 files · ~1,676,750 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 3532 nodes · 6598 edges · 182 communities (147 shown, 35 thin omitted)
- Extraction: 96% EXTRACTED · 4% INFERRED · 0% AMBIGUOUS · INFERRED: 253 edges (avg confidence: 0.77)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `6ea618f7`
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
- notify
- PonderOverlay.jsx
- salesRollup.js
- context-watch.mjs
- MerchantSalesView.jsx
- VaultGate.jsx
- helpers.js
- BiohazardTheme.jsx
- notify
- supply.js
- pc-drag.mjs
- AgentProfileView.jsx
- MerchantSalesView.jsx
- useTransactionEngine.js
- react-leaflet-cluster
- customerBrief.selfcheck.mjs
- CustomerManager.jsx
- pc-flow.mjs
- DashboardView.jsx
- haResolve
- KPMInventoryApp
- t
- PonderPad.jsx
- t
- CapybaraMascot.jsx
- AchievementTester.jsx
- PonderOverlay.jsx
- ResidentEvilInventory.jsx
- FleetCanvasManager.jsx
- demo-seed-from-backup.mjs
- StockOpnameView.jsx
- SamplingManager.jsx
- nmKey
- notify
- PonderOverlay.jsx
- vgRestore
- formatRupiah
- convertToBks
- povPreview.js
- expedition.js
- pc-fly.mjs
- lab-bell.jsx
- board.js
- SettingsView.jsx
- pc-land.mjs
- demoBuild.check.mjs
- main.jsx
- AgentChestStage.jsx
- EODReconciliationView.jsx
- pc-hover.mjs
- txSize.selfcheck.mjs
- ShipmentPlanStage.jsx
- StockStage.jsx
- SamplingManager.jsx
- OpnameWorklist.jsx
- convertToBks
- useDatabaseSync.js
- ProductPerformanceStage.jsx
- LoadingBayStage.jsx
- fanout-gate-cloud.mjs
- react-is
- main.jsx
- lab-bell.jsx
- k
- GoodsReceivedStage.jsx
- test-seat-limit.mjs
- PonderPad.jsx
- A
- mixedUnits.selfcheck.mjs
- UpdateStatus.jsx
- fanout-gate-cloud.test.mjs
- navfix.mjs
- useSound.selfcheck.mjs
- demo-reset.js
- useOfflineEngine
- ConfirmGate.jsx
- _demoFaces.js
- interact.mjs
- intro.mjs
- fixes.mjs
- end.mjs
- ho.mjs
- omz.mjs
- sel.mjs
- term.mjs
- toastSeverity.selfcheck.mjs
- mkcyi.mjs
- SaleReceipt.jsx
- cdp.mjs
- useOfflineEngine
- serve.mjs
- outfits.sh
- retry.sh
- test-agent-chest.mjs
- eslint-plugin-react-refresh
- gen.mjs
- autoprefixer
- elder.mjs
- three
- NixieCount.jsx
- notify
- convertToBks
- autoprefixer
- SaleReceipt.jsx
- ANTIGRAVITY-TASK.md
- ShellLab
- main.jsx
- ProductPerformanceStage.jsx
- SamplingManager.jsx
- phone
- @fontsource/rajdhani
- recharts
- openApp

## God Nodes (most connected - your core abstractions)
1. `PROGRESS — read this, search for nothing` - 511 edges
2. `KPMInventoryApp()` - 93 edges
3. `MerchantSalesView()` - 71 edges
4. `notify()` - 66 edges
5. `convertToBks()` - 55 edges
6. `StockOpnameView()` - 54 edges
7. `t()` - 52 edges
8. `confirmAction()` - 49 edges
9. `formatRupiah()` - 42 edges
10. `storeKey()` - 40 edges

## Surprising Connections (you probably didn't know these)
- `KPMInventoryApp()` --indirect_call--> `face()`  [INFERRED]
  src/App.jsx → api/_demoFaces.js
- `CustomerAccessPanel()` --indirect_call--> `changes()`  [INFERRED]
  src/components/CustomerAccessPanel.jsx → load-test/hundred-users.mjs
- `FleetCanvasManager()` --indirect_call--> `places()`  [INFERRED]
  src/FleetCanvasManager.jsx → rules-test/test-places-read.mjs
- `SettingsView()` --indirect_call--> `place()`  [INFERRED]
  src/components/SettingsView.jsx → rules-test/test-places-read.mjs
- `LandlordDashboard()` --indirect_call--> `counts()`  [INFERRED]
  src/components/LandlordDashboard.jsx → tools/demo-reset-emulator.mjs

## Import Cycles
- None detected.

## Communities (182 total, 35 thin omitted)

### Community 0 - "App.jsx"
Cohesion: 0.06
Nodes (58): AgentInventoryView, AgentProfileView, AuditVaultView, BranchWarehouseManager, ConsignmentFinanceView, CustomerManagement, DashboardView, EODReconciliationView (+50 more)

### Community 1 - "MapMissionControl.jsx"
Cohesion: 0.50
Nodes (3): F — Phone, G — Nothing old was lost, KPM Sales Terminal — test results

### Community 2 - "dependencies"
Cohesion: 0.09
Nodes (23): @emailjs/browser, firebase-admin, framer-motion, idb, jsbarcode, leaflet, lucide-react, dependencies (+15 more)

### Community 3 - "CustomerManager.jsx"
Cohesion: 0.33
Nodes (5): auth, db, googleProvider, PROXIED_AUTH_HOSTS, storage

### Community 4 - "devDependencies"
Cohesion: 0.08
Nodes (25): cross-env, eslint, @eslint/js, globals, devDependencies, cross-env, eslint, @eslint/js (+17 more)

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
Cohesion: 0.13
Nodes (21): customers, d, jv, logs, man, quick, sc, shop() (+13 more)

### Community 12 - "test-batch1.mjs"
Cohesion: 0.53
Nodes (5): ctxFor(), expect(), RULES, run(), seed()

### Community 13 - "test-batch2.mjs"
Cohesion: 0.53
Nodes (5): ctxFor(), expect(), RULES, run(), seed()

### Community 14 - "React + Vite"
Cohesion: 0.50
Nodes (3): Expanding the ESLint configuration, React Compiler, React + Vite

### Community 16 - "CLAUDE.md"
Cohesion: 0.15
Nodes (11): Antigravity, Claude's partner (2026-11-08), Context Navigation (3-layer rule), graphify, Publishing (a push IS the live app), Before you commit, End of every job: write it back, or it is lost, For Antigravity (Gemini) — Aldi's KPM app, How to work (the same discipline Claude follows) (+3 more)

### Community 21 - "Animation prompts — Pip-Boy style, capybara merchant"
Cohesion: 0.29
Nodes (6): Animation prompts — Pip-Boy style, capybara merchant, How a sprite sheet gets wired (already possible today), PROMPT — 2D animation sprite sheet (paste this), PROMPT — 3D, only if a rotating merchant is ever wanted, When Aldi generates more images, Why this reference is a good fit

### Community 22 - "dayStats.selfcheck.mjs"
Cohesion: 0.06
Nodes (34): ?, ?, ?, ?, ?, ?, ?, ? (+26 more)

### Community 23 - "JourneyView.jsx"
Cohesion: 0.14
Nodes (12): adopters, app, convertToBks(), dash, djisam, isLowOnTerminal(), isLowStock(), MIN_STOCK_UNITS (+4 more)

### Community 24 - "hasClearance"
Cohesion: 0.01
Nodes (206): allJs, allowedHex, app, appCode, appCrossed, appFiles, appSrc, archEnd (+198 more)

### Community 25 - "Sales Terminal — test list"
Cohesion: 0.13
Nodes (14): A. The shelf, B. The rail (desktop, wide window), C. The customer brief, D. Money — the part that must be exactly right, E. The merchant, F. Phone (narrow the browser, or use your phone), G. Nothing old was lost, H. Territory and duplicate outlets — built 2026-08-07 (+6 more)

### Community 26 - "LOG — newest first, older entries live in `git log` for this file"
Cohesion: 0.14
Nodes (11): SCENES, STAGES, agentChest, goodsReceived, loadingBay, productPerformance, regionalWarehouse, shipmentPlan (+3 more)

### Community 27 - "check-progress.mjs"
Cohesion: 0.22
Nodes (9): brief, hook, note, noteTime, now, PERSONAL, root, SKIP (+1 more)

### Community 28 - "COMPACTING NOW — what the summary must keep, and what it must drop"
Cohesion: 0.40
Nodes (4): COMPACTING NOW — what the summary must keep, and what it must drop, Drop hard — this is where the waste is, Keep, in this order, Then, immediately after compacting

### Community 29 - "customerBrief.selfcheck.mjs"
Cohesion: 0.18
Nodes (8): bgRe, byGround, edgeRe, inkRe, lines, rows, stack, tally

### Community 30 - "notify"
Cohesion: 0.27
Nodes (6): LazyTabBoundary, canReachInternet(), onlineListeners, setSharedOnline(), subscribeOnline(), useOfflineEngine()

### Community 31 - "eslint-plugin-react-refresh"
Cohesion: 0.11
Nodes (33): L, act(), AreaRow(), Badge(), checkPointInGeoJSON(), compressCoords(), createCustomClusterIcon(), daysAgo() (+25 more)

### Community 32 - "dayStats.selfcheck.mjs"
Cohesion: 0.08
Nodes (48): EODAgentFlow(), readDraft(), summaryRow(), writeDraft(), clampLine(), EODCardDeck(), HINTS, ICONS (+40 more)

### Community 33 - "docChanges.selfcheck.mjs"
Cohesion: 0.10
Nodes (26): CustomerAccessPanel(), OFF_IDS, NO_SHOPS, useDatabaseSync(), accessFor(), canEditShop(), canSeeShop(), filedArea() (+18 more)

### Community 34 - "plan-quota.mjs"
Cohesion: 0.17
Nodes (8): b64(), candidates, connId, mint(), saved, sUsed, weekly, wUsed

### Community 35 - "useTransactionEngine.js"
Cohesion: 0.04
Nodes (42): LOOKS, LAB_ACCESS, LAB_AGENT_TXNS, LAB_CAREER, LAB_CUSTOMERS, LAB_DMG_CG16, LAB_FLEET, LAB_FLEET_CUSTOMERS (+34 more)

### Community 36 - "KPMInventoryApp"
Cohesion: 0.18
Nodes (10): 1. What we are copying, and what we are not, 2. 🔴 THE DECISION THAT SHAPES EVERYTHING — demo data, not live data, 3. Scene format, 4. Prerequisite refactor (small, do it first), 5. Files, 6. Traps specific to THIS codebase, 7. Checks to add with the engine, 8. Build order (+2 more)

### Community 37 - "MapMissionControl.jsx"
Cohesion: 0.11
Nodes (17): Lamp(), CornerSheet(), PhotoField(), WarehouseDeskNav(), data, inside(), photo(), PQ (+9 more)

### Community 39 - "vaultGrace.selfcheck.mjs"
Cohesion: 0.33
Nodes (4): body, fnText, graceIsValid, src

### Community 40 - "CapybaraMascot.jsx"
Cohesion: 0.01
Nodes (195): aA, aB, acceptBody, ACCEPTED, acFrom, acTo, aiv, AIV_ROSTER (+187 more)

### Community 41 - "✅ THE LIGHT DUKE'S LEDGER IS BUILT — 524/524, contrast self-check passes"
Cohesion: 0.00
Nodes (511): 🟡 2026-09-28 17:45 — KPM: two new asks - vault passwords per account, and a biohazard quarantine box, 🟡 2026-09-28 17:50 — KPM: his pick A - a vault password for every person, 🟢 2026-09-28 19:45 — KPM: a vault password for every person, built `7b85941`, 🟡 2026-09-28 20:05 — KPM: his follow-up - T1/T2 reset a person's vault password (double confirm, never set it) + LOCK a person's account, 🟡 2026-09-28 20:59 — KPM: vault reset + account lock BUILT, NOT COMMITTED; he stops for the night, 🟢 2026-09-29 08:25 — KPM: vault reset + account lock COMMITTED `56801d9` (local, not pushed), 🟡 2026-09-29 08:30 — KPM: the biohazard box - three looks on the prototype, his pick owed, 🟡 2026-09-29 08:42 — KPM: look C picked; warehouse quarantine + Gmail move read (no code) (+503 more)

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
Nodes (26): aim(), BEFORE, boxOf(), DemoMission(), FACE, first(), GO, greet() (+18 more)

### Community 48 - "toastSeverity.selfcheck.mjs"
Cohesion: 0.15
Nodes (31): ashtray(), clear(), cyl(), flat_print(), hat(), lathe(), lighter(), lin() (+23 more)

### Community 49 - "notify"
Cohesion: 0.32
Nodes (4): DEMO_CHEST, U, AgentChestStage(), chestOpen()

### Community 50 - "MerchantSalesView.jsx"
Cohesion: 0.22
Nodes (7): css, dark, light, lum(), PAIRS, ratio(), srgb()

### Community 51 - "VaultGate.jsx"
Cohesion: 0.28
Nodes (9): get(), inheritedBy(), nmKey(), nmLabel(), ownerMap(), refusedRows(), set(), storeK() (+1 more)

### Community 52 - "CapybaraMascot.jsx"
Cohesion: 0.25
Nodes (7): includeFiles, maxDuration, crons, functions, api/demo-reset.js, rewrites, $schema

### Community 53 - "helpers.js"
Cohesion: 0.13
Nodes (9): anon, boss, captain, FIRESTORE_RULES, locked, other, sales, STORAGE_RULES (+1 more)

### Community 54 - "RestockVaultView.jsx"
Cohesion: 0.05
Nodes (82): index, point(), VAULT, why(), AcceptanceReceipt(), Money(), DashboardBenchmarks(), groupDigits() (+74 more)

### Community 55 - "postcss"
Cohesion: 0.16
Nodes (18): budi, dewi, eko, logData(), logs(), LOT, lotAndLog(), lotData() (+10 more)

### Community 57 - "StockOpnameView.jsx"
Cohesion: 0.15
Nodes (25): BYPASS_WORD, c3(), CUT_WHY, fmt(), inRect(), items(), LoadingBay(), MOTE_COLORS (+17 more)

### Community 59 - "undef.check.mjs"
Cohesion: 0.29
Nodes (6): BASELINE, eslint, fixed, found, seen, unexpected

### Community 60 - "StockOpnameView.jsx"
Cohesion: 0.17
Nodes (11): name, private, scripts, build, deploy, dev, lint, lint:undef (+3 more)

### Community 61 - "firebase.js"
Cohesion: 0.18
Nodes (24): LandlordDashboard(), canSetBundlePrice, canSetBundleRules, canSwitchBundle, resolveTierOneId(), tierWord(), FleetCanvasManager(), bountyItems() (+16 more)

### Community 62 - "MerchantSalesView.jsx"
Cohesion: 0.14
Nodes (18): acceptBranch(), acceptMaster(), audit(), budi, card(), count(), dewi, mark (+10 more)

### Community 63 - "notify"
Cohesion: 0.11
Nodes (26): center(), MoreKey(), useWide(), act(), AGENT_COLORS, checkPointInGeoJSON(), createJourneyClusterIcon(), getHashColor() (+18 more)

### Community 64 - "PonderOverlay.jsx"
Cohesion: 0.06
Nodes (33): ARMS, BACK, BODY5, chestHtml(), darker(), E12, escTag(), figs (+25 more)

### Community 65 - "salesRollup.js"
Cohesion: 0.11
Nodes (17): blank, done, eightDaysAgo, far, free, HERE, minefar, near (+9 more)

### Community 66 - "context-watch.mjs"
Cohesion: 0.05
Nodes (60): GLYPHS, hhmm(), isWide(), packs(), saleTotal(), SECTION, TodayBook(), INTRO_MIX (+52 more)

### Community 67 - "MerchantSalesView.jsx"
Cohesion: 0.10
Nodes (21): dayWord(), PatchNotesButton(), readSeen(), ProofCamera(), justAfterLocalMidnight, justBeforeLocalMidnight, NOW, rows (+13 more)

### Community 68 - "VaultGate.jsx"
Cohesion: 0.13
Nodes (11): DIR, legacy, outsider, owner, RULES, superA, t2, t2x (+3 more)

### Community 69 - "helpers.js"
Cohesion: 0.67
Nodes (3): AP_ROSTER, apPanel(), apQueue()

### Community 70 - "BiohazardTheme.jsx"
Cohesion: 0.14
Nodes (27): ArrivalScanner(), arrivalsOnHand(), BranchWarehouseManager(), inTransitQty(), middle(), oldestStockDays(), productArrivals(), receiptBlocked() (+19 more)

### Community 71 - "notify"
Cohesion: 0.12
Nodes (19): bez(), capy(), curve(), el(), fmt(), keys(), levelUp(), paint() (+11 more)

### Community 72 - "supply.js"
Cohesion: 0.67
Nodes (3): MP_SHOPS, mpFocus(), mpKey()

### Community 73 - "pc-drag.mjs"
Cohesion: 0.21
Nodes (23): ExamineModal(), START_ROTATION, Cube(), PromoGoods3D, PromoLookFields(), formatAdvancedStock(), isPhone(), ItemInspector() (+15 more)

### Community 74 - "AgentProfileView.jsx"
Cohesion: 0.14
Nodes (21): MissedRow(), NotificationBell(), addMissed(), bellTime(), bindMissed(), clearMissed(), EMPTY, getMissed() (+13 more)

### Community 75 - "MerchantSalesView.jsx"
Cohesion: 0.20
Nodes (10): dailySeries(), CUSTOMERS, day(), fields(), MOTORISTS, PRODUCTS, put(), run() (+2 more)

### Community 77 - "react-leaflet-cluster"
Cohesion: 0.18
Nodes (17): BlastDoors(), done(), EYE_IMG, QuarantineBand(), QuarantineHatch(), runSwitch(), SIGN_IMG, SKIN (+9 more)

### Community 78 - "customerBrief.selfcheck.mjs"
Cohesion: 0.07
Nodes (18): BRANCHES, changes(), failed, fProducts, month, moveP0, now, opensPerDay (+10 more)

### Community 79 - "CustomerManager.jsx"
Cohesion: 0.21
Nodes (11): at(), chrome, errors, ev(), list, log, pend, send() (+3 more)

### Community 80 - "pc-flow.mjs"
Cohesion: 0.19
Nodes (11): chrome, errors, ev(), list, log, pend, send(), shot() (+3 more)

### Community 81 - "DashboardView.jsx"
Cohesion: 0.10
Nodes (43): AuthoritySelect(), HoldButton(), DeviceBand(), PermissionMatrixEditor(), SettingsView(), writeCareerLedger(), writePhotoStorage(), setLang() (+35 more)

### Community 82 - "haResolve"
Cohesion: 0.67
Nodes (3): haApprove(), haKey(), haResolve()

### Community 83 - "KPMInventoryApp"
Cohesion: 0.08
Nodes (58): HistoryReportView(), demoPhoto(), getLang(), canSellBundleAnyShop, capyHoldForSale(), useTransactionEngine(), StoreFocus(), MerchantSalesView() (+50 more)

### Community 84 - "t"
Cohesion: 0.13
Nodes (12): applyLive(), deleteDoc(), found(), getDoc(), getDocs(), listeners, onSnapshot(), record() (+4 more)

### Community 86 - "t"
Cohesion: 0.20
Nodes (20): LABEL, ProductPerformancePanel(), countsAsRevenue(), debtCredit(), isTitip(), outstandingTitip(), soldLinesOf(), dayOf() (+12 more)

### Community 87 - "CapybaraMascot.jsx"
Cohesion: 0.13
Nodes (12): COUNTERS, DIR, KEY, legacy, owner, RULES, stranger, superA (+4 more)

### Community 88 - "AchievementTester.jsx"
Cohesion: 0.14
Nodes (15): ask(), auth, built, call(), COLS, counts(), custom(), db (+7 more)

### Community 89 - "PonderOverlay.jsx"
Cohesion: 0.13
Nodes (15): errs, front(), R, asLeaves(), buildPages(), facingPage(), maxTurnOf(), turnFor() (+7 more)

### Community 90 - "ResidentEvilInventory.jsx"
Cohesion: 0.17
Nodes (20): arrowAt(), cachedIcon(), count(), esc(), ExpeditionLayer(), ExpeditionMini(), ExpeditionPanel(), ExpeditionPeople() (+12 more)

### Community 91 - "FleetCanvasManager.jsx"
Cohesion: 0.12
Nodes (11): DIR, legacy, LOCK, NEW, owner, rina, RULES, t2 (+3 more)

### Community 92 - "demo-seed-from-backup.mjs"
Cohesion: 0.25
Nodes (7): hook, k(), left, lines, pct, CapyTalk(), pick()

### Community 93 - "StockOpnameView.jsx"
Cohesion: 0.11
Nodes (15): A(), alex, DIR, legacy, owner, RULES, seed(), SHOPS (+7 more)

### Community 94 - "SamplingManager.jsx"
Cohesion: 0.33
Nodes (5): DEMO_PLAN_BRANCHES, DEMO_PLAN_ROWS, ShipmentPlanStage(), n(), ShipmentPlanTable()

### Community 95 - "nmKey"
Cohesion: 0.33
Nodes (12): callerOf(), demoKey(), handler(), resetDemo(), same(), upsertLogin(), guestOf(), handler() (+4 more)

### Community 96 - "notify"
Cohesion: 0.17
Nodes (11): audit(), back(), card(), dewi, owner, putBack(), rina, RULES (+3 more)

### Community 97 - "PonderOverlay.jsx"
Cohesion: 0.12
Nodes (13): errs, R, st(), focusOf(), liteOn(), POINT, PonderOverlay(), reduced() (+5 more)

### Community 99 - "formatRupiah"
Cohesion: 0.12
Nodes (12): anon, budi, dewi, dika, lost, other, owner, place() (+4 more)

### Community 100 - "convertToBks"
Cohesion: 0.12
Nodes (16): A(), DIR, general(), offer, offers(), owner, RULES, t2 (+8 more)

### Community 101 - "povPreview.js"
Cohesion: 0.16
Nodes (21): addDays(), atWib(), baseOf(), buildDemoCompany(), dayRound(), hhmm(), line(), PRACTICE (+13 more)

### Community 102 - "expedition.js"
Cohesion: 0.08
Nodes (28): chrome, down(), errors, ev(), gesture(), list, lock, move() (+20 more)

### Community 103 - "pc-fly.mjs"
Cohesion: 0.21
Nodes (11): at(), chrome, errors, ev(), list, log, pend, send() (+3 more)

### Community 105 - "lab-bell.jsx"
Cohesion: 0.16
Nodes (10): boss4, budi, card(), dika, garut4, hendra, load(), rina (+2 more)

### Community 106 - "board.js"
Cohesion: 0.16
Nodes (12): big, line, naive, product, size(), stripped, BODY, drawPrint() (+4 more)

### Community 107 - "SettingsView.jsx"
Cohesion: 0.17
Nodes (11): DIR, expect(), LIST, locked, log(), owner, RULES, stranger (+3 more)

### Community 108 - "pc-land.mjs"
Cohesion: 0.21
Nodes (11): at(), chrome, errors, ev(), list, log, pend, send() (+3 more)

### Community 109 - "demoBuild.check.mjs"
Cohesion: 0.22
Nodes (5): DEMO, DOOR, EMAIL, OFF, REAL

### Community 110 - "main.jsx"
Cohesion: 0.18
Nodes (9): DIR, first, head, newest, progress, second, tmp, transcript() (+1 more)

### Community 111 - "AgentChestStage.jsx"
Cohesion: 0.15
Nodes (29): FolderCard(), BAR, NightReplay(), PART_ORDER, PlayerCard(), PlayerCardHead(), useXpReplay(), XP_SOURCES (+21 more)

### Community 112 - "EODReconciliationView.jsx"
Cohesion: 0.22
Nodes (16): AchievementTester(), BASE_STATS, buildFakeCareer(), fmtValue(), LIVE_ONLY_STATS, ROOT_STATS, careerXP(), checkBadges() (+8 more)

### Community 113 - "pc-hover.mjs"
Cohesion: 0.22
Nodes (8): chrome, drift(), errors, ev(), list, pend, send(), ws

### Community 115 - "ShipmentPlanStage.jsx"
Cohesion: 0.04
Nodes (48): Appearance — deferred on purpose, last, Business track — CLOSED and PARKED, do not reopen, Closed — do not reopen, FIXED 2026-09-20 00:05 — the folder's leaving mark outlived its page (`6379364`) — CONFIRMED 00:15 (*"approve, continue"*), and d7f2193 with it, History - facts only, NOT a prompt to copy, How to measure and propose — the recipe is settled, do not re-derive it, Job 4: AGENT PROFILE on the phone — mount first (2026-09-20 00:20, nothing built yet), NEXT-SESSION archive - NEVER read this file whole; grep it for the one block you need (+40 more)

### Community 116 - "StockStage.jsx"
Cohesion: 0.53
Nodes (4): DEMO_TOTALS, DEMO_WAREHOUSES, scriptedOpen(), StockStage()

### Community 117 - "SamplingManager.jsx"
Cohesion: 0.42
Nodes (7): checkPointInGeoJSON(), FIELD, isPointInPolygon(), clearBorderCache(), loadBorderCache(), openCacheDB(), saveBorderCache()

### Community 119 - "OpnameWorklist.jsx"
Cohesion: 0.17
Nodes (15): react, react, t(), MapTouchGate(), ShopNames(), BookLab(), ControlsLab(), forceHover() (+7 more)

### Community 121 - "useDatabaseSync.js"
Cohesion: 0.19
Nodes (13): ConfirmHost(), ToastHost(), UpdateStatus(), unlockSounds(), onGestureUnlock(), onRegisteredSW(), SOUND_GESTURES, getRegistration() (+5 more)

### Community 122 - "ProductPerformanceStage.jsx"
Cohesion: 0.17
Nodes (9): b, guarded, inventory, messy, ok, rows, sameDay, sd (+1 more)

### Community 123 - "LoadingBayStage.jsx"
Cohesion: 0.19
Nodes (11): chrome, errors, ev(), list, log, pend, send(), shot() (+3 more)

### Community 124 - "fanout-gate-cloud.mjs"
Cohesion: 0.24
Nodes (8): bad, calls, endOfBlock(), endOfString(), his, isHuman(), rows, textOf()

### Community 125 - "react-is"
Cohesion: 0.22
Nodes (9): AgentInventoryView(), Money(), HazardMark(), DIGITS, NixieCount(), isFleetManagementTier(), nixieDigits(), saleLines() (+1 more)

### Community 126 - "main.jsx"
Cohesion: 0.13
Nodes (20): ART, by(), cachedIcon(), CR, DayReplayLayer(), DayReplayPanel(), ease(), esc() (+12 more)

### Community 127 - "lab-bell.jsx"
Cohesion: 0.11
Nodes (12): anon, budi, dewi, dika, lost, other, owner, rina (+4 more)

### Community 128 - "k"
Cohesion: 0.18
Nodes (7): __isUnlocked(), __reset(), ctx(), makeDoc(), played, RateAudio, StubAudio

### Community 129 - "GoodsReceivedStage.jsx"
Cohesion: 0.22
Nodes (5): owner, RULES, t2, t2x, t5

### Community 131 - "PonderPad.jsx"
Cohesion: 0.35
Nodes (9): instant(), liteOn(), pad2(), PonderPad(), reduced(), useDecode(), getScene(), SECTIONS (+1 more)

### Community 133 - "mixedUnits.selfcheck.mjs"
Cohesion: 0.29
Nodes (5): month, outsider, RULES, salesman, tally

### Community 134 - "UpdateStatus.jsx"
Cohesion: 0.22
Nodes (7): a, b, fall, h, has, map, want

### Community 135 - "fanout-gate-cloud.test.mjs"
Cohesion: 0.29
Nodes (3): dir, gate, t

### Community 137 - "useSound.selfcheck.mjs"
Cohesion: 0.12
Nodes (14): restorableBorders(), agents, backup, BORDER_KEYS, droppedKeys, folders, mapBorders, PRICES (+6 more)

### Community 138 - "demo-reset.js"
Cohesion: 0.32
Nodes (11): eodDay(), expedition(), his(), metres(), pin(), getLocalDayKey(), at(), km() (+3 more)

### Community 139 - "useOfflineEngine"
Cohesion: 0.13
Nodes (21): BOOST, boostElement(), buildGainStage(), CAPY_PHRASES, CAPY_QUIET, capyGate, capyPhrase(), initSounds() (+13 more)

### Community 140 - "ConfirmGate.jsx"
Cohesion: 0.14
Nodes (20): AgentProfileView(), BADGE_CATEGORIES, createImage(), DynamicIconMap, getCroppedImg(), CareerDevTools(), DEFAULT_RANKS, BADGE_SOURCES (+12 more)

### Community 141 - "_demoFaces.js"
Cohesion: 0.33
Nodes (5): BG, face(), FACES, HAIR, SKIN

### Community 153 - "toastSeverity.selfcheck.mjs"
Cohesion: 0.40
Nodes (4): FAILURE_STRIPS, MASCOT_CHATTER, MASCOT_FAILURES, SUCCESSES

### Community 154 - "mkcyi.mjs"
Cohesion: 0.29
Nodes (5): fall, has, j, map, want

### Community 155 - "SaleReceipt.jsx"
Cohesion: 0.67
Nodes (3): Drawer(), n(), StockByWarehouseTable()

### Community 157 - "useOfflineEngine"
Cohesion: 0.12
Nodes (26): BiohazardTheme(), BULAN, LiteStatusLine(), PEEK_TEXT, REEL, ask(), CARD, DemoBar() (+18 more)

### Community 162 - "test-agent-chest.mjs"
Cohesion: 0.25
Nodes (4): LAYOUT, PEOPLE, RULES, VANS

### Community 167 - "elder.mjs"
Cohesion: 0.22
Nodes (8): errs, ev(), fails, proc, send(), tall, wait, ws

### Community 169 - "NixieCount.jsx"
Cohesion: 0.22
Nodes (9): DEMO_BAY, DEMO_BAY_FAILED, DEMO_BAY_PLAN, DEMO_BAY_PRESET, U, landed(), LINES, LoadingBayStage() (+1 more)

### Community 170 - "notify"
Cohesion: 0.53
Nodes (5): NEW_LINE, NEW_RULES, PromoBundleFields(), bundleRuleWords(), bundleTiers()

### Community 171 - "convertToBks"
Cohesion: 0.25
Nodes (7): back(), bksPerUnit(), cello, custom, d, real, totalBks()

### Community 172 - "autoprefixer"
Cohesion: 0.36
Nodes (8): add(), at(), buf(), env(), finish(), noise(), SOUNDS, tone()

### Community 173 - "SaleReceipt.jsx"
Cohesion: 0.42
Nodes (6): clampZoom(), ReceiptPreview(), SAMPLE_ROWS, SaleReceipt(), WATERMARK_STYLE, watermarkFrom()

### Community 177 - "main.jsx"
Cohesion: 0.13
Nodes (31): AuditVaultView(), confirmAction(), promptAction(), CrownTransferProtocol(), CustomerDetailView(), CustomerManagement(), SamplingCartView(), shareReceipt() (+23 more)

### Community 178 - "ProductPerformanceStage.jsx"
Cohesion: 0.39
Nodes (5): DEMO_PERFORMANCE_ROWS, ProductPerformanceStage(), n(), ProductPerformanceTable(), rp()

### Community 180 - "SamplingManager.jsx"
Cohesion: 0.40
Nodes (4): formatSampleQty(), SampleEntryModal(), SamplingAnalyticsView(), SamplingFolderView()

### Community 181 - "phone"
Cohesion: 0.40
Nodes (5): phone(), resetVan(), setStock(), stockOf(), vanQty()

### Community 189 - "openApp"
Cohesion: 0.67
Nodes (3): listenerSet(), openApp(), tg()

## Knowledge Gaps
- **1758 isolated node(s):** `root`, `note`, `brief`, `hook`, `now` (+1753 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **35 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `MerchantSalesView()` connect `KPMInventoryApp` to `App.jsx`, `demo-reset.js`, `CustomerManager.jsx`, `useOfflineEngine`, `ConfirmGate.jsx`, `useTransactionEngine.js`, `convertToBks`, `main.jsx`, `SamplingManager.jsx`, `phone`, `RestockVaultView.jsx`, `notify`, `MerchantSalesView.jsx`, `BiohazardTheme.jsx`, `notify`, `pc-drag.mjs`, `DashboardView.jsx`, `t`, `expedition.js`, `OpnameWorklist.jsx`, `useDatabaseSync.js`?**
  _High betweenness centrality (0.026) - this node is a cross-community bridge._
- **Why does `t()` connect `OpnameWorklist.jsx` to `App.jsx`, `PonderPad.jsx`, `demo-reset.js`, `CustomerManager.jsx`, `ConfirmGate.jsx`, `eslint-plugin-react-refresh`, `dayStats.selfcheck.mjs`, `docChanges.selfcheck.mjs`, `useTransactionEngine.js`, `dayStats.selfcheck.mjs`, `main.jsx`, `VaultGate.jsx`, `SamplingManager.jsx`, `RestockVaultView.jsx`, `firebase.js`, `notify`, `context-watch.mjs`, `BiohazardTheme.jsx`, `notify`, `AgentProfileView.jsx`, `MerchantSalesView.jsx`, `react-leaflet-cluster`, `KPMInventoryApp`, `t`, `PonderOverlay.jsx`, `ResidentEvilInventory.jsx`, `expedition.js`, `AgentChestStage.jsx`, `useDatabaseSync.js`, `main.jsx`?**
  _High betweenness centrality (0.025) - this node is a cross-community bridge._
- **Why does `devDependencies` connect `devDependencies` to `test-seat-limit.mjs`, `eslint-plugin-react-refresh`, `StockOpnameView.jsx`, `txSize.selfcheck.mjs`?**
  _High betweenness centrality (0.022) - this node is a cross-community bridge._
- **Are the 10 inferred relationships involving `KPMInventoryApp()` (e.g. with `face()` and `logData()`) actually correct?**
  _`KPMInventoryApp()` has 10 INFERRED edges - model-reasoned connections that need verification._
- **Are the 11 inferred relationships involving `MerchantSalesView()` (e.g. with `up()` and `el()`) actually correct?**
  _`MerchantSalesView()` has 11 INFERRED edges - model-reasoned connections that need verification._
- **What connects `root`, `note`, `brief` to the rest of the system?**
  _1758 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `App.jsx` be split into smaller, more focused modules?**
  _Cohesion score 0.05608322026232474 - nodes in this community are weakly interconnected._