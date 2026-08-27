# Graph Report - kpm-inventory-main  (2026-08-27)

## Corpus Check
- 125 files · ~702,513 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1071 nodes · 1934 edges · 55 communities (50 shown, 5 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 30 edges (avg confidence: 0.78)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `521b1d96`
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
- nextStop.js
- MerchantSalesView.jsx
- VaultGate.jsx
- undef.check.mjs
- context-watch.mjs
- firebase.js
- notify
- MapMissionControl.jsx

## God Nodes (most connected - your core abstractions)
1. `notify()` - 43 edges
2. `KPMInventoryApp()` - 39 edges
3. `confirmAction()` - 37 edges
4. `convertToBks()` - 32 edges
5. `formatRupiah()` - 29 edges
6. `MerchantSalesView()` - 25 edges
7. `getLocalDayKey()` - 24 edges
8. `StockOpnameView()` - 22 edges
9. `storeKey()` - 22 edges
10. `AgentProfileView()` - 19 edges

## Surprising Connections (you probably didn't know these)
- `JourneyView()` --indirect_call--> `k()`  [INFERRED]
  src/JourneyView.jsx → .claude/context-watch.mjs
- `RestockVaultView()` --indirect_call--> `k()`  [INFERRED]
  src/RestockVaultView.jsx → .claude/context-watch.mjs
- `Lab()` --indirect_call--> `t()`  [INFERRED]
  tools/ponder-lab.jsx → src/config/findDuplicates.selfcheck.mjs
- `AuthoritySelect()` --indirect_call--> `k()`  [INFERRED]
  src/components/AuthoritySelect.jsx → .claude/context-watch.mjs
- `KPMInventoryApp()` --references--> `react`  [EXTRACTED]
  src/App.jsx → package.json

## Import Cycles
- None detected.

## Communities (55 total, 5 thin omitted)

### Community 0 - "App.jsx"
Cohesion: 0.06
Nodes (39): AgentInventoryView, AgentProfileView, BranchWarehouseManager, ConsignmentFinanceView, DashboardView, EODReconciliationView, FleetCanvasManager, HistoryReportView (+31 more)

### Community 1 - "MapMissionControl.jsx"
Cohesion: 0.50
Nodes (3): F — Phone, G — Nothing old was lost, KPM Sales Terminal — test results

### Community 2 - "dependencies"
Cohesion: 0.05
Nodes (37): @emailjs/browser, firebase, idb, leaflet, lucide-react, dependencies, @emailjs/browser, firebase (+29 more)

### Community 3 - "CustomerManager.jsx"
Cohesion: 0.09
Nodes (28): arrivalsOnHand(), BranchWarehouseManager(), inTransitQty(), middle(), oldestStockDays(), productArrivals(), receiptBlocked(), receiptDisputed() (+20 more)

### Community 4 - "devDependencies"
Cohesion: 0.06
Nodes (31): autoprefixer, cross-env, eslint, @eslint/js, eslint-plugin-react-hooks, eslint-plugin-react-refresh, globals, devDependencies (+23 more)

### Community 5 - "mixedUnits.selfcheck.mjs"
Cohesion: 0.05
Nodes (47): b, guarded, inventory, messy, ok, rows, sameDay, sd (+39 more)

### Community 6 - "savePhotoAndGetReference"
Cohesion: 0.07
Nodes (36): ConfirmHost(), ToastHost(), easeInOut(), easeOut(), gateHoldMs(), gateIsRich(), rndWord(), VaultGate() (+28 more)

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
Cohesion: 0.26
Nodes (15): AuditVaultView(), confirmAction(), promptAction(), CrownTransferProtocol(), checkPointInGeoJSON(), CustomerDetailView(), CustomerManagement(), isPointInPolygon() (+7 more)

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
Nodes (147): allJs, allowedHex, app, appCode, appCrossed, appFiles, appSrc, archEnd (+139 more)

### Community 25 - "Sales Terminal — test list"
Cohesion: 0.13
Nodes (14): A. The shelf, B. The rail (desktop, wide window), C. The customer brief, D. Money — the part that must be exactly right, E. The merchant, F. Phone (narrow the browser, or use your phone), G. Nothing old was lost, H. Territory and duplicate outlets — built 2026-08-07 (+6 more)

### Community 26 - "LOG — newest first, older entries live in `git log` for this file"
Cohesion: 0.12
Nodes (23): getDocOfflineSafe(), KPMInventoryApp(), PovBanner(), TierPovSwitch(), CORPORATE_TIERS, canUsePovSwitch(), previewIdentity(), TEST_ACCOUNTS (+15 more)

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
Cohesion: 0.22
Nodes (11): isFleetManagementTier(), AGENT_COLORS, checkPointInGeoJSON(), getHashColor(), getStoreHierarchy(), getStoreIcon(), isPointInPolygon(), JourneyView() (+3 more)

### Community 31 - "txSize.selfcheck.mjs"
Cohesion: 0.07
Nodes (52): AgentProfileView(), BADGE_CATEGORIES, createImage(), DynamicIconMap, getCroppedImg(), AchievementTester(), BASE_STATS, buildFakeCareer() (+44 more)

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
Cohesion: 0.26
Nodes (9): k(), AuthoritySelect(), HoldButton(), SettingsView(), writeCareerLedger(), writeLiteMode(), writePhotoStorage(), ROLE_PERMISSIONS (+1 more)

### Community 36 - "KPMInventoryApp"
Cohesion: 0.18
Nodes (10): 1. What we are copying, and what we are not, 2. 🔴 THE DECISION THAT SHAPES EVERYTHING — demo data, not live data, 3. Scene format, 4. Prerequisite refactor (small, do it first), 5. Files, 6. Traps specific to THIS codebase, 7. Checks to add with the engine, 8. Build order (+2 more)

### Community 37 - "BranchWarehouseManager.jsx"
Cohesion: 0.47
Nodes (6): createdMillis(), findDuplicates(), groupKey(), hasCoords(), metresBetween(), normaliseName()

### Community 39 - "vaultGrace.selfcheck.mjs"
Cohesion: 0.33
Nodes (4): body, fnText, graceIsValid, src

### Community 40 - "CapybaraMascot.jsx"
Cohesion: 0.06
Nodes (29): app, appFiles, boundary, branch, brief, dashPanel, dashView, daystats (+21 more)

### Community 41 - "✅ THE LIGHT DUKE'S LEDGER IS BUILT — 524/524, contrast self-check passes"
Cohesion: 0.13
Nodes (14): 🟢 2026-08-26 21:03 — DOUBLE SCROLLBAR KILLED, SIDEBAR EXPLAINED. `999b5a7`. **616/616.**, 🟢 2026-08-26 22:05 — RESUME BRIEF WRITTEN. `775c791`. Session ready to clear., 🟢 2026-08-27 07:40 — REQUEST TAB + ROSTER TUJUAN + SEBARAN STOK. `76de71a`. **627/627.**, 🟢 2026-08-27 07:55 — DRIVEN LIVE. `20c4a0a`. **628/628.** One bug caught on screen., 🟢 2026-08-27 08:12 — SEBARAN STOK REDESIGNED. `d042520`. **630/630.**, 🟢 2026-08-27 08:14 — TIMESTAMP ONLY. No code changed since `d042520`., 🟢 2026-08-27 08:40 — VAGUE LABELS GONE; THE ESTIMATE SHOWS ITS WORKING. **631/631.**, 🟢 2026-08-27 08:45 — "SJ" SPELLED OUT ON THE DESK. **631/631.** (+6 more)

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
Cohesion: 0.22
Nodes (8): First command, How to actually see it, NEXT SESSION — read this, then `.claude/PONDER-PLAN.md` §4. Read no code to orient., 🔴 THE ONE JOB — PONDER SLICE 2: put the REAL table on the stage, The smallest change that works, The traps, each of which has already cost time, What the code does today, Where things live

### Community 50 - "MerchantSalesView.jsx"
Cohesion: 0.22
Nodes (7): css, dark, light, lum(), PAIRS, ratio(), srgb()

### Community 51 - "VaultGate.jsx"
Cohesion: 0.23
Nodes (17): PermissionMatrixEditor(), canEditFleetRoster(), canPickFromGallery(), canSeeExpectedCount(), CUSTOMER_EDIT_PERMS, defaultFleetAccess(), DYNAMIC_TIERS, FLEET_EDIT_PERMS (+9 more)

### Community 59 - "undef.check.mjs"
Cohesion: 0.29
Nodes (6): BASELINE, eslint, fixed, found, seen, unexpected

### Community 60 - "context-watch.mjs"
Cohesion: 0.40
Nodes (4): hook, left, lines, pct

### Community 61 - "firebase.js"
Cohesion: 0.27
Nodes (6): LazyTabBoundary, canReachInternet(), onlineListeners, setSharedOnline(), subscribeOnline(), useOfflineEngine()

### Community 63 - "notify"
Cohesion: 0.06
Nodes (65): AgentInventoryView(), Money(), DashboardBenchmarks(), groupDigits(), pct(), toBal(), DashboardView(), SERIES (+57 more)

### Community 64 - "MapMissionControl.jsx"
Cohesion: 0.13
Nodes (21): L, store(), createJourneyClusterIcon(), BorderImporter(), checkPointInGeoJSON(), compressCoords(), createCustomClusterIcon(), DraggableAddMarker() (+13 more)

## Knowledge Gaps
- **500 isolated node(s):** `root`, `note`, `hook`, `now`, `hook` (+495 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **5 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `devDependencies` connect `devDependencies` to `dependencies`?**
  _High betweenness centrality (0.033) - this node is a cross-community bridge._
- **Why does `notify()` connect `AgentProfileView.jsx` to `App.jsx`, `MapMissionControl.jsx`, `CustomerManager.jsx`, `useTransactionEngine.js`, `mixedUnits.selfcheck.mjs`, `VaultGate.jsx`, `LOG — newest first, older entries live in `git log` for this file`, `txSize.selfcheck.mjs`, `BiohazardTheme.jsx`, `notify`?**
  _High betweenness centrality (0.031) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `KPMInventoryApp()` (e.g. with `t()` and `report()`) actually correct?**
  _`KPMInventoryApp()` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `root`, `note`, `hook` to the rest of the system?**
  _500 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `App.jsx` be split into smaller, more focused modules?**
  _Cohesion score 0.05612244897959184 - nodes in this community are weakly interconnected._
- **Should `dependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.05263157894736842 - nodes in this community are weakly interconnected._
- **Should `CustomerManager.jsx` be split into smaller, more focused modules?**
  _Cohesion score 0.09246088193456614 - nodes in this community are weakly interconnected._