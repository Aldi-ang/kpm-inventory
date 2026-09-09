# The one job

**Close the Fleet & Roster question. A fix shipped (`da71cbd`) that is certainly a real bug and may
not be the one Aldi hit. Ask him what the empty roster box says now, then finish it.**

Start by asking him — one question, nothing else:

> Open Fleet & Roster as your T4 again. The empty box now says one of four things. Which?

## Why this is not finished

His report, 2026-09-09: *"my tier 4 cant even detect its own sales team inside the fleet and
roster"*. His screen read `UNASSIGNED ROSTER · ACTIVE PERSONNEL: 0 · No personnel found`.

`App.jsx:453` routes every database call in the app through `bossUid || user.uid`.
`FleetCanvasManager.jsx:19` re-derived its own id and left `bossUid` out, so nine collection paths —
the roster listener, branch stock, the product/branch-inventory writes behind Load Canvas and
Reconcile, and the GPS-bypass approvals — pointed at the signed-in person's own empty vault. That is
fixed: the component now takes `masterUserId` from App.

**But he found it through the POV switch, and POV keeps his real uid.** On the owner's own account
`bossUid === user.uid`, so old and new code do exactly the same thing there. The vault bug is
[certain] for a real tier-4 *login*; that it was the live cause on *his* screen is [likely] and
unproven. Do not open this session by claiming it is fixed.

## The four answers and what each one means

`src/FleetCanvasManager.jsx` (search `AN EMPTY ROSTER HAS FOUR DIFFERENT CAUSES`) now prints one of:

| what he sees | the cause | what to do |
|---|---|---|
| *"The roster could not be read (…)"* | Firestore refused the listener | get the code from him; it is a rules question, and **he deploys rules, never you** |
| *"Your own staff record was not found"* | `TEST_TIER_4` is absent from the vault now being read | `App.jsx:3513` writes it at `artifacts/{appId}/users/{userId}/motorists/{account.id}` on first wear — check that id against the one the listener reads |
| *"You are not posted to a branch yet"* | the costume has no `location` | `povPreview.js` defaults it to `'Headquarters'`; find who cleared it |
| *"Nobody is posted to X"* | **the vault is fine** — his team is filed under a different area string | not a code bug; it is the exact-match rule below |

## The trap that makes a lazy patch wrong

**Do not "fix" this by loosening the area filter.** `FleetCanvasManager.jsx` line ~90 matches
`m.location` against the admin's own area **exactly**, lowercased and trimmed. That is the whole
regional boundary — a regional admin seeing another branch's staff is a permission hole, not a
convenience. If the answer is *"Nobody is posted to X"*, the fix is data (post the team to that
area, or move the costume), or a deliberate product decision from Aldi about what a T4 may see. It
is never a wider filter chosen by you.

**And do not make `previewIdentity` rewrite the email or the uid** to make POV agree with a real
login. `A-Brain/Wiki/Concepts/POV Changes the Id, Never the Email.md` says why: email is identity
and other code makes real decisions on it. Stand the lookup down at the screen instead — this file
already does that at the `myProfile` line.

**Mixed line endings:** these files are LF. Check before editing or an edit anchor silently misses.

## Done when

- Aldi's answer is recorded in `A-Brain/Wiki/Entities/Terminal Tenant Path Split.md`, replacing the
  open "whether it was the live cause is what the next look will say" line with what it actually was.
- If a code bug remains, it is fixed with a regression guard and a behaviour check in
  `src/config/logicFixes.selfcheck.mjs`.
- If it was data or the exact-match rule, **no code changes** — say so plainly and write it down.
- He can see his T5/T6 team on that screen, which was the point: he wants to add stock to their
  inventory.

Then rewrite this file with the next single job — the queue below has it.

<details>
<summary>Queue — do NOT paste these; promote one only when the job above is finished</summary>

### Promote this next: the first minute ends in a red alarm that will not go away

Ranked first of seven on the 2026-09-09 day-one walk. Full walk:
`A-Brain/Brainstorm/2026-09-09_day-one-walk.md`.

Save the very first product with **MIN. ALERT (BKS)** blank → it falls back to the company default
of 3 Bal = 600 Bks → the product is instantly "critically low". The toast then **never expires** and
renders at `z-index: 10000`; on the walk it covered the "WHO IS BUYING?" search box inside the sale
dialog.

Two halves. **The threshold:** a blank MIN. ALERT means "not decided yet", not "use 600" — do NOT
silence the alarm itself, it is correct and he needs it. **The toast lifetime:**
`src/components/Toast.jsx` (`notify()`) — do NOT auto-dismiss everything; an error that vanishes
before it is read is the silence he calls a bug. Errors and reports want different lifetimes, and
`notify()` is called from everywhere, so change behaviour per severity, never the global default.

### Shipped 2026-09-09

* `da71cbd` — **Fleet & Roster vault.** Above. Also: an empty roster now names which of its four
  causes fired, and a refused read prints its Firestore code instead of hiding in `console.warn`.
  Vault: `Wiki/Entities/Terminal Tenant Path Split.md`, second-file section.
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
