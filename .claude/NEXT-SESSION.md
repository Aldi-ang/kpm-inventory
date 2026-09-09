# The one job

**Sale proof: force a LIVE camera capture for Tier 4 and below, allow a gallery photo for Tier 3
and above, and put that switch in the permission matrix so a company can change it.**

His words, 2026-09-09: *"for the camera on PC i want it to be work for tier 3 and above on default
without the camera, only gallery photo is okay and tier 4 and lower will need to use the real time
camera to do this, also add this option on the matrix to toggle on and off"*.

The money half of that same message shipped in `a6192b1`; this is the other half.

## What exists today

`src/MerchantSalesView.jsx:2166` renders one button over a hidden
`<input type="file" accept="image/*" capture="environment">`, and `:1570` gates the sale on
`txProofPhoto` being set. So a photo is already mandatory for everyone — that part is right and
stays. What is missing is WHERE the photo may come from.

`capture="environment"` opens the camera on a phone and is **ignored on desktop**, where it falls
back to a file picker. So today a desk sale accepts any image on disk, including a screenshot, and
a field salesman on a phone gets the camera by accident of the platform rather than by rule.

## The rule to build

| tier | what they may attach | default |
|---|---|---|
| T1, T2, T3 | a live capture **or** a file from the gallery | gallery allowed |
| T4, T5, T6 | a live capture only — no file picker at all | gallery blocked |

Tier numbers run the other way to authority here: T1 is the owner, T6 the Sales Motorist. "Tier 3
and above" is T1–T3, the desk; "Tier 4 and lower" is T4–T6, the field.

**Both halves are defaults, not laws** — he asked for the switch in the matrix, so a company can
turn gallery access on or off per tier the way every other privilege there works. Read how a
neighbouring privilege is declared in `src/config/permissions.js` and follow it exactly rather than
inventing a second shape; `DYNAMIC_TIERS` and `hasClearance` are the entry points, and
`injectDynamicPermissions` is what merges a company's own matrix over the defaults.

## Traps

**A camera-only tier must actually be able to sell.** `getUserMedia` needs a secure context. The
live site is https so it is fine, but `8abcf04`'s plain-http dev mode is NOT a secure context, so
the file picker has to stay reachable there or the whole app becomes untestable locally. Gate that
on the dev flag, never on the tier.

**No camera and no permission means no sale, and he knows** — *"if no photo then sales is not
possible"*. So the failure has to SAY so. A blocked camera that silently leaves the button reading
"REQUIRE PROOF" is the same bug as a dialog that does nothing. Name the cause: no camera found,
permission denied, or not a secure page.

**Do not weaken `canSubmitSale`.** `:1570` requiring `txProofPhoto` is the law that makes all of
this worth anything. This job narrows where the photo may come from; it must not open a path that
lets a sale through without one.

**A synthetic file can be pushed into a file input from the console** — that is how the 2026-09-09
walk got past this gate to test the rest of the app. Worth knowing that the gallery path is only
ever a convenience for trusted tiers, never a security boundary.

**Mixed line endings:** `MerchantSalesView.jsx` is LF, `permissions.js` — check before editing.
Match the file or the edit anchor silently misses.

## Done when

- A T6 account on a desktop sees a camera view and no file chooser; a T1 account sees both.
- Turning the matrix switch off for T5 makes a T5 account camera-only; turning it on lets them
  pick a file. Emulator-testable with the POV switch.
- Blocking the camera in the browser produces a message naming why, not a dead button.
- Two lines in `src/config/logicFixes.selfcheck.mjs`: the regression guard (a tier without the
  privilege must never be handed a file input) and the behaviour check (the matrix value, not a
  hardcoded tier number, is what decides).

Then rewrite this file with the next single job.

<details>
<summary>Queue — do NOT paste these; promote one only when the job above is finished</summary>

### Shipped 2026-09-09

* `a6192b1` — **omzet now waits for the cash.** A Titip placement books nothing; the store audit
  books what the shop actually sold. Dashboard reads Rp 2.000 with `Piutang titip Rp 24.000`
  beside it on the walk data that read Rp 26.000 the day before. The rule is one module,
  `src/utils/revenueRule.js`, because it had been written correctly in `EODReconciliationView` and
  wrongly in seven other places. Also fixed the rebuild button, which had never rendered: its two
  props were on `<DashboardView>`, which reads neither.
* **He must press "Rebuild sales totals" once on the live app** (Settings → General & Brand) or
  his historical months keep the old inflated figures. Proven in the emulator: the cached month
  went from 26000/2 Bks to 2000/1 Bks. Tell him again if he has not done it.

### Day one — from the 2026-09-09 walk, ranked, unblocked

Full list with file and line: `A-Brain/Brainstorm/2026-09-09_day-one-walk.md`.

1. **The first minute ends in a red alarm that will not go away.** A first product saved with
   MIN. ALERT left blank falls back to the company default of 3 Bal = 600 Bks, so it is instantly
   "critically low"; the toast then never expires and paints over dialogs at `z-index: 10000`
   (it covered the "WHO IS BUYING?" search box). Two halves, one story. Do not silence the alarm
   itself and do not auto-dismiss every toast — errors and reports need different lifetimes.
2. **The phantom competitor.** A store created today, sold to the same day, shows an undismissable
   red banner: `ALREADY SECURED TODAY — Claimed by ANOTHER AGENT`. `CustomerManager.jsx:248` and
   `:1018` default a new customer's `lastVisit` to today; `MerchantSalesView.jsx:536` then falls
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

### Money, still open and NOT part of his answer

A cash **refund** (`type: 'RETURN'`) reduces the day's takings in `dayStats` but reduces nothing in
omzet, Product Performance or EOD's expected cash. Under "money received" it arguably should. It
was deliberately left alone on 2026-09-09 because he was asked about consignment, and making
refunds move omzet is a second rule that restates history again. Ask before building.

### Appearance — he deferred this, it is last on purpose

~180 blue/green Tailwind classes in app UI: `MapMissionControl.jsx` 58, `FleetCanvasManager.jsx`
50, `JourneyView.jsx` 33, `ConsignmentFinanceView.jsx` 33. Receipt and surat-jalan blues are legal.

### Still owed from earlier sessions

Round 7 Section D of `MANUAL_TEST_CHECKLIST.md` has never been run. C4 needs a second BANDUNG
account. `cdaabc7`, `967e447`, `83f5041` unverified by eye. HQ 3 and HQ TEST are his money and his
call. Bug 3, the geofence bypass routing, is still unanswered.

</details>
