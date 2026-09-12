# The one job

**A store created today and sold to the same day shows an undismissable red
`ALREADY SECURED TODAY — Claimed by ANOTHER AGENT`. There is no other agent. Three lines invent
one.**

⚠️ **Before this job: read Aldi's re-test of `coba baru` (✅ TEST from 2026-09-12).** `9b31bf0` made
all four late screens ask `isLowStock`. If he reports the Dashboard and Merchant Sales STILL
disagree on that product, THAT is the job instead — start from
`src/config/stockThreshold.selfcheck.mjs` section 7 and `git show 9b31bf0`, not from scratch.
If they agree, or he has not tested yet, do the job below.

---

## Paste this to start the next session

> /alucard
>
> Read `.claude/NEXT-SESSION.md` first — it is the whole job, do not re-read source to re-orient.
>
> **The bug:** a store created today, then sold to today, shows the standing red banner
> `ALREADY SECURED TODAY — Claimed by ANOTHER AGENT`. Nobody else visited it. The banner is
> undismissable by design (it replaced a `window.confirm`), so a false one is a wall.
>
> **The three lines, all verified 2026-09-12:**
> - `src/components/CustomerManager.jsx:248` — a NEW customer is born with `lastVisit: getLocalDayKey()`.
>   Creating the store counts as visiting it.
> - `src/components/CustomerManager.jsx:1037` — the edit path does the same: `lastVisit: c.lastVisit || getLocalDayKey()`.
> - `src/MerchantSalesView.jsx:552` — `setRevisitToday(cust.lastVisit === localToday ? (iVisitedIt ? 'me' : (visitedBy || 'another agent')) : null)`.
>   `lastVisitedBy` is empty on a fresh store, so the fallback string names a competitor who does not exist.
>
> **The smallest fix:** a store with `lastVisit === today` and NO `lastVisitedBy` was created today,
> not visited today. Treat empty `visitedBy` as "nobody" — no banner — rather than "another agent".
> Decide whether the two CustomerManager lines should stop stamping `lastVisit` at creation at all;
> read who else reads `lastVisit` first (`CustomerManager.jsx:746` prints it as "last visit").
>
> **Order:** guard in `src/config/logicFixes.selfcheck.mjs` first (blank `lastVisitedBy` + today's
> `lastVisit` → no competitor), prove it RED, then fix, then `npm run build; node src/config/integration.audit.mjs`.
>
> **Trap:** the banner deliberately replaced a dialog — do not bring a dialog back, and do not make
> it dismissable. Fix the DATA that feeds it, not the banner. See the comment block at
> `MerchantSalesView.jsx:540-550`.
>
> Rewrite this file with the next single job before closing.

---

## Shipped 2026-09-12 — `9b31bf0`

The four `|| 50` / `|| 5` call sites are gone. `ResidentEvilInventory.jsx`, `useTransactionEngine.js`,
`MerchantSalesView.jsx`, `StockOpnameView.jsx` all call `isLowStock(product, appSettings)` from
`src/utils/stockThreshold.js`. `appSettings` is threaded into the two that lacked it (a prop from
`App.jsx` for ResidentEvilInventory; an option for useTransactionEngine). Section 7 of
`stockThreshold.selfcheck.mjs` guards all four: 8 red before, 36/36 green after. Build clean,
`integration.audit.mjs` 722/722 — that also clears the audit owed on `44058b1`.

**What Aldi must do:** re-test `coba baru` (MIN. ALERT blank, 1 Bal). Dashboard STOK KRITIS and
Merchant Sales (Boss Car / Master Vault mode) must BOTH say LOW.

<details>
<summary>Queue — do NOT paste these; promote one only when the job above is finished</summary>

### Still ship-blocking, and both are his call

* **Rank Config cross-tenant gap.** `artifacts/cello-inventory-manager/settings/{achievements,
  rpg_ranks}` is ONE document shared by every company. Rules coverage was fixed; the shared path was
  not. Safe for one customer, not two — between tobacco competitors that is a confidentiality breach,
  not a bug. **Pasal 10 ayat (3) of the contract draft promises per-customer separation, so this is a
  clause he cannot honestly sign twice until it is fixed.**
* **PBKDF2.** The SHA-256 master-password hash is unsalted and single-round. `crypto.subtle` already
  offers PBKDF2; a per-company salt and about 100k iterations turns a claim that invites inspection
  into one that survives it. Offered, never answered.

### Business track — CLOSED and PARKED, do not reopen

All prices in one place: `A-Brain/Wiki/Entities/KPM Price Sheet.md`. Rp 5 juta/bulan recommended at
25-30 users, **Aldi leans Rp 10 juta** as intent, floor Rp 2 juta, perpetual Rp 250 juta, copyright
**not for sale**, final PPh Rp 0. Legal research: `Brainstorm/2026-09-10_riset-hukum-menjual-kpm.md`.
Contract draft: `Brainstorm/2026-09-10_draft-13-pasal-kontrak-kpm.md`. His private brief:
<https://claude.ai/code/artifact/4fed138f-1639-4317-b41f-41bbf6613305>

### Rebuild sales totals — DONE, stop asking

Aldi pressed it 2026-09-09 and 2026-09-10. **Do not put this on a list again.**

### Day one — the rest of the walk, ranked

1. **The toast half of the alarm story.** `Toast.jsx:91` — `if (!item.sticky)` sets the dismiss
   timer, so a sticky toast never expiring is deliberate, and sticky toasts have a dismiss path at
   `:64`. Open: is the low-stock alarm raised `sticky: true` at all, and `Toast.jsx:114` sits at
   `z-[10000]` above dialogs. The container is `pointer-events-none`. Lowering it below the dialog
   layer is the safe half.
2. **New personnel default to `T3: HQ SALES MANAGER`** even when the role picker says Sales Motorist.
3. **The GPS placeholder reads as a value** (`-7.6043, 110.2055`, empty `value`), then Save fails with
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
`A-Brain/Wiki/Concepts/A sale is a closed contract — no cash goes back.md`. Not a bug.

**The sale-proof camera.** `284ea64` plus `1857b97`. T4 to T6 open a real `getUserMedia` view and
have no file input in the DOM in ANY build; T1 to T3 keep the picker. **Do not reintroduce a
build-mode escape hatch.** To let a tier attach a file, turn `photo_pick_from_gallery` ON in the
matrix, test, turn it off. Untouched on purpose: the GPS-bypass proof photo at
`MerchantSalesView.jsx:1839` and the NOO storefront photo at `:2914`.

**What "low" means.** Settled 2026-08-25, adopted everywhere 2026-09-12. Own MIN. ALERT (Bks) if
set, else the company default (qty + unit, default 3 Bal) converted per product. Blank means "use
the company default". `A-Brain/Wiki/Entities/What Counts As Low.md`.

### Appearance — deferred on purpose, last

About 180 blue and green Tailwind classes in app UI: `MapMissionControl.jsx` 58,
`FleetCanvasManager.jsx` 50, `JourneyView.jsx` 33, `ConsignmentFinanceView.jsx` 33. Receipt and
surat-jalan blues are legal.

### Still owed from earlier sessions

Round 7 Section D of `MANUAL_TEST_CHECKLIST.md` has never been run. C4 needs a second BANDUNG account.
`cdaabc7`, `967e447`, `83f5041` are unverified by eye. Bug 3, the geofence bypass routing, is still
unanswered — the GPS-bypass approvals were among the nine paths `da71cbd` re-routed, so re-check
before treating it as open.

</details>
