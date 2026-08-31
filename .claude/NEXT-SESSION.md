# NEXT SESSION — read this, then `.claude/PROGRESS.md`. Read no code to orient.

**Written 2026-08-31 19:25 WIB. 673/673 audit · 954/954 selfcheck. Branch `phase0-solid-ground`.**

## First command

```
npm run build; node src/config/integration.audit.mjs; node src/config/logicFixes.selfcheck.mjs
```

PowerShell: `;` not `&&`. **Quote BOTH numbers.** The audit refuses to run against a stale `dist/`.

## To LOOK at the Restock Vault without signing in

```
npx vite build --config tools/ponder-lab.config.mjs; python -m http.server 4187 -d dist-ponderlab
```

`?places` mounts the **whole Restock Vault** against fixtures (`db=null`, so its one listener bails
out and nothing touches Firestore) · `?nota` mounts the surat jalan · `&light`, `&lite`, `&probe`.

The `?places` motorist fixtures carry TIERS on purpose — one above the delivery line and two below —
so the Orang list proves the clearance from both sides instead of just looking populated.

⚠️ **The pane lies twice over.** A screenshot can be a stale frame — the tab underline appeared on
the wrong tab while `getComputedStyle` showed it correctly on the right one. And `document.hidden`
is `true` unless you `tabs_select` first, which stalls React state updates so clicks look ignored.
**Drive it with `element.click()` and read computed values.** A frame is the last word on nothing.

---

## THE ONE JOB — redesign `BranchWarehouseManager` into Duke's Ledger

His own to-do: *"we havent redesign the regional warehouse i think i put that on the to do list"*.
It is the last screen still in the old visual language.

**Load the design stack first — SKILL.md §1a, non-negotiable:** `Aldi's Design Taste.md`, then
`Design Inspiration Sources.md`, then `Skill(impeccable)` with the verb that matches, then
`Skill(emil-design-eng)`, plus `Skill(redesign-skill)` and `Skill(taste-skill)` because this
replaces an existing look. The palette law is locked: no blue, no green, slate + rust + gold, and
the exemption for printed notas does not apply here — this is app UI.

**What the screen already knows**, so the redesign preserves it rather than rediscovering it:
`BranchWarehouseManager.jsx` imports `supplyByProduct`, `warehouseList`, `MASTER` and `bufferDays`
from `src/utils/supply.js`. `MASTER` gets `days: null`, not `0`, on purpose — the master vault is
where shipments come FROM, so "days of cover" is not a question that applies to it. Do not let a
redesign turn that null into a dash that looks like missing data.

**Two things landed today that this screen touches.** The main warehouse is named once now,
`Gudang Pusat (Master Vault)` — longer than the old `MASTER`, so **re-measure anything that
truncates**, `StockByWarehouseTable` on a phone especially. And warehouses now carry a registered
address (`places` collection, `kind: 'gudang'`); showing it here would cost almost nothing.

---

<details>
<summary>Queued — do not start these</summary>

- **Ponder caption static on phones, moving on PC.** DECIDED 2026-08-31, not built. His words: *"to
  save space then let it stay static for phones but move for PC"* and *"u can use /emil design to
  help u do this job"*. Today the phone case is `if (boxW > W * 0.7) return null;` in
  `PonderOverlay.jsx` — it HIDES the caption instead of pinning it. The job is a third state:
  visible, fixed position, phone only.
- **G1 + G2, the money item.** `batchNo` captured at intake and never copied onto
  `branches/{loc}/inventory`; nothing enforces oldest-ships-first.
- **Restock Vault, two notes from the 2026-08-31 review.** Nothing destructive is gated by ROLE —
  what protects it is the screen mounting behind `isAdmin`, the Master Vault password. And landed
  cost spreads shipping/labour/excise equally per UNIT, so a cheap product absorbs the same rupiah
  as an expensive one — **a decision he has not been asked to confirm**, not a bug.
- **Three caption/ring overlaps in Stock by Warehouse on DESKTOP**, beats 7, 16, 22.
- **G5** shrinkage · **G4** records joined by name not id · **Siapkan Pengiriman and the shipping
  modal, still untested by anyone.**
- **9router dies at login.** Its startup script uses `start /min`, which throws the error away. A
  30-second delay plus a redirect into `startup.log` is drafted and **not applied** — it edits a
  file that runs at every login, and he has not said yes.
- **The quota meter is FIXED, do not re-investigate.** Id `76c7cf4f-4c24-4984-aada-3aa91f53a148` in
  `C:/Users/ASUS/.claude/9router-claude-id.txt` — note the `.claude/`.

</details>

**No Firestore rules change is needed for the new `places` collection** — it falls through the
`users/{bossUid}/{document=**}` catch-all to owner and distributor-admin only, which is exactly the
gate the Restock Vault already sits behind. Nothing to deploy.

**Before you finish: rewrite this file with the next single job.**
