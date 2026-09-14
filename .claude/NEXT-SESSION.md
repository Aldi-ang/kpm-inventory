# The one job

**The fleet form's tier picker shows `T3: HQ SALES MANAGER` for every new person while the record
it saves says something else. It is a controlled `<select>` whose value is not one of its options,
so the browser draws the first option and the state keeps the phantom. Reproduce it on screen
first, then make the value a real tier id — and the tier a new Sales Motorist gets is his call.**

**Session closed 2026-09-14 ~18:55 WIB.** `2af2dd9` shipped (the top bar wraps on a phone; the
bell was clipped at x 442..489 on a 375 viewport, measured in the new `?shell` lab mount). Aldi was
asked for a phone screenshot of the top bar as the proof — read his reply first. Both repos
committed.

⚠️ **Before this job: read Aldi's test results.** ✅ TEST owed: `2af2dd9` (phone top bar — four
controls on their own line under the title, bell visible; PC header unchanged), `2771374` (customer
form: no browser bubble, faint GPS example), `d4bd41a` (Running-low card in Master Vault mode;
FLEET picker "(Available: 100 Bks)"), `8ed215f` (store created today, no ANOTHER AGENT banner).

---

## Paste this to start the next session

> /alucard
>
> Read `.claude/NEXT-SESSION.md` first — it is the whole job, do not re-read source to re-orient.
>
> **The bug, and the mechanism (read from the live files 2026-09-14):**
> - `src/FleetCanvasManager.jsx:149-153` — `defaultAgentState` has `userRole: 'AGENT'`.
> - `src/FleetCanvasManager.jsx:843` — the tier `<select>` is `value={newAgent.userRole || 'AGENT'}`,
>   and its options at `:848` are `DYNAMIC_TIERS` minus ADMIN / COMPANY_OWNER / DEVELOPER.
> - `src/config/permissions.js:2-9` — the tier ids are `DEVELOPER, COMPANY_OWNER, AREA_ADMIN,
>   FLEET_CAPTAIN, FIELD_OPERATIVE, ROOKIE`. **`'AGENT'` is not one of them.** A React controlled
>   `<select>` whose value matches no `<option>` paints the FIRST option — after the filter that is
>   `AREA_ADMIN`, label `T3: HQ SALES MANAGER` — while `newAgent.userRole` stays `'AGENT'`.
> - `src/config/permissions.js:72` — at READ time `'AGENT'` (and `Motorist`, `Canvas`, `Salesman`)
>   is normalised to `TIER_5` = `FIELD_OPERATIVE` = `T5: SALES CANVAS`.
>
> So the form SHOWS T3 and SAVES a person who behaves as T5. That is the UI-says-yes-server-says-no
> shape (`A-Brain/Wiki/Concepts/UI-Says-Yes-Server-Says-No Pattern.md`) — check it before writing
> a brief, the vault may already name the fix.
>
> **Reproduce first, on screen.** The fleet form is behind sign-in; the ponder lab has no mount for
> it yet. The cheapest honest reproduction is a `?fleet` mount in `tools/ponder-lab.jsx` the way
> `?shell` was added on 2026-09-14 (see that block and `tools/lab-firebase-stub.js` for the alias
> the shell needed — the fleet form imports `../config/firebase` too). Read the select's
> `selectedIndex` and `value` in the same probe: `value` will be `''` (no match) and the painted
> option will be T3. If the mount costs more than three turns, ask Aldi for one screenshot of the
> ADD PERSONNEL form with nothing touched and stop.
>
> **The fix is one line, and the value is his.** `defaultAgentState.userRole` must be a real id.
> The role picker beside it (`:832`) defaults to `Motorist`, so the honest default is
> `CORPORATE_TIERS.TIER_6` (`ROOKIE`, `T6: SALES MOTORIST`) — but `:72` has been turning `'AGENT'`
> into T5 for every person saved so far, so a T6 default CHANGES what a new motorist may do
> (diff `ROLE_PERMISSIONS[FIELD_OPERATIVE]` against `[ROOKIE]` in `permissions.js` before you
> describe the change to him — not checked on 2026-09-14).
> ❓ ANSWER for Aldi, in plain words: *"When you add a new Sales Motorist and do not touch the tier
> box, which tier should they get — T5 Sales Canvas (what they get today, hidden) or T6 Sales
> Motorist (what the label says)?"* Do not pick for him. The `|| 'AGENT'` fallback at `:843` goes
> with it, and the edit paths at `:374` and `:389` must be checked for the same phantom.
>
> **Traps:** (1) `permissions.js:72` is a read-side normaliser — do NOT delete it, old records
> carry `'AGENT'` and rely on it. (2) The guard goes in `logicFixes.selfcheck.mjs` BEFORE the
> canPickFromGallery block if that block is still last (it mutates ROLE_PERMISSIONS). (3) The
> label list is `DYNAMIC_TIERS`, which Settings can rename — pin the guard to the ID, never to
> the words `HQ SALES MANAGER`.
>
> Rewrite this file with the next single job before closing.

---

## Shipped 2026-09-14 — `2af2dd9`

**The bell is on the phone screen.** Measured in the new `?shell` ponder-lab mount at a real
375×812 (`innerWidth` read in the same probe): title stack 232 wide and unshrinkable, control
cluster 229 and `shrink-0`, bell at x 442..489 inside an `overflow-hidden` column — clipped, never
drawn; the switch cut in half. `flex-wrap` on the top bar row (`BiohazardTheme.jsx:951`) and
`ml-auto` on the control cluster (`:995`): the four controls take a second line under the title,
right-aligned; header 134 tall instead of 78 on a phone; desk unchanged (one line, 82 tall, bell
1016..1064, clock 1076..1249 at 1280). Both themes rendered at 375. Section THE BELL IS ON THE
PHONE SCREEN, 2 red → 1470/1470; audit 722/722. **The ribbon claim was an artifact:** top 340 of
812 = (812−132)/2 exactly; the "top:-66px" came from a hidden pane reporting innerHeight 0.
**✅ TEST:** open the app on the phone — the book, the cloud, the theme switch and the bell sit on
their own line under the page title, all four visible, bell at the right edge.

## Shipped 2026-09-13, night — `9fed51d`, `0ff0732`, `d9de090` — all CONFIRMED by Aldi

The boss is tier 1 on Stock Opname and the sales terminal (`userRole={userRole}` passed from App;
the boss's user object is the raw Firebase user with no role). The nota prints the Settings →
Admin Display Name. His words: *"yes now the nota name is the same with the signature name … no
camera lock no more"*, *"yep tes approve"*. Closed.

## Shipped 2026-09-13 — `2771374`, `d876904`, `3af7685`, `d4bd41a`, `772ab0a`

Rail tint `.66/.78` (confirmed); customer form `noValidate` + faint italic GPS example + refusals
reworded to the shop owner (TEST owed); Running-low card says `Master Vault` in VAULT mode and the
FLEET picker prints `(Available: 100 Bks)` (TEST owed); confirm dialog lifted to `z-[10001]` over
the alarm strip (confirmed: *"now the question panel is on front of everything else"*).

## Still owed from 2026-09-12 — `8ed215f`

Creating a store no longer stamps `lastVisit`. **✅ TEST:** create a store, sell to it the same
day, no red ANOTHER AGENT banner; the new store shows NEVER VISITED until its first sale.

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

### Day one — the rest of the walk

1. ~~New personnel default to `T3: HQ SALES MANAGER`~~ — PROMOTED to the job above on 2026-09-14,
   mechanism found (`FleetCanvasManager.jsx:843`, a select value that is not an option).
2. ~~The GPS placeholder reads as a value~~ — SHIPPED `2771374`.

### Phone, at 375x812

* ~~The menu ribbon … `top:-66px`, half above the viewport~~ — MEASURED 2026-09-14: top 340 of 812.
  Artifact of a hidden pane. Not a bug. Deleted.
* ~~The notification bell is off-screen~~ — MEASURED 2026-09-14: real, x 442..489. SHIPPED `2af2dd9`.
* The `?shell` lab mount now exists for any future top-bar or ribbon question: `preview_start`
  ponder-lab → `resize_window` 375×812 → `?shell` (add `&light` for the light theme).

### Wording — cheap, each one read by a customer

The EOD verify confirm claiming "clears their inventory" on a stamps-only card, the EOD `MATCHES`
column showing a dash when the numbers are equal, the audit receipt printing `BAYAR : CASH` on an
audit that collected Rp 0.

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
