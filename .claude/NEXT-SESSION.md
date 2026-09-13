# The one job

**On a phone, is the notification bell off the right edge of the screen? The queue says "bell at
x 398–445 against a 375 viewport" and "the menu ribbon sits half above the viewport" — one of
those two is almost certainly a measurement artifact, and the other has never been re-measured.
This job is a MEASUREMENT first, and the fix only if the number is real.**

⚠️ **Before this job: read Aldi's test results.** Confirmed 2026-09-13 in his words: nota name
(`d9de090`) and the sales-terminal camera lock (`0ff0732`) — *"yes now the nota name is the same
with the signature name … no camera lock no more"*; the rail (`7ea096e`). Still owed: `9fed51d`
(Stock Opname as the boss — expected count shown, pending audits listed), `2771374` (form: no
browser bubble, faint GPS example), `d4bd41a` (two stock labels), `8ed215f` (from 2026-09-12).

---

## Paste this to start the next session

> /alucard
>
> Read `.claude/NEXT-SESSION.md` first — it is the whole job, do not re-read source to re-orient.
>
> **The two claims, and why one of them is suspect (verified 2026-09-13):**
> - "The menu ribbon is a 14×66px sliver at the right edge, `top:-66px`, half above the viewport."
>   `BiohazardTheme.jsx:285-291`: `ribbonY` starts at `Math.round((window.innerHeight - RIBBON_H) / 2)`,
>   clamped to `innerHeight - RIBBON_H - 8` when a saved value exists. A NEGATIVE top can only
>   come from `innerHeight` being 0 — which is exactly what the in-app Browser pane reports when
>   it is hidden (lesson: *a viewport of zero returns rectangles, and they are all lies*). Treat
>   this claim as an artifact until a real 375×812 viewport says otherwise.
> - "The notification bell is off-screen, x 398 to 445 against a 375 viewport." The bell is
>   `<NotificationBell>` at `BiohazardTheme.jsx:1039`, a `.kpm-chip.kpm-bell` inside the header
>   row. Never re-measured since it was written down. Plausible — a header row that does not wrap
>   overflows to the right — but a number from the same hidden pane is worth nothing.
>
> **Measure, do not build.** Headless Chrome on Windows will not go below ~518px (`Looking at the
> App.md`), so the only honest instruments are: (a) the in-app Browser pane with `resize_window`
> to 375×812 and `innerWidth` read in the SAME probe as the rects — if `innerWidth` is 0 the pane
> is hidden and every number is a lie; or (b) Aldi's phone screenshot, which is what found every
> real phone bug so far. Ask for (b) in the first reply, do (a) meanwhile. The probe: the bell's
> `getBoundingClientRect().right` against `innerWidth`, and the ribbon's `top` against 0. The app
> is behind Google sign-in, so (a) needs the ponder lab — mount `BiohazardTheme`'s header is not
> cheap; if it costs more than three turns, stop and wait for (b).
>
> **If the bell IS off-screen:** the fix is in the header row's classes at `BiohazardTheme.jsx`
> around `:1024-1040` (let the chips wrap, or hide the tutorial chip under `sm:`), and it is a
> visual change — frame at 518 is still a crop, so Aldi's screenshot is the proof. **If neither
> claim survives measurement:** delete both lines from the queue below and say so; that is a
> result.
>
> Rewrite this file with the next single job before closing.

---

## Shipped 2026-09-13, night — `9fed51d`

**The boss is tier 1 on Stock Opname too.** Same hole as `0ff0732`: `StockOpnameView.jsx:200`
derived the role off the user object → `'AGENT'` for the owner, so he counted blind and
`isHighCommand` (pending-audit + quarantine listeners) was false. App passes `userRole={userRole}`;
the view aliases it `liveRole` and reads it first. Section THE BOSS IS TIER 1 ON STOCK OPNAME TOO,
3 red → 1465/1465. The sweep `user?.userRole` across `src` now matches only the two fallbacks.
**✅ TEST:** open Stock Opname as the boss — the expected count sits beside each line while
counting, and any pending audit from a field agent is listed.

## Shipped 2026-09-13, night — `0ff0732`

**The boss is tier 1 on the sales terminal too.** His screenshot: CAMERA UNAVAILABLE on a sale as
tier 1. `canPickFromGallery('ADMIN')` was always true; the terminal read the role off the user
object, and the boss's user object is the raw Firebase user with no role → `undefined` → TIER_5.
App now passes `userRole={userRole}`; the terminal reads `myRole = userRole || user?.userRole ||
user?.role` for both the gallery gate and the sample lock. Section THE BOSS IS TIER 1 ON THE SALES
TERMINAL TOO, 4 red → 1461/1461. **✅ TEST:** sell as tier 1 — "Capture or choose photo", no
camera lock. Same hole found on Stock Opname → the job above.

## Shipped 2026-09-13, night — `d9de090`

**The nota prints the boss's name.** The engine (`useTransactionEngine.js`, both `let
finalAgentName` sites) now starts with `(userRole === 'ADMIN' && appSettings?.adminDisplayName)`
— the Settings field `ReceiptPreview.jsx:147` already printed. `MerchantSalesView.jsx`'s five
copies of the displayName/email fallback collapsed into `emailName` + `myName`; the visit compare
matches `meNames` (Settings name, display name, email) so old stamps still read as his. Section
THE NOTA PRINTS THE BOSS'S NAME, 5 red → 1455/1455. **✅ TEST:** sell as the boss, the nota's SALES
line must show the name typed in Settings → Admin Display Name, not `ADIKARYASUKSES99`. If that
Settings field is empty, it falls to the Google name, then the email — fill it in first.

---

## Shipped 2026-09-13, night — `3af7685`, `d4bd41a`

**`3af7685`** — rail tint `.42/.58` → `.66/.78`, his second round: *"reduce the transparancy more
still not visible in very bright space"*. Rendered over a near-white band. **`d4bd41a`** — the
Running-low card says `left in the Master Vault` in VAULT mode (`MerchantSalesView.jsx:2802`,
branches on `adminSalesMode`, the buttons' own words); the loading picker prints `(Available: 100
Bks)` (`FleetCanvasManager.jsx:1260` — a master product has no `unit`, stock is Bks, the qty box
beside it says Bungkus). Section TWO STOCK LABELS SAY WHERE AND WHAT, 3 red → 1447/1447.

---

## Shipped 2026-09-13, evening — `2771374`, from his test of `d876904`

**Three from his screenshots.** (1) The dark rail's glass tint `.02/.10` → `.42/.58`
(`theme.css` `.kpm-rail-pod::before`) — *"less transparant because on some bright space the name
and logo cant be seen"*; rendered over a bright band before/after; guarded as a BAND (.35–.8, still
a gradient, blur on). Light mode's opaque plate untouched. (2) `<form noValidate>` on the customer
form — the browser's "Please fill out this field." bubble ran before `handleSubmit`, so the app's
own name refusal never spoke. (3) GPS example `placeholder:opacity-50` on top of italic — *"too
visible that i think it is already filled"*. logicFixes 1442/1442 (3 red before), audit 722/722.
**✅ TEST owed:** rail over a bright screen region — name and marks readable; customer form with
nothing filled → the red strip "This outlet has no name…", no browser bubble; GPS example faint.
If the rail is still too see-through for him, the two numbers are in that one rule — raise both,
keep them ≤ .8, and the band check tells you if you went solid.

## Shipped 2026-09-13, later — `d876904`

**The customer form speaks to a shop owner.** `CustomerManager.jsx:1440` GPS box gets
`placeholder:italic` (rendered: empty box reads as an example, typed box as a value, both themes);
`:929` and `:935` refusals reworded to the shape of the pin refusal at `:956` — "This outlet has no
name / no location. … before saving". `logicFixes.selfcheck.mjs:5957` re-anchored on the predicate
before the reword; new section THE CUSTOMER FORM SPEAKS TO A SHOP OWNER, 3 red → 1434/1434. Audit
722/722. Untouched: "Matrix Location" in the admin-only DATA SCRUB confirm at `:842`.

## Shipped 2026-09-13 — `772ab0a`

**The confirm dialog now paints over the alarm strip.** `ConfirmGate.jsx:124` lifted from `z-[9999]`
to `z-[10001]`; the toast column stays at `z-[10000]`. The 2026-09-12 plan (push the strip down to
`z-[9998]`) was NOT done: four other full-screen layers sit at `z-[9999]` (vault gate `App.jsx:4238`,
Access Denied `:4495`, Offline-Unverified `:4509`, Flight Recorder `:5112`) and the gate raises five
`notify()` reports while it is up — at 9998 they would have painted behind an opaque screen. Aldi
chose the lift ("do 1"). Guard: last block of `toastSeverity.selfcheck.mjs`, 1 red → 57/57. Rendered
through the new `?toast` mount in `tools/ponder-lab.jsx`, BEFORE/AFTER at 820x300, both themes.
**Tested by Aldi 2026-09-13 18:23, his screenshot:** *"now the question panel is on front of
everything else and dim all the background"*. Closed. The mascot and its bubble stay bright above
the box on purpose (it carries 68 mascot-only reports); he was told, said nothing — not a job.

---

## Shipped 2026-09-12, later — `8ed215f` and `a2b4eae`

**`8ed215f` — creating a store is not visiting it.** The customer form stamped `lastVisit` with
today in three places (`CustomerManager.jsx:248`, `:1018`, `:1037`) and never `lastVisitedBy`, so
`MerchantSalesView.jsx:552` read a fresh store as "claimed by another agent". The form now leaves
`lastVisit` blank; every reader already has a branch for blank. PHANTOM COMPETITOR section in
`logicFixes.selfcheck.mjs`: 1 red before, 1426/1426 after. Stores created earlier on 2026-09-12
keep the stamp until midnight.

**`a2b4eae` — the alarm says `(300 Bks left)`, not `(300 left)`.** `App.jsx:1365`. Guard: THE
ALARM SAYS 300 OF WHAT in `logicFixes.selfcheck.mjs`, 1427/1427.

**✅ TEST owed by Aldi:** create a new store in the customer directory, then sell to it the same
day. No red `ANOTHER AGENT` banner. Side effect to expect: that new store shows as NEVER VISITED in
the Journey view and as due-now on the map until the first real sale — that is the truth now.

## Shipped 2026-09-12 — `9b31bf0`

The four `|| 50` / `|| 5` call sites are gone. `ResidentEvilInventory.jsx`, `useTransactionEngine.js`,
`MerchantSalesView.jsx`, `StockOpnameView.jsx` all call `isLowStock(product, appSettings)` from
`src/utils/stockThreshold.js`. `appSettings` is threaded into the two that lacked it (a prop from
`App.jsx` for ResidentEvilInventory; an option for useTransactionEngine). Section 7 of
`stockThreshold.selfcheck.mjs` guards all four: 8 red before, 36/36 green after. Build clean,
`integration.audit.mjs` 722/722 — that also clears the audit owed on `44058b1`.

**Tested by Aldi 2026-09-12 20:50, both screens LOW.** Closed.

Same session, at his "yes": `A-Brain/automation/heredoc-gate.mjs` is a PreToolUse hook on Bash in
this repo's `.claude/settings.json`. It refuses a heredoc whose body has a backslash or is over 40
lines, and `node -e` / `python -c` holding a backtick or `${`. The way out is the Write tool, then
run the file. Do not work around it.

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

1. **New personnel default to `T3: HQ SALES MANAGER`** even when the role picker says Sales Motorist.
   Looked for on 2026-09-12 and NOT found in two greps: `LandlordDashboard.jsx:14` defaults to tier
   2, `FleetCanvasManager.jsx:150` `defaultAgentState` has `role: 'Motorist'` and no tier at all.
   Next place to look: how a `motorists` record acquires its tier — the sign-in "ghost profile"
   path in `App.jsx`, and `povPreview.js`. Reproduce it on screen before writing a brief for it.
2. ~~The GPS placeholder reads as a value~~ — PROMOTED to the job above on 2026-09-13.

### Phone, at 375x812

* ~~The only way to open the menu is a 14x66px sliver … `top:-66px`, half above the viewport~~ —
  PROMOTED as a measurement job above; the negative top is almost certainly a hidden-pane artifact.
* ~~The notification bell is off-screen, x 398 to 445 against a 375 viewport~~ — same job.

### Wording — cheap, each one read by a customer

~~`49 Bks left in the vehicle` while selling from Master Vault, `Surya 16 (Available: 100 )`~~
(SHIPPED `d4bd41a`), ~~the salesperson printed as `ADIKARYASUKSES99`~~ (SHIPPED `d9de090`), the EOD verify confirm
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
