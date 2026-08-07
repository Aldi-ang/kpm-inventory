# Graph Report - kpm-inventory-main  (2026-08-08)

## Corpus Check
- 81 files · ~514,442 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 546 nodes · 975 edges · 33 communities (31 shown, 2 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 18 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `012ae21b`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- App.jsx
- MapMissionControl.jsx
- dependencies
- permissions.js
- devDependencies
- mixedUnits.selfcheck.mjs
- savePhotoAndGetReference
- getCurrentDate
- manifest.json
- KPM Inventory — Manual Test Checklist
- Firestore Security Rules — Deployment Checklist
- HallOfFameView.jsx
- test-batch1.mjs
- test-batch2.mjs
- React + Vite
- Duke3D.jsx
- CLAUDE.md
- Animation prompts — Pip-Boy style, capybara merchant
- savePhotoAndGetReference
- customerBrief.selfcheck.mjs
- hasClearance
- Sales Terminal — test list
- LOG — newest first, older entries live in `git log` for this file
- check-progress.mjs
- COMPACTING NOW — what the summary must keep, and what it must drop
- CustomerManager.jsx
- dayStats.selfcheck.mjs
- txSize.selfcheck.mjs
- context-watch.mjs

## God Nodes (most connected - your core abstractions)
1. `confirmAction()` - 37 edges
2. `formatRupiah()` - 23 edges
3. `MerchantSalesView()` - 19 edges
4. `convertToBks()` - 18 edges
5. `KPMInventoryApp()` - 17 edges
6. `AgentProfileView()` - 14 edges
7. `commitInChunks()` - 14 edges
8. `CustomerManagement()` - 13 edges
9. `savePhotoAndGetReference()` - 13 edges
10. `Sales Terminal — test list` - 13 edges

## Surprising Connections (you probably didn't know these)
- `AgentProfileView()` --indirect_call--> `k()`  [INFERRED]
  src/AgentProfileView.jsx → .claude/context-watch.mjs
- `JourneyView()` --indirect_call--> `k()`  [INFERRED]
  src/JourneyView.jsx → .claude/context-watch.mjs
- `KPMInventoryApp()` --references--> `react`  [EXTRACTED]
  src/App.jsx → package.json
- `MapRecenter()` --references--> `react`  [EXTRACTED]
  src/JourneyView.jsx → package.json
- `MerchantSalesView()` --references--> `react`  [EXTRACTED]
  src/MerchantSalesView.jsx → package.json

## Import Cycles
- None detected.

## Communities (33 total, 2 thin omitted)

### Community 0 - "App.jsx"
Cohesion: 0.06
Nodes (40): AgentInventoryView, AgentProfileView, BranchWarehouseManager, ConsignmentFinanceView, DashboardView, EODReconciliationView, FleetCanvasManager, getDocOfflineSafe() (+32 more)

### Community 1 - "MapMissionControl.jsx"
Cohesion: 0.14
Nodes (10): BorderImporter(), checkPointInGeoJSON(), compressCoords(), getIcon(), isPointInPolygon(), MarkerWithZoom(), StoreBottomSheet(), TacticalDashboard() (+2 more)

### Community 2 - "dependencies"
Cohesion: 0.06
Nodes (33): @emailjs/browser, firebase, idb, leaflet, lucide-react, dependencies, @emailjs/browser, firebase (+25 more)

### Community 3 - "permissions.js"
Cohesion: 0.09
Nodes (42): react, react, AuditVaultView(), BranchWarehouseManager(), confirmAction(), ConfirmHost(), promptAction(), CrownTransferProtocol() (+34 more)

### Community 4 - "devDependencies"
Cohesion: 0.07
Nodes (29): autoprefixer, cross-env, eslint, @eslint/js, eslint-plugin-react-hooks, eslint-plugin-react-refresh, globals, devDependencies (+21 more)

### Community 5 - "mixedUnits.selfcheck.mjs"
Cohesion: 0.11
Nodes (16): blank, done, eightDaysAgo, far, free, HERE, minefar, near (+8 more)

### Community 6 - "savePhotoAndGetReference"
Cohesion: 0.06
Nodes (45): justAfterLocalMidnight, justBeforeLocalMidnight, NOW, rows, s, shuffled, withReturn, back() (+37 more)

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

### Community 11 - "HallOfFameView.jsx"
Cohesion: 0.12
Nodes (31): AgentProfileView(), BADGE_CATEGORIES, createImage(), DynamicIconMap, getCroppedImg(), AchievementTester(), BASE_STATS, buildFakeCareer() (+23 more)

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

### Community 22 - "savePhotoAndGetReference"
Cohesion: 0.12
Nodes (20): AgentInventoryView(), getCurrentDate(), DashboardBenchmarks(), CustomTooltip(), DashboardView(), HistoryReportView(), formatAdvancedStock(), ItemInspector() (+12 more)

### Community 23 - "customerBrief.selfcheck.mjs"
Cohesion: 0.16
Nodes (12): b, guarded, inventory, messy, ok, rows, sameDay, sd (+4 more)

### Community 24 - "hasClearance"
Cohesion: 0.06
Nodes (31): allJs, appCode, appFiles, beforeNota, BS, CENSUS, check(), css (+23 more)

### Community 25 - "Sales Terminal — test list"
Cohesion: 0.13
Nodes (14): A. The shelf, B. The rail (desktop, wide window), C. The customer brief, D. Money — the part that must be exactly right, E. The merchant, F. Phone (narrow the browser, or use your phone), G. Nothing old was lost, H. Territory and duplicate outlets — built 2026-08-07 (+6 more)

### Community 26 - "LOG — newest first, older entries live in `git log` for this file"
Cohesion: 0.11
Nodes (17): 2026-08-07 19:5x WIB — the tier-spelling fix is BUILT (Aldi: "you can do both fix bro"), 2026-08-07 20:1x WIB — duplicate finder shipped, plus an 8-bit test logger, 2026-08-07 21:39 WIB — the end-of-window stop is now a HOOK, not a promise, 2026-08-07 22:20 WIB — the finder found a false positive before it found duplicates, 2026-08-07 22:4x WIB — duplicate panel: Open goes to the wrong place, dismiss is HALF-BUILT, 2026-08-07 22:5x WIB — the context meter is ALSO broken, but this is NOT what blocked him, 2026-08-07 23:0x WIB — 🔴 THE LIMIT THAT MATTERS IS THE 5-HOUR PLAN QUOTA, NOT CONTEXT, 🚫 DO NOT open a PR or merge to main yet (+9 more)

### Community 27 - "check-progress.mjs"
Cohesion: 0.29
Nodes (6): hook, note, now, root, SKIP, walk()

### Community 28 - "COMPACTING NOW — what the summary must keep, and what it must drop"
Cohesion: 0.40
Nodes (4): COMPACTING NOW — what the summary must keep, and what it must drop, Drop hard — this is where the waste is, Keep, in this order, Then, immediately after compacting

### Community 29 - "CustomerManager.jsx"
Cohesion: 0.21
Nodes (9): AGENT_COLORS, checkPointInGeoJSON(), getHashColor(), getStoreHierarchy(), getStoreIcon(), isPointInPolygon(), JourneyView(), storeIconCache (+1 more)

### Community 30 - "dayStats.selfcheck.mjs"
Cohesion: 0.52
Nodes (6): store(), MapMissionControl(), clearBorderCache(), loadBorderCache(), openCacheDB(), saveBorderCache()

### Community 31 - "txSize.selfcheck.mjs"
Cohesion: 0.29
Nodes (5): big, line, naive, product, stripped

### Community 35 - "context-watch.mjs"
Cohesion: 0.29
Nodes (6): hook, k(), left, lines, pct, used

## Knowledge Gaps
- **227 isolated node(s):** `root`, `note`, `hook`, `now`, `hook` (+222 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **2 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `devDependencies` connect `devDependencies` to `dependencies`?**
  _High betweenness centrality (0.070) - this node is a cross-community bridge._
- **Why does `dependencies` connect `dependencies` to `permissions.js`?**
  _High betweenness centrality (0.059) - this node is a cross-community bridge._
- **Why does `MerchantSalesView()` connect `savePhotoAndGetReference` to `App.jsx`, `permissions.js`, `customerBrief.selfcheck.mjs`?**
  _High betweenness centrality (0.054) - this node is a cross-community bridge._
- **Are the 3 inferred relationships involving `MerchantSalesView()` (e.g. with `t()` and `back()`) actually correct?**
  _`MerchantSalesView()` has 3 INFERRED edges - model-reasoned connections that need verification._
- **What connects `root`, `note`, `hook` to the rest of the system?**
  _227 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `App.jsx` be split into smaller, more focused modules?**
  _Cohesion score 0.06196078431372549 - nodes in this community are weakly interconnected._
- **Should `MapMissionControl.jsx` be split into smaller, more focused modules?**
  _Cohesion score 0.1437908496732026 - nodes in this community are weakly interconnected._