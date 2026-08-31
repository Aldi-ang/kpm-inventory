# NEXT SESSION — read this, then `.claude/PROGRESS.md`. Read no code to orient.

**Written 2026-08-31 10:07 WIB. 673/673 audit · 915/915 selfcheck. Branch `phase0-solid-ground`,
tree clean at `150a5c9`.**

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

## 🔴 THE ONE JOB — redesign the regional warehouse into Duke's Ledger

`src/components/BranchWarehouseManager.jsx`. He named it himself, 2026-08-31: *"we havent redesign
the regional warehouse i think i put that on the to do list"*. It is the last screen still in the
old visual language, which is what makes the app look half-finished.

**This is a LOOK job with no correctness risk, and it is interactive** — he has an opinion on every
screen. Do not batch a large redesign and present it whole.

**Load the design stack FIRST, it is his standing rule** (`SKILL.md` §1a): `Aldi's Design Taste.md`
and `Design Inspiration Sources.md` from A-Brain, then `impeccable`, `emil-design-eng`,
`ui-ux-pro-max`, plus `redesign-skill` and `taste-skill` because this is a redesign of something
that already ships. **The palette law is locked** — no blue, no green, slate + gold, amber is an
edge and an ink and never a fill. A style pack must never be pointed at KPM.

**The Restock Vault review it follows is DONE — see below. Do not redo it.**

### ✅ THE SALES-TOTAL HALF IS DONE — fixed in `150a5c9`, do not re-investigate

The deletes and the history edit addressed `users/{user.uid}/transactions` while every write and
read uses `users/{userId}/` (`userId = bossUid || user.uid`). Same for the owner, wrong for any
delegated account: Firestore treats deleting a missing document as SUCCESS, so the app reported a
delete that never happened and the un-tally landed in a `sales_stats` nothing reads. Six call sites
now pass `userId`. Check 673 asserts the old spelling cannot return on this path, and two
selfchecks that had been pinning `user.uid` were corrected rather than loosened.

Never reachable in practice — those buttons gate on `isAdmin`, which is `vaultUnlocked` (the Master
Vault password, not a tier), and Aldi confirmed only he holds it. Fixed as a landmine.

**Scope was held deliberately.** `App.jsx` uses `user.uid` legitimately for settings, tiers, audit
logs, map borders and mascot messages, and one branch tests `userId !== user.uid` on purpose. Those
were not touched and are not known to be wrong.



---

### ✅ THE RESTOCK VAULT REVIEW IS DONE — 2026-08-31, nothing urgent found

Read for the failure shapes this codebase actually has, not line by line.

**Clean:** every `catch` reports through `notify` (no silent failures) · every write is awaited ·
**22 of 22** Firestore paths use `activeUserId = masterUserId || user?.uid`, so the tenant split
that bit the receipts is NOT present here · `handleDeletePO` reverses the stock it added, atomically
with `increment(-qty)`, warns in the confirm, and writes an audit line · the landed-cost divide is
guarded against a zero-quantity delivery (`if (!qty) continue`).

**Two things worth his attention, neither urgent:**

1. **Nothing destructive is gated by ROLE.** Edit delivery, Hapus delivery, Hapus request and Hapus
   target render unconditionally (lines ~1426, 1427, 1432, 1526). What actually protects them is the
   whole screen mounting behind `isAdmin` in `App.jsx:4557` — and `isAdmin` is `vaultUnlocked`, the
   Master Vault password. Only Aldi holds it, so this is latent. It becomes real the day he delegates
   or the day that gate becomes a tier check. Same shape as the receipt bug fixed in `150a5c9`.
2. **Landed cost splits extra costs per UNIT, not per value** (`extra / qty`, line ~255): shipping,
   labour and excise are spread equally over every pack in a delivery, so a cheap product absorbs
   the same rupiah as an expensive one. It may well be what he wants — but it drives the "did this
   get dearer?" comparison, so it is a decision rather than an accident. **Ask before changing.**

**Still untested by anyone:** Siapkan Pengiriman and the shipping modal. Nothing structurally wrong
was found by reading, but nobody has ever clicked them.

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
