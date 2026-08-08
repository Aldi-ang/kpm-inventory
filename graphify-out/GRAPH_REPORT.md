# Graph Report - kpm-inventory-main  (2026-08-08)

## Corpus Check
- 85 files · ~517,972 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 565 nodes · 1059 edges · 35 communities (33 shown, 2 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 21 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `e7f2eab1`
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
- MerchantSalesView
- MerchantSalesView.jsx
- plan-quota.mjs

## God Nodes (most connected - your core abstractions)
1. `notify()` - 43 edges
2. `confirmAction()` - 37 edges
3. `formatRupiah()` - 23 edges
4. `MerchantSalesView()` - 20 edges
5. `KPMInventoryApp()` - 19 edges
6. `convertToBks()` - 18 edges
7. `AgentProfileView()` - 15 edges
8. `CustomerManagement()` - 14 edges
9. `commitInChunks()` - 14 edges
10. `savePhotoAndGetReference()` - 13 edges

## Surprising Connections (you probably didn't know these)
- `AgentProfileView()` --indirect_call--> `k()`  [INFERRED]
  src/AgentProfileView.jsx → .claude/context-watch.mjs
- `JourneyView()` --indirect_call--> `k()`  [INFERRED]
  src/JourneyView.jsx → .claude/context-watch.mjs
- `KPMInventoryApp()` --references--> `react`  [EXTRACTED]
  src/App.jsx → package.json
- `PermissionMatrixEditor()` --references--> `react`  [EXTRACTED]
  src/components/SettingsView.jsx → package.json
- `SettingsView()` --references--> `react`  [EXTRACTED]
  src/components/SettingsView.jsx → package.json

## Import Cycles
- None detected.

## Communities (35 total, 2 thin omitted)

### Community 0 - "App.jsx"
Cohesion: 0.06
Nodes (45): AgentInventoryView, AgentProfileView, BranchWarehouseManager, ConsignmentFinanceView, DashboardView, EODReconciliationView, FleetCanvasManager, getDocOfflineSafe() (+37 more)

### Community 1 - "MapMissionControl.jsx"
Cohesion: 0.08
Nodes (30): hook, k(), left, lines, pct, isFleetManagementTier(), AGENT_COLORS, checkPointInGeoJSON() (+22 more)

### Community 2 - "dependencies"
Cohesion: 0.05
Nodes (36): @emailjs/browser, firebase, idb, leaflet, lucide-react, dependencies, @emailjs/browser, firebase (+28 more)

### Community 3 - "permissions.js"
Cohesion: 0.12
Nodes (37): AuditVaultView(), BranchWarehouseManager(), confirmAction(), ConfirmHost(), CrownTransferProtocol(), HistoryReportView(), LandlordDashboard(), PermissionMatrixEditor() (+29 more)

### Community 4 - "devDependencies"
Cohesion: 0.07
Nodes (29): autoprefixer, cross-env, eslint, @eslint/js, eslint-plugin-react-hooks, eslint-plugin-react-refresh, globals, devDependencies (+21 more)

### Community 5 - "mixedUnits.selfcheck.mjs"
Cohesion: 0.11
Nodes (17): blank, done, eightDaysAgo, far, free, HERE, minefar, near (+9 more)

### Community 6 - "savePhotoAndGetReference"
Cohesion: 0.13
Nodes (19): BOOST, boostElement(), initSounds(), __isUnlocked(), liteModeOn(), makePool(), MUMBLES, playSound() (+11 more)

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
Cohesion: 0.19
Nodes (11): AgentInventoryView(), getCurrentDate(), DashboardBenchmarks(), CustomTooltip(), DashboardView(), formatAdvancedStock(), ItemInspector(), ResidentEvilInventory() (+3 more)

### Community 23 - "customerBrief.selfcheck.mjs"
Cohesion: 0.15
Nodes (13): b, guarded, inventory, messy, ok, rows, sameDay, sd (+5 more)

### Community 24 - "hasClearance"
Cohesion: 0.05
Nodes (37): allJs, appCode, appFiles, beforeNota, boxLeft, BS, CENSUS, check() (+29 more)

### Community 25 - "Sales Terminal — test list"
Cohesion: 0.13
Nodes (14): A. The shelf, B. The rail (desktop, wide window), C. The customer brief, D. Money — the part that must be exactly right, E. The merchant, F. Phone (narrow the browser, or use your phone), G. Nothing old was lost, H. Territory and duplicate outlets — built 2026-08-07 (+6 more)

### Community 26 - "LOG — newest first, older entries live in `git log` for this file"
Cohesion: 0.12
Nodes (15): 2026-08-07 22:5x WIB — the context meter is ALSO broken, but this is NOT what blocked him, 2026-08-07 23:0x WIB — 🔴 THE LIMIT THAT MATTERS IS THE 5-HOUR PLAN QUOTA, NOT CONTEXT, 2026-08-08 08:45 WIB — the plan-quota meter is LIVE. Reading 60% used, resets in 3h 57m., 2026-08-08 — 9router fully investigated. Only ONE thing is still missing., 2026-08-08 — the four worktrees are GONE. src/ is clean., 🚫 DO NOT open a PR or merge to main yet, ▶ DO THIS NEXT, First command of every session (+7 more)

### Community 27 - "check-progress.mjs"
Cohesion: 0.29
Nodes (6): hook, note, now, root, SKIP, walk()

### Community 28 - "COMPACTING NOW — what the summary must keep, and what it must drop"
Cohesion: 0.40
Nodes (4): COMPACTING NOW — what the summary must keep, and what it must drop, Drop hard — this is where the waste is, Keep, in this order, Then, immediately after compacting

### Community 29 - "CustomerManager.jsx"
Cohesion: 0.28
Nodes (12): promptAction(), checkPointInGeoJSON(), CustomerDetailView(), CustomerManagement(), isPointInPolygon(), getCustomerAccessLevel(), createdMillis(), findDuplicates() (+4 more)

### Community 30 - "dayStats.selfcheck.mjs"
Cohesion: 0.19
Nodes (10): justAfterLocalMidnight, justBeforeLocalMidnight, NOW, rows, s, shuffled, withReturn, agoLabel() (+2 more)

### Community 31 - "txSize.selfcheck.mjs"
Cohesion: 0.29
Nodes (5): big, line, naive, product, stripped

### Community 32 - "MerchantSalesView"
Cohesion: 0.27
Nodes (10): back(), bksPerUnit(), cello, custom, d, real, totalBks(), MerchantSalesView() (+2 more)

### Community 33 - "MerchantSalesView.jsx"
Cohesion: 0.46
Nodes (6): directionsUrl(), km(), metresLabel(), mine(), nextStop(), visitedWithinCycle()

### Community 34 - "plan-quota.mjs"
Cohesion: 0.29
Nodes (4): connId, cookie, ctl, timer

## Knowledge Gaps
- **236 isolated node(s):** `root`, `note`, `hook`, `now`, `hook` (+231 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **2 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `notify()` connect `permissions.js` to `App.jsx`, `MapMissionControl.jsx`, `MerchantSalesView.jsx`, `MerchantSalesView`, `HallOfFameView.jsx`, `CustomerManager.jsx`?**
  _High betweenness centrality (0.070) - this node is a cross-community bridge._
- **Why does `devDependencies` connect `devDependencies` to `dependencies`?**
  _High betweenness centrality (0.067) - this node is a cross-community bridge._
- **Are the 3 inferred relationships involving `MerchantSalesView()` (e.g. with `t()` and `back()`) actually correct?**
  _`MerchantSalesView()` has 3 INFERRED edges - model-reasoned connections that need verification._
- **What connects `root`, `note`, `hook` to the rest of the system?**
  _236 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `App.jsx` be split into smaller, more focused modules?**
  _Cohesion score 0.05639097744360902 - nodes in this community are weakly interconnected._
- **Should `MapMissionControl.jsx` be split into smaller, more focused modules?**
  _Cohesion score 0.0753045404208195 - nodes in this community are weakly interconnected._
- **Should `dependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.05405405405405406 - nodes in this community are weakly interconnected._