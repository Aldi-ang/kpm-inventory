# NEXT SESSION — read this, then `.claude/PROGRESS.md`. Read no code to orient.

**Written 2026-08-31 18:30 WIB. 673/673 audit · 931/931 selfcheck. Branch `phase0-solid-ground`.**

## First command

```
npm run build; node src/config/integration.audit.mjs; node src/config/logicFixes.selfcheck.mjs
```

PowerShell: `;` not `&&`. **Quote BOTH numbers.** The audit refuses to run against a stale `dist/`.

## To LOOK at anything in the Restock Vault

```
npx vite build --config tools/ponder-lab.config.mjs; python -m http.server 4187 -d dist-ponderlab
```

`?nota` mounts the surat jalan · add `&light`, `&lite`, `&probe` · `?perf`, `?plan`, `?book` are the
other slices. **`?nota&probe` prints the receipt's computed background** — the one honest answer to
"is the paper opaque", because a screenshot can catch a fade mid-flight and lie in both directions.

---

## THE ONE JOB — registered factories and warehouses, and Asal/Tujuan on the Masuk panel

His words, 2026-08-31, from the surat jalan screenshot:

> *"asal inside the masuk panel should be the factory location and tujuan should be the warehouse
> location, can be sent to master vault or regional warehouse directly"*

> *"we need to make option to register factory and gudang therefore the adress for both is fixed and
> there is no way to input new name inside the textbox. textbox is used only to search gudang name
> not register a new one unlike sales terminal"*

**What that means in code.** Today both fields are free-text `<input>`s in `RestockVaultView.jsx`
(the Masuk panel writes `supplierName` and `destination` as whatever was typed). They must become a
SEARCH over a registry of places, and typing a name that is not in the registry must not create one.
Two record kinds: **factories** (origins) and **warehouses** (destinations — Master Vault or any
regional branch). Each carries a fixed address.

**The question he has already ANSWERED, so do not ask it again.** Old deliveries keep whatever was
typed into them: *"we can leave the old record thats okay all the record is still on trials and
error anyway."* No migration, no reconciliation prompt, no matching screen. New entries pick from
the registry; old strings stay as strings. That is what makes this a one-day job.

**Two traps.**
- The destination list already exists in part — `NON_BRANCH` and `warehouseList()` in
  `src/utils/supply.js` decide what counts as a shippable place, and the Restock Vault's Tujuan list
  once filtered on its own shorter copy and produced TWO entries for the same place on a form that
  writes stock movements. Reuse `warehouseList()`; do not build a second list beside it.
- The main warehouse is named ONCE now, `MASTER` in `supply.js` = `Gudang Pusat (Master Vault)`,
  and `'MASTER'` in `StockOpnameView.jsx` is a Firestore routing value that must never follow it.
  Checks D13 pin both.

---

<details>
<summary>Queued — do not start these</summary>

- **Ponder caption static on phones, moving on PC.** DECIDED 2026-08-31, not built. His words: *"to
  save space then let it stay static for phones but move for PC"* and *"u can use /emil design to
  help u do this job"*. Today the phone case is `if (boxW > W * 0.7) return null;` in
  `PonderOverlay.jsx` — it HIDES the caption instead of pinning it. The job is a third state:
  visible, fixed position, phone only. Load the §1a design stack plus `Skill(emil-design-eng)`.
- **Redesign `BranchWarehouseManager` into Duke's Ledger** — his own to-do, *"we havent redesign the
  regional warehouse"*. Last screen in the old visual language.
- **G1 + G2, the money item.** `batchNo` captured at intake and never copied onto
  `branches/{loc}/inventory`; nothing enforces oldest-ships-first.
- **Three caption/ring overlaps in Stock by Warehouse on DESKTOP**, beats 7, 16, 22. Reproduce on a
  FRESH load and use a 2-D overlap test.
- **`StockByWarehouseTable` truncates warehouse names on a phone** — and the main warehouse's name
  got LONGER on 2026-08-31, so re-measure before assuming it still fits.
- **G5** shrinkage · **G4** records joined by name not id · **Siapkan Pengiriman and the shipping
  modal, still untested by anyone.**
- **9router dies at login.** Its startup script uses `start /min`, which throws the error away. A
  30-second delay plus a redirect into `startup.log` is drafted and **not applied** — it edits a
  file that runs at every login, and he has not said yes.
- **The quota meter is FIXED, do not re-investigate.** Id `76c7cf4f-4c24-4984-aada-3aa91f53a148` in
  `C:/Users/ASUS/.claude/9router-claude-id.txt` — note the `.claude/`. Both the 5-hour and the
  7-day buckets are watched; silence below 70% is correct.

</details>

WARNING — the preview pane freezes its own clock while hidden. `document.hidden` reads `true`, rAF
never fires, and a CSS fade sits at `currentTime: 0` forever, so an element mid-fade paints
semi-transparent in a screenshot. **This cost half a diagnosis on 2026-08-31 — read a computed
value, never trust a frame, for anything an animation touches.**

**Before you finish: rewrite this file with the next single job.**
