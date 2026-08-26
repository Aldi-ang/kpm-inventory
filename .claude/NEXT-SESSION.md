# The job for next session

## 📋 PASTE THIS — it is the whole prompt, nothing else needed

```
/alucard

Two things, in this order. Read .claude/NEXT-SESSION.md first.

1. Brainstorm with me: how HQ sends stock to a regional warehouse ON PURPOSE, without
   waiting for the regional admin to request it. We do not have that feature. Bring me
   options before writing any code.
2. Then split Stok Kritis per warehouse, with a minimum-stock setting per warehouse.

Keep the dev server on 5173. I will unlock the vault when you ask.
```

---

## ⚠️ THE VIEWING PATH — read this before wasting a turn

**`claude-in-chrome` against HIS Chrome on `https://localhost:5173`.** It works.
`tabs_context_mcp` → `navigate` → `computer{screenshot}`.

🔴 **THE DASHBOARD IS A LAZY CHUNK.** Vite hot-updates `App.jsx`, `theme.css` and any plain
import — but **an already-resolved lazy chunk does not hot-swap**, so JSX edits to
`DashboardView` / `DashboardBenchmarks` need a **full reload**, and a reload drops him at the
**MASTER VAULT lock screen**. That is his password, not yours. Batch your edits and spend ONE
unlock, not four. This cost four unlocks last session.

⚠️ **The console is flooded** with ~60 Firestore "update time in the future" warnings.
`read_console_messages` shows the FIRST n, so pass **`limit: 200`** to reach the real error at
the tail. A collector armed via `javascript_tool` is wiped by any reload.

⚠️ **`javascript_tool` is blocked** if the script contains a query string (`?t=`) or certain
literals. Read component props through the React fiber instead — walk up from `.kpm-dash` to the
first `memoizedProps` with `inventory`. That is how the "supply returns 5 rows" fact was
established without guessing.

---

## 🧠 JOB 1 — BRAINSTORM FIRST, NO CODE

> *"how do we sent our product from HQ to regional warehouse on purpose without fullfill regional
> admin request tho, i dont think we have that features yet"*

✅ **HE IS RIGHT. VERIFIED.** Every write path into `branches/{loc}/inventory` was checked. There
are exactly three, and **none is HQ deciding to send something**:

| path | who starts it |
|---|---|
| `BranchWarehouseManager.jsx:438` → `stock_requests` `status:'PENDING'` | **the BRANCH**, from the branch screen |
| `App.jsx:1877` / `:1888` | an agent's end-of-day return |
| `FleetCanvasManager.jsx:305` / `:411` | a van being loaded/unloaded |

⚠️ **THE RULE THAT MUST SURVIVE ANY DESIGN:** `BranchWarehouseManager.jsx:505` credits the branch
with **what the branch COUNTED**, never what HQ claimed to have sent. That screen exists for that
one line. A push feature must not bypass it — the branch still counts on arrival.
There is also a double-credit guard at `:499` (a second tap used to invent stock).

**The shape to bring him:** reuse the same `stock_requests` document, created at HQ instead of at
the branch, skipping PENDING and starting in a "shipped, awaiting count" state. Costs no new
collection and keeps the count-on-arrival rule. Bring at least one alternative and the trade-offs.

---

## 🔨 JOB 2 — SPLIT STOK KRITIS, PER-WAREHOUSE MINIMUM

> *"split the stock kritis and add option to setting minimum stock to trigger this"*

✅ **Already agreed WHY, do not re-litigate:** master low = **order from supplier**; regional low
= **move stock from master**. Different jobs, so one merged alert cannot say which — and a full
master would hide an empty branch that has quietly stopped selling.

⚠️ **THE HONEST PROBLEM, tell him:** until Job 1 exists, a "Muntilan is low" alert names an action
the app cannot perform. The only thing it can say is *"ask Muntilan to raise a request"*. That is
why the brainstorm comes first.

**Where the work is**
- `App.jsx` (~L1292) — `lowStockItems` filters `inventory` alone. **Master-only.**
- Branch shelves are **already loaded** as `branchStock` from `useDatabaseSync`. No new listener.
- `src/utils/stockThreshold.js` — the rule. Today the company default is
  `defaultMinStockQty` + `defaultMinStockUnit`; he wants it **per warehouse**, so something like
  `minStockByWarehouse: { MASTER: {qty,unit}, MUNTILAN: {...} }` with the company value as
  fallback.
- ⚠️ **DO NOT reinterpret `product.minStock`** — it is in **BKS**, every product already carries a
  value in that unit, and changing its meaning silently moves every threshold he has ever set.
  Only the company/warehouse default speaks units.
- The setting UI lives in **Konfigurasi Target** (`DashboardBenchmarks.jsx`).

---

## ✅ Verify

```
npm run build; npm run lint:undef; node src/config/integration.audit.mjs; node src/config/logicFixes.selfcheck.mjs; node src/config/stockThreshold.selfcheck.mjs; node src/config/contrast.selfcheck.mjs
```
Baseline: **607/607**, **825/825**, **26/26**, all contrast pairs, `lint:undef` clean.

🔴 **`npm run lint:undef` IS NOT OPTIONAL.** A green build is not a check that identifiers exist —
that is exactly how `setScrub is not defined` shipped a blank dashboard last session while all
five other checks passed. Full lint has ~290 pre-existing findings, so this gates the one rule
that separates "untidy" from "blank screen".

⚠️ **`integration.audit` reads BUILT output** — rebuild before running it.

---

<details>
<summary>Locked decisions — do not re-open</summary>

- **No running totals anywhere.** HARI/MINGGU/BULAN/TAHUN only. *"dont use total"*.
- **No laba/margin on the dashboard.** The plumbing is real (`profitSnapshot` = sold − distributor
  price) but reads 1,0% because cost prices are unfilled. ⚠️ **If he ever fills in distributor
  prices, it becomes worth showing.**
- **Warehouse list comes from the ROSTER** — distinct motorist `location` except Headquarters.
  **HQ IS the master vault**, not a branch. Firestore cannot list subcollections.
- **Supply bars are each their own 100%** — he reversed the cross-product scaling after seeing it.
- **Hour-of-day strip: dropped.** Wrong for a distributor. The useful version is *which agent
  sold what*, which is the leaderboard grown up.
- **Money owed on the dashboard: deferred.** Needs `ConsignmentFinanceView` wiring.
- Palette: no blue, no green · amber is an edge/ink/lamp, **never a slab** · a plate carries its
  own ink · **Lite Mode strips shadow/blur/filter** — never let one carry meaning.

### Also open, unranked
- 🔴 **`MapMissionControl.jsx:1551` and `:1553` call `getDoc` without importing it**, inside a
  try/catch, so it fails silently forever. Same shape as the bug that disabled the rank engine
  for months. Pinned in `undef.check.mjs`'s baseline. He has not ranked it.
- 4 files still inline their own `minStock || 50`: `useTransactionEngine.js:270`,
  `MerchantSalesView.jsx:2423`, `ResidentEvilInventory.jsx:236`, **`StockOpnameView.jsx:1003`
  (says `5`)**. They should route through `isLowStock()`.
- Stock Opname, Fleet and Master Vault each open **their own** branch listeners for data that is
  now in `branchStock`. His principle: *"we always use the same database ... so all the
  components can be connected"*.
- **Merge to main** — last of all.

</details>
