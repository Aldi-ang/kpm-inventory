# Graph Report - kpm-inventory-main  (2026-08-17)

## Corpus Check
- 105 files · ~622,157 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 867 nodes · 1475 edges · 52 communities (49 shown, 3 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 25 edges (avg confidence: 0.79)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `df92a405`
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
- firebase.js
- nextStop.js
- customerBrief.selfcheck.mjs
- dayStats.selfcheck.mjs
- MerchantSalesView.jsx
- dayStats.selfcheck.mjs

## God Nodes (most connected - your core abstractions)
1. `notify()` - 43 edges
2. `10. How to work on this — the workflow that earned his approval` - 39 edges
3. `confirmAction()` - 37 edges
4. `KPMInventoryApp()` - 28 edges
5. `formatRupiah()` - 25 edges
6. `MerchantSalesView()` - 20 edges
7. `🔴🔴 THE SPEC — EOD SETORAN REDESIGN, FULL HANDOVER` - 19 edges
8. `convertToBks()` - 18 edges
9. `AgentProfileView()` - 15 edges
10. `CustomerManagement()` - 14 edges

## Surprising Connections (you probably didn't know these)
- `AgentProfileView()` --indirect_call--> `k()`  [INFERRED]
  src/AgentProfileView.jsx → .claude/context-watch.mjs
- `JourneyView()` --indirect_call--> `k()`  [INFERRED]
  src/JourneyView.jsx → .claude/context-watch.mjs
- `AuthoritySelect()` --indirect_call--> `k()`  [INFERRED]
  src/components/AuthoritySelect.jsx → .claude/context-watch.mjs
- `KPMInventoryApp()` --references--> `react`  [EXTRACTED]
  src/App.jsx → package.json
- `MapRecenter()` --references--> `react`  [EXTRACTED]
  src/JourneyView.jsx → package.json

## Import Cycles
- None detected.

## Communities (52 total, 3 thin omitted)

### Community 0 - "App.jsx"
Cohesion: 0.09
Nodes (22): AgentInventoryView, AgentProfileView, BranchWarehouseManager, ConsignmentFinanceView, DashboardView, EODReconciliationView, FleetCanvasManager, HistoryReportView (+14 more)

### Community 1 - "MapMissionControl.jsx"
Cohesion: 0.50
Nodes (3): F — Phone, G — Nothing old was lost, KPM Sales Terminal — test results

### Community 2 - "dependencies"
Cohesion: 0.06
Nodes (33): @emailjs/browser, firebase, idb, leaflet, lucide-react, dependencies, @emailjs/browser, firebase (+25 more)

### Community 3 - "permissions.js"
Cohesion: 0.10
Nodes (32): checkPointInGeoJSON(), CustomerDetailView(), CustomerManagement(), isPointInPolygon(), L, store(), getCustomerAccessLevel(), AGENT_COLORS (+24 more)

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
Cohesion: 0.35
Nodes (10): MerchantSalesView(), reorderFromLast(), agoLabel(), splitToUnits(), directionsUrl(), km(), metresLabel(), mine() (+2 more)

### Community 23 - "JourneyView.jsx"
Cohesion: 0.09
Nodes (27): hook, k(), left, lines, pct, react, react, AuthoritySelect() (+19 more)

### Community 24 - "hasClearance"
Cohesion: 0.02
Nodes (118): allJs, allowedHex, app, appCode, appCrossed, appFiles, appSrc, archEnd (+110 more)

### Community 25 - "Sales Terminal — test list"
Cohesion: 0.13
Nodes (14): A. The shelf, B. The rail (desktop, wide window), C. The customer brief, D. Money — the part that must be exactly right, E. The merchant, F. Phone (narrow the browser, or use your phone), G. Nothing old was lost, H. Territory and duplicate outlets — built 2026-08-07 (+6 more)

### Community 26 - "LOG — newest first, older entries live in `git log` for this file"
Cohesion: 0.05
Nodes (39): 10. How to work on this — the workflow that earned his approval, 🎮 2026-08-16 17:30 — THE BIG ONE HE ASKED FOR: animation, 3D, gamification, 🔴 2026-08-16 18:20 — EOD CONCEPTS PUBLISHED (v1 superseded by the entry above), 🔴 2026-08-16 18:25 — EOD v2: HE KILLED C, KEPT A+B, AND NAMED A MISSING RULE, ⚙️ 2026-08-16 19:00 — v3: C AND D HAD NO MOTION, AND THE REASON IS REUSABLE, 📱 2026-08-16 19:15 — v4: PHONE, THE FREE DASHBOARD, AND THE ANIMATION THAT SHOWED NOTHING, ✅ 2026-08-16 19:25 — earlier decisions, still valid: B chosen, Accept short YES, gold on a perfect day, 🏆 2026-08-16 19:35 — HE SPECIFIED THE WHOLE FLOW HIMSELF. THIS SUPERSEDES "BUILD B". (+31 more)

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
Cohesion: 0.09
Nodes (40): EODAgentFlow(), summaryRow(), EODCardDeck(), HINTS, ICONS, toNum(), EODLetter(), SEND_DURATION (+32 more)

### Community 33 - "docChanges.selfcheck.mjs"
Cohesion: 0.19
Nodes (4): useDatabaseSync(), applyDocChanges(), base, baseState

### Community 34 - "plan-quota.mjs"
Cohesion: 0.29
Nodes (5): b64(), candidates, connId, mint(), saved

### Community 35 - "MerchantSalesView.jsx"
Cohesion: 0.08
Nodes (50): AgentInventoryView(), getCurrentDate(), AuditVaultView(), BranchWarehouseManager(), confirmAction(), promptAction(), CrownTransferProtocol(), DashboardBenchmarks() (+42 more)

### Community 36 - "KPMInventoryApp"
Cohesion: 0.36
Nodes (7): getDocOfflineSafe(), KPMInventoryApp(), computeDayXP(), clearGrace(), graceIsValid(), readGrace(), touchGrace()

### Community 37 - "toastSeverity.selfcheck.mjs"
Cohesion: 0.28
Nodes (7): FADE, MASCOT_CHATTER, MASCOT_FAILURES, report(), STICKY, isFailure(), isSticky()

### Community 38 - "mixedUnits.selfcheck.mjs"
Cohesion: 0.25
Nodes (7): back(), bksPerUnit(), cello, custom, d, real, totalBks()

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

### Community 46 - "firebase.js"
Cohesion: 0.05
Nodes (38): 🟢 13:51 WIB (Lancelot session) — no file changes this turn; those `src/**` edits are the app's, 1. What is being built, in one line, 2026-08-15 14:31 (KPM app session) — the mascot comes back, and steps out when you size him, 2026-08-15 20:46 (KPM app session) — light mode switched on for the first time, and the terminal got a light bench, 2026-08-16 07:40 (KPM app session) — /alucard wifi troubleshooting, no KPM code touched, 2026-08-16 08:18 (KPM app session) — the app was finally OPENED, and two skins were painting over the page, 🔴 2026-08-17 00:50 — HIS THREE CORRECTIONS AFTER SEEING IT LIVE. START HERE., ✅ 23:40 WIB (Lancelot session) — the two potongan methods BUILT. A-Brain `8b20e34`. 103 checks green. (+30 more)

### Community 47 - "nextStop.js"
Cohesion: 0.48
Nodes (6): easeInOut(), easeOut(), gateHoldMs(), gateIsRich(), rndWord(), VaultGate()

### Community 48 - "customerBrief.selfcheck.mjs"
Cohesion: 0.16
Nodes (12): b, guarded, inventory, messy, ok, rows, sameDay, sd (+4 more)

### Community 49 - "dayStats.selfcheck.mjs"
Cohesion: 0.29
Nodes (6): app, auth, db, firebaseConfig, googleProvider, storage

### Community 50 - "MerchantSalesView.jsx"
Cohesion: 0.22
Nodes (7): css, dark, light, lum(), PAIRS, ratio(), srgb()

### Community 51 - "dayStats.selfcheck.mjs"
Cohesion: 0.19
Nodes (9): justAfterLocalMidnight, justBeforeLocalMidnight, NOW, rows, s, shuffled, withReturn, dayStats() (+1 more)

## Knowledge Gaps
- **434 isolated node(s):** `root`, `note`, `hook`, `now`, `hook` (+429 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **3 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `devDependencies` connect `devDependencies` to `dependencies`?**
  _High betweenness centrality (0.039) - this node is a cross-community bridge._
- **Why does `notify()` connect `MerchantSalesView.jsx` to `App.jsx`, `permissions.js`, `KPMInventoryApp`, `toastSeverity.selfcheck.mjs`, `🔴 LOG 2026-08-13 08:15 WIB — QUOTA 100%. Architect redesign UNFINISHED. Fire sprite done, uncommitted. (KPM app session)`, `AgentProfileView.jsx`, `savePhotoAndGetReference`, `JourneyView.jsx`?**
  _High betweenness centrality (0.035) - this node is a cross-community bridge._
- **Why does `dependencies` connect `dependencies` to `JourneyView.jsx`?**
  _High betweenness centrality (0.029) - this node is a cross-community bridge._
- **What connects `root`, `note`, `hook` to the rest of the system?**
  _434 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `App.jsx` be split into smaller, more focused modules?**
  _Cohesion score 0.08615384615384615 - nodes in this community are weakly interconnected._
- **Should `dependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.058823529411764705 - nodes in this community are weakly interconnected._
- **Should `permissions.js` be split into smaller, more focused modules?**
  _Cohesion score 0.10256410256410256 - nodes in this community are weakly interconnected._