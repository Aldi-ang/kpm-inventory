---
name: project-kpm-cost-fix-workflow
description: "The agreed working method and definition of done for the Firestore cost fix — stages, who does what, when to stop"
metadata: 
  node_type: memory
  type: project
  modified: 2026-08-05T05:11:44.660Z
  originSessionId: d25f3677-6e5f-4107-96dc-7e14a0ef4cc5
---

# Cost fix — the workflow

Agreed 2026-08-05. Aldi: *"lets have a clean workflow, usage efficient but to the point with
our goals, consider it done when we achieve our goals"*.

## The goal, stated so it can be checked

**A salesman's phone must read data proportional to HIS OWN work, not the whole team's.**

That is the structural test, and it is the one that matters — it is what makes cost scale in
a straight line with headcount instead of with headcount squared.

**Done when:** at 50 salesmen, projected reads/day sit inside or near Firestore's free
50.000/day, AND no screen has lost data it is entitled to.

**Not a goal:** removing the 7-day window. The window is fine. The problem was always *whose*
records each phone loads.

## Non-negotiables while doing it

- No screen silently loses data. Every stage names its consumers before it changes them.
- No new composite index without Aldi deploying it. A missing index does not degrade — it
  kills the listener outright.
- `firestore.rules` stays a DRAFT — see [[project-kpm-rules-draft-process]].
- Security and anti-fraud are not traded for cost. The geofence gate stays as it is.

## Stages

| # | Stage | State |
|---|---|---|
| 1 | audit_logs → admin only; notifications → server-side filter | ✅ done, `1acabca` |
| 2 | transactions + samplings → scoped by agent for non-admins | ⛔ blocked, see below |
| 3 | eod_reports / account_transfers → check who really needs them | not started |
| 4 | Re-measure, then stop | — |

## 🔴 TRAPS FOUND — read before touching either collection

**Notifications use `agentId`. NOT `targetId`, NOT `targetRole`.** Every write in App.jsx
sets `agentId` (`:1470`, `:1500`, `:1513`). A server-side `where('targetId', ...)` matches
nothing, silently. I did this in `1acabca` and reverted it in `f8196ea`; the code at
App `:300` already carried a warning that the same filter "was already tried once and
dropped notifications it shouldn't have". **Filtering notifications needs the write side
unified on one field name and old docs backfilled FIRST.**

**There are TWO notification listeners.** The live one that feeds the bell is
`App.jsx :305` → `systemNotifs`. The one in `useDatabaseSync` is described at `App :412` as
"the broken 'notifications' variable" and is effectively dead. Fix the App.jsx one, not the
hook's.

**The journey map's "who visited today" is built from `transactions`** — `JourneyView :270`
maps today's transactions to `visitData[store] = tx.agentName`. Scoping transactions per
agent would make each salesman see only his OWN visits, silently breaking the team-coverage
feature that is the whole point of the map. **Fix: read visit status from the customer
document instead (`lastVisit`, `lastVisitedBy`, `lastVisitTag`, `lastVisitNote` — already
written, already shared, already cheap). Do that BEFORE scoping.**

## What salesmen legitimately share (Aldi, 2026-08-05)

Only these cross-agent things exist, and each needs its own answer before scoping:
1. **Leaderboard** (agent profile) → becomes an EOD snapshot, regional only
2. **Journey map visit status** → move to the customer doc, see above
3. **Hand-off** in Receivables & Consignment → notifications, already targeted
4. **Customer profile** → ⛔ **OUT OF SCOPE, its own session.** Aldi, 2026-08-05: *"we need
   our own discussion for that customer profile... it is out of our plan to redesign this app
   as a whole"*. It is a privacy decision about what one salesman sees of another's
   customers, not a technical one. **Do not fold it into terminal work.**
5. **Competitor intelligence** → salesmen fill it in; shared by design

## Regional = a fleet/roster TEAM. The field is `location`.

One team per area. Own base, own regional warehouse, a subsidiary channel of HQ. Leaderboard
is scoped to that team only.

**The field is `location` on the agent / motorist record** — `myProfile?.location`,
`user?.location`, `m.location`. Confirmed at `src/FleetCanvasManager.jsx :37-45`, which
already filters the roster with it. Sentinel values to exclude: `UNASSIGNED`,
`UNASSIGNED AREA`, `Headquarters`.

The same field drives the regional warehouse path —
`branches/{location}/inventory` in `components/BranchWarehouseManager.jsx`. So **one field
ties the team, the warehouse and the leaderboard together.**

⚠️ **Normalisation trap.** `FleetCanvasManager` compares it `.trim().toLowerCase()` but
builds the warehouse path from the trimmed, NOT-lowercased value (`branchPathLocation`,
`:38-39`). Any leaderboard keyed on `location` must normalise the same way the roster does,
or "Bekasi" and "bekasi" become two teams and the board splits in half.

Per-person history lives in `src/components/HistoryReportView.jsx` (Aldi, 2026-08-05).

## ⛔ Stage 2 is blocked on ONE question

**Do salesmen see team-wide figures anywhere — a leaderboard, a team average, a benchmark?**

`DashboardBenchmarks.jsx` and `DashboardView.jsx` both read `transactions`. If a salesman's
dashboard compares him to the team, scoping his listener to his own records silently shows
him wrong numbers. If it only ever shows his own, stage 2 is safe and is the single biggest
win available.

Guessing here is worse than waiting.

## One stage at a time

Each stage: name the consumers → change one listener → build → self-checks → commit → Aldi
checks the Firebase console the next working day. Do not batch stages; the console reading is
the only real feedback and batching destroys it.

## Who does what

Only Aldi can: read the Firebase console, deploy indexes or rules, test on a real phone in a
real shop, and answer the benchmark question above.

Delegate to 9router (`localhost:20128`, free tier) when a stage needs bulk mechanical output —
a sweep of every consumer of a prop across ~150 files, for example. Judgement calls about
what a screen is *entitled* to stay here. See [[feedback-9router-subordinate-delegation]].

Related: [[project-kpm-terminal-next-features]], [[project-kpm-merchantsales-redesign-brief]]
