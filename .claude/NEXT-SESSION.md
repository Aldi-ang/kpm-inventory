# NEXT SESSION — read this, then `.claude/PROGRESS.md`. Read no code to orient.

**Written 2026-08-31 18:05 WIB. 673/673 audit · 925/925 selfcheck. Branch `phase0-solid-ground`.**

## First command

```
npm run build; node src/config/integration.audit.mjs; node src/config/logicFixes.selfcheck.mjs
```

PowerShell: `;` not `&&`. **Quote BOTH numbers.** The audit refuses to run against a stale `dist/`.

---

## ⏱️ The quota meter is FIXED — do not re-investigate it

`[plan-quota]` now reads a real number. The connection id is
`76c7cf4f-4c24-4984-aada-3aa91f53a148`, and it lives in **`C:/Users/ASUS/.claude/9router-claude-id.txt`**
— note the `.claude/` in that path. `C:/Users/ASUS/9router-claude-id.txt` also exists, is a decoy,
and is read by nothing. The earlier brief named the decoy, which is why four sessions of guessing
went nowhere.

Two buckets are live and both are now watched: `session (5h)` and `weekly (7d)`. Silence below 70%
is correct. To see it speak: `sed 's/used >= 70/used >= 5/' .claude/plan-quota.mjs > /tmp/m.mjs`
then `echo '{}' | node /tmp/m.mjs`.

---

## THE ONE JOB — redesign the surat jalan receipt, and fix the hole that makes it transparent

`src/RestockVaultView.jsx`, the `viewingAcceptance` modal, around line **1030**. His words,
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

**One thing already changed under it:** the receipt's TUJUAN line now prints
`Gudang Pusat (Master Vault)`, one constant shared with the warehouse table. Do not re-hardcode it.

---

<details>
<summary>Queued — do not start these</summary>

- **Ponder caption on phones.** DECIDED 2026-08-31, not built. His words: *"to save space then let
  it stay static for phones but move for PC"* and *"u can use /emil design to help u do this job"*.
  Today the phone case is `if (boxW > W * 0.7) return null;` in `PonderOverlay.jsx` — it HIDES the
  caption rather than pinning it. The job is a third state: visible, fixed position, phone only.
  Load the §1a design stack plus `Skill(emil-design-eng)` before proposing anything.
- **Registered factories and warehouses**, and Asal/Tujuan corrected on the Masuk panel. His words:
  *"asal inside the masuk panel should be the factory location and tujuan should be the warehouse
  location"* and *"textbox is used only to search gudang name not register a new one"*. **The old
  records question is ANSWERED and closed** — 2026-08-31: *"we can leave the old record thats okay
  all the record is still on trials and error anyway"*. So: no migration, no reconciliation prompt.
  New entries pick from the registry; old typed-in strings stay as they are.
- **Redesign `BranchWarehouseManager` into Duke's Ledger** — his own to-do, *"we havent redesign the
  regional warehouse"*. Last screen in the old visual language.
- **G1 + G2, the money item.** `batchNo` captured at intake and never copied onto
  `branches/{loc}/inventory`; nothing enforces oldest-ships-first.
- **Three caption/ring overlaps in Stock by Warehouse on DESKTOP**, beats 7, 16, 22. Reproduce on a
  FRESH load and use a 2-D overlap test.
- **`StockByWarehouseTable` truncates warehouse names on a phone** — and the name just got LONGER
  (`Gudang Pusat (Master Vault)`), so re-check this one before assuming it is unchanged.
- **G5** shrinkage · **G4** records joined by name not id · **Siapkan Pengiriman and the shipping
  modal, still untested by anyone.**
- **9router dies at login.** Its startup script uses `start /min`, which throws the error away. A
  30-second delay plus a redirect into `startup.log` is drafted and **not applied** — it edits a
  file that runs at every login, and he has not said yes.

</details>

WARNING — the preview pane freezes its own clock while hidden. rAF never fires and a 40ms timer
measured 810ms. **`tabs_select` to front the tab before testing motion.**

**Before you finish: rewrite this file with the next single job.**
