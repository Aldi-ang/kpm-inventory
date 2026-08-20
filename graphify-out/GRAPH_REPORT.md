# Graph Report - kpm-inventory-main  (2026-08-20)

## Corpus Check
- 108 files · ~682,866 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1008 nodes · 1685 edges · 62 communities (56 shown, 6 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 22 edges (avg confidence: 0.77)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `dc08be0a`
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
- toastSeverity.selfcheck.mjs
- PROGRESS.md
- vaultGrace.selfcheck.mjs
- CapybaraMascot.jsx
- ✅ THE LIGHT DUKE'S LEDGER IS BUILT — 524/524, contrast self-check passes
- check
- 🔴 LOG 00:37 WIB — superseded: 4 blockers found, now all fixed.
- ✅ LOG 08:36 WIB — the rules question is ANSWERED, and G6 is HALF done. One question owed.
- dev-proxy.mjs
- firebase.js
- nextStop.js
- dayStats.selfcheck.mjs
- MerchantSalesView.jsx
- MerchantSalesView.jsx
- VaultGate.jsx
- mixedUnits.selfcheck.mjs
- context-watch.mjs
- 🔴 2026-08-17 ~04:00 — the unverified first pass of that review (superseded by the entry above)
- CapybaraMascot.jsx
- 🔎 2026-08-17 17:1x — LOGIC REVIEW: 7 FLAWS FOUND, ALL WRITTEN TO THE BACKLOG
- ✅ 2026-08-17 08:48 — REVIEW VERIFIED: **44 CONFIRMED, 34 REFUTED**. FIRST FIX LANDED.
- ✅🔴 2026-08-17 18:3x — WORKFLOW RESUMED: 3 CONFIRMED, ~60 UNVERIFIED. QUOTA OUT AGAIN (resets 23:20).
- firebase.js
- notify
- MapMissionControl.jsx

## God Nodes (most connected - your core abstractions)
1. `notify()` - 43 edges
2. `10. How to work on this — the workflow that earned his approval` - 39 edges
3. `confirmAction()` - 37 edges
4. `KPMInventoryApp()` - 33 edges
5. `formatRupiah()` - 29 edges
6. `MerchantSalesView()` - 23 edges
7. `convertToBks()` - 23 edges
8. `storeKey()` - 22 edges
9. `🔴🔴 THE SPEC — EOD SETORAN REDESIGN, FULL HANDOVER` - 19 edges
10. `AgentProfileView()` - 17 edges

## Surprising Connections (you probably didn't know these)
- `JourneyView()` --indirect_call--> `k()`  [INFERRED]
  src/JourneyView.jsx → .claude/context-watch.mjs
- `AuthoritySelect()` --indirect_call--> `k()`  [INFERRED]
  src/components/AuthoritySelect.jsx → .claude/context-watch.mjs
- `KPMInventoryApp()` --references--> `react`  [EXTRACTED]
  src/App.jsx → package.json
- `PermissionMatrixEditor()` --references--> `react`  [EXTRACTED]
  src/components/SettingsView.jsx → package.json
- `SettingsView()` --references--> `react`  [EXTRACTED]
  src/components/SettingsView.jsx → package.json

## Import Cycles
- None detected.

## Communities (62 total, 6 thin omitted)

### Community 0 - "App.jsx"
Cohesion: 0.09
Nodes (21): AgentInventoryView, AgentProfileView, BranchWarehouseManager, ConsignmentFinanceView, DashboardView, EODReconciliationView, FleetCanvasManager, HistoryReportView (+13 more)

### Community 1 - "MapMissionControl.jsx"
Cohesion: 0.50
Nodes (3): F — Phone, G — Nothing old was lost, KPM Sales Terminal — test results

### Community 2 - "dependencies"
Cohesion: 0.05
Nodes (36): @emailjs/browser, firebase, idb, leaflet, lucide-react, dependencies, @emailjs/browser, firebase (+28 more)

### Community 3 - "CustomerManager.jsx"
Cohesion: 0.28
Nodes (7): FADE, MASCOT_CHATTER, MASCOT_FAILURES, report(), STICKY, isFailure(), isSticky()

### Community 4 - "devDependencies"
Cohesion: 0.06
Nodes (31): autoprefixer, cross-env, eslint, @eslint/js, eslint-plugin-react-hooks, eslint-plugin-react-refresh, globals, devDependencies (+23 more)

### Community 5 - "mixedUnits.selfcheck.mjs"
Cohesion: 0.11
Nodes (16): blank, done, eightDaysAgo, far, free, HERE, minefar, near (+8 more)

### Community 6 - "savePhotoAndGetReference"
Cohesion: 0.13
Nodes (22): ConfirmHost(), BOOST, boostElement(), buildGainStage(), initSounds(), __isUnlocked(), liteModeOn(), makePool() (+14 more)

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
Cohesion: 0.36
Nodes (8): BiohazardTheme(), easeInOut(), easeOut(), gateCanvasOn(), gateHoldMs(), gateIsRich(), rndWord(), VaultGate()

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
Cohesion: 0.29
Nodes (6): app, auth, db, firebaseConfig, googleProvider, storage

### Community 24 - "hasClearance"
Cohesion: 0.02
Nodes (119): allJs, allowedHex, app, appCode, appCrossed, appFiles, appSrc, archEnd (+111 more)

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
Cohesion: 0.22
Nodes (6): BULAN, REEL, NotificationBell(), DETECTED_TRACKS, musicModules, MusicPlayer()

### Community 31 - "txSize.selfcheck.mjs"
Cohesion: 0.12
Nodes (32): AgentProfileView(), BADGE_CATEGORIES, createImage(), DynamicIconMap, getCroppedImg(), AchievementTester(), BASE_STATS, buildFakeCareer() (+24 more)

### Community 32 - "dayStats.selfcheck.mjs"
Cohesion: 0.08
Nodes (43): EODAgentFlow(), summaryRow(), clampLine(), EODCardDeck(), HINTS, ICONS, receiptActual(), toNum() (+35 more)

### Community 33 - "docChanges.selfcheck.mjs"
Cohesion: 0.19
Nodes (4): useDatabaseSync(), applyDocChanges(), base, baseState

### Community 34 - "plan-quota.mjs"
Cohesion: 0.29
Nodes (5): b64(), candidates, connId, mint(), saved

### Community 36 - "KPMInventoryApp"
Cohesion: 0.36
Nodes (7): getDocOfflineSafe(), KPMInventoryApp(), computeDayXP(), clearGrace(), graceIsValid(), readGrace(), touchGrace()

### Community 37 - "toastSeverity.selfcheck.mjs"
Cohesion: 0.25
Nodes (8): ✗ #11 REFUTED — no code changed. **Score is 74 real, not 75.**, 🔒 LOCKED 2026-08-18 — SALE IS FINAL, 🔴 NEXT, in damage order, 🔧 PLAN A UNDERWAY — 12 FIXES SHIPPED, EVERY ONE SELF-CHECKED, Shipped (12) — each verified BEFORE its commit, Task list (harness tasks — survives compaction), 📋 Testing is OFF his plate — stop putting ✅ TEST asks in chat replies, ✅ THE SELF-CHECK HARNESS — `src/config/logicFixes.selfcheck.mjs`

### Community 38 - "PROGRESS.md"
Cohesion: 0.13
Nodes (14): 🔴 17 — THE EOD SUBMITS EXPECTED FIGURES, NOT COUNTED ONES (`EODReconciliationView.jsx:494-511`), 🔴 2026-08-17 00:50 — HIS THREE CORRECTIONS AFTER SEEING IT LIVE (all fixed above), ✅ 2026-08-17 02:24 — HIS THREE EARLIER CORRECTIONS, BUILT AND RENDERED. `661498f`, 🔴 2026-08-17 03:34 — THE STAMP CEILING. `23d1977`. READ THE MONEY NOTE., ❓ 2026-08-17 08:48 — (ANSWERED — he picked C) the typed-vs-confirm question, ✅ 2026-08-17 09:06 — TRANSFER IS NOW CHECKED, NOT COUNTED. `git log -1`, 🎴 2026-08-17 09:34 — THE FAN CAROUSEL PROTOTYPE IS PUBLISHED. HE ASKED TO SEE IT FIRST., 🎴 2026-08-17 13:36 — CAROUSEL v2. HE APPROVED THE FAN, REJECTED THE TRUNCATED NAMES. (+6 more)

### Community 39 - "vaultGrace.selfcheck.mjs"
Cohesion: 0.33
Nodes (4): body, fnText, graceIsValid, src

### Community 40 - "CapybaraMascot.jsx"
Cohesion: 0.08
Nodes (22): app, appFiles, boundary, branch, brief, daystats, engine, eod (+14 more)

### Community 41 - "✅ THE LIGHT DUKE'S LEDGER IS BUILT — 524/524, contrast self-check passes"
Cohesion: 0.22
Nodes (9): 🟠 2026-08-18 20:52 — the approve button is quiet, and amber is a real colour now. `a0d27b5`, 🟠 2026-08-18 20:58 — SESSION ENDED CLEAN. He is taking the night off., 🟠 2026-08-19 07:55 — THE EOD DOUBLE-SUBMIT. The named button was already safe; two others were not., 🟠 2026-08-19 11:25 — SIX ITEMS INVESTIGATED, NONE FIXED. Evidence banked, quota ran out., 🟠 2026-08-19 11:34 — HE ANSWERED BOTH. And he told me to stop using hard words., ▶ NOW, PROGRESS — read this, search for nothing, 📏 STANDING RULE — TELL IT ONCE (Aldi, 2026-08-18: *"yes"*) (+1 more)

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
Nodes (39): 🟢 13:51 WIB (Lancelot session) — no file changes this turn; those `src/**` edits are the app's, 1. What is being built, in one line, 2026-08-15 14:31 (KPM app session) — the mascot comes back, and steps out when you size him, 2026-08-15 20:46 (KPM app session) — light mode switched on for the first time, and the terminal got a light bench, 2026-08-16 07:40 (KPM app session) — /alucard wifi troubleshooting, no KPM code touched, 2026-08-16 08:18 (KPM app session) — the app was finally OPENED, and two skins were painting over the page, 2026-08-18 12:16 (KPM app session) — 12 fixes, a self-check harness, a locked rule, one finding killed, and the next six jobs written out, 2026-08-18 12:32 (KPM app session) — store hand-off stopped reassigning every shop that shares a name (+31 more)

### Community 48 - "dayStats.selfcheck.mjs"
Cohesion: 0.16
Nodes (11): b, guarded, inventory, messy, ok, rows, sameDay, sd (+3 more)

### Community 49 - "MerchantSalesView.jsx"
Cohesion: 0.40
Nodes (5): ❓ 2026-08-17 09:06 — TWO OPEN QUESTIONS. HIS WORDS, VERBATIM., ✅ Q1 — the transfer shortfall. **ANSWERED 2026-08-17 13:5x. Do not ask again.**, ✅ Q1b — who rules on a dispute? **ANSWERED 2026-08-17 14:0x.**, ✅ Q1c — **CLOSED 2026-08-17 16:5x. HE SCOPED IT OUT, AND HE IS RIGHT.**, 🔴 Q2 — the card carousel. He sent a VIDEO and I watched it. Awaiting a number.

### Community 50 - "MerchantSalesView.jsx"
Cohesion: 0.22
Nodes (7): css, dark, light, lum(), PAIRS, ratio(), srgb()

### Community 51 - "VaultGate.jsx"
Cohesion: 0.19
Nodes (9): justAfterLocalMidnight, justBeforeLocalMidnight, NOW, rows, s, shuffled, withReturn, dayStats() (+1 more)

### Community 52 - "mixedUnits.selfcheck.mjs"
Cohesion: 0.30
Nodes (12): MerchantSalesView(), readDraft(), reorderFromLast(), agoLabel(), paymentLabel(), splitToUnits(), directionsUrl(), km() (+4 more)

### Community 53 - "context-watch.mjs"
Cohesion: 0.25
Nodes (6): hook, k(), left, lines, pct, AuthoritySelect()

### Community 54 - "🔴 2026-08-17 ~04:00 — the unverified first pass of that review (superseded by the entry above)"
Cohesion: 0.50
Nodes (4): 🔴 2026-08-17 ~04:00 — the unverified first pass of that review (superseded by the entry above), 📋 Backlog written for him (A-Brain, committed separately), The five that look most real to me — CHECK EACH BEFORE TOUCHING, ✅ What DID land tonight and is committed

### Community 56 - "CapybaraMascot.jsx"
Cohesion: 0.40
Nodes (4): CapybaraMascot(), LOCKED_MESSAGES, LOGGED_IN_MESSAGES, NO_MESSAGES

### Community 57 - "🔎 2026-08-17 17:1x — LOGIC REVIEW: 7 FLAWS FOUND, ALL WRITTEN TO THE BACKLOG"
Cohesion: 0.50
Nodes (4): 🔎 2026-08-17 17:1x — LOGIC REVIEW: 7 FLAWS FOUND, ALL WRITTEN TO THE BACKLOG, FOURTH PASS, 17:5x — four more, total 17. ONE OF THEM OUTRANKS EVERYTHING ELSE., SECOND PASS, 17:3x — four more, total 11, THIRD PASS, 17:4x — two more, total 13

### Community 59 - "✅ 2026-08-17 08:48 — REVIEW VERIFIED: **44 CONFIRMED, 34 REFUTED**. FIRST FIX LANDED."
Cohesion: 0.67
Nodes (3): ✅ 2026-08-17 08:48 — REVIEW VERIFIED: **44 CONFIRMED, 34 REFUTED**. FIRST FIX LANDED., 🔨 CONFIRMED AND STILL TO DO — none of these need his decision, 🔴 NEEDS HIS DECISION — collected for him, do not act

### Community 60 - "✅🔴 2026-08-17 18:3x — WORKFLOW RESUMED: 3 CONFIRMED, ~60 UNVERIFIED. QUOTA OUT AGAIN (resets 23:20)."
Cohesion: 0.67
Nodes (3): ✅🔴 2026-08-17 18:3x — WORKFLOW RESUMED: 3 CONFIRMED, ~60 UNVERIFIED. QUOTA OUT AGAIN (resets 23:20)., 🔴 EVERYTHING ELSE IS UNVERIFIED — NOT REFUTED, NOT REAL, ✅ THREE FINDINGS THAT PASSED A REAL SKEPTIC — write these to the Backlog first

### Community 61 - "firebase.js"
Cohesion: 0.08
Nodes (26): LazyTabBoundary, formatAdvancedStock(), ItemInspector(), ResidentEvilInventory(), back(), bksPerUnit(), cello, custom (+18 more)

### Community 63 - "notify"
Cohesion: 0.07
Nodes (63): AuditVaultView(), BranchWarehouseManager(), confirmAction(), promptAction(), CrownTransferProtocol(), checkPointInGeoJSON(), CustomerDetailView(), CustomerManagement() (+55 more)

### Community 64 - "MapMissionControl.jsx"
Cohesion: 0.07
Nodes (45): AgentInventoryView(), getCurrentDate(), Money(), DashboardBenchmarks(), CustomTooltip(), DashboardView(), SafetyStatus(), L (+37 more)

## Knowledge Gaps
- **529 isolated node(s):** `root`, `note`, `hook`, `now`, `hook` (+524 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **6 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `devDependencies` connect `devDependencies` to `dependencies`?**
  _High betweenness centrality (0.036) - this node is a cross-community bridge._
- **Why does `storeKey()` connect `MapMissionControl.jsx` to `App.jsx`, `KPMInventoryApp`, `dayStats.selfcheck.mjs`, `VaultGate.jsx`, `mixedUnits.selfcheck.mjs`, `txSize.selfcheck.mjs`, `firebase.js`, `notify`?**
  _High betweenness centrality (0.018) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `KPMInventoryApp()` (e.g. with `t()` and `report()`) actually correct?**
  _`KPMInventoryApp()` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `root`, `note`, `hook` to the rest of the system?**
  _529 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `App.jsx` be split into smaller, more focused modules?**
  _Cohesion score 0.09057971014492754 - nodes in this community are weakly interconnected._
- **Should `dependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.05405405405405406 - nodes in this community are weakly interconnected._
- **Should `devDependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.06451612903225806 - nodes in this community are weakly interconnected._