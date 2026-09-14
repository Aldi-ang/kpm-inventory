# The one job

**The phone sweep — every screen must work on a 375 px phone as well as it does on the PC. His
words: *"we need all the panel whatever the method is, i just want to make sure that all the
features is available on the phone as good as pc uses"*. It starts with Restock Vault, whose tab
strip hides two of its five tabs on a phone, and it starts with HIS ANSWER, which is owed: the
letter A / B / C from `tabs-options.png`, and 1 (one screen at a time) or 2 (all 16 frames now).**

**Session closed 2026-09-14 19:27 WIB at his "okay ask me tomorrow lets continue tomorrow make
notes and prompt for now".** Both repos committed. Nothing shipped for the sweep yet.

🔴 **His new work rule, saved in memory and in the vault — obey it before the first proposal:**
*"if u want me to decide then give me ilustration or image or anything to show me what is the
recommended changes instead of telling me with your technical AI sentence that i wont understand
keep this work method in mind when working with me"*. A 🔴 DECIDE on a screen is ONE IMAGE: today
and each option rendered at 375, side by side, the recommended one marked, one plain sentence
under each. The reply carries the question only.

⚠️ **Before this job: read Aldi's test results.** ✅ TEST owed: `2771374` (customer form: no
browser bubble, faint GPS example), `d4bd41a` (Running-low card in Master Vault mode; FLEET picker
"(Available: 100 Bks)"), `8ed215f` (store created today, no ANOTHER AGENT banner).

---

## Paste this to start the next session

> /alucard
>
> Read `.claude/NEXT-SESSION.md` first — it is the whole job, do not re-read source to re-orient.
>
> **Ask him first, in one line, for the two answers he owes:** the letter for the Restock Vault
> tab strip (A = the two extra tabs drop to a second row, recommended; B = a bar at the bottom of
> the screen; C = tabs slide sideways) and the number for the sweep (1 = one screen at a time,
> starting with the salesmen's screens: Sales Terminal → Customers → Agent Inventory → EOD Setoran
> → Stock Opname → Journey Plan → Sampling → Agent Profile; 2 = all 16 frames at once). If he
> already answered above this block, act on it and do not ask again.
>
> **How to render an option before building it (the method his rule requires):** the ponder lab
> takes `?css=<rules>` (`tools/ponder-lab.jsx`, top of file) and appends them after the app's own
> stylesheet. A scratch HTML with one 375×812 `<iframe>` per option — the pattern is
> `tabs-options.html` in this session's scratchpad, or rebuild it — rendered by headless Chrome
> at `--window-size=1620,1020` gives one PNG of every option side by side. Headless Chrome crops
> any window under ~518 px, which is exactly why the iframe is the trick: the iframe lays out at
> 375 inside a wide window. Send the PNG with SendUserFile, `display: render`.
>
> **Restock Vault at 375 — measured 2026-09-14 in the lab (`?places`, `innerWidth` 375):**
> 1. The tab strip clips. `src/RestockVaultView.jsx:1478` is `<div className="flex">` holding the
>    five tab buttons (434 px together) inside the desk `:1467` (`rounded-2xl overflow-hidden`,
>    327 px on the phone). BUKU is cut at 351, DATA INDUK sits at 375..458 and is never drawn.
>    **If he picks A:** `flex-wrap w-full lg:w-auto` on `:1478` and `flex-auto lg:flex-none` on
>    each button — the `lg:` halves are the desk's protection: on a desk the strip sits BESIDE the
>    title block on one line, and a bare `w-full` would drop it under the title. Measure the desk
>    at 1280 before and after; the head row is `flex-wrap` already (`:1470`), so the phone wrap
>    is free. If he picks B, the bottom bar is a new element, not a class — render it properly
>    first and show him again before building. If C, `overflow-x-auto` plus a visible edge cut.
> 2. `:2189` — the footer hint says *"Cari barang di kiri"* (search on the LEFT); on the phone the
>    list is ABOVE the form. One string, but it is his app's words: propose the wording, do not
>    pick it.
> 3. Thirteen form fields on the Data Induk tab measure 41 px tall (`py-2.5` inputs, e.g. `:1519`,
>    `:1524`, `:1562`); the app's minimum touch target is 44. Show, do not describe.
> 4. On his own 375 frame the desk is ~254 px of 375 — about a third of the phone is padding
>    (`p-6` shell + panel + card). Cutting it is a taste call: render a before/after first.
>
> **Guard for whatever ships:** `logicFixes.selfcheck.mjs`, scoped to the strip element (slice
> from `const tabs = [` to `tabs.map`), red before the edit, green after. Then `npm run build;
> node src/config/integration.audit.mjs` (722 now), `graphify update .`.
>
> **For every other screen:** his frame at 375 is the instrument (F12 → Ctrl+Shift+M → 375). No
> lab mount exists for Sales Terminal, Customers, Map, Fleet, Journey, Consignment, EOD, Stock
> Opname, Sampling, Reports, Audit Logs, Settings, Agent Profile, Agent Inventory, Master Vault,
> Command Center. Do not build sixteen mounts; read his frames, measure what can be measured in
> the lab, and put every finding in front of him as a picture.
>
> Rewrite this file with the next single job before closing.

---

## Not shipped 2026-09-14, evening — the decision is his

Restock Vault tab strip options rendered (`tabs-options.png`, real renders through `?css=`): TODAY
/ A wrap / B bottom bar / C sideways. He was asked for a letter and a number and closed the
session instead. The lab's `?css=` switch is committed (`tools/ponder-lab.jsx`). The design stack
(`impeccable adapt`, `emil-design-eng`, `ui-ux-pro-max`) was loaded per his 2026-08-23 rule;
`ui-ux-pro-max` says horizontal scroll on mobile is a High-severity anti-pattern, which is why C is
not recommended. His /findskill on the 1,194-skill library: 0 real matches (all phone forensics).

## Shipped 2026-09-14 — `2af2dd9` — CONFIRMED by Aldi

**The bell is on the phone screen.** Measured in the new `?shell` ponder-lab mount at a real
375×812: title stack 232 wide and unshrinkable, control cluster 229 and `shrink-0`, bell at x
442..489 inside an `overflow-hidden` column — clipped, never drawn. `flex-wrap` on the top bar row
(`BiohazardTheme.jsx:951`) and `ml-auto` on the control cluster (`:995`). Desk unchanged (one line,
82 tall at 1280). Section THE BELL IS ON THE PHONE SCREEN, 2 red → 1470/1470; audit 722/722. **The
ribbon claim was an artifact:** top 340 of 812. **Confirmed** with his Chrome device-toolbar frames
at 420 and 375 (*"sc1 is 420, sc2 is 375"*). Closed.

## Shipped 2026-09-13 — nine commits, seven confirmed

`9fed51d`, `0ff0732`, `d9de090` (boss is tier 1 on Stock Opname and the sales terminal; nota prints
the Settings name) — confirmed. `3af7685`, `7ea096e` rail tint — confirmed. `772ab0a` confirm
dialog over the alarm strip — confirmed. Owed: `2771374`, `d4bd41a`. From 2026-09-12: `8ed215f`.

<details>
<summary>Queue — do NOT paste these; promote one only when the job above is finished</summary>

### Promoted and parked behind the sweep

* **The fleet form's tier picker paints T3 for a value that is not an option.**
  `src/FleetCanvasManager.jsx:149-153` `defaultAgentState.userRole: 'AGENT'`; `:843` the tier
  `<select>` is `value={newAgent.userRole || 'AGENT'}`; `src/config/permissions.js:2-9` has no
  `'AGENT'` id, so the browser paints the first option (`AREA_ADMIN`, "T3: HQ SALES MANAGER")
  while the state keeps `'AGENT'`, which `:72` normalises to T5 at read time. Form shows T3, saves
  a T5. ❓ for Aldi: which tier should a new Sales Motorist get by default — T5 (today, hidden) or
  T6 (what the label says)? Diff `ROLE_PERMISSIONS[FIELD_OPERATIVE]` vs `[ROOKIE]` before
  describing the change. Do NOT delete `:72` — old records rely on it. Edit paths `:374`, `:389`.

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

### Phone — the lab instruments that exist now

* `?shell` — the app shell (top bar, ribbon). `?places` — Restock Vault. `?gudang` — branch
  warehouse. `?nota`, `?label`, `?scan`, `?perf`, `?plan`, `?minkirim`, `?toast`.
* `?css=<rules>` on any mount — render a proposed change before writing it.
* `preview_start` ponder-lab → `resize_window` 375×812 → probe with `innerWidth` in the same call.
  Headless Chrome crops under ~518; use an iframe wrapper for a 375 PNG.

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
