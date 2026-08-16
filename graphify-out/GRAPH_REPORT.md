# Graph Report - kpm-inventory-main  (2026-08-16)

## Corpus Check
- 100 files · ~602,693 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 782 nodes · 1335 edges · 51 communities (48 shown, 3 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 25 edges (avg confidence: 0.79)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `99fb6971`
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
- AgentProfileView.jsx
- test-batch1.mjs
- test-batch2.mjs
- React + Vite
- Duke3D.jsx
- CLAUDE.md
- Animation prompts — Pip-Boy style, capybara merchant
- savePhotoAndGetReference
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
- MerchantSalesView.jsx
- KPMInventoryApp
- toastSeverity.selfcheck.mjs
- mixedUnits.selfcheck.mjs
- vaultGrace.selfcheck.mjs
- CapybaraMascot.jsx
- 🔴 LOG 2026-08-13 08:15 WIB — QUOTA 100%. Architect redesign UNFINISHED. Fire sprite done, uncommitted. (KPM app session)
- check
- 🔴 LOG 00:37 WIB — superseded: 4 blockers found, now all fixed.
- ✅ LOG 08:36 WIB — the rules question is ANSWERED, and G6 is HALF done. One question owed.
- dev-proxy.mjs
- customerBrief.selfcheck.mjs
- dayStats.selfcheck.mjs
- MerchantSalesView.jsx
- dayStats.selfcheck.mjs
- VaultGate.jsx

## God Nodes (most connected - your core abstractions)
1. `notify()` - 43 edges
2. `confirmAction()` - 37 edges
3. `KPMInventoryApp()` - 28 edges
4. `formatRupiah()` - 23 edges
5. `▶ NOW` - 21 edges
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
- `AuthoritySelect()` --indirect_call--> `k()`  [INFERRED]
  src/components/AuthoritySelect.jsx → .claude/context-watch.mjs
- `KPMInventoryApp()` --references--> `react`  [EXTRACTED]
  src/App.jsx → package.json
- `PermissionMatrixEditor()` --references--> `react`  [EXTRACTED]
  src/components/SettingsView.jsx → package.json

## Import Cycles
- None detected.

## Communities (51 total, 3 thin omitted)

### Community 0 - "App.jsx"
Cohesion: 0.08
Nodes (27): AgentInventoryView, AgentProfileView, BranchWarehouseManager, ConsignmentFinanceView, DashboardView, EODReconciliationView, FleetCanvasManager, HistoryReportView (+19 more)

### Community 1 - "MapMissionControl.jsx"
Cohesion: 0.50
Nodes (3): F — Phone, G — Nothing old was lost, KPM Sales Terminal — test results

### Community 2 - "dependencies"
Cohesion: 0.05
Nodes (36): @emailjs/browser, firebase, idb, leaflet, lucide-react, dependencies, @emailjs/browser, firebase (+28 more)

### Community 3 - "permissions.js"
Cohesion: 0.10
Nodes (32): checkPointInGeoJSON(), CustomerDetailView(), CustomerManagement(), isPointInPolygon(), store(), CORPORATE_TIERS, getCustomerAccessLevel(), isFieldLevelTier() (+24 more)

### Community 4 - "devDependencies"
Cohesion: 0.06
Nodes (31): autoprefixer, cross-env, eslint, @eslint/js, eslint-plugin-react-hooks, eslint-plugin-react-refresh, globals, devDependencies (+23 more)

### Community 5 - "mixedUnits.selfcheck.mjs"
Cohesion: 0.11
Nodes (16): blank, done, eightDaysAgo, far, free, HERE, minefar, near (+8 more)

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

### Community 11 - "AgentProfileView.jsx"
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
Cohesion: 0.38
Nodes (9): MerchantSalesView(), reorderFromLast(), agoLabel(), directionsUrl(), km(), metresLabel(), mine(), nextStop() (+1 more)

### Community 23 - "JourneyView.jsx"
Cohesion: 0.25
Nodes (6): hook, k(), left, lines, pct, AuthoritySelect()

### Community 24 - "hasClearance"
Cohesion: 0.02
Nodes (114): allJs, allowedHex, app, appCode, appCrossed, appFiles, appSrc, archEnd (+106 more)

### Community 25 - "Sales Terminal — test list"
Cohesion: 0.13
Nodes (14): A. The shelf, B. The rail (desktop, wide window), C. The customer brief, D. Money — the part that must be exactly right, E. The merchant, F. Phone (narrow the browser, or use your phone), G. Nothing old was lost, H. Territory and duplicate outlets — built 2026-08-07 (+6 more)

### Community 26 - "LOG — newest first, older entries live in `git log` for this file"
Cohesion: 0.04
Nodes (44): 🟢 13:51 WIB (Lancelot session) — no file changes this turn; those `src/**` edits are the app's, 2026-08-15 14:31 (KPM app session) — the mascot comes back, and steps out when you size him, 2026-08-15 20:46 (KPM app session) — light mode switched on for the first time, and the terminal got a light bench, 2026-08-16 07:40 (KPM app session) — /alucard wifi troubleshooting, no KPM code touched, 2026-08-16 08:18 (KPM app session) — the app was finally OPENED, and two skins were painting over the page, ✅ 23:40 WIB (Lancelot session) — the two potongan methods BUILT. A-Brain `8b20e34`. 103 checks green., 🔴 35 CLASSES WERE PAINTING NOTHING — `a5d0beb`, group 44. **547/547**, 🔴 A SCREEN CAN BE EXEMPT FROM THE THEME — `fdc9bbb`, 548/548 (+36 more)

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
Cohesion: 0.19
Nodes (9): BiohazardTheme(), BULAN, REEL, NotificationBell(), gateCanvasOn(), hasClearance(), DETECTED_TRACKS, musicModules (+1 more)

### Community 31 - "txSize.selfcheck.mjs"
Cohesion: 0.29
Nodes (6): big, line, naive, product, size(), stripped

### Community 32 - "dayStats.selfcheck.mjs"
Cohesion: 0.22
Nodes (12): HistoryReportView(), clampZoom(), ReceiptPreview(), SAMPLE_ROWS, formatSampleQty(), SampleEntryModal(), SamplingAnalyticsView(), SamplingCartView() (+4 more)

### Community 33 - "docChanges.selfcheck.mjs"
Cohesion: 0.19
Nodes (4): useDatabaseSync(), applyDocChanges(), base, baseState

### Community 34 - "plan-quota.mjs"
Cohesion: 0.29
Nodes (5): b64(), candidates, connId, mint(), saved

### Community 35 - "MerchantSalesView.jsx"
Cohesion: 0.60
Nodes (3): formatAdvancedStock(), ItemInspector(), ResidentEvilInventory()

### Community 36 - "KPMInventoryApp"
Cohesion: 0.36
Nodes (7): getDocOfflineSafe(), KPMInventoryApp(), computeDayXP(), clearGrace(), graceIsValid(), readGrace(), touchGrace()

### Community 37 - "toastSeverity.selfcheck.mjs"
Cohesion: 0.28
Nodes (7): FADE, MASCOT_CHATTER, MASCOT_FAILURES, report(), STICKY, isFailure(), isSticky()

### Community 38 - "mixedUnits.selfcheck.mjs"
Cohesion: 0.25
Nodes (9): back(), bksPerUnit(), cello, custom, d, real, totalBks(), convertToBks() (+1 more)

### Community 39 - "vaultGrace.selfcheck.mjs"
Cohesion: 0.33
Nodes (4): body, fnText, graceIsValid, src

### Community 40 - "CapybaraMascot.jsx"
Cohesion: 0.40
Nodes (4): CapybaraMascot(), LOCKED_MESSAGES, LOGGED_IN_MESSAGES, NO_MESSAGES

### Community 41 - "🔴 LOG 2026-08-13 08:15 WIB — QUOTA 100%. Architect redesign UNFINISHED. Fire sprite done, uncommitted. (KPM app session)"
Cohesion: 0.60
Nodes (4): canReachInternet(), useOfflineEngine(), useTransactionEngine(), stripCartItemForStorage()

### Community 42 - "check"
Cohesion: 0.67
Nodes (3): check(), inCss(), inJs()

### Community 43 - "🔴 LOG 00:37 WIB — superseded: 4 blockers found, now all fixed."
Cohesion: 0.33
Nodes (5): assets, css, html, out, out_name

### Community 44 - "✅ LOG 08:36 WIB — the rules question is ANSWERED, and G6 is HALF done. One question owed."
Cohesion: 0.40
Nodes (3): PORT, ROOT, TYPES

### Community 48 - "customerBrief.selfcheck.mjs"
Cohesion: 0.16
Nodes (12): b, guarded, inventory, messy, ok, rows, sameDay, sd (+4 more)

### Community 49 - "dayStats.selfcheck.mjs"
Cohesion: 0.08
Nodes (47): AgentInventoryView(), getCurrentDate(), AuditVaultView(), BranchWarehouseManager(), confirmAction(), promptAction(), CrownTransferProtocol(), DashboardBenchmarks() (+39 more)

### Community 50 - "MerchantSalesView.jsx"
Cohesion: 0.22
Nodes (7): css, dark, light, lum(), PAIRS, ratio(), srgb()

### Community 51 - "dayStats.selfcheck.mjs"
Cohesion: 0.19
Nodes (9): justAfterLocalMidnight, justBeforeLocalMidnight, NOW, rows, s, shuffled, withReturn, dayStats() (+1 more)

### Community 52 - "VaultGate.jsx"
Cohesion: 0.48
Nodes (6): easeInOut(), easeOut(), gateHoldMs(), gateIsRich(), rndWord(), VaultGate()

## Knowledge Gaps
- **381 isolated node(s):** `root`, `note`, `hook`, `now`, `hook` (+376 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **3 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `devDependencies` connect `devDependencies` to `dependencies`?**
  _High betweenness centrality (0.043) - this node is a cross-community bridge._
- **Why does `notify()` connect `dayStats.selfcheck.mjs` to `App.jsx`, `dayStats.selfcheck.mjs`, `permissions.js`, `KPMInventoryApp`, `toastSeverity.selfcheck.mjs`, `🔴 LOG 2026-08-13 08:15 WIB — QUOTA 100%. Architect redesign UNFINISHED. Fire sprite done, uncommitted. (KPM app session)`, `AgentProfileView.jsx`, `savePhotoAndGetReference`?**
  _High betweenness centrality (0.036) - this node is a cross-community bridge._
- **What connects `root`, `note`, `hook` to the rest of the system?**
  _381 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `App.jsx` be split into smaller, more focused modules?**
  _Cohesion score 0.07741935483870968 - nodes in this community are weakly interconnected._
- **Should `dependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.05405405405405406 - nodes in this community are weakly interconnected._
- **Should `permissions.js` be split into smaller, more focused modules?**
  _Cohesion score 0.1 - nodes in this community are weakly interconnected._
- **Should `devDependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.06451612903225806 - nodes in this community are weakly interconnected._