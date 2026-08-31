# NEXT SESSION — read this, then `.claude/PROGRESS.md`. Read no code to orient.

**Written 2026-08-31 09:28 WIB. 672/672 audit · 915/915 selfcheck. Branch `phase0-solid-ground`,
tree clean at `a84024a`.**

🔴 **THE CAPTION RULE, SO IT IS NOT RE-LITIGATED.** On a PC a beat that focuses a real element
shows the MOVING caption; on a phone every beat uses the static bottom bar. Both are his call, both
2026-08-31: *"why the tutorial description is static again on PC"* and *"for phone just let it
static, just make sure that it looks good on phones"*. The switch is one line in `PonderOverlay.jsx`
— `if (boxW > W * 0.7) return null;` — which fires only when the caption would take most of the
stage width. A beat focusing `'*'` stays static everywhere: there is nothing to point at.

⚠️ **THE PREVIEW PANE FREEZES ITS OWN CLOCK WHILE IT IS HIDDEN** — `requestAnimationFrame` never
fires and every `setTimeout` stretches (a 40ms wait measured 810ms), so anything that unmounts on a
timer looks like a hang and any animation looks stuck on frame one. **Front the tab with
`tabs_select` before testing motion.** Afterwards a 100ms timer measured 115ms and rAF fired in 0ms.

## First command

```
npm run build; node src/config/integration.audit.mjs; node src/config/logicFixes.selfcheck.mjs
```

PowerShell: `;` not `&&`. **Quote BOTH numbers.** The audit refuses to run against a stale `dist/`.

---

## 🔴 THE ONE JOB — read the sales-total path and the Restock Vault, then REPORT, do not fix

His words, 2026-08-31: *"now focus on the sales total and also improvement on the restock vault if
needed"*. **"If needed" is the operative half** — this is a diagnosis job first. His standing rule
is to report findings and let him rank them before any code is written.

**Do not start by reading the whole Restock Vault.** It is a large file. Start where a fault would
cost money.

**The sales total — the four call sites are the risk, not the arithmetic.** `src/utils/salesRollup.js`
is pure and already has 27 checks running against real numbers in plain node. What no check can
prove is that a call site still exists, so read these four and confirm each one still adds and
subtracts the same sale:

| path | file |
|---|---|
| the online sale, inside the receipt's own batch | `src/hooks/useTransactionEngine.js` |
| the offline drain, filed on the day the sale was MADE | `src/App.jsx` |
| the three deletes, through one shared `untallyOps` | `src/App.jsx` |
| the history edit, −1 of what stood before, +1 of what was saved | `src/HistoryReportView.jsx` |

`src/utils/salesRollupWrite.js` is the only module that owns the `sales_stats` path. **The rollup is
a CACHE, never the truth** — `transactions` is the record, and Settings › Company · 07 rebuilds
every month from it, so a bug there costs a rebuild and never data.

**Worth checking specifically, because it has never been exercised:** `handleRebuildSalesStats` in
`src/App.jsx`. Aldi has still not pressed it, so the whole rebuild path is unrun code. Read it for
the obvious failure shapes — a partial write that leaves some months rebuilt and others not, no
progress reported while it runs, and what happens if it is pressed twice.

**Restock Vault:** `src/RestockVaultView.jsx`. Two things are already known and unexamined —
**Siapkan Pengiriman and the shipping modal have never been tested by anyone**, and G1/G2 below sit
underneath this screen. Look for a real fault before proposing polish.

**Deliver a ranked list with a cost per item, not a patch.**

### 🔴 ONE FINDING IS ALREADY COMPLETE — the delete/edit tenant split

Sales are SAVED to `artifacts/{appId}/users/{userId}/transactions` where
`userId = bossUid || user.uid` ([App.jsx:412](src/App.jsx:412)). Sales are DELETED and EDITED at
`users/{user.uid}/` — the raw login id, not the tenant key:

| what | where | uid used |
|---|---|---|
| write a sale | `useTransactionEngine.js` | `userId` ✅ |
| rebuild totals | `App.jsx` `handleRebuildSalesStats` | `userId` ✅ |
| delete one / delete folder ×2 | `App.jsx` ~2846–2890 | **`user.uid`** ❌ |
| `untallyOps` beside them | `App.jsx:2794` | **`user.uid`** ❌ |
| edit a sale + its ±1 tally | `HistoryReportView.jsx:377–380` | **`user.uid`** ❌ |

**Owner is safe:** he claims his own id as `bossUid` ([App.jsx:998](src/App.jsx:998)), so the two are
equal and every path agrees. **Anyone with a `bossUid` pointing elsewhere is not.**

**Severity depends on one thing, and it is not a tier.** `isAdmin` is `vaultUnlocked`
([App.jsx:255](src/App.jsx:255)) — the Master Vault password, not a role. The delete and edit
buttons are gated on it ([HistoryReportView.jsx:794, 856, 857](src/components/HistoryReportView.jsx:856)).
So it needs a delegated account whose holder can unlock the vault. Not reachable by an ordinary
subordinate today; live the moment the password is shared or the gate becomes a tier check.

**What goes wrong when it is reached:** `deleteDoc` on a missing document SUCCEEDS in Firestore, so
the UI reports a delete that did not happen, the receipt stays, and `untallyOps` writes a negative
into `users/{their own uid}/sales_stats/` — a document nothing reads. Product Performance keeps
counting the sale. The rollup is a cache and a rebuild repairs the totals; **the un-deleted receipt
is not repaired by anything.**

**This is older than the rollup** — the rollup copied `user.uid` from the delete code beside it.
The fix is mechanical (pass `userId`), but every one of these is a money path: change them together,
add a check that no `users/${user.uid}` string survives in App.jsx or HistoryReportView, and
mutation-test it. **Aldi was told and has not yet said fix or leave.**

---

## 🔴 UNANSWERED — he asked, I answered, he has not replied

> *"wait where is the small box inside the ponder system that move with the higlights panel?"*

It is the `near` caption — [PonderOverlay.jsx](src/ponder/PonderOverlay.jsx:300), rendered at the
`{near && …}` block. **Still alive on desktop** (goods-received 29 beats of 30, product-performance
5 of 12). **Gone on phones by my change**: `if (boxW > W * 0.7) return null;` because at 375px the
box is 349 wide on a 373 stage and every position it could choose sat on the row it was explaining.
Three options were put to him — keep it, force it back on phones anyway (frames prove it covers
rows), or shrink the box on phones so it fits. **He has not chosen. Do not change it unprompted.**

---

## What changed today, so it is not re-derived

- **The tutorial has one door.** All three per-panel `?` chips and `PonderButton.jsx` are gone —
  *"all should be inside the tutorial book on top"*. Checked first that all four scenes were already
  in `sections.js`, so nothing was orphaned.
- **The book shuts and flies back when a scene closes** (`1efeb11`), and the panel has its own
  240ms exit (`c4f2f1b`) so the closing sound is no longer played over an empty screen.
- **The phone caption bug was a smooth scroll that moved nothing** (`aef7f03`) — not the unclamped
  `top` the old brief blamed. `A-Brain/Wiki/Concepts/A Smooth Scroll That Never Runs.md`.

## 🔴 TWO THINGS ONLY ALDI CAN DO

1. **The quota meter is blind.** `.claude/plan-quota.mjs` warns at 70/85/95 and has never run:
   `C:/Users/ASUS/9router-claude-id.txt` and `9router-cookie.txt` do not exist, and the hook exits
   silently without the id. The cookie is a credential — he writes both files himself, never into
   the repo or into chat. Until then there is no 5-hour meter at all, so write `NEXT-SESSION.md`
   then `PROGRESS.md` right after the first commit. The Stop hook blocks on either being stale.
2. **Rebuild sales totals**, Settings › Company · 07, pressed once.

<details>
<summary>Queued behind this — do not start these</summary>

- **G1 + G2, his own doc calls it the money item.** Batch identity dies at the HQ door (`batchNo`
  captured at intake, never copied onto `branches/{loc}/inventory`), and nothing enforces
  oldest-ships-first — age is displayed only.
- **Three caption/ring overlaps in Stock by Warehouse on DESKTOP**, beats 7, 16 and 22. Pre-existing.
  Reproduce on a FRESH load, never by clicking through, and use a 2-D overlap test —
  `!(B.b<=R.t||B.t>=R.b) && !(B.r<=R.l||B.l>=R.r)` — or every *beside* caption reads as a failure.
- **G5** — inventory accuracy and shrinkage never calculated, though the raw numbers exist.
- **G4** — records joined by name, not id. A spelling fix silently splits one product into two.
- **Redesign `BranchWarehouseManager` into Duke's Ledger.** A look job, not a correctness one.
- **`StockByWarehouseTable` truncates warehouse names on a phone** — "GUDAN…". Same squeeze that
  was fixed in `ShipmentPlanTable` by reserving 100px more of its minimum width, but a different
  edit: this one is a Tailwind arbitrary-value grid (`grid-cols-[minmax(0,1fr)_100px_…]`) with
  audit checks pinning the class string, so changing it will move those checks too.
- **The other scenes were never re-checked after the caption fix.** `shipment-plan` went from 3
  moving beats to 11 once the `at:` values were revisited; `product-performance` is still 5 of 12
  and `stock-by-warehouse` 16 of 23. Some of those `bottom` beats may be carrying the same expired
  reason. Measure with the 2-D test before changing any of them.

</details>

**Before you finish: rewrite this file with the next single job.**
