# The one job

**The first minute of a brand-new company ends in a red alarm that will not go away, and the alarm
then paints over the dialogs the owner needs to use. Fix both halves — they are one story.**

Ranked first of seven on the 2026-09-09 day-one walk. Full walk:
`A-Brain/Brainstorm/2026-09-09_day-one-walk.md`.

## What happens

Save the very first product with **MIN. ALERT (BKS)** left blank. The field falls back to the
company default of **3 Bal = 600 Bks**, so a product just created with a small opening stock is
instantly "critically low". The owner has done nothing wrong and the app opens with a red alarm.

Then the toast announcing it **never expires**, and it renders at `z-index: 10000`. On the walk it
covered the "WHO IS BUYING?" search box inside the sale dialog — so the alarm did not only mislead,
it blocked the next thing he had to do.

## The two halves, and why neither alone is the fix

**Half 1 — the threshold.** A blank MIN. ALERT means "he has not decided yet", and it is currently
read as "use 600". Find where the company default is applied and decide what a blank field should
mean for a product whose stock has never been counted. Do NOT silence the low-stock alarm itself:
it is correct and he needs it. The bug is the *default*, not the warning.

**Half 2 — the toast lifetime.** `src/components/Toast.jsx` (`notify()`) — see which severities
auto-dismiss. Do NOT auto-dismiss everything: an error that vanishes before it is read is the
silence he calls a bug, and a report he asked for should stay. Errors and reports want different
lifetimes. The `z-index: 10000` over a dialog is the separate, smaller half — a toast that outranks
a modal is a layering decision nobody made on purpose.

## Traps

**Do not fix this by lowering the alarm's sensitivity.** Every product will eventually be genuinely
low and the alarm has to fire then. If the walk's product is not actually low, the threshold is
wrong; if it is low, the alarm is right and only the toast needs work. Decide which before editing.

**`notify()` is called from everywhere.** Changing its default lifetime changes every screen at
once. Grep the call sites before touching the signature, and change behaviour per severity rather
than globally.

**Mixed line endings:** these files are LF. Check before editing or an edit anchor silently misses.

## Done when

- A brand-new company can create its first product and reach the sale screen with no red alarm it
  did not earn.
- A genuinely low product still raises one — verify by setting a real MIN. ALERT above the stock.
- No toast can cover a dialog's own controls.
- An error toast still waits to be read; a routine report clears itself.
- Two lines in `src/config/logicFixes.selfcheck.mjs`: the regression guard (a blank MIN. ALERT must
  not resolve to the 600-Bks company default for an uncounted product) and the behaviour check (the
  low-stock comparison re-run on real numbers, low and not-low).

Then rewrite this file with the next single job.

<details>
<summary>Queue — do NOT paste these; promote one only when the job above is finished</summary>

### Shipped 2026-09-09

* `b945280` — **Fleet & Roster, the live bug.** CLOSED. `FleetCanvasManager` destructures
  `agentProfileId` and App.jsx never passed it, so the POV stand-down fell back to
  `find(m => m.id === undefined)` — nothing, on every tier, however full the roster. A real login
  never reaches that half; only the preview does, and the preview is what nobody re-tested after the
  stand-down was added. **Lesson now in the vault: when you disable a lookup, the fallback it lands
  on is new load-bearing code.**
* `da71cbd` — **Fleet & Roster vault (a SECOND, real bug on the same screen, not the one he hit).**
  `FleetCanvasManager.jsx:19` re-derived its tenant id without `bossUid` while App.jsx:453 routes
  everything through it; nine paths hang off it, including the branch-stock writes behind Load
  Canvas. Broken for any non-owner login, invisible on the owner's own account. Also: an empty
  roster now names which of its four causes fired, and a refused read prints its Firestore code
  instead of hiding in `console.warn`. Vault: `Wiki/Entities/Terminal Tenant Path Split.md`.
* `284ea64` — **sale-proof camera.** `capture="environment"` was never enforcement: phones honour
  it, desktops ignore it and open the file picker. T4–T6 now open a real `getUserMedia` view
  (`src/components/ProofCamera.jsx`) and have **no file input in the DOM** of a shipped build;
  T1–T3 keep the picker. `canPickFromGallery` reads the matrix key `photo_pick_from_gallery`,
  absence = tier default. `canSubmitSale` untouched. Vault:
  `Wiki/Concepts/capture=environment Is a Request, Not a Lock.md`.
  ⚠️ Deliberately not touched: the GPS-bypass proof photo (`MerchantSalesView.jsx:1839`) and the NOO
  storefront photo (`:2914`) still use plain file inputs. His call, separate job.
* `a6192b1` — **omzet waits for the cash.** One module, `src/utils/revenueRule.js`.
* `2714b12` — **buyback off** for everyone including the owner; Exchange kept.
* **He must press "Rebuild sales totals" once on the live app** (Settings → General & Brand) or his
  historical months keep the old inflated figures. Tell him again if he has not done it.

### Day one — the rest of the walk, ranked, unblocked

2. **The phantom competitor.** A store created today and sold to the same day shows an
   undismissable red `ALREADY SECURED TODAY — Claimed by ANOTHER AGENT`. `CustomerManager.jsx:248`
   and `:1018` default a new customer's `lastVisit` to today; `MerchantSalesView.jsx:536` then falls
   back to the literal string `'another agent'` when `lastVisitedBy` is empty.
3. **New personnel default to `T3: HQ SALES MANAGER`** even when the role picker says Sales
   Motorist — every salesman a manager unless the owner notices the dropdown.
4. **The GPS placeholder reads as a value** (`-7.6043, 110.2055`, empty `value`), then Save fails
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
the numbers are equal · the audit receipt printing `BAYAR : CASH` on an audit that collected Rp 0 ·
`MIN. ALERT (BKS)` labelled over a `pakai batas perusahaan (3 Bal)` placeholder.

### Money — ANSWERED and CLOSED 2026-09-09, do not reopen

A cash refund does **not** reduce omzet, and never should. A completed sale is a closed contract; a
retur is the salesman's private arrangement. Buyback is off for everyone including the owner;
Exchange (Tukar) stays. `A-Brain/Wiki/Concepts/A sale is a closed contract — no cash goes back.md`.
That also closes the walk's `returnTotal` item: written in three places, read by no money
calculation, **because it is not company money**. Not a bug. Do not "fix" it.

### Appearance — he deferred this, it is last on purpose

~180 blue/green Tailwind classes in app UI: `MapMissionControl.jsx` 58, `FleetCanvasManager.jsx`
50, `JourneyView.jsx` 33, `ConsignmentFinanceView.jsx` 33. Receipt and surat-jalan blues are legal.

### Still owed from earlier sessions

Round 7 Section D of `MANUAL_TEST_CHECKLIST.md` has never been run. C4 needs a second BANDUNG
account. `cdaabc7`, `967e447`, `83f5041` unverified by eye. HQ 3 and HQ TEST are his money and his
call. Bug 3, the geofence bypass routing, is still unanswered — and note that the GPS-bypass
approvals were among the nine paths `da71cbd` re-routed, so re-check it before treating it as open.

</details>
