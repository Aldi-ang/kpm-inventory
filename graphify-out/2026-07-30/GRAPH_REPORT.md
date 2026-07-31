# Graph Report - kpm-inventory-main  (2026-07-30)

## Corpus Check
- 60 files · ~453,309 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 318 nodes · 586 edges · 20 communities (18 shown, 2 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 9 edges (avg confidence: 0.57)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `dc6561a9`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- App.jsx
- MapMissionControl.jsx
- dependencies
- permissions.js
- devDependencies
- formatRupiah
- helpers.js
- manifest.json
- KPM Inventory — Manual Test Checklist
- Firestore Security Rules — Deployment Checklist
- HallOfFameView.jsx
- test-batch1.mjs
- test-batch2.mjs
- React + Vite
- Duke3D.jsx
- CLAUDE.md

## God Nodes (most connected - your core abstractions)
1. `formatRupiah()` - 23 edges
2. `KPMInventoryApp()` - 15 edges
3. `commitInChunks()` - 14 edges
4. `savePhotoAndGetReference()` - 13 edges
5. `convertToBks()` - 12 edges
6. `hasClearance()` - 11 edges
7. `saveBorderCache()` - 10 edges
8. `getCurrentDate()` - 10 edges
9. `AgentProfileView()` - 9 edges
10. `loadBorderCache()` - 9 edges

## Surprising Connections (you probably didn't know these)
- `KPMInventoryApp()` --references--> `react`  [EXTRACTED]
  src/App.jsx → package.json
- `MapRecenter()` --references--> `react`  [EXTRACTED]
  src/JourneyView.jsx → package.json
- `PermissionMatrixEditor()` --references--> `react`  [EXTRACTED]
  src/components/SettingsView.jsx → package.json
- `SettingsView()` --references--> `react`  [EXTRACTED]
  src/components/SettingsView.jsx → package.json
- `MerchantSalesView()` --references--> `react`  [EXTRACTED]
  src/MerchantSalesView.jsx → package.json

## Import Cycles
- None detected.

## Communities (20 total, 2 thin omitted)

### Community 0 - "App.jsx"
Cohesion: 0.06
Nodes (39): AgentInventoryView, AgentProfileView, BranchWarehouseManager, ConsignmentFinanceView, DashboardView, EODReconciliationView, FleetCanvasManager, getDocOfflineSafe() (+31 more)

### Community 1 - "MapMissionControl.jsx"
Cohesion: 0.08
Nodes (29): AuditVaultView(), checkPointInGeoJSON(), CustomerDetailView(), CustomerManagement(), isPointInPolygon(), getCustomerAccessLevel(), AGENT_COLORS, checkPointInGeoJSON() (+21 more)

### Community 2 - "dependencies"
Cohesion: 0.06
Nodes (33): @emailjs/browser, firebase, idb, leaflet, lucide-react, dependencies, @emailjs/browser, firebase (+25 more)

### Community 3 - "permissions.js"
Cohesion: 0.15
Nodes (19): react, react, CrownTransferProtocol(), LandlordDashboard(), PermissionMatrixEditor(), SettingsView(), CORPORATE_TIERS, CUSTOMER_EDIT_PERMS (+11 more)

### Community 4 - "devDependencies"
Cohesion: 0.07
Nodes (29): autoprefixer, cross-env, eslint, @eslint/js, eslint-plugin-react-hooks, eslint-plugin-react-refresh, globals, devDependencies (+21 more)

### Community 5 - "formatRupiah"
Cohesion: 0.14
Nodes (22): AgentInventoryView(), getCurrentDate(), BranchWarehouseManager(), DashboardBenchmarks(), CustomTooltip(), DashboardView(), HistoryReportView(), formatAdvancedStock() (+14 more)

### Community 6 - "helpers.js"
Cohesion: 0.43
Nodes (5): formatSampleQty(), SampleEntryModal(), SamplingAnalyticsView(), SamplingFolderView(), getCurrentDate()

### Community 8 - "manifest.json"
Cohesion: 0.40
Nodes (4): A-Brain — the persistent knowledge base, check for more than just code questions, Caveman mode — ALWAYS ON for this project (full intensity), Karpathy Guidelines — standing discipline for all code work here, Standing toolkit for this project (kpm-inventory)

### Community 9 - "KPM Inventory — Manual Test Checklist"
Cohesion: 0.15
Nodes (12): After deploying a Firestore Security Rules change specifically, 🚨 Before you say "done" or commit anything — do this EVERY time, 🔴 Business-critical — test every single release, 🟠 Data integrity — test after any related change, 🟡 Edge cases — test when touching that specific code, KPM Inventory — Manual Test Checklist, Round 2 — fixes for the bugs you found on the first local test, Round 3 — the morning test list (start here) (+4 more)

### Community 10 - "Firestore Security Rules — Deployment Checklist"
Cohesion: 0.29
Nodes (6): After a successful deploy, Before deploying, Firestore Security Rules — Deployment Checklist, If something breaks, Immediately after deploying — test this for real, not just trust the emulator, The deploy itself

### Community 11 - "HallOfFameView.jsx"
Cohesion: 0.11
Nodes (32): AgentProfileView(), BADGE_CATEGORIES, createImage(), DynamicIconMap, getCroppedImg(), AchievementTester(), BASE_STATS, buildFakeCareer() (+24 more)

### Community 12 - "test-batch1.mjs"
Cohesion: 0.53
Nodes (5): ctxFor(), expect(), RULES, run(), seed()

### Community 13 - "test-batch2.mjs"
Cohesion: 0.53
Nodes (5): ctxFor(), expect(), RULES, run(), seed()

### Community 14 - "React + Vite"
Cohesion: 0.50
Nodes (3): Expanding the ESLint configuration, React Compiler, React + Vite

## Knowledge Gaps
- **89 isolated node(s):** `agent-browser`, `name`, `private`, `version`, `type` (+84 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **2 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `devDependencies` connect `devDependencies` to `dependencies`?**
  _High betweenness centrality (0.140) - this node is a cross-community bridge._
- **Why does `dependencies` connect `dependencies` to `permissions.js`?**
  _High betweenness centrality (0.115) - this node is a cross-community bridge._
- **Why does `formatRupiah()` connect `formatRupiah` to `App.jsx`, `MapMissionControl.jsx`?**
  _High betweenness centrality (0.066) - this node is a cross-community bridge._
- **What connects `agent-browser`, `name`, `private` to the rest of the system?**
  _89 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `App.jsx` be split into smaller, more focused modules?**
  _Cohesion score 0.06033182503770739 - nodes in this community are weakly interconnected._
- **Should `MapMissionControl.jsx` be split into smaller, more focused modules?**
  _Cohesion score 0.08350951374207188 - nodes in this community are weakly interconnected._
- **Should `dependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.058823529411764705 - nodes in this community are weakly interconnected._