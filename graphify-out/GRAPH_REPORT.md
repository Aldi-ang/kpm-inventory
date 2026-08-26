# Graph Report - kpm-inventory-main  (2026-08-26)

## Corpus Check
- 114 files · ~695,123 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1007 nodes · 1823 edges · 57 communities (52 shown, 5 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 25 edges (avg confidence: 0.78)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `1c884389`
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
- dayStats.selfcheck.mjs
- nextStop.js
- nextStop.js
- StubAudio
- MerchantSalesView.jsx
- VaultGate.jsx
- context-watch.mjs
- CapybaraMascot.jsx
- firebase.js
- notify
- MapMissionControl.jsx

## God Nodes (most connected - your core abstractions)
1. `notify()` - 43 edges
2. `KPMInventoryApp()` - 39 edges
3. `confirmAction()` - 37 edges
4. `formatRupiah()` - 29 edges
5. `convertToBks()` - 29 edges
6. `PROGRESS — read this, search for nothing` - 25 edges
7. `MerchantSalesView()` - 24 edges
8. `getLocalDayKey()` - 24 edges
9. `StockOpnameView()` - 22 edges
10. `storeKey()` - 22 edges

## Surprising Connections (you probably didn't know these)
- `JourneyView()` --indirect_call--> `k()`  [INFERRED]
  src/JourneyView.jsx → .claude/context-watch.mjs
- `AuthoritySelect()` --indirect_call--> `k()`  [INFERRED]
  src/components/AuthoritySelect.jsx → .claude/context-watch.mjs
- `KPMInventoryApp()` --references--> `react`  [EXTRACTED]
  src/App.jsx → package.json
- `MapRecenter()` --references--> `react`  [EXTRACTED]
  src/JourneyView.jsx → package.json
- `MerchantSalesView()` --references--> `react`  [EXTRACTED]
  src/MerchantSalesView.jsx → package.json

## Import Cycles
- None detected.

## Communities (57 total, 5 thin omitted)

### Community 0 - "App.jsx"
Cohesion: 0.08
Nodes (27): AgentInventoryView, AgentProfileView, BranchWarehouseManager, ConsignmentFinanceView, DashboardView, EODReconciliationView, FleetCanvasManager, HistoryReportView (+19 more)

### Community 1 - "MapMissionControl.jsx"
Cohesion: 0.50
Nodes (3): F — Phone, G — Nothing old was lost, KPM Sales Terminal — test results

### Community 2 - "dependencies"
Cohesion: 0.06
Nodes (33): @emailjs/browser, firebase, idb, leaflet, lucide-react, dependencies, @emailjs/browser, firebase (+25 more)

### Community 3 - "CustomerManager.jsx"
Cohesion: 0.28
Nodes (7): FADE, MASCOT_CHATTER, MASCOT_FAILURES, report(), STICKY, isFailure(), isSticky()

### Community 4 - "devDependencies"
Cohesion: 0.06
Nodes (31): autoprefixer, cross-env, eslint, @eslint/js, eslint-plugin-react-hooks, eslint-plugin-react-refresh, globals, devDependencies (+23 more)

### Community 5 - "mixedUnits.selfcheck.mjs"
Cohesion: 0.11
Nodes (16): blank, done, eightDaysAgo, far, free, HERE, minefar, near (+8 more)

### Community 6 - "savePhotoAndGetReference"
Cohesion: 0.13
Nodes (23): ConfirmHost(), ToastHost(), BOOST, boostElement(), buildGainStage(), initSounds(), __isUnlocked(), liteModeOn() (+15 more)

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
Cohesion: 0.29
Nodes (6): big, line, naive, product, size(), stripped

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
Nodes (121): allJs, allowedHex, app, appCode, appCrossed, appFiles, appSrc, archEnd (+113 more)

### Community 25 - "Sales Terminal — test list"
Cohesion: 0.13
Nodes (14): A. The shelf, B. The rail (desktop, wide window), C. The customer brief, D. Money — the part that must be exactly right, E. The merchant, F. Phone (narrow the browser, or use your phone), G. Nothing old was lost, H. Territory and duplicate outlets — built 2026-08-07 (+6 more)

### Community 26 - "LOG — newest first, older entries live in `git log` for this file"
Cohesion: 0.35
Nodes (9): PovBanner(), TierPovSwitch(), CORPORATE_TIERS, previewIdentity(), TEST_ACCOUNTS, testAccountDoc(), testAccountFor(), testAccountName() (+1 more)

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
Cohesion: 0.15
Nodes (14): BiohazardTheme(), BULAN, REEL, NotificationBell(), easeInOut(), easeOut(), gateCanvasOn(), gateHoldMs() (+6 more)

### Community 31 - "txSize.selfcheck.mjs"
Cohesion: 0.12
Nodes (30): AgentProfileView(), BADGE_CATEGORIES, createImage(), DynamicIconMap, getCroppedImg(), AchievementTester(), BASE_STATS, buildFakeCareer() (+22 more)

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
Cohesion: 0.30
Nodes (12): StoreBottomSheet(), MerchantSalesView(), readDraft(), briefSeconds(), customerBrief(), reorderFromLast(), agoLabel(), dayStats() (+4 more)

### Community 36 - "KPMInventoryApp"
Cohesion: 0.31
Nodes (8): getDocOfflineSafe(), KPMInventoryApp(), computeDayXP(), canUsePovSwitch(), clearGrace(), graceIsValid(), readGrace(), touchGrace()

### Community 37 - "BranchWarehouseManager.jsx"
Cohesion: 0.30
Nodes (13): arrivalsOnHand(), BranchWarehouseManager(), inTransitQty(), middle(), oldestStockDays(), productArrivals(), receiptBlocked(), receiptDisputed() (+5 more)

### Community 38 - "customerBrief.selfcheck.mjs"
Cohesion: 0.17
Nodes (9): b, guarded, inventory, messy, ok, rows, sameDay, sd (+1 more)

### Community 39 - "vaultGrace.selfcheck.mjs"
Cohesion: 0.33
Nodes (4): body, fnText, graceIsValid, src

### Community 40 - "CapybaraMascot.jsx"
Cohesion: 0.06
Nodes (29): app, appFiles, boundary, branch, brief, dashPanel, dashView, daystats (+21 more)

### Community 41 - "✅ THE LIGHT DUKE'S LEDGER IS BUILT — 524/524, contrast self-check passes"
Cohesion: 0.05
Nodes (39): 🟢 13:51 WIB (Lancelot session) — no file changes this turn; those `src/**` edits are the app's, 🔴 2026-08-21 17:12 — THE WHOLE STOCK OPNAME SCREEN WAS CRASHING, AND EVERY CHECK WAS GREEN, 🔧 2026-08-23 12:5x — TOOLING TRACK (no app code touched). Graphify hook now ANSWERS, not nags., 🟠 2026-08-23 — THE COUNT MOVED TO THE DOOR, AND THE ROADMAP GOT RANKED, 🟠 2026-08-24 09:26 — THE POV SWITCH RAN, FOUND TWO REAL HOLES, AND BOTH ARE SHUT AND SEEN., 🟠 2026-08-24 10:05 — G6 WAS ALREADY BUILT. G3 IS NOT, SO G3 GOT BUILT. 599/599, 762/762., 🟠 2026-08-24 10:36 — THE RAIL HAS A MATERIAL NOW, AND IT IS AMBER. 599/599, 762/762., 🟠 2026-08-24 11:0x — THE AMBER PLATE SWAP IS IMPOSSIBLE UNDER THE CURRENT CONTRAST RULE (+31 more)

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
Cohesion: 0.20
Nodes (7): justAfterLocalMidnight, justBeforeLocalMidnight, NOW, rows, s, shuffled, withReturn

### Community 47 - "nextStop.js"
Cohesion: 0.20
Nodes (9): Also open, 📋 PASTE THIS — it is the whole prompt, nothing else needed, 🔨 SIX SCREENS LEFT of his eight, 🎨 THE JOB — the Dashboard LAYOUT, not its colours, The laws this must not break, The one job for next session, ⚠️ THE VIEWING PATH — this is the only one that works, Verify (+1 more)

### Community 48 - "nextStop.js"
Cohesion: 0.70
Nodes (4): km(), mine(), nextStop(), visitedWithinCycle()

### Community 50 - "MerchantSalesView.jsx"
Cohesion: 0.22
Nodes (7): css, dark, light, lum(), PAIRS, ratio(), srgb()

### Community 51 - "VaultGate.jsx"
Cohesion: 0.08
Nodes (56): AgentInventoryView(), Money(), AuditVaultView(), confirmAction(), promptAction(), CrownTransferProtocol(), checkPointInGeoJSON(), CustomerDetailView() (+48 more)

### Community 53 - "context-watch.mjs"
Cohesion: 0.08
Nodes (40): hook, k(), left, lines, pct, react, react, AuthoritySelect() (+32 more)

### Community 56 - "CapybaraMascot.jsx"
Cohesion: 0.40
Nodes (4): CapybaraMascot(), LOCKED_MESSAGES, LOGGED_IN_MESSAGES, NO_MESSAGES

### Community 61 - "firebase.js"
Cohesion: 0.22
Nodes (9): LazyTabBoundary, canReachInternet(), onlineListeners, setSharedOnline(), subscribeOnline(), useOfflineEngine(), applySaleToCanvas(), useTransactionEngine() (+1 more)

### Community 63 - "notify"
Cohesion: 0.12
Nodes (30): DashboardBenchmarks(), groupDigits(), pct(), toBal(), DashboardView(), dominant(), PaceChart(), VB (+22 more)

### Community 64 - "MapMissionControl.jsx"
Cohesion: 0.10
Nodes (29): L, store(), AGENT_COLORS, checkPointInGeoJSON(), createJourneyClusterIcon(), getHashColor(), getStoreHierarchy(), getStoreIcon() (+21 more)

## Knowledge Gaps
- **473 isolated node(s):** `root`, `note`, `hook`, `now`, `hook` (+468 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **5 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `devDependencies` connect `devDependencies` to `dependencies`?**
  _High betweenness centrality (0.039) - this node is a cross-community bridge._
- **Why does `dependencies` connect `dependencies` to `context-watch.mjs`?**
  _High betweenness centrality (0.025) - this node is a cross-community bridge._
- **Why does `formatRupiah()` connect `VaultGate.jsx` to `App.jsx`, `dayStats.selfcheck.mjs`, `MapMissionControl.jsx`, `useTransactionEngine.js`, `context-watch.mjs`, `notify`?**
  _High betweenness centrality (0.022) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `KPMInventoryApp()` (e.g. with `t()` and `report()`) actually correct?**
  _`KPMInventoryApp()` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `root`, `note`, `hook` to the rest of the system?**
  _473 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `App.jsx` be split into smaller, more focused modules?**
  _Cohesion score 0.07741935483870968 - nodes in this community are weakly interconnected._
- **Should `dependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.058823529411764705 - nodes in this community are weakly interconnected._