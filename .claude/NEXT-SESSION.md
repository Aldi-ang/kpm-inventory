# The one job

**A brand-new customer's first minute ends in a red alarm that will not go away. Fix the alarm's
threshold and the toast's lifetime. Nothing else.**

The day-one walk ran on 2026-09-09 (emulator, empty tenant, desktop + 375px). Full list of what
broke: `A-Brain/Brainstorm/2026-09-09_day-one-walk.md`. The money finding at the top of that list
is blocked on Aldi's answer, so this is the first unblocked job under it.

## What actually happens

Add the very first product in Master Vault, leave MIN. ALERT empty (a new customer will), give it
any realistic opening stock. The moment it saves, a red toast appears:

    ⚠️ BOSS! Surya 16 is critically low (100 left). Restock needed!

It was still on screen 7 minutes later, on every other screen, and it sat on top of the
"WHO IS BUYING?" dialog and covered its search box. Two more errors stacked under it and stayed
there after the thing they complained about was fixed.

## The two halves

**1. The threshold.** MIN. ALERT left empty falls back to the company default. That default is
**3 Bal = 600 Bks** — the field's own placeholder says `pakai batas perusahaan (3 Bal)` while its
label says `MIN. ALERT (BKS)`. Any first stock entry a real customer types is below 600 Bks, so
the first product is always "critically low". Find where the empty field resolves to the company
limit and decide what an unset alert should mean on a tenant with no history. `0`/unset meaning
"no alarm" is the smallest change; do not invent a new setting.

**2. The toast.** `z-index: 10000` on the toast container, and the dialogs underneath create no
stacking context of their own, so every toast paints over every modal. They also never expire —
only the × dismisses them. An error the customer has already fixed keeps accusing them.

## The trap

**Do not silence the low-stock alarm itself.** It is correct behaviour once a company has real
thresholds; a salesman running out mid-route is exactly what it exists to catch. The bug is the
DEFAULT firing on an empty tenant, not the alarm.

**Do not give every toast an auto-dismiss either.** Some of these are the app's only report that
an action happened, and `Every action must report` is a locked law here — a warning that vanishes
before it is read is the same failure as one that was never shown. Separate the two: a success
report can fade; an error the user must act on should stay until its cause is gone or it is
dismissed. Say which rule you applied to which toast.

**Check the mascot's bubble too** — on the empty tenant it opened with
`⚠️ PROTOCOL ALERT: TIME FOR USB SAFE BACKUP!` on a company with zero rows to back up.

## Done when

- A first product saved on an empty tenant with MIN. ALERT left blank raises no alarm.
- A product genuinely below a threshold the company set still raises one.
- No toast paints over a dialog. Open "WHO IS BUYING?" with an error showing and read the search box.
- One line in `src/config/logicFixes.selfcheck.mjs`: the regression guard (unset alert must not
  resolve to the company Bal limit) and the behaviour check (a set threshold still fires).

Then rewrite this file with the next single job.

<details>
<summary>Queue — do NOT paste these; promote one only when the job above is finished</summary>

### 🔴 BLOCKED ON ALDI — the money question, ranked above everything here

Titip revenue is booked at placement and the store audit never corrects it. Measured on the walk:

| screen | says |
|---|---|
| Sales Terminal `TAKEN` | Rp 26.000 |
| Dashboard `OMZET` | Rp 26.000 |
| Product Performance | Surya 16 — 2 Bks sold, Rp 26.000, 100% |
| Receivables | Rp 24.000 still owed by Warung Berkah |
| Store audit receipt | 0 Laku, TOTAL COLLECTED Rp 0 |
| EOD expected cash | Rp 2.000 ← the only one that is right |

Actually collected: Rp 2.000. The other Rp 24.000 is one packet still sitting on the shop's
shelf, counted as revenue AND as debt at the same time. The audit that proved it unsold changed
nothing on the dashboard.

His unanswered question from 2026-09-08 was *"is Titip revenue booked at placement correct?"* —
the walk turns that into a concrete one: **should a Titip placement count towards OMZET before
the audit says it sold?** If no, the rollups must read the audit result, not the placement value.
Do not touch the rollups until he answers; a wrong answer here rewrites his history.

### Day one — unblocked, ranked after the job above

1. **The phantom competitor.** A store created today, sold to the same day, shows a permanent red
   banner: `ALREADY SECURED TODAY — Claimed by ANOTHER AGENT. Selling here is a redundant visit.`
   `src/components/CustomerManager.jsx:248` and `:1018` default a new customer's `lastVisit` to
   `getLocalDayKey()`; `src/MerchantSalesView.jsx:536` then reads `lastVisit === localToday` and,
   with `lastVisitedBy` empty, falls back to the literal string `'another agent'`. The banner is
   deliberately undismissable (the comment above it explains why), so it cannot be shrugged off.
   Trap: do not delete the banner. The fix is the create-time default and the empty-name fallback.
2. **Every sale needs a photo, with no exception.** `src/MerchantSalesView.jsx:1570` —
   `canSubmitSale` requires `txProofPhoto` unconditionally. No setting, no payment-type carve-out,
   no tier carve-out. Correct on a phone in the field; on the desk (the MASTER VAULT tab the owner
   sells from) there is no camera, so a laptop-only customer cannot complete a single sale. Ask
   him whether desk selling should be exempt before writing anything.
3. **New personnel default to `T3: HQ SALES MANAGER`** even when the role picker says Sales
   Motorist. A customer clicking through the roster form gives every salesman a management tier.
4. **The GPS placeholder reads as a value.** `-7.6043, 110.2055` in the same grey as real text,
   `value` empty. Save then fails with "This outlet has no map pin". Same form answers a first
   failure with `SSOT Violation: You must specify the complete Matrix Location...` — jargon in
   front of a shop owner.

### Phone, at 375x812

* **The only way to open the menu is a 14px sliver.** `.kpm-edge-ribbon`, `w-[14px] h-[132px]`,
  `top: -66px` — half of it is above the viewport, so the real target is 14x66. Below every
  minimum touch size, at the extreme right edge, next to the bell.
* **The notification bell is off-screen.** Measured x 398 -> 445 against a 375 viewport. The clock
  hides itself deliberately (`hidden md:flex`); the bell does not, it just overflows.

### Wording — cheap, and each one is a customer reading it

* Sales Terminal: `49 Bks left in the vehicle` while selling from Master Vault, not a vehicle.
* Product picker: `Surya 16 (Available: 100 )` — trailing space where the unit should be.
* Receipt and consignment card name the salesperson `ADIKARYASUKSES99` — the email prefix.
* EOD verify confirm says `This clears their inventory and returns it to the Vault` on the
  PITA CUKAI ONLY card, which carries no inventory.
* EOD verification `MATCHES` column shows `—` when expected equals counted; a dash reads as "no
  data", not as "yes".
* Store audit receipt prints `BAYAR : CASH` on an audit that collected Rp 0.
* `MIN. ALERT (BKS)` label over a `pakai batas perusahaan (3 Bal)` placeholder — two units, one field.

### Appearance — he deferred this, it is last on purpose

~180 blue/green Tailwind classes still in app UI: `MapMissionControl.jsx` 58,
`FleetCanvasManager.jsx` 50, `JourneyView.jsx` 33, `ConsignmentFinanceView.jsx` 33. The receipt
and surat-jalan blues are legal (the nota keeps company blue). The rest are the palette law's own
headline example — `bg-blue-600` sits on the Fleet & Canvas add-personnel button today.

### Confirmed working on the walk — do not re-investigate

* `f46bc4a` holds: the store audit itself does not count unsold goods as sold (0 Laku, Rp 0).
* EOD expected cash correctly excludes the Titip placement.
* Unit maths correct everywhere: 1 Bal = 200 Bks, 1 Karton = 800 Bks, stock 100 -> 50 -> 49 -> 48.
* **The dashboard is not broken.** The old "Rp 0 against three seeded transactions" was the seed
  writing no `timestamp`. Sales written by the app appear immediately.
* Every confirmation was an in-app dialog. No `window.confirm` survived anywhere on the walk.

### Still owed from earlier sessions

Round 7 Section D of `MANUAL_TEST_CHECKLIST.md` has never been run. C4 needs a second BANDUNG
account. `cdaabc7`, `967e447`, `83f5041` are still unverified by eye. HQ 3 and HQ TEST are his
money and his call. Bug 3, the geofence bypass routing, is still unanswered.

</details>
