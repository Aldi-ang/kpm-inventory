---
name: project-kpm-terminal-next-features
description: "The agreed plan for what goes into the sales terminal AFTER the rail — ranked, with the one decision Aldi still owes"
metadata: 
  node_type: memory
  type: project
  modified: 2026-08-05T07:49:54.739Z
  originSessionId: d25f3677-6e5f-4107-96dc-7e14a0ef4cc5
---

# Sales terminal — what to build next

Plan artifact: `https://claude.ai/code/artifact/fc3fbe50-49b4-4e40-bce2-1458ed2ef419`
Rail design artifact: `https://claude.ai/code/artifact/8a29c56e-2b59-463d-a1f3-f8daaa5c8fb2`

Brainstormed 2026-08-05 with Aldi, framed as "what does a salesman want when he opens
this". Everything here is **additive** — no existing feature is removed or rerouted, and
the capability census stays part of every commit.

## The order, and it is not arbitrary

Ranked by time saved for a man with a customer waiting, not by how interesting it is.

1. ✅ **DONE `b150666` — the customer brief** (desktop rail). Logic in
   `src/utils/customerBrief.js`, check with `node src/config/customerBrief.selfcheck.mjs`.
2. ✅ **DONE `b150666` — "Same as last time"**, re-priced from today's product record,
   drops/clamps what is not on the van, disabled during a retur.

   **Built from the in-memory 7-day transactions, deliberately — zero extra reads.** A store
   visited less often than weekly shows "no recent order". Reaching further back needs a
   per-customer query AND an index decision; see [[project-kpm-cost-fix-workflow]].
   Rail priority is now: hovered ware → brief → today.
3. **Regional warehouse stock** — second line in the rail beside the van's stock, so
   "I don't have it" becomes "I'll bring two Karton Thursday". Collection exists:
   `branches/{region}/inventory` (see `components/BranchWarehouseManager.jsx`).
4. **Next stop on the route** — from JourneyView; GPS is already in the terminal.
5. **The arrival** — one ~600ms staged reveal on mount. Motion at the threshold is free;
   motion during work is a cost.

## ✅ Item 3 ANSWERED 2026-08-05 — own region only

The salesman sees **his own regional warehouse** — the one his regional team actually
restocks from. For tier 2 and 3 that warehouse **is the main vault**. Not "nearest region
with stock"; that was the larger feature and it is not wanted.

## ✅ Geofence override — decided 2026-08-05

Agreed: **viewing is free, selling stays gated.** A salesman may search and read any store's
brief from anywhere; the moment he tries to commit, the existing gate applies unchanged.
Aldi's words: *"as long as they only view and cant do any sales for stores that doesnt meet
the requirement to do sales then they wont do that"*.

Two changes that follow:
1. **Tier 3 joins tiers 1 and 2** as exempt from the geofence lock.
2. **Move the exemption out of the hardcoded tier list and into the permission matrix**
   (`src/config/permissions.js` + `PermissionMatrixEditor` in `components/SettingsView.jsx`).
   Today it is hardcoded at `MerchantSalesView :46` as
   `isAdmin || tier === 1 || tier === 2`. Aldi wants it configurable for flexibility.

⚠️ This is an anti-fraud control. The client-side gate is UX, not security — the real
enforcement belongs in `firestore.rules`, which is a DRAFT and must never have its `allow`
lines silently changed. See [[project-kpm-rules-draft-process]].

**The trigger for the manual picker is NO GPS FIX (~10s), not "offline".** GPS is satellite
and works with no bars; poor signal breaks sync, which the offline queue already handles.
What actually kills a fix: indoors, cheap phone, battery saver, denied permission.

## The constraint that shapes 1 and 2

`useDatabaseSync.js:42` loads transactions with `where('timestamp','>=', sevenDaysAgo)`.
A store visited fortnightly has **no history in memory**. Both features need one targeted
per-customer query on select. Cheap, but real work — do not plan them as "data is already
there".

## Mobile — SUPERSEDED 2026-08-05. New design agreed in principle.

Mobile design artifact: `https://claude.ai/code/artifact/8feebaa4-f8a2-414d-a4a6-2c642a27af48`

Aldi asked for the brief, last order, next stop + directions and store search on mobile too,
then asked "is this too much data for mobile?". **Answer: as a stack of features yes, but
his own geofence idea solves it.** The phone gets no rail and no dashboard — it gets ONE
context strip showing exactly ONE card, chosen by GPS state:

| State | Card |
|---|---|
| driving (no geofence) | next stop, distance, **Directions** (secondary, not primary — it leaves the app) |
| inside a geofence | that store's brief + **Same as last time** |
| two geofences | same card + a two-way swap. **Caps at two** — three would be a menu; beyond that, fall through to search |
| searching | type-ahead, **nearest first** |
| cart has items | collapses to one line and gives the room BACK to the shelf |

**The rule for the phone/laptop split:** the phone shows what he needs *where he is
standing*; the laptop shows everything at once because the admin isn't standing anywhere.
Warehouse stock and today-vs-yesterday are laptop-only (Aldi's call on warehouse, and it is
right for cost and battery too).

Directions URL pattern already exists — `MapMissionControl.jsx:1266`,
`https://www.google.com/maps/dir/?api=1&destination={lat},{lng}`. Reuse it, do not reinvent.

## 💰 Firebase cost — the real finding

Aldi worried these features would raise the bill. They will not, materially: the brief and
last-order are ONE query per customer selected (~40/day/salesman); next stop, search and the
arrival are zero. The one genuinely expensive item is the **warehouse live listener**, which
is exactly the one he already decided to keep off mobile.

Cost model artifact (interactive, move the sliders):
`https://claude.ai/code/artifact/c2892a7e-853d-4f0e-abac-c6949131f37c`

**Measured baseline 2026-08-05:** Aldi's console showed **1,5K reads / 59 writes per day**
with essentially one person testing. That is the anchor for any estimate.

**But the bill is not coming from features.** `useDatabaseSync.js` opens three live listeners
(transactions, samplings, audit_logs), each pulling **7 days of every record with NO
`limit()`**, on every app open for every user. That is almost certainly the dominant read
cost and dwarfs everything planned. Adding `limit()` to those three is likely the single
biggest saving available. **Check the real Firebase usage breakdown before optimising
anything else.**

## Old mobile note (kept — the layout advice still holds)

The phone layout is right; it was built for one hand, a bright street and a talking
customer. Do NOT port the rail — no width, no cursor. Backport **information**, not layout:
- the Karton/Bal/Slop/Bks breakdown, reached by **tapping** a row rather than hovering
- the customer brief, as a collapsed strip above the manifest

## Explicitly rejected

- **A leaderboard in the terminal.** Rank belongs in the Hall of Fame. On the selling screen
  it competes with a customer and pushes toward volume exactly when discipline about price
  and credit matters most.
- **Anything that adds a step to a routine sale** — that is the tab-switching cost this
  whole rework exists to remove.
- **More animation during work.** The arrival and the deal are the places for motion.

Related: [[project-kpm-merchantsales-redesign-brief]], [[project-kpm-palette-law]]
