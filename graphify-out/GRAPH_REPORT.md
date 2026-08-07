# Graph Report - kpm-inventory-main  (2026-08-07)

## Corpus Check
- 78 files · ~501,907 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 517 nodes · 860 edges · 30 communities (28 shown, 2 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 10 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `f3623188`
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
- txSize.selfcheck.mjs
- hasClearance
- Sales Terminal — test list
- LOG — newest first, older entries live in `git log` for this file
- check-progress.mjs
- COMPACTING NOW — what the summary must keep, and what it must drop
- customerBrief.selfcheck.mjs

## God Nodes (most connected - your core abstractions)
1. `formatRupiah()` - 23 edges
2. `MerchantSalesView()` - 18 edges
3. `convertToBks()` - 18 edges
4. `KPMInventoryApp()` - 15 edges
5. `LOG — newest first, older entries live in `git log` for this file` - 15 edges
6. `AgentProfileView()` - 14 edges
7. `commitInChunks()` - 14 edges
8. `savePhotoAndGetReference()` - 13 edges
9. `hasClearance()` - 11 edges
10. `Sales Terminal — test list` - 11 edges

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

## Communities (30 total, 2 thin omitted)

### Community 0 - "App.jsx"
Cohesion: 0.06
Nodes (44): AgentInventoryView, AgentProfileView, BranchWarehouseManager, ConsignmentFinanceView, DashboardView, EODReconciliationView, FleetCanvasManager, getDocOfflineSafe() (+36 more)

### Community 1 - "MapMissionControl.jsx"
Cohesion: 0.06
Nodes (38): hook, k(), left, lines, pct, used, AuditVaultView(), checkPointInGeoJSON() (+30 more)

### Community 2 - "dependencies"
Cohesion: 0.06
Nodes (33): @emailjs/browser, firebase, idb, leaflet, lucide-react, dependencies, @emailjs/browser, firebase (+25 more)

### Community 3 - "permissions.js"
Cohesion: 0.17
Nodes (17): react, react, CrownTransferProtocol(), LandlordDashboard(), PermissionMatrixEditor(), SettingsView(), CORPORATE_TIERS, CUSTOMER_EDIT_PERMS (+9 more)

### Community 4 - "devDependencies"
Cohesion: 0.07
Nodes (29): autoprefixer, cross-env, eslint, @eslint/js, eslint-plugin-react-hooks, eslint-plugin-react-refresh, globals, devDependencies (+21 more)

### Community 5 - "mixedUnits.selfcheck.mjs"
Cohesion: 0.13
Nodes (19): BOOST, boostElement(), initSounds(), __isUnlocked(), liteModeOn(), makePool(), MUMBLES, playSound() (+11 more)

### Community 6 - "savePhotoAndGetReference"
Cohesion: 0.06
Nodes (45): HistoryReportView(), justAfterLocalMidnight, justBeforeLocalMidnight, NOW, rows, s, shuffled, withReturn (+37 more)

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
Cohesion: 0.13
Nodes (21): AgentInventoryView(), getCurrentDate(), BranchWarehouseManager(), DashboardBenchmarks(), CustomTooltip(), DashboardView(), formatAdvancedStock(), ItemInspector() (+13 more)

### Community 23 - "txSize.selfcheck.mjs"
Cohesion: 0.29
Nodes (5): big, line, naive, product, stripped

### Community 24 - "hasClearance"
Cohesion: 0.14
Nodes (15): allJs, beforeNota, BS, CENSUS, check(), css, engine, files (+7 more)

### Community 25 - "Sales Terminal — test list"
Cohesion: 0.17
Nodes (11): A. The shelf, B. The rail (desktop, wide window), C. The customer brief, D. Money — the part that must be exactly right, E. The merchant, F. Phone (narrow the browser, or use your phone), G. Nothing old was lost, How to report a failure (+3 more)

### Community 26 - "LOG — newest first, older entries live in `git log` for this file"
Cohesion: 0.08
Nodes (23): 2026-08-06, 2026-08-07 13:56 WIB, 2026-08-07 14:07 WIB, 2026-08-07 14:11 WIB, 2026-08-07 14:23 WIB, 2026-08-07 14:25 WIB, 2026-08-07 14:30 WIB, 2026-08-07 14:32 WIB (+15 more)

### Community 27 - "check-progress.mjs"
Cohesion: 0.29
Nodes (6): hook, note, now, root, SKIP, walk()

### Community 28 - "COMPACTING NOW — what the summary must keep, and what it must drop"
Cohesion: 0.40
Nodes (4): COMPACTING NOW — what the summary must keep, and what it must drop, Drop hard — this is where the waste is, Keep, in this order, Then, immediately after compacting

### Community 29 - "customerBrief.selfcheck.mjs"
Cohesion: 0.16
Nodes (12): b, guarded, inventory, messy, ok, rows, sameDay, sd (+4 more)

## Knowledge Gaps
- **215 isolated node(s):** `root`, `note`, `hook`, `now`, `hook` (+210 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **2 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `devDependencies` connect `devDependencies` to `dependencies`?**
  _High betweenness centrality (0.075) - this node is a cross-community bridge._
- **Why does `dependencies` connect `dependencies` to `permissions.js`?**
  _High betweenness centrality (0.063) - this node is a cross-community bridge._
- **Why does `MerchantSalesView()` connect `savePhotoAndGetReference` to `customerBrief.selfcheck.mjs`, `permissions.js`, `mixedUnits.selfcheck.mjs`, `savePhotoAndGetReference`?**
  _High betweenness centrality (0.056) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `MerchantSalesView()` (e.g. with `back()` and `totalBks()`) actually correct?**
  _`MerchantSalesView()` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `root`, `note`, `hook` to the rest of the system?**
  _215 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `App.jsx` be split into smaller, more focused modules?**
  _Cohesion score 0.05565638233514821 - nodes in this community are weakly interconnected._
- **Should `MapMissionControl.jsx` be split into smaller, more focused modules?**
  _Cohesion score 0.06359189378057302 - nodes in this community are weakly interconnected._