# Graph Report - kpm-inventory-main  (2026-08-27)

## Corpus Check
- 130 files · ~710,710 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1104 nodes · 2014 edges · 62 communities (52 shown, 10 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 38 edges (avg confidence: 0.78)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `7b353a3b`
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
- toastSeverity.selfcheck.mjs
- package.json
- MerchantSalesView.jsx
- VaultGate.jsx
- CapybaraMascot.jsx
- cross-env
- eslint-plugin-react-refresh
- postcss
- tailwindcss
- @vitejs/plugin-react
- undef.check.mjs
- firebase.js
- notify
- MapMissionControl.jsx

## God Nodes (most connected - your core abstractions)
1. `notify()` - 43 edges
2. `KPMInventoryApp()` - 40 edges
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
- `BookLab()` --indirect_call--> `t()`  [INFERRED]
  tools/ponder-lab.jsx → src/config/findDuplicates.selfcheck.mjs
- `Lab()` --indirect_call--> `t()`  [INFERRED]
  tools/ponder-lab.jsx → src/config/findDuplicates.selfcheck.mjs
- `AuthoritySelect()` --indirect_call--> `k()`  [INFERRED]
  src/components/AuthoritySelect.jsx → .claude/context-watch.mjs

## Import Cycles
- None detected.

## Communities (62 total, 10 thin omitted)

### Community 0 - "App.jsx"
Cohesion: 0.08
Nodes (27): AgentInventoryView, AgentProfileView, BranchWarehouseManager, ConsignmentFinanceView, DashboardView, EODReconciliationView, FleetCanvasManager, HistoryReportView (+19 more)

### Community 1 - "MapMissionControl.jsx"
Cohesion: 0.50
Nodes (3): F — Phone, G — Nothing old was lost, KPM Sales Terminal — test results

### Community 2 - "dependencies"
Cohesion: 0.09
Nodes (23): @emailjs/browser, firebase, idb, leaflet, lucide-react, dependencies, @emailjs/browser, firebase (+15 more)

### Community 3 - "CustomerManager.jsx"
Cohesion: 0.15
Nodes (20): arrivalsOnHand(), BranchWarehouseManager(), inTransitQty(), middle(), oldestStockDays(), productArrivals(), receiptBlocked(), receiptDisputed() (+12 more)

### Community 4 - "devDependencies"
Cohesion: 0.10
Nodes (21): autoprefixer, eslint, @eslint/js, eslint-plugin-react-hooks, globals, devDependencies, autoprefixer, eslint (+13 more)

### Community 5 - "mixedUnits.selfcheck.mjs"
Cohesion: 0.05
Nodes (49): b, guarded, inventory, messy, ok, rows, sameDay, sd (+41 more)

### Community 6 - "savePhotoAndGetReference"
Cohesion: 0.05
Nodes (47): react, react, BOOST, boostElement(), buildGainStage(), initSounds(), __isUnlocked(), liteModeOn() (+39 more)

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
Cohesion: 0.17
Nodes (18): AuditVaultView(), confirmAction(), ConfirmHost(), CrownTransferProtocol(), CustomerDetailView(), LandlordDashboard(), notify(), ToastHost() (+10 more)

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
Nodes (153): allJs, allowedHex, app, appCode, appCrossed, appFiles, appSrc, archEnd (+145 more)

### Community 25 - "Sales Terminal — test list"
Cohesion: 0.13
Nodes (14): A. The shelf, B. The rail (desktop, wide window), C. The customer brief, D. Money — the part that must be exactly right, E. The merchant, F. Phone (narrow the browser, or use your phone), G. Nothing old was lost, H. Territory and duplicate outlets — built 2026-08-07 (+6 more)

### Community 26 - "LOG — newest first, older entries live in `git log` for this file"
Cohesion: 0.18
Nodes (17): getDocOfflineSafe(), KPMInventoryApp(), PovBanner(), TierPovSwitch(), computeDayXP(), CORPORATE_TIERS, canUsePovSwitch(), previewIdentity() (+9 more)

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
Cohesion: 0.09
Nodes (41): AgentInventoryView(), Money(), formatAdvancedStock(), ItemInspector(), ResidentEvilInventory(), formatSampleQty(), SampleEntryModal(), SamplingAnalyticsView() (+33 more)

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
Cohesion: 0.15
Nodes (14): BiohazardTheme(), BULAN, REEL, NotificationBell(), easeInOut(), easeOut(), gateCanvasOn(), gateHoldMs() (+6 more)

### Community 36 - "KPMInventoryApp"
Cohesion: 0.18
Nodes (10): 1. What we are copying, and what we are not, 2. 🔴 THE DECISION THAT SHAPES EVERYTHING — demo data, not live data, 3. Scene format, 4. Prerequisite refactor (small, do it first), 5. Files, 6. Traps specific to THIS codebase, 7. Checks to add with the engine, 8. Build order (+2 more)

### Community 37 - "BranchWarehouseManager.jsx"
Cohesion: 0.29
Nodes (7): scripts, build, deploy, dev, lint, lint:undef, preview

### Community 39 - "vaultGrace.selfcheck.mjs"
Cohesion: 0.33
Nodes (4): body, fnText, graceIsValid, src

### Community 40 - "CapybaraMascot.jsx"
Cohesion: 0.06
Nodes (29): app, appFiles, boundary, branch, brief, dashPanel, dashView, daystats (+21 more)

### Community 41 - "✅ THE LIGHT DUKE'S LEDGER IS BUILT — 524/524, contrast self-check passes"
Cohesion: 0.12
Nodes (15): 🟢 2026-08-26 21:03 — DOUBLE SCROLLBAR KILLED, SIDEBAR EXPLAINED. `999b5a7`. **616/616.**, 🟢 2026-08-26 22:05 — RESUME BRIEF WRITTEN. `775c791`. Session ready to clear., 🟢 2026-08-27 07:40 — REQUEST TAB + ROSTER TUJUAN + SEBARAN STOK. `76de71a`. **627/627.**, 🟢 2026-08-27 07:55 — DRIVEN LIVE. `20c4a0a`. **628/628.** One bug caught on screen., 🟢 2026-08-27 08:12 — SEBARAN STOK REDESIGNED. `d042520`. **630/630.**, 🟢 2026-08-27 08:14 — TIMESTAMP ONLY. No code changed since `d042520`., 🟢 2026-08-27 08:40 — VAGUE LABELS GONE; THE ESTIMATE SHOWS ITS WORKING. **631/631.**, 🟢 2026-08-27 08:45 — "SJ" SPELLED OUT ON THE DESK. **631/631.** (+7 more)

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
Nodes (8): First command, How to see it, NEXT SESSION — read this, then `.claude/PONDER-PLAN.md`. Read no code to orient., 🔴 THE ONE JOB — write the Sales Terminal tutorial: **Titip vs Lunas**, Traps, each of which has already cost time here, What has to exist, What the scene has to teach, Where things live

### Community 48 - "toastSeverity.selfcheck.mjs"
Cohesion: 0.33
Nodes (5): FADE, MASCOT_CHATTER, MASCOT_FAILURES, STICKY, isFailure()

### Community 49 - "package.json"
Cohesion: 0.40
Nodes (4): name, private, type, version

### Community 50 - "MerchantSalesView.jsx"
Cohesion: 0.22
Nodes (7): css, dark, light, lum(), PAIRS, ratio(), srgb()

### Community 51 - "VaultGate.jsx"
Cohesion: 0.09
Nodes (35): hook, k(), left, lines, pct, AuthoritySelect(), HistoryReportView(), HoldButton() (+27 more)

### Community 52 - "CapybaraMascot.jsx"
Cohesion: 0.40
Nodes (4): CapybaraMascot(), LOCKED_MESSAGES, LOGGED_IN_MESSAGES, NO_MESSAGES

### Community 59 - "undef.check.mjs"
Cohesion: 0.29
Nodes (6): BASELINE, eslint, fixed, found, seen, unexpected

### Community 61 - "firebase.js"
Cohesion: 0.13
Nodes (15): LazyTabBoundary, big, line, naive, product, size(), stripped, canReachInternet() (+7 more)

### Community 63 - "notify"
Cohesion: 0.10
Nodes (37): DashboardBenchmarks(), groupDigits(), pct(), toBal(), DashboardView(), SERIES, share(), PaceChart() (+29 more)

### Community 64 - "MapMissionControl.jsx"
Cohesion: 0.08
Nodes (40): promptAction(), checkPointInGeoJSON(), CustomerManagement(), isPointInPolygon(), L, store(), getCustomerAccessLevel(), AGENT_COLORS (+32 more)

## Knowledge Gaps
- **509 isolated node(s):** `root`, `note`, `hook`, `now`, `hook` (+504 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **10 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `devDependencies` connect `devDependencies` to `package.json`, `cross-env`, `eslint-plugin-react-refresh`, `postcss`, `tailwindcss`, `@vitejs/plugin-react`?**
  _High betweenness centrality (0.032) - this node is a cross-community bridge._
- **Why does `dependencies` connect `dependencies` to `package.json`, `savePhotoAndGetReference`?**
  _High betweenness centrality (0.029) - this node is a cross-community bridge._
- **Why does `notify()` connect `AgentProfileView.jsx` to `App.jsx`, `MapMissionControl.jsx`, `CustomerManager.jsx`, `mixedUnits.selfcheck.mjs`, `VaultGate.jsx`, `LOG — newest first, older entries live in `git log` for this file`, `firebase.js`, `BiohazardTheme.jsx`, `txSize.selfcheck.mjs`?**
  _High betweenness centrality (0.026) - this node is a cross-community bridge._
- **Are the 3 inferred relationships involving `KPMInventoryApp()` (e.g. with `t()` and `report()`) actually correct?**
  _`KPMInventoryApp()` has 3 INFERRED edges - model-reasoned connections that need verification._
- **What connects `root`, `note`, `hook` to the rest of the system?**
  _509 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `App.jsx` be split into smaller, more focused modules?**
  _Cohesion score 0.07741935483870968 - nodes in this community are weakly interconnected._
- **Should `dependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.08695652173913043 - nodes in this community are weakly interconnected._