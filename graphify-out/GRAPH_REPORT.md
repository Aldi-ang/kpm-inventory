# Graph Report - kpm-inventory-main  (2026-08-11)

## Corpus Check
- 89 files · ~550,147 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 633 nodes · 1166 edges · 42 communities (40 shown, 2 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 23 edges (avg confidence: 0.79)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `93537490`
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
- MerchantSalesView.jsx
- dayStats.selfcheck.mjs
- MerchantSalesView.jsx
- mixedUnits.selfcheck.mjs
- vaultGrace.selfcheck.mjs
- ExamineModal.jsx
- useTransactionEngine.js

## God Nodes (most connected - your core abstractions)
1. `notify()` - 43 edges
2. `confirmAction()` - 37 edges
3. `KPMInventoryApp()` - 28 edges
4. `PROGRESS — read this, search for nothing` - 26 edges
5. `formatRupiah()` - 23 edges
6. `MerchantSalesView()` - 20 edges
7. `convertToBks()` - 18 edges
8. `AgentProfileView()` - 15 edges
9. `CustomerManagement()` - 14 edges
10. `commitInChunks()` - 14 edges

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

## Communities (42 total, 2 thin omitted)

### Community 0 - "App.jsx"
Cohesion: 0.09
Nodes (22): AgentInventoryView, AgentProfileView, BranchWarehouseManager, ConsignmentFinanceView, DashboardView, EODReconciliationView, FleetCanvasManager, HistoryReportView (+14 more)

### Community 1 - "MapMissionControl.jsx"
Cohesion: 0.50
Nodes (3): F — Phone, G — Nothing old was lost, KPM Sales Terminal — test results

### Community 2 - "dependencies"
Cohesion: 0.05
Nodes (36): @emailjs/browser, firebase, idb, leaflet, lucide-react, dependencies, @emailjs/browser, firebase (+28 more)

### Community 3 - "permissions.js"
Cohesion: 0.10
Nodes (44): AgentInventoryView(), getCurrentDate(), AuditVaultView(), BranchWarehouseManager(), confirmAction(), CrownTransferProtocol(), DashboardBenchmarks(), CustomTooltip() (+36 more)

### Community 4 - "devDependencies"
Cohesion: 0.06
Nodes (31): autoprefixer, cross-env, eslint, @eslint/js, eslint-plugin-react-hooks, eslint-plugin-react-refresh, globals, devDependencies (+23 more)

### Community 5 - "mixedUnits.selfcheck.mjs"
Cohesion: 0.11
Nodes (17): blank, done, eightDaysAgo, far, free, HERE, minefar, near (+9 more)

### Community 6 - "savePhotoAndGetReference"
Cohesion: 0.11
Nodes (23): ConfirmHost(), BOOST, boostElement(), buildGainStage(), initSounds(), __isUnlocked(), liteModeOn(), makePool() (+15 more)

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

### Community 21 - "Animation prompts — Pip-Boy style, capybara merchant"
Cohesion: 0.29
Nodes (6): Animation prompts — Pip-Boy style, capybara merchant, How a sprite sheet gets wired (already possible today), PROMPT — 2D animation sprite sheet (paste this), PROMPT — 3D, only if a rotating merchant is ever wanted, When Aldi generates more images, Why this reference is a good fit

### Community 22 - "savePhotoAndGetReference"
Cohesion: 0.11
Nodes (26): promptAction(), checkPointInGeoJSON(), CustomerDetailView(), CustomerManagement(), isPointInPolygon(), getCustomerAccessLevel(), BorderImporter(), checkPointInGeoJSON() (+18 more)

### Community 23 - "customerBrief.selfcheck.mjs"
Cohesion: 0.16
Nodes (12): b, guarded, inventory, messy, ok, rows, sameDay, sd (+4 more)

### Community 24 - "hasClearance"
Cohesion: 0.04
Nodes (45): allJs, appCode, appFiles, appSrc, beforeNota, boxLeft, BS, CENSUS (+37 more)

### Community 25 - "Sales Terminal — test list"
Cohesion: 0.13
Nodes (14): A. The shelf, B. The rail (desktop, wide window), C. The customer brief, D. Money — the part that must be exactly right, E. The merchant, F. Phone (narrow the browser, or use your phone), G. Nothing old was lost, H. Territory and duplicate outlets — built 2026-08-07 (+6 more)

### Community 26 - "LOG — newest first, older entries live in `git log` for this file"
Cohesion: 0.05
Nodes (37): 2026-08-10 11:44 WIB — his 8 phone items are all built. A-Brain backfilled. One self-inflicted break, fixed., 2026-08-10 11:52 WIB — Hermes → alucard. Not app work. Quota died mid-sweep., 2026-08-10 15:11 WIB — he finished the round, 64/64. G5 broken. Two questions open., 2026-08-10 21:11 WIB — the iPhone silence is fixed. `8c502f7`. Audit 217/217., 2026-08-10 — ✅ HIS PHONE CAN LOG IN NOW. Dev is HTTPS. `b1aee4e`, 2026-08-11 03:12 WIB — the strip names the last order; the IOU bug is a TENANT bug, ✅ CLOSED 20:22 WIB — HERMES → ALUCARD IS DONE. Nothing open on it., ✅ CLOSED: "vault button dead on phone" — it was `crypto.subtle`, fixed `f460297` + `b1aee4e` (+29 more)

### Community 27 - "check-progress.mjs"
Cohesion: 0.29
Nodes (6): hook, note, now, root, SKIP, walk()

### Community 28 - "COMPACTING NOW — what the summary must keep, and what it must drop"
Cohesion: 0.40
Nodes (4): COMPACTING NOW — what the summary must keep, and what it must drop, Drop hard — this is where the waste is, Keep, in this order, Then, immediately after compacting

### Community 29 - "CustomerManager.jsx"
Cohesion: 0.16
Nodes (12): BiohazardTheme(), NotificationBell(), app, auth, db, firebaseConfig, googleProvider, storage (+4 more)

### Community 30 - "dayStats.selfcheck.mjs"
Cohesion: 0.28
Nodes (7): FADE, MASCOT_CHATTER, MASCOT_FAILURES, report(), STICKY, isFailure(), isSticky()

### Community 31 - "txSize.selfcheck.mjs"
Cohesion: 0.29
Nodes (6): big, line, naive, product, size(), stripped

### Community 32 - "MerchantSalesView"
Cohesion: 0.27
Nodes (10): getDocOfflineSafe(), KPMInventoryApp(), gateCanvasOn(), gateHoldMs(), gateIsRich(), computeDayXP(), clearGrace(), graceIsValid() (+2 more)

### Community 33 - "MerchantSalesView.jsx"
Cohesion: 0.70
Nodes (4): easeInOut(), easeOut(), rndWord(), VaultGate()

### Community 34 - "plan-quota.mjs"
Cohesion: 0.29
Nodes (5): b64(), candidates, connId, mint(), saved

### Community 35 - "MerchantSalesView.jsx"
Cohesion: 0.40
Nodes (4): CapybaraMascot(), LOCKED_MESSAGES, LOGGED_IN_MESSAGES, NO_MESSAGES

### Community 36 - "dayStats.selfcheck.mjs"
Cohesion: 0.19
Nodes (9): justAfterLocalMidnight, justBeforeLocalMidnight, NOW, rows, s, shuffled, withReturn, dayStats() (+1 more)

### Community 37 - "MerchantSalesView.jsx"
Cohesion: 0.35
Nodes (10): MerchantSalesView(), reorderFromLast(), agoLabel(), splitToUnits(), directionsUrl(), km(), metresLabel(), mine() (+2 more)

### Community 38 - "mixedUnits.selfcheck.mjs"
Cohesion: 0.25
Nodes (7): back(), bksPerUnit(), cello, custom, d, real, totalBks()

### Community 39 - "vaultGrace.selfcheck.mjs"
Cohesion: 0.33
Nodes (4): body, fnText, graceIsValid, src

### Community 40 - "ExamineModal.jsx"
Cohesion: 0.11
Nodes (20): hook, k(), left, lines, pct, CORPORATE_TIERS, isFieldLevelTier(), isFleetManagementTier() (+12 more)

### Community 41 - "useTransactionEngine.js"
Cohesion: 0.60
Nodes (4): canReachInternet(), useOfflineEngine(), useTransactionEngine(), stripCartItemForStorage()

## Knowledge Gaps
- **278 isolated node(s):** `root`, `note`, `hook`, `now`, `hook` (+273 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **2 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `devDependencies` connect `devDependencies` to `dependencies`?**
  _High betweenness centrality (0.061) - this node is a cross-community bridge._
- **Why does `notify()` connect `permissions.js` to `App.jsx`, `MerchantSalesView`, `MerchantSalesView.jsx`, `ExamineModal.jsx`, `useTransactionEngine.js`, `HallOfFameView.jsx`, `savePhotoAndGetReference`, `dayStats.selfcheck.mjs`?**
  _High betweenness centrality (0.050) - this node is a cross-community bridge._
- **What connects `root`, `note`, `hook` to the rest of the system?**
  _278 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `App.jsx` be split into smaller, more focused modules?**
  _Cohesion score 0.08615384615384615 - nodes in this community are weakly interconnected._
- **Should `dependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.05405405405405406 - nodes in this community are weakly interconnected._
- **Should `permissions.js` be split into smaller, more focused modules?**
  _Cohesion score 0.09743589743589744 - nodes in this community are weakly interconnected._
- **Should `devDependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.06451612903225806 - nodes in this community are weakly interconnected._