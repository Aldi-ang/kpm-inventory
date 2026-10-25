# Graph Report - kpm-inventory-main  (2026-10-25)

## Corpus Check
- 264 files · ~1,398,655 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 2889 nodes · 5292 edges · 157 communities (122 shown, 35 thin omitted)
- Extraction: 96% EXTRACTED · 4% INFERRED · 0% AMBIGUOUS · INFERRED: 199 edges (avg confidence: 0.77)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `1e391938`
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
- VaultGate.jsx
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
- expedition.js
- pc-fly.mjs
- lab-bell.jsx
- useSound.selfcheck.mjs
- postcss
- pc-land.mjs
- demoBuild.check.mjs
- eslint-plugin-react-hooks
- pc-hover.mjs
- ShipmentPlanStage.jsx
- StockStage.jsx
- react-easy-crop
- LoadingBayStage.jsx
- k
- AcceptanceReceipt.jsx
- LoadingBayStage.jsx
- fanout-gate-cloud.mjs
- react-is
- main.jsx
- capyVoice.js
- k
- A
- mixedUnits.selfcheck.mjs
- UpdateStatus.jsx
- fanout-gate-cloud.test.mjs
- navfix.mjs
- wheel.mjs
- cloud-start.mjs
- test-agent-chest.mjs
- interact.mjs
- intro.mjs
- fixes.mjs
- end.mjs
- ho.mjs
- omz.mjs
- sel.mjs
- term.mjs
- jsbarcode
- mkcyi.mjs
- cdp.mjs
- @eslint/js
- serve.mjs
- outfits.sh
- retry.sh
- autoprefixer
- @vitejs/plugin-basic-ssl
- gen.mjs
- lab-bell.jsx
- nav.mjs
- phone
- AcceptanceReceipt.jsx
- listenerSet
- cross-env

## God Nodes (most connected - your core abstractions)
1. `PROGRESS — read this, search for nothing` - 310 edges
2. `KPMInventoryApp()` - 71 edges
3. `notify()` - 66 edges
4. `t()` - 49 edges
5. `convertToBks()` - 48 edges
6. `confirmAction()` - 47 edges
7. `MerchantSalesView()` - 42 edges
8. `formatRupiah()` - 39 edges
9. `storeKey()` - 37 edges
10. `The one job` - 37 edges

## Surprising Connections (you probably didn't know these)
- `CapyTalk()` --indirect_call--> `k()`  [INFERRED]
  src/components/DemoMission.jsx → .claude/context-watch.mjs
- `pick()` --indirect_call--> `k()`  [INFERRED]
  tools/demo-seed-from-backup.mjs → .claude/context-watch.mjs
- `KPMInventoryApp()` --indirect_call--> `face()`  [INFERRED]
  src/App.jsx → api/_demoFaces.js
- `CustomerAccessPanel()` --indirect_call--> `changes()`  [INFERRED]
  src/components/CustomerAccessPanel.jsx → load-test/hundred-users.mjs
- `stampsOwed()` --indirect_call--> `val()`  [INFERRED]
  src/config/logicFixes.selfcheck.mjs → tools/seed-emulator.mjs

## Import Cycles
- None detected.

## Communities (157 total, 35 thin omitted)

### Community 0 - "App.jsx"
Cohesion: 0.06
Nodes (50): AgentInventoryView, AgentProfileView, AuditVaultView, BranchWarehouseManager, ConsignmentFinanceView, CustomerManagement, DashboardView, EODReconciliationView (+42 more)

### Community 1 - "MapMissionControl.jsx"
Cohesion: 0.50
Nodes (3): F — Phone, G — Nothing old was lost, KPM Sales Terminal — test results

### Community 2 - "dependencies"
Cohesion: 0.09
Nodes (23): @emailjs/browser, firebase, firebase-admin, framer-motion, idb, leaflet, lucide-react, dependencies (+15 more)

### Community 3 - "CustomerManager.jsx"
Cohesion: 0.33
Nodes (5): auth, db, googleProvider, PROXIED_AUTH_HOSTS, storage

### Community 4 - "devDependencies"
Cohesion: 0.09
Nodes (23): autoprefixer, eslint, eslint-plugin-react-hooks, eslint-plugin-react-refresh, globals, devDependencies, autoprefixer, eslint (+15 more)

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
Cohesion: 0.15
Nodes (19): customers, d, jv, logs, man, quick, sc, stops (+11 more)

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
Cohesion: 0.50
Nodes (3): Context Navigation (3-layer rule), graphify, Publishing (a push IS the live app)

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
Nodes (205): allJs, allowedHex, app, appCode, appCrossed, appFiles, appSrc, archEnd (+197 more)

### Community 25 - "Sales Terminal — test list"
Cohesion: 0.13
Nodes (14): A. The shelf, B. The rail (desktop, wide window), C. The customer brief, D. Money — the part that must be exactly right, E. The merchant, F. Phone (narrow the browser, or use your phone), G. Nothing old was lost, H. Territory and duplicate outlets — built 2026-08-07 (+6 more)

### Community 26 - "LOG — newest first, older entries live in `git log` for this file"
Cohesion: 0.13
Nodes (12): SCENES, STAGES, agentChest, goodsReceived, loadingBay, productPerformance, regionalWarehouse, shipmentPlan (+4 more)

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
Cohesion: 0.17
Nodes (27): add(), add2(), bell(), chipSyllable(), consonant(), fn(), hall(), intro() (+19 more)

### Community 31 - "eslint-plugin-react-refresh"
Cohesion: 0.09
Nodes (38): L, status(), store(), StoreFocus(), act(), AreaRow(), Badge(), checkPointInGeoJSON() (+30 more)

### Community 32 - "dayStats.selfcheck.mjs"
Cohesion: 0.08
Nodes (47): EODAgentFlow(), readDraft(), summaryRow(), writeDraft(), clampLine(), EODCardDeck(), HINTS, ICONS (+39 more)

### Community 33 - "docChanges.selfcheck.mjs"
Cohesion: 0.16
Nodes (11): b, guarded, inventory, messy, ok, rows, sameDay, sd (+3 more)

### Community 34 - "plan-quota.mjs"
Cohesion: 0.17
Nodes (8): b64(), candidates, connId, mint(), saved, sUsed, weekly, wUsed

### Community 35 - "useTransactionEngine.js"
Cohesion: 0.05
Nodes (40): ArrivalScanner(), ExamineModal(), START_ROTATION, ShipmentLabel(), LOOKS, BookLab(), forceHover(), LAB_ACCESS (+32 more)

### Community 36 - "KPMInventoryApp"
Cohesion: 0.18
Nodes (10): 1. What we are copying, and what we are not, 2. 🔴 THE DECISION THAT SHAPES EVERYTHING — demo data, not live data, 3. Scene format, 4. Prerequisite refactor (small, do it first), 5. Files, 6. Traps specific to THIS codebase, 7. Checks to add with the engine, 8. Build order (+2 more)

### Community 37 - "MapMissionControl.jsx"
Cohesion: 0.11
Nodes (19): Lamp(), CornerSheet(), PhotoField(), WarehouseDeskNav(), data, inside(), photo(), PQ (+11 more)

### Community 39 - "vaultGrace.selfcheck.mjs"
Cohesion: 0.33
Nodes (4): body, fnText, graceIsValid, src

### Community 40 - "CapybaraMascot.jsx"
Cohesion: 0.01
Nodes (194): aA, aB, acceptBody, ACCEPTED, acFrom, acTo, aiv, AIV_ROSTER (+186 more)

### Community 41 - "✅ THE LIGHT DUKE'S LEDGER IS BUILT — 524/524, contrast self-check passes"
Cohesion: 0.01
Nodes (310): 🟡 2026-09-28 17:45 — KPM: two new asks - vault passwords per account, and a biohazard quarantine box, 🟡 2026-09-28 17:50 — KPM: his pick A - a vault password for every person, 🟢 2026-09-28 19:45 — KPM: a vault password for every person, built `7b85941`, 🟡 2026-09-28 20:05 — KPM: his follow-up - T1/T2 reset a person's vault password (double confirm, never set it) + LOCK a person's account, 🟡 2026-09-28 20:59 — KPM: vault reset + account lock BUILT, NOT COMMITTED; he stops for the night, 🟢 2026-09-29 08:25 — KPM: vault reset + account lock COMMITTED `56801d9` (local, not pushed), 🟡 2026-09-29 08:30 — KPM: the biohazard box - three looks on the prototype, his pick owed, 🟡 2026-09-29 08:42 — KPM: look C picked; warehouse quarantine + Gmail move read (no code) (+302 more)

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
Cohesion: 0.09
Nodes (24): CapyTalk(), DemoMission(), FACE, linesFor(), load(), PLACE, save(), GLYPHS (+16 more)

### Community 47 - "nextStop.js"
Cohesion: 0.04
Nodes (46): Appearance — deferred on purpose, last, Business track — CLOSED and PARKED, do not reopen, Closed — do not reopen, FIXED 2026-09-20 00:05 — the folder's leaving mark outlived its page (`6379364`) — CONFIRMED 00:15 (*"approve, continue"*), and d7f2193 with it, History - facts only, NOT a prompt to copy, How to measure and propose — the recipe is settled, do not re-derive it, Job 4: AGENT PROFILE on the phone — mount first (2026-09-20 00:20, nothing built yet), Paste this to start the next session (+38 more)

### Community 48 - "toastSeverity.selfcheck.mjs"
Cohesion: 0.13
Nodes (10): deleteDoc(), found(), getDoc(), getDocs(), onSnapshot(), record(), runTransaction(), snap() (+2 more)

### Community 49 - "notify"
Cohesion: 0.30
Nodes (9): AuditVaultView(), HistoryReportView(), BorderImporter(), TierAutomationEngine(), commitInChunks(), statsPath(), statsWrite(), tallySaleOp() (+1 more)

### Community 50 - "MerchantSalesView.jsx"
Cohesion: 0.22
Nodes (7): css, dark, light, lum(), PAIRS, ratio(), srgb()

### Community 51 - "VaultGate.jsx"
Cohesion: 0.50
Nodes (5): inheritedBy(), ownerMap(), refusedRows(), storeK(), visibleTo()

### Community 52 - "CapybaraMascot.jsx"
Cohesion: 0.25
Nodes (7): includeFiles, maxDuration, crons, functions, api/demo-reset.js, rewrites, $schema

### Community 53 - "helpers.js"
Cohesion: 0.06
Nodes (53): DashboardBenchmarks(), groupDigits(), pct(), toBal(), DashboardView(), SERIES, share(), o() (+45 more)

### Community 54 - "RestockVaultView.jsx"
Cohesion: 0.60
Nodes (4): areaFromPin(), checkPointInGeoJSON(), FIELD, isPointInPolygon()

### Community 55 - "postcss"
Cohesion: 0.17
Nodes (20): arrowAt(), cachedIcon(), count(), esc(), ExpeditionLayer(), ExpeditionMini(), ExpeditionPanel(), ExpeditionPeople() (+12 more)

### Community 57 - "StockOpnameView.jsx"
Cohesion: 0.11
Nodes (23): LazyTabBoundary, big, line, naive, product, size(), stripped, canReachInternet() (+15 more)

### Community 59 - "undef.check.mjs"
Cohesion: 0.29
Nodes (6): BASELINE, eslint, fixed, found, seen, unexpected

### Community 60 - "StockOpnameView.jsx"
Cohesion: 0.17
Nodes (11): name, private, scripts, build, deploy, dev, lint, lint:undef (+3 more)

### Community 61 - "firebase.js"
Cohesion: 0.10
Nodes (28): center(), useWide(), act(), AGENT_COLORS, checkPointInGeoJSON(), createJourneyClusterIcon(), getHashColor(), getStoreHierarchy() (+20 more)

### Community 62 - "MerchantSalesView.jsx"
Cohesion: 0.13
Nodes (18): dailySeries(), CUSTOMERS, day(), fields(), MOTORISTS, PRODUCTS, put(), run() (+10 more)

### Community 63 - "notify"
Cohesion: 0.26
Nodes (12): CustomerDetailView(), CustomerManagement(), MoreKey(), getCustomerAccessLevel(), grosirRequestNotice(), createdMillis(), findDuplicates(), groupKey() (+4 more)

### Community 64 - "PonderOverlay.jsx"
Cohesion: 0.06
Nodes (30): ARMS, BACK, BODY5, darker(), E12, figs, FREE, FRONT (+22 more)

### Community 65 - "salesRollup.js"
Cohesion: 0.11
Nodes (16): blank, done, eightDaysAgo, far, free, HERE, minefar, near (+8 more)

### Community 66 - "context-watch.mjs"
Cohesion: 0.05
Nodes (76): callerOf(), demoKey(), handler(), resetDemo(), same(), upsertLogin(), guestOf(), handler() (+68 more)

### Community 67 - "MerchantSalesView.jsx"
Cohesion: 0.11
Nodes (29): BiohazardTheme(), BULAN, LiteStatusLine(), REEL, ask(), CARD, DemoBar(), DemoDoor() (+21 more)

### Community 68 - "VaultGate.jsx"
Cohesion: 0.13
Nodes (11): DIR, legacy, outsider, owner, RULES, superA, t2, t2x (+3 more)

### Community 69 - "helpers.js"
Cohesion: 0.67
Nodes (3): AP_ROSTER, apPanel(), apQueue()

### Community 70 - "BiohazardTheme.jsx"
Cohesion: 0.11
Nodes (41): AgentInventoryView(), Money(), FolderCard(), DIGITS, NixieCount(), BAR, PART_ORDER, PlayerCard() (+33 more)

### Community 71 - "notify"
Cohesion: 0.12
Nodes (23): ART, by(), cachedIcon(), CR, DayReplayLayer(), DayReplayPanel(), ease(), esc() (+15 more)

### Community 72 - "supply.js"
Cohesion: 0.67
Nodes (3): MP_SHOPS, mpFocus(), mpKey()

### Community 74 - "AgentProfileView.jsx"
Cohesion: 0.18
Nodes (17): MissedRow(), NotificationBell(), addMissed(), bellTime(), bindMissed(), clearMissed(), EMPTY, getMissed() (+9 more)

### Community 75 - "MerchantSalesView.jsx"
Cohesion: 0.26
Nodes (15): DAMAGE_REASONS, damageBlocked(), damageSorted(), isLeak(), recountState(), samePass(), shortageStreak(), StockOpnameView() (+7 more)

### Community 77 - "react-leaflet-cluster"
Cohesion: 0.20
Nodes (10): react, react, MapTouchGate(), Drawer(), n(), StockByWarehouseTable(), ControlsLab(), Lab() (+2 more)

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
Cohesion: 0.13
Nodes (18): bez(), capy(), curve(), el(), fmt(), keys(), levelUp(), paint() (+10 more)

### Community 82 - "haResolve"
Cohesion: 0.67
Nodes (3): haApprove(), haKey(), haResolve()

### Community 83 - "KPMInventoryApp"
Cohesion: 0.14
Nodes (15): ConfirmHost(), ToastHost(), UpdateStatus(), FAILURE_STRIPS, MASCOT_CHATTER, MASCOT_FAILURES, SUCCESSES, onRegisteredSW() (+7 more)

### Community 84 - "t"
Cohesion: 0.05
Nodes (67): hook, k(), left, lines, pct, chrome, down(), errors (+59 more)

### Community 86 - "VaultGate.jsx"
Cohesion: 0.21
Nodes (18): CustomerAccessPanel(), OFF_IDS, NO_SHOPS, useDatabaseSync(), accessFor(), canEditShop(), canSeeShop(), filedArea() (+10 more)

### Community 87 - "CapybaraMascot.jsx"
Cohesion: 0.13
Nodes (12): COUNTERS, DIR, KEY, legacy, owner, RULES, stranger, superA (+4 more)

### Community 88 - "AchievementTester.jsx"
Cohesion: 0.14
Nodes (14): ask(), auth, built, call(), COLS, custom(), db, expected (+6 more)

### Community 89 - "PonderOverlay.jsx"
Cohesion: 0.16
Nodes (20): playSound(), asLeaves(), buildPages(), facingPage(), maxTurnOf(), turnFor(), ICONS, Library() (+12 more)

### Community 90 - "ResidentEvilInventory.jsx"
Cohesion: 0.27
Nodes (10): clampZoom(), ReceiptPreview(), SAMPLE_ROWS, SaleReceipt(), shareReceipt(), WATERMARK_STYLE, watermarkFrom(), waNumber() (+2 more)

### Community 91 - "FleetCanvasManager.jsx"
Cohesion: 0.12
Nodes (11): DIR, legacy, LOCK, NEW, owner, rina, RULES, t2 (+3 more)

### Community 92 - "demo-seed-from-backup.mjs"
Cohesion: 0.12
Nodes (13): agents, backup, BORDER_KEYS, droppedKeys, folders, mapBorders, pick(), PRICES (+5 more)

### Community 93 - "StockOpnameView.jsx"
Cohesion: 0.11
Nodes (15): A(), alex, DIR, legacy, owner, RULES, seed(), SHOPS (+7 more)

### Community 94 - "SamplingManager.jsx"
Cohesion: 0.33
Nodes (5): DEMO_PLAN_BRANCHES, DEMO_PLAN_ROWS, ShipmentPlanStage(), n(), ShipmentPlanTable()

### Community 96 - "notify"
Cohesion: 0.22
Nodes (9): DEMO_BAY, DEMO_BAY_FAILED, DEMO_BAY_PLAN, DEMO_BAY_PRESET, U, landed(), LINES, LoadingBayStage() (+1 more)

### Community 97 - "PonderOverlay.jsx"
Cohesion: 0.19
Nodes (10): focusOf(), liteOn(), POINT, PonderOverlay(), reduced(), TONE_EDGE, TONE_RING, TONE_RULE (+2 more)

### Community 102 - "expedition.js"
Cohesion: 0.50
Nodes (7): instant(), liteOn(), pad2(), PonderPad(), reduced(), useDecode(), getScene()

### Community 103 - "pc-fly.mjs"
Cohesion: 0.21
Nodes (11): at(), chrome, errors, ev(), list, log, pend, send() (+3 more)

### Community 105 - "lab-bell.jsx"
Cohesion: 0.17
Nodes (24): arrivalsOnHand(), BranchWarehouseManager(), inTransitQty(), middle(), oldestStockDays(), productArrivals(), receiptBlocked(), receiptDisputed() (+16 more)

### Community 106 - "useSound.selfcheck.mjs"
Cohesion: 0.18
Nodes (7): __isUnlocked(), __reset(), ctx(), makeDoc(), played, RateAudio, StubAudio

### Community 108 - "pc-land.mjs"
Cohesion: 0.21
Nodes (11): at(), chrome, errors, ev(), list, log, pend, send() (+3 more)

### Community 109 - "demoBuild.check.mjs"
Cohesion: 0.22
Nodes (5): DEMO, DOOR, EMAIL, OFF, REAL

### Community 113 - "pc-hover.mjs"
Cohesion: 0.22
Nodes (8): chrome, drift(), errors, ev(), list, pend, send(), ws

### Community 115 - "ShipmentPlanStage.jsx"
Cohesion: 0.08
Nodes (26): ch, chestRecording(), convolve(), decode(), dry, end0, fade, fft() (+18 more)

### Community 116 - "StockStage.jsx"
Cohesion: 0.53
Nodes (4): DEMO_TOTALS, DEMO_WAREHOUSES, scriptedOpen(), StockStage()

### Community 119 - "LoadingBayStage.jsx"
Cohesion: 0.19
Nodes (15): AuthoritySelect(), confirmAction(), CrownTransferProtocol(), HoldButton(), PermissionMatrixEditor(), SettingsView(), writeCareerLedger(), writePhotoStorage() (+7 more)

### Community 120 - "k"
Cohesion: 0.13
Nodes (35): promptAction(), PlayerCardHead(), judge(), pickerShows(), writeApproval(), branchIsDelegated(), canApproveHandoffFrom(), canEditFleetRoster() (+27 more)

### Community 121 - "AcceptanceReceipt.jsx"
Cohesion: 0.26
Nodes (11): state(), shop(), eodDay(), expedition(), his(), metres(), pin(), at() (+3 more)

### Community 123 - "LoadingBayStage.jsx"
Cohesion: 0.19
Nodes (11): chrome, errors, ev(), list, log, pend, send(), shot() (+3 more)

### Community 124 - "fanout-gate-cloud.mjs"
Cohesion: 0.24
Nodes (8): bad, calls, endOfBlock(), endOfString(), his, isHuman(), rows, textOf()

### Community 126 - "main.jsx"
Cohesion: 0.10
Nodes (25): CapybaraMascot(), LOCKED_MESSAGES, LOGGED_IN_MESSAGES, NO_MESSAGES, CAPY_ONSETS, CAPY_VOICE, CAPY_VOWELS, capyFile() (+17 more)

### Community 127 - "capyVoice.js"
Cohesion: 0.17
Nodes (11): DIR, expect(), LIST, locked, log(), owner, RULES, stranger (+3 more)

### Community 130 - "k"
Cohesion: 0.24
Nodes (15): ProofCamera(), MerchantSalesView(), readDraft(), canConfirmGrosir(), grosirHold(), reorderFromLast(), agoLabel(), paymentLabel() (+7 more)

### Community 133 - "mixedUnits.selfcheck.mjs"
Cohesion: 0.29
Nodes (5): month, outsider, RULES, salesman, tally

### Community 134 - "UpdateStatus.jsx"
Cohesion: 0.22
Nodes (7): a, b, fall, h, has, map, want

### Community 135 - "fanout-gate-cloud.test.mjs"
Cohesion: 0.29
Nodes (3): dir, gate, t

### Community 137 - "wheel.mjs"
Cohesion: 0.29
Nodes (3): errs, front(), R

### Community 138 - "cloud-start.mjs"
Cohesion: 0.40
Nodes (4): index, point(), VAULT, why()

### Community 140 - "test-agent-chest.mjs"
Cohesion: 0.25
Nodes (4): LAYOUT, PEOPLE, RULES, VANS

### Community 154 - "mkcyi.mjs"
Cohesion: 0.29
Nodes (5): fall, has, j, map, want

### Community 166 - "lab-bell.jsx"
Cohesion: 0.24
Nodes (9): formatAdvancedStock(), isPhone(), ItemInspector(), ResidentEvilInventory(), ago(), LAB_BELL_NEEDS, LAB_MISSED, sec() (+1 more)

### Community 167 - "nav.mjs"
Cohesion: 0.33
Nodes (3): errs, R, st()

### Community 168 - "phone"
Cohesion: 0.40
Nodes (5): phone(), resetVan(), setStock(), stockOf(), vanQty()

### Community 171 - "listenerSet"
Cohesion: 0.67
Nodes (3): listenerSet(), openApp(), tg()

## Knowledge Gaps
- **1416 isolated node(s):** `root`, `note`, `brief`, `hook`, `now` (+1411 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **35 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `MerchantSalesView()` connect `k` to `CustomerManager.jsx`, `eslint-plugin-react-refresh`, `docChanges.selfcheck.mjs`, `useTransactionEngine.js`, `phone`, `helpers.js`, `RestockVaultView.jsx`, `StockOpnameView.jsx`, `firebase.js`, `notify`, `MerchantSalesView.jsx`, `BiohazardTheme.jsx`, `MerchantSalesView.jsx`, `react-leaflet-cluster`, `DashboardView.jsx`, `t`, `PonderOverlay.jsx`, `ResidentEvilInventory.jsx`, `k`, `main.jsx`?**
  _High betweenness centrality (0.029) - this node is a cross-community bridge._
- **Why does `devDependencies` connect `devDependencies` to `@vitejs/plugin-basic-ssl`, `postcss`, `cross-env`, `StockOpnameView.jsx`, `@eslint/js`?**
  _High betweenness centrality (0.024) - this node is a cross-community bridge._
- **Why does `notify()` connect `MerchantSalesView.jsx` to `App.jsx`, `k`, `CustomerManager.jsx`, `eslint-plugin-react-refresh`, `useTransactionEngine.js`, `lab-bell.jsx`, `dayStats.selfcheck.mjs`, `notify`, `StockOpnameView.jsx`, `firebase.js`, `notify`, `context-watch.mjs`, `BiohazardTheme.jsx`, `AgentProfileView.jsx`, `MerchantSalesView.jsx`, `KPMInventoryApp`, `VaultGate.jsx`, `ResidentEvilInventory.jsx`, `lab-bell.jsx`, `LoadingBayStage.jsx`, `k`?**
  _High betweenness centrality (0.017) - this node is a cross-community bridge._
- **Are the 7 inferred relationships involving `KPMInventoryApp()` (e.g. with `face()` and `getDocOfflineSafe()`) actually correct?**
  _`KPMInventoryApp()` has 7 INFERRED edges - model-reasoned connections that need verification._
- **Are the 48 inferred relationships involving `t()` (e.g. with `curve()` and `AgentProfileView()`) actually correct?**
  _`t()` has 48 INFERRED edges - model-reasoned connections that need verification._
- **What connects `root`, `note`, `brief` to the rest of the system?**
  _1416 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `App.jsx` be split into smaller, more focused modules?**
  _Cohesion score 0.059887005649717516 - nodes in this community are weakly interconnected._