# The one job

**The first minute of KPM ends in a red alarm that will not go away. Fix both halves — the
threshold that raises it, and the toast that never leaves.**

This is now the top job because the demo is the next real step with the uncle, and this is what he
sees in minute one of it. Legal research is done (2026-09-10, `1e1d957`). Ship date is still
30 September.

**It got more urgent on 2026-09-10, and not for a reason about code.** The customer will have 25-30
users, which means there is no small slice to pilot on — one branch is nearly the whole company. So
the pilot is bounded by time, everyone is on the app from day one, and **nothing absorbs the first
mistake**. The first minute has to be clean before the pilot opens, not during it.

**Pricing and legal are DONE and PARKED. Do not reopen them.** Canonical numbers:
`A-Brain/Wiki/Entities/KPM Price Sheet.md` — read that file for a figure, never the Brainstorm notes,
which carry superseded ones. Aldi's instruction, 2026-09-10: *"lets take notes for all the price and
cost and go back on finishing all the app logic to make sure that its all work well"*.

## What actually happens

A new owner saves their first product. They leave **MIN. ALERT** blank, because the field's
placeholder reads `pakai batas perusahaan (3 Bal)` and looks like it already has a value. The blank
falls back to the company default of **3 Bal = 600 Bks**. Their first product has less stock than
that, so it is **instantly "critically low"** — on a brand new, correctly entered product.

Then the alarm toast fires. It **never expires**, and it paints at `z-index: 10000`, which is over
every dialog. So the first thing a new user sees is a red warning they did not earn, and cannot
dismiss, sitting on top of the screen they were trying to use.

## Two halves, one story

1. **The threshold default.** A first product saved with a blank minimum should not be born
   critical. Decide what blank means: inherit the company default only when the product actually has
   stock history, or treat blank as "no alert set" until the owner sets one. Read how
   `MIN. ALERT (BKS)` is stored and who reads it before choosing.
2. **The toast lifetime**, `src/components/Toast.jsx`. Critical toasts currently live forever.

## DIAGNOSED 2026-09-11 — the job is smaller and different from the description above

**Do not re-decide what a blank MIN. ALERT means. Aldi decided it on 2026-08-25 and it is already
written and shipped** in `src/utils/stockThreshold.js`, a module whose own header says it exists
because "it used to be seven" places.

**The rule it encodes:** a product is low when stock reaches its own `minStock` if one is set,
otherwise the COMPANY DEFAULT held as quantity + unit (`defaultMinStockQty` / `defaultMinStockUnit`,
default 3 Bal), converted per product using that product's own packing. `product.minStock` stays in
Bks on purpose — reinterpreting it would silently move every threshold a user already set.

**The real defect: the module was written and only ONE caller was wired to it.** Confirmed by grep
on 2026-09-11.

| call site | today | should be |
|---|---|---|
| `src/components/DashboardView.jsx:102` | `minStockBks(item, appSettings)` — correct | — |
| `src/components/ResidentEvilInventory.jsx:236` | `item.stock <= (item.minStock || 50)` | `isLowStock(item, appSettings)` |
| `src/hooks/useTransactionEngine.js:317` | `newStock <= (prodData.minStock || 50)` | `isLowStock({ ...prodData, stock: newStock }, appSettings)` |
| `src/MerchantSalesView.jsx:2472` | `item.stock <= (item.minStock || 50)` | `isLowStock(item, appSettings)` |
| `src/StockOpnameView.jsx:1007` | `stat.vault <= (p.minStock || 5)` | `isLowStock({ ...p, stock: stat.vault }, appSettings)` |
| `src/App.jsx` lowStockItems | **UNVERIFIED** — the module header says it was 50, grep did not surface it. Check before touching. |

**Five screens disagree about what low means, by a factor of ten between 50 and 5.** That is the bug
behind the alarm, and it is also why the alert panel has felt inconsistent.

⚠️ **So the stated cause at the top of this file is [likely], not confirmed.** "Falls back to 3 Bal =
600 Bks" holds only on the DashboardView path. If the alarm Aldi saw came from a `|| 50` site, the
comparison was against 50 Bks, not 600. **Reproduce it once and note WHICH screen raised it before
changing any threshold.** The fix is the same either way, but do not report a cause nobody observed.

### The toast half is also different from the description

`src/components/Toast.jsx:91` — `if (!item.sticky)` is what sets the auto-dismiss timer. **A sticky
toast never expiring is deliberate**, and sticky toasts already have a dismiss path (`dismiss(id)` at
:64). So "critical toasts live forever" is by design, not a defect.

Two narrower things, neither confirmed yet:

1. **Is the low-stock alarm raised with `sticky: true`?** If so, decide whether a stock warning earns
   the stickiness that money warnings deserve.
2. **`Toast.jsx:114` puts the host at `z-[10000]`**, above dialogs. The container is
   `pointer-events-none`, so it does not swallow clicks — it only paints over them. Moving it below
   the dialog layer is the smaller and safer half.

**Adopting `stockThreshold.js` at the four confirmed sites is the whole first job.** Mechanical, and
`src/config/stockThreshold.selfcheck.mjs` already guards the module's own behaviour.

## The trap that makes a lazy patch wrong

**Do not silence the alarm, and do not auto-dismiss every toast.** A stock alarm that a real
low-stock condition cannot raise is worse than the bug — this app exists to catch missing stock. The
fix is that the alarm should not fire on a product that was entered correctly, not that alarms
should be quieter. Same for the toast: a critical money warning that vanishes on a timer while
nobody is looking is a new bug wearing the old one's clothes. Persist it, but let it be dismissed,
and keep it under dialogs rather than over them.

Also fix the placeholder while you are in that form: `MIN. ALERT (BKS)` labelled over a
`pakai batas perusahaan (3 Bal)` placeholder mixes two units and reads as a filled value. Ask Aldi
before renaming anything user-facing — match the sibling screen's language.

## Before you claim it is done

Leave a line in `src/config/logicFixes.selfcheck.mjs`: one regression guard (a first product with a
blank minimum does not come back critical) and one behaviour check (a genuinely low product still
raises the alarm). Then rewrite this file with the next single job.

<details>
<summary>Queue — do NOT paste these; promote one only when the job above is finished</summary>

### Shipped 2026-09-10 — the legal research, closed

`1e1d957` in **A-Brain** (not this repo). Two new notes:
`Brainstorm/2026-09-10_riset-hukum-menjual-kpm.md` — seven items, a source per number.
`Brainstorm/2026-09-10_draft-13-pasal-kontrak-kpm.md` — the 13 clauses as real pasal.
Artifact (his private brief, Indonesian, nine sections):
<https://claude.ai/code/artifact/4fed138f-1639-4317-b41f-41bbf6613305>

The three findings worth remembering without opening the files:

* **PPh 23 is 2% for jasa, 15% for royalti, and the contract wording decides which.** Rp 31,2 juta
  a year of difference at Rp 20 juta/month. The licence clause now says hak pakai for internal
  operations, no right to reproduce or sublicense, maintenance priced separately.
* **The 0,5% final UMKM rate no longer expires** for an orang pribadi or a Perseroan Perorangan —
  PP 20/2026, in force 22 April 2026, changed PP 55/2022 Pasal 59. For CV, firma and ordinary PT
  the rules tightened instead.
* **A liability cap holds here** if written as a computable amount (KUHPerdata 1249) and if the
  contract records that it was negotiated rather than a klausula baku (UU 8/1999 Pasal 18). Cap,
  never exclude — a total exclusion invites the whole clause being voided.

⚠️ **Not written, on purpose:** the one-page proposal and the demo script. The audience changed on
2026-09-09 — those are uncle-facing and are a separate job, after the demo, not before.

⚠️ **Aldi is 24, not 14.** He corrected this on 2026-09-09. Earlier notes were wrong.

### Still ship-blocking, and both are his call

* **Rank Config cross-tenant gap.** `artifacts/cello-inventory-manager/settings/{achievements,
  rpg_ranks}` is ONE document shared by every company. Rules coverage was fixed; the shared path
  was not. Safe for one customer. Not two — between tobacco competitors that is a confidentiality
  breach, not a bug. **And the contract draft now promises per-customer separation in Pasal 10 ayat
  (3), so this is a clause he cannot honestly sign twice until it is fixed.**
* **PBKDF2.** The SHA-256 master-password hash is unsalted and single-round. `crypto.subtle` already
  offers PBKDF2; a per-company salt and ~100k iterations turns a claim that invites inspection into
  one that survives it. Offered, never answered.

### He must still press this once

**"Rebuild sales totals"** on the live app (Settings → General & Brand), or his historical months
keep the old inflated omzet — and that is the number he will show his uncle. Tell him again.

### Day one — the rest of the walk, ranked

1. **The phantom competitor.** A store created today and sold to the same day shows an undismissable
   red `ALREADY SECURED TODAY — Claimed by ANOTHER AGENT`. `CustomerManager.jsx:248` and `:1018`
   default a new customer's `lastVisit` to today; `MerchantSalesView.jsx:536` then falls back to the
   literal string `'another agent'` when `lastVisitedBy` is empty.
2. **New personnel default to `T3: HQ SALES MANAGER`** even when the role picker says Sales
   Motorist — every salesman a manager unless the owner notices the dropdown.
3. **The GPS placeholder reads as a value** (`-7.6043, 110.2055`, empty `value`), then Save fails
   with "This outlet has no map pin". The same form's first refusal is `SSOT Violation: You must
   specify the complete Matrix Location...` — jargon in front of a shop owner.

### Phone, at 375x812

* The only way to open the menu is a 14x66px sliver at the right edge (`.kpm-edge-ribbon`,
  `w-[14px] h-[132px]`, `top:-66px` — half of it above the viewport).
* The notification bell is off-screen (x 398 → 445 against a 375 viewport). The clock hides itself
  on purpose (`hidden md:flex`); the bell just overflows.

### Wording — cheap, each one read by a customer

`49 Bks left in the vehicle` while selling from Master Vault · `Surya 16 (Available: 100 )` with a
trailing space and no unit · the salesperson printed as `ADIKARYASUKSES99` · the EOD verify confirm
claiming "clears their inventory" on a stamps-only card · the EOD `MATCHES` column showing `—` when
the numbers are equal · the audit receipt printing `BAYAR : CASH` on an audit that collected Rp 0.

### Closed — do not reopen

**Money.** A cash refund does not reduce omzet, and never should. A completed sale is a closed
contract; a retur is the salesman's private arrangement. Buyback is off for everyone including the
owner; Exchange (Tukar) stays. `A-Brain/Wiki/Concepts/A sale is a closed contract — no cash goes
back.md`. That also closes the walk's `returnTotal` item — written in three places, read by no money
calculation, because it is not company money. Not a bug.

**The sale-proof camera.** `284ea64` + `1857b97`. T4–T6 open a real `getUserMedia` view and have no
file input in the DOM in ANY build; T1–T3 keep the picker. Do not reintroduce a build-mode escape
hatch — `1857b97` removed one gated on `import.meta.env.DEV`, and dev is the only place he tests, so
it removed the rule under test in the one place it could be observed. To let a tier attach a file,
turn `photo_pick_from_gallery` ON in the matrix, test, turn it off. Deliberately untouched: the
GPS-bypass proof photo (`MerchantSalesView.jsx:1839`) and the NOO storefront photo (`:2914`).

### Appearance — deferred on purpose, last

~180 blue/green Tailwind classes in app UI: `MapMissionControl.jsx` 58, `FleetCanvasManager.jsx` 50,
`JourneyView.jsx` 33, `ConsignmentFinanceView.jsx` 33. Receipt and surat-jalan blues are legal.

### Still owed from earlier sessions

Round 7 Section D of `MANUAL_TEST_CHECKLIST.md` has never been run. C4 needs a second BANDUNG
account. `cdaabc7`, `967e447`, `83f5041` unverified by eye. HQ 3 and HQ TEST are his money and his
call. Bug 3, the geofence bypass routing, is still unanswered — and the GPS-bypass approvals were
among the nine paths `da71cbd` re-routed, so re-check it before treating it as open.

</details>
