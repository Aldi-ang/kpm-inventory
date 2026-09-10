# The one job

**Four screens still hardcode their own idea of "low stock". Point all four at
`src/utils/stockThreshold.js`, which was written to settle exactly this and never finished being
adopted.**

---

## Paste this to start the next session

> /alucard
>
> Read `.claude/NEXT-SESSION.md` first — it is the whole job, do not re-read source to re-orient.
>
> **The bug is reproduced.** 2026-09-10 19:49, product `coba baru`, MIN. ALERT left empty, stock
> 1 Bal. Dashboard STOK KRITIS says LOW and prints `ambang 3 bal`. Merchant Sales in Boss Car /
> Master Vault mode shows no low indicator at all. Two screens, one product, opposite answers.
>
> **The job:** point all four hardcoded `|| 50` / `|| 5` call sites at `isLowStock` from
> `src/utils/stockThreshold.js`. The table in the brief has the exact line for each.
>
> **Order, no shortcuts:**
> 1. `npm run build; node src/config/integration.audit.mjs` — owed from 2026-09-10, `44058b1`
>    has never been through it.
> 2. Add the blank-`minStock` guard to `src/config/stockThreshold.selfcheck.mjs` and prove it
>    **RED before** touching any screen.
> 3. Make the four edits. Green. `node src/config/mixedUnits.selfcheck.mjs` stays 12/12.
> 4. Commit, then tell me to re-test `coba baru` — both screens must agree.
>
> Two traps are written in the brief: `isLowStock` takes the whole product, not a number, and
> the blank-MIN.ALERT meaning was settled 2026-08-25 — do not re-decide it.

---

## What the code does today

`src/utils/stockThreshold.js` exists because the fallback "used to be seven" places — its own header
says so, and records Aldi's decision from 2026-08-25. **The module shipped. The adoption did not.**

| call site | today | should be |
|---|---|---|
| `src/components/DashboardView.jsx:102` | `minStockBks(item, appSettings)` — already correct | — |
| `src/components/ResidentEvilInventory.jsx:236` | `item.stock <= (item.minStock \|\| 50)` | `isLowStock(item, appSettings)` |
| `src/hooks/useTransactionEngine.js:317` | `newStock <= (prodData.minStock \|\| 50)` | `isLowStock({ ...prodData, stock: newStock }, appSettings)` |
| `src/MerchantSalesView.jsx:2472` | `item.stock <= (item.minStock \|\| 50)` | `isLowStock(item, appSettings)` |
| `src/StockOpnameView.jsx:1007` | `stat.vault <= (p.minStock \|\| 5)` | `isLowStock({ ...p, stock: stat.vault }, appSettings)` |
| `src/App.jsx` lowStockItems | **UNVERIFIED** — the module header says it was 50 and grep did not surface it. Find it before assuming it is clean. |

**The rule the module already encodes:** a product is low when stock reaches its own `minStock` if
one is set, otherwise the company default held as quantity plus unit (`defaultMinStockQty` and
`defaultMinStockUnit`, default 3 Bal), converted per product using that product's own packing.
`product.minStock` stays in Bks on purpose — reinterpreting it would silently move every threshold a
user has already set.

**So four screens disagree about the word "low" by a factor of ten, between 50 and 5.**

## The trap that makes a lazy patch wrong

**Do not re-decide what a blank MIN. ALERT means.** It was decided on 2026-08-25 and it is already
written down. The job is adoption, not design. Anyone who reopens that question produces a fourth
different answer.

**`isLowStock` takes the whole product, not a number.** Two of the four sites compare a value that is
not `product.stock` — `useTransactionEngine` uses `newStock`, the value *after* the sale, and
`StockOpname` uses `stat.vault`. Spread the object and override `stock`, as in the table. Passing the
raw product compares the wrong quantity, and the screen would look right while being wrong.

**Do not touch the unit of `product.minStock`.** It is Bks and it must stay Bks.

## What is NOT part of this job

**The blank-MIN.ALERT bug is REPRODUCED — 2026-09-10 19:49.** Product `coba baru`, MIN. ALERT left
empty, stock 1 Bal. Dashboard's STOK KRITIS calls it low and prints `ambang 3 bal` — the company
default, so the blank-field fallback genuinely ran this time. Merchant Sales in Boss Car / Master
Vault mode shows **no low indicator at all**, because `item.minStock || 50` reads 1 Bal as far above
50 Bks. **Two screens, one product, opposite answers.** The evidence exists now. **After the fix,
re-test that same product — both screens must agree.**

## Before you claim it is done

1. `npm run build; node src/config/integration.audit.mjs` — **owed from 2026-09-10**, skipped there
   for quota. `44058b1` has not been through it.
2. `node src/config/mixedUnits.selfcheck.mjs` — should stay 12/12.
3. Add one guard to `src/config/stockThreshold.selfcheck.mjs`: a product with a blank `minStock` must
   produce the SAME verdict from every adopted call site. Prove it red before the change.
4. Rewrite this file with the next single job.

<details>
<summary>Queue — do NOT paste these; promote one only when the job above is finished</summary>

### Shipped 2026-09-10

**`44058b1` — the stock panel stopped printing a zero that was not true.** Aldi photographed
`STOK KRITIS` showing ten real packs as `0 BAL`, threshold `ambang 0 bal`. A Bal is 200 Bks for that
product, so `Math.floor(10/200)` is 0. `helpers.js:141 displayQty` has two paths: the AUTO ladder
steps down Karton, Bal, Slop, Bks until the number is true; the pinned-unit path, used whenever the
Dashboard unit selector is set, floored and returned zero. It now falls through to the ladder that
already existed. A pinned unit is still honoured when it fits, so 3 Bal prints `3 BAL`, and a zero
survives only when stock really is zero. Check 12 in `mixedUnits.selfcheck.mjs` imports the real
function and was proven RED before the fix went in. **Build and the 722 audit were not run.**

**The business track is CLOSED and PARKED. Do not reopen it.** All prices live in one place:
`A-Brain/Wiki/Entities/KPM Price Sheet.md`. Read that for a figure, never the Brainstorm notes, which
carry three generations of superseded numbers. Headline: Rp 5 juta/bulan recommended at 25-30 users,
**Aldi leans Rp 10 juta** as intent rather than decision, floor Rp 2 juta, perpetual Rp 250 juta,
copyright **not for sale**, final PPh Rp 0. Legal research with a source per number:
`Brainstorm/2026-09-10_riset-hukum-menjual-kpm.md`. Contract draft as real pasal:
`Brainstorm/2026-09-10_draft-13-pasal-kontrak-kpm.md`. His private brief, published Artifact:
<https://claude.ai/code/artifact/4fed138f-1639-4317-b41f-41bbf6613305>

### Still ship-blocking, and both are his call

* **Rank Config cross-tenant gap.** `artifacts/cello-inventory-manager/settings/{achievements,
  rpg_ranks}` is ONE document shared by every company. Rules coverage was fixed; the shared path was
  not. Safe for one customer, not two — between tobacco competitors that is a confidentiality breach,
  not a bug. **Pasal 10 ayat (3) of the contract draft now promises per-customer separation, so this
  is a clause he cannot honestly sign twice until it is fixed.**
* **PBKDF2.** The SHA-256 master-password hash is unsalted and single-round. `crypto.subtle` already
  offers PBKDF2; a per-company salt and about 100k iterations turns a claim that invites inspection
  into one that survives it. Offered, never answered.

### Rebuild sales totals — DONE, stop asking

Aldi pressed it on **2026-09-09 and again on 2026-09-10** and said so plainly:
*"i said 1 is done which is rebuild sales total i already press that yesterday and todaty"*.
His historical omzet is rebuilt. **Do not put this on a list again.**

⚠️ He had already said so once, at the top of the screenshot message — the word was *"1 done"* — and
it was read past. **When he answers a numbered list by number, read the number before the
attachments.**

### Day one — the rest of the walk, ranked

1. **The toast half of the alarm story, still open.** `Toast.jsx:91` — `if (!item.sticky)` sets the
   dismiss timer, so a sticky toast never expiring is **deliberate**, and sticky toasts already have
   a dismiss path at `:64`. Genuinely open: is the low-stock alarm raised `sticky: true` at all, and
   `Toast.jsx:114` sits at `z-[10000]` above dialogs. The container is `pointer-events-none`, so it
   paints over without swallowing clicks. Lowering it below the dialog layer is the safe half.
2. **The phantom competitor.** A store created today and sold to the same day shows an undismissable
   red `ALREADY SECURED TODAY — Claimed by ANOTHER AGENT`. `CustomerManager.jsx:248` and `:1018`
   default a new customer's `lastVisit` to today; `MerchantSalesView.jsx:536` then falls back to the
   literal string `'another agent'` when `lastVisitedBy` is empty.
3. **New personnel default to `T3: HQ SALES MANAGER`** even when the role picker says Sales Motorist.
4. **The GPS placeholder reads as a value** (`-7.6043, 110.2055`, empty `value`), then Save fails with
   "This outlet has no map pin". The same form's first refusal is `SSOT Violation: You must specify
   the complete Matrix Location...` — jargon in front of a shop owner.

### Phone, at 375x812

* The only way to open the menu is a 14x66px sliver at the right edge (`.kpm-edge-ribbon`,
  `w-[14px] h-[132px]`, `top:-66px`, half of it above the viewport).
* The notification bell is off-screen, x 398 to 445 against a 375 viewport.

### Wording — cheap, each one read by a customer

`49 Bks left in the vehicle` while selling from Master Vault, `Surya 16 (Available: 100 )` with a
trailing space and no unit, the salesperson printed as `ADIKARYASUKSES99`, the EOD verify confirm
claiming "clears their inventory" on a stamps-only card, the EOD `MATCHES` column showing a dash when
the numbers are equal, the audit receipt printing `BAYAR : CASH` on an audit that collected Rp 0.

### Closed — do not reopen

**Money.** A cash refund does not reduce omzet. A completed sale is a closed contract; a retur is the
salesman's private arrangement. Buyback is off for everyone including the owner; Exchange stays.
`A-Brain/Wiki/Concepts/A sale is a closed contract — no cash goes back.md`. That also closes the
walk's `returnTotal` item, written in three places and read by no money calculation, because it is
not company money. Not a bug.

**The sale-proof camera.** `284ea64` plus `1857b97`. T4 to T6 open a real `getUserMedia` view and
have no file input in the DOM in ANY build; T1 to T3 keep the picker. **Do not reintroduce a
build-mode escape hatch** — `1857b97` removed one gated on `import.meta.env.DEV`, and dev is the only
place he tests, so it removed the rule under test in the one place it could be observed. To let a
tier attach a file, turn `photo_pick_from_gallery` ON in the matrix, test, turn it off. Deliberately
untouched: the GPS-bypass proof photo at `MerchantSalesView.jsx:1839` and the NOO storefront photo at
`:2914`.

### Appearance — deferred on purpose, last

About 180 blue and green Tailwind classes in app UI: `MapMissionControl.jsx` 58,
`FleetCanvasManager.jsx` 50, `JourneyView.jsx` 33, `ConsignmentFinanceView.jsx` 33. Receipt and
surat-jalan blues are legal.

### Still owed from earlier sessions

Round 7 Section D of `MANUAL_TEST_CHECKLIST.md` has never been run. C4 needs a second BANDUNG account.
`cdaabc7`, `967e447`, `83f5041` are unverified by eye. Bug 3, the geofence bypass routing, is still
unanswered — and the GPS-bypass approvals were among the nine paths `da71cbd` re-routed, so re-check
before treating it as open.

</details>
