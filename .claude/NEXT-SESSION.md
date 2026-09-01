# NEXT SESSION — read this, then `.claude/PROGRESS.md`. Read no code to orient.

**Written 2026-09-01 07:50 WIB. 680/680 audit · 957/957 selfcheck. Branch `phase0-solid-ground`.**

## First command

```
npm run build; node src/config/integration.audit.mjs; node src/config/logicFixes.selfcheck.mjs
```

PowerShell: `;` not `&&`. **Quote BOTH numbers.** The audit refuses to run against a stale `dist/`.

## To LOOK at a screen without signing in

```
npx vite build --config tools/ponder-lab.config.mjs; python -m http.server 4187 -d dist-ponderlab
```

`?gudang` mounts the **branch warehouse screen** · `?places` the Restock Vault · `?nota` the surat
jalan. Add `&light`, `&lite`, `&probe`.

**`?gudang` is new and it is the reusable part.** `tools/lab-firestore-stub.js` is aliased over
`firebase/firestore` for the lab build only, so a screen that needs live data now renders against
fixtures through its own real listener. Adding a screen means adding a `FIXTURES['<path tail>']`
entry and a mount — no component changes.

⚠️ **The pane lies.** A screenshot can be a stale frame or a mid-fade, and `document.hidden` is
`true` unless you `tabs_select` first. **Drive it with `element.click()` and read computed values.**

---

## THE ONE JOB — the two faults found on 2026-09-01 are app-wide, and nothing pins them

Both were found by LOOKING at the branch warehouse screen *after every check on it was already
green*, and both are palette-law breaches in light mode. Counted across `src/**/*.jsx`:

| Fault | Sites | Why it is a bug |
|---|---|---|
| **Uncoloured `placeholder=`** | **90, in 18 files** | no colour set → the browser's own `rgb(156,163,175)`, which is **slate, the hue the law bans by name**. Measured **1,36:1** on the light well |
| **Bare `text-orange` as ink** | **~107, in 15 files** | `--orange` is `#FF8C1A` in BOTH themes because it is the EDGE half of the amber law. As reading ink on the light well it measured **1,08:1** |

Worst offenders: `RestockVaultView.jsx` (19 placeholders), `CustomerManager.jsx` (13),
`JourneyView.jsx` (21 orange), `MapMissionControl.jsx` (18 orange).

**The fix is already written and shipped once** — copy it out of `BranchWarehouseManager.jsx`:

- placeholders → `placeholder:text-ink-dim placeholder:opacity-100 placeholder:italic`. All three
  parts are load-bearing. `opacity-100` because **Firefox dims placeholders by .54 on top of any
  colour set**; `italic` because in light mode a darkened placeholder is otherwise
  indistinguishable from a typed value (`theme.css:3231` settled this, and says so).
- `text-orange` → `text-accent-ink`. **`border-orange` and `bg-orange` stay** — those are edges,
  and a 3px rule is the legal form of amber.

⚠️ **THE TRAP THAT MAKES A LAZY SWEEP WRONG.** Not every `text-orange` is a breach: one sitting on
a scrim or a dark-only surface is correct, because a scrim is dark in both themes by law. A blind
regex over 15 files will repaint those too and nobody will notice. **Measure each ground before
swapping** — mount the screen at `?<lab>&light` and sweep leaf text nodes against the first
ancestor that paints an opaque background. That sweep is written; lift it from the `?gudang&probe`
block in `tools/ponder-lab.jsx`.

⚠️ **Do not add `.kpm-inline` to reach the placeholder rule.** It carries its own height, padding
and border, and will fight classes the inputs already have. That is why the fix is per-input.

**Pin it in `integration.audit.mjs` group 57's shape** — that group went red on all four of its
first checks before the edit, which is the only reason its green is worth anything.

---

<details>
<summary>Queued — do not start these</summary>

- **G1 + G2, the money item.** `batchNo` captured at intake, never copied onto
  `branches/{loc}/inventory`; nothing enforces oldest-ships-first. **If he wants money before
  paint, this jumps the queue** — his own standing call on the warehouse-gaps list.
- **Ponder caption static on phones, moving on PC.** DECIDED 2026-08-31, not built. *"to save space
  then let it stay static for phones but move for PC"*. Today `PonderOverlay.jsx` HIDES it:
  `if (boxW > W * 0.7) return null;`. The job is a third state — visible, fixed, phone only.
- **"My Current Branch Inventory" takes 3 lines at 375px.** Measured, not broken: 16px, the title
  column is 218px, and the chevron eats width the other panels do not spend. A shorter name would
  fix it and **naming is his** — ask before renaming.
- **Landed cost spreads shipping/labour/excise equally per UNIT**, so a cheap product absorbs the
  same rupiah as an expensive one. **A decision he has not been asked to confirm**, not a bug.
- **Restock Vault: nothing destructive is gated by ROLE** — what protects it is the screen mounting
  behind `isAdmin`, the Master Vault password.
- **Three caption/ring overlaps in Stock by Warehouse on DESKTOP**, beats 7, 16, 22.
- **G5** shrinkage · **G4** records joined by name not id · **Siapkan Pengiriman and the shipping
  modal, still untested by anyone.**
- **9router dies at login.** Its startup script uses `start /min`, which throws the error away. A
  30-second delay plus a redirect into `startup.log` is drafted and **not applied** — it edits a
  file that runs at every login, and he has not said yes.
- **The quota meter is FIXED, do not re-investigate.** Id `76c7cf4f-4c24-4984-aada-3aa91f53a148` in
  `C:/Users/ASUS/.claude/9router-claude-id.txt` — note the `.claude/`.

</details>

**Before you finish: rewrite this file with the next single job.**
