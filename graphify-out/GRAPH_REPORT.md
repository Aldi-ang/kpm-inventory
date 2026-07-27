# Graph Report - kpm-inventory-main  (2026-07-27)

## Corpus Check
- 55 files · ~450,968 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 294 nodes · 509 edges · 21 communities (19 shown, 2 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `a8fc57cf`
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
- package.json
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
2. `commitInChunks()` - 14 edges
3. `savePhotoAndGetReference()` - 13 edges
4. `KPMInventoryApp()` - 12 edges
5. `convertToBks()` - 12 edges
6. `hasClearance()` - 11 edges
7. `saveBorderCache()` - 10 edges
8. `getCurrentDate()` - 10 edges
9. `loadBorderCache()` - 9 edges
10. `react` - 7 edges

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

## Communities (21 total, 2 thin omitted)

### Community 0 - "App.jsx"
Cohesion: 0.07
Nodes (40): AgentInventoryView, AgentProfileView, BranchWarehouseManager, ConsignmentFinanceView, DashboardView, EODReconciliationView, FleetCanvasManager, getDocOfflineSafe() (+32 more)

### Community 1 - "MapMissionControl.jsx"
Cohesion: 0.09
Nodes (26): checkPointInGeoJSON(), CustomerManagement(), isPointInPolygon(), getCustomerAccessLevel(), isFleetManagementTier(), AGENT_COLORS, checkPointInGeoJSON(), getHashColor() (+18 more)

### Community 2 - "dependencies"
Cohesion: 0.06
Nodes (33): clsx, @emailjs/browser, firebase, idb, leaflet, lucide-react, dependencies, clsx (+25 more)

### Community 3 - "permissions.js"
Cohesion: 0.12
Nodes (22): react, react, AgentProfileView(), BadgeIconMap, createImage(), DEFAULT_BADGES, DynamicIconMap, getCroppedImg() (+14 more)

### Community 4 - "devDependencies"
Cohesion: 0.07
Nodes (29): autoprefixer, cross-env, eslint, @eslint/js, eslint-plugin-react-hooks, eslint-plugin-react-refresh, globals, devDependencies (+21 more)

### Community 5 - "formatRupiah"
Cohesion: 0.14
Nodes (16): AgentInventoryView(), getCurrentDate(), DashboardBenchmarks(), CustomTooltip(), DashboardView(), HistoryReportView(), formatAdvancedStock(), ItemInspector() (+8 more)

### Community 6 - "helpers.js"
Cohesion: 0.29
Nodes (11): AuditVaultView(), BranchWarehouseManager(), LandlordDashboard(), TierAutomationEngine(), RestockVaultView(), StockOpnameView(), commitInChunks(), compressImageToBase64() (+3 more)

### Community 7 - "package.json"
Cohesion: 0.18
Nodes (10): name, private, scripts, build, deploy, dev, lint, preview (+2 more)

### Community 8 - "manifest.json"
Cohesion: 0.22
Nodes (8): background_color, display, icons, name, orientation, short_name, start_url, theme_color

### Community 9 - "KPM Inventory — Manual Test Checklist"
Cohesion: 0.25
Nodes (7): After deploying a Firestore Security Rules change specifically, 🚨 Before you say "done" or commit anything — do this EVERY time, 🔴 Business-critical — test every single release, 🟠 Data integrity — test after any related change, 🟡 Edge cases — test when touching that specific code, KPM Inventory — Manual Test Checklist, ⚪ Skip entirely

### Community 10 - "Firestore Security Rules — Deployment Checklist"
Cohesion: 0.29
Nodes (6): After a successful deploy, Before deploying, Firestore Security Rules — Deployment Checklist, If something breaks, Immediately after deploying — test this for real, not just trust the emulator, The deploy itself

### Community 11 - "HallOfFameView.jsx"
Cohesion: 0.38
Nodes (4): BADGE_REGISTRY, checkUnlockedBadges(), HallOfFameView(), IconMap

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
- **90 isolated node(s):** `name`, `private`, `version`, `type`, `dev` (+85 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **2 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `dependencies` connect `dependencies` to `permissions.js`, `package.json`?**
  _High betweenness centrality (0.173) - this node is a cross-community bridge._
- **Why does `devDependencies` connect `devDependencies` to `package.json`?**
  _High betweenness centrality (0.150) - this node is a cross-community bridge._
- **Why does `formatRupiah()` connect `formatRupiah` to `App.jsx`, `MapMissionControl.jsx`, `helpers.js`?**
  _High betweenness centrality (0.076) - this node is a cross-community bridge._
- **What connects `name`, `private`, `version` to the rest of the system?**
  _90 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `App.jsx` be split into smaller, more focused modules?**
  _Cohesion score 0.06531204644412192 - nodes in this community are weakly interconnected._
- **Should `MapMissionControl.jsx` be split into smaller, more focused modules?**
  _Cohesion score 0.09446693657219973 - nodes in this community are weakly interconnected._
- **Should `dependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.06060606060606061 - nodes in this community are weakly interconnected._