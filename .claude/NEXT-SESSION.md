# NEXT SESSION — read this, then `.claude/PROGRESS.md`. Read no code to orient.

**Written 2026-08-31 10:42 WIB. 673/673 audit · 915/915 selfcheck. Branch `phase0-solid-ground`,
tree clean at `ee5dbfd`.**

## First command

```
npm run build; node src/config/integration.audit.mjs; node src/config/logicFixes.selfcheck.mjs
```

PowerShell: `;` not `&&`. **Quote BOTH numbers.** The audit refuses to run against a stale `dist/`.

---

## ⏱️ FIRST TWO MINUTES — finish the quota meter, it is one guess away

`.claude/plan-quota.mjs` now RUNS (the id file exists again) but prints `9router answered 404`.
**The endpoint is fine** — in his browser `GET http://localhost:20128/api/usage/{uuid}` returns
**200**. Four connection uuids exist; the one now in `C:/Users/ASUS/9router-claude-id.txt` is
`64c59482-eae9-4a74-8b38-68398d5a246a` and it 404s from the hook.

**The other three, untried:**

```
2a9e8eec-abfc-42e8-b4a1-d15d197a5df8
3d1d7d0b-9aa1-4168-8529-674d912904c1
76c7cf4f-4c24-4984-aada-3aa91f53a148
```

**Test without spending anything:** write one into the file, then read the `[plan-quota]` line on
his very next message. The hook reports itself. One id per message, three messages maximum.

**If all four 404:** the id is not the problem — the minted `auth_token` is not accepted on that
route. A bad token returns 401 and this returns 404, so that is not yet proven either way. The
durable fix is then to read 9router's local store at `C:/Users/ASUS/AppData/Roaming/9router/db`
instead of calling HTTP at all. **Ask before reading anything there** — probing that API by minting
a token from `jwt-secret` was refused by the permission classifier, correctly, and that refusal must
not be routed around.

WARNING — do not repeat the 2026-08-31 dead ends. `/api/usage` with NO id returns 404 and means
nothing; the route needs the uuid. The cookie file is irrelevant: the hook mints its own token and
the jar holds only `auth_token`. `status`, `settings`, `version` and `keys` carry no id.

---

## THE ONE JOB — redesign the surat jalan receipt, and fix the hole that makes it transparent

`src/RestockVaultView.jsx`, the `viewingAcceptance` modal, around line **1026**. His words,
2026-08-31: *"we need to redesign the receipt for this because it looks awful and i dont know why is
it transparant look at the SC"*.

**The bug is real and confirmed from his frame:** page content shows through the card, doubled
behind the receipt text. The card is `print-receipt bg-white text-black ... animate-fade-in` inside
a `fixed inset-0 z-[200] bg-sunk/80` overlay.

**Already ruled out — do not re-check:**
- The `<style>` block above it is correctly scoped inside `@media print`.
- `.bg-white`, `.text-black` and `.bg-gray-100` all EXIST in the built CSS with correct
  declarations — `grep -o "\.bg-white{[^}]*}" dist/assets/*.css`.
- `colors` sits inside `extend` in `tailwind.config.js`, so Tailwind's defaults are intact.
- The lite-mode `!important` scrim in `index.css` only targets `[class*="backdrop-blur"]`, and this
  overlay has none.

**The unanswered question is whether he was in Lite Mode, and which theme. Do not ask him again —
reproduce it.** The component needs no Firestore, only a `viewingAcceptance` object, so add a
`?nota` slice to `tools/ponder-lab.jsx` mounting the modal against a fixed record, exactly the way
`?perf` mounts the Product Performance panel. One frame settles it, in both themes and `?nota&lite`.

**Then the look.** It is a PRINTED DOCUMENT, not app UI — the palette law stops at the print block
and the receipt keeps KPM company blue. Read `A-Brain/Wiki/Concepts/Aldi's Design Taste.md` first,
per SKILL.md section 1a.

**Leave a check behind:** the receipt's background must be opaque. Assert the guarantee, not a
spelling — a `?nota&probe` reading `getComputedStyle(card).backgroundColor` beats grepping a class.

---

## HIS OTHER TWO REQUIREMENTS FROM THE SAME SCREENSHOT — queued behind the receipt

**1. One name for the main warehouse.** *"our name for the main warehouse is master vault isnt?"*
Spelled three ways today: `HQ_NAME = 'Gudang Pusat (HQ)'` (`RestockVaultView.jsx:33`), `MASTER`
(`utils/supply.js:34`), and hardcoded again in `GoodsReceivedStage.jsx:42`. **He has not said which
name wins — ask, then make the other two read from it.**

**2. Asal / Tujuan are wrong on the Masuk panel, and places must be REGISTERED.** His words:
*"asal inside the masuk panel should be the factory location and tujuan should be the warehouse
location, can be sent to master vault or regional warehouse directly"*, and *"we need to make option
to register factory and gudang therefore the adress for both is fixed and there is no way to input
new name inside the textbox. textbox is used only to search gudang name not register a new one
unlike sales terminal"*.

A registry of factories and warehouses; the fields become a SEARCH over it, never a create. **This
is a data-model job.** The open question he has not answered: what happens to deliveries already
saved with typed-in names — leave them, or reconcile them on first open? That decides one day
versus two.

---

## UNANSWERED — asked, never chosen

> *"wait where is the small box inside the ponder system that move with the higlights panel?"*

The `near` caption. Alive on desktop, off on phones by `if (boxW > W * 0.7) return null;` in
`PonderOverlay.jsx`. He was given keep / force-back-on-phone / shrink-for-phone and picked none.
**Do not change it unprompted.**

<details>
<summary>Queued — do not start these</summary>

- **Redesign `BranchWarehouseManager` into Duke's Ledger** — his own to-do, *"we havent redesign the
  regional warehouse"*. Last screen in the old visual language. Load the design stack first.
- **G1 + G2, the money item.** `batchNo` captured at intake and never copied onto
  `branches/{loc}/inventory`; nothing enforces oldest-ships-first.
- **Three caption/ring overlaps in Stock by Warehouse on DESKTOP**, beats 7, 16, 22. Reproduce on a
  FRESH load and use a 2-D overlap test, or every *beside* caption reads as a failure.
- **`StockByWarehouseTable` truncates warehouse names on a phone** — same squeeze fixed in
  `ShipmentPlanTable`, but its grid is a Tailwind class with audit checks pinning it.
- **G5** shrinkage · **G4** records joined by name not id · **Siapkan Pengiriman and the shipping
  modal, still untested by anyone.**
- **Restock Vault review is DONE** (2026-08-31) — clean; two non-urgent notes are in PROGRESS.

</details>

WARNING — the preview pane freezes its own clock while hidden. rAF never fires and a 40ms timer
measured 810ms. **`tabs_select` to front the tab before testing motion.**

**Before you finish: rewrite this file with the next single job.**
