# PONDER — the in-app tutorial system

**Written 2026-08-27. Nothing built yet — this is the plan he asked for, to be reviewed on a full quota.**
His ask: *"custom instruction menu on each of every components ... so that if our user forgot they can
just see it from there"*, and *"i want the tutorial to be like video interactive similar to ponder
system on minecraft create mod"*.

**Decided already:** scripted scenes, NOT recorded video. He chose this after seeing the trade-off.
Eight labels were renamed on 2026-08-27 alone; recorded clips would have gone stale the same day.

---

## 1. What we are copying, and what we are not

Ponder (Create mod) is not a video player. It builds a **small fixed world from a schematic**, then
runs a **script** over it: the camera moves, blocks place themselves, machinery turns, and captions
appear timed to the action. The player scrubs stages with ← →, replays, and jumps to related scenes.

**Copy these five:**
1. **Entry point is the thing itself.** In Create you press W on the item, not "open the manual".
   Here: a `?` chip on the panel you are confused by.
2. **Show, don't tell.** The world *does* the thing. Captions are short and sit beside the motion.
3. **Stages, not one long play.** Each beat is discrete, and you can go back one beat.
4. **A fixed demo world.** See §2 — this is the important one.
5. **Scenes link to scenes.** "Related: Kirim ke cabang".

**Do NOT copy:** Ponder's 3D camera work, its schematic format, or its length. Our scenes are
30–45 seconds, 5–8 steps.

---

## 2. 🔴 THE DECISION THAT SHAPES EVERYTHING — demo data, not live data

Two ways to build a scene:

| | Spotlight the LIVE panel | Render the panel with FIXED demo data |
|---|---|---|
| Always matches current UI | ✅ | ✅ (same component, different props) |
| Lesson works for a brand-new user | ❌ **empty data = a tutorial full of dashes** | ✅ always the same story |
| Can teach a state he has never hit (red "3 days left") | ❌ | ✅ |
| Can show a number *changing* | ❌ | ✅ |
| Panel must be scrolled/opened first | ❌ fragile | ✅ irrelevant |
| Work needed | less | one small refactor per component (§4) |

**Take the demo-data version.** It is what Ponder actually does — the schematic world is not your
base — and it is the only one that teaches a user whose warehouse is empty, which is exactly the
user who needs the tutorial. Bandung is all zeros today; a live-spotlight tutorial of Sebaran Stok
would currently teach nothing but `—`.

---

## 3. Scene format

A scene is **data, not code**. One file per component under `src/ponder/scenes/`.

```js
export const sebaranStok = {
  id: 'sebaran-stok',
  title: 'Sebaran Stok',
  blurb: 'Where every pack is, and which warehouse to restock first',
  related: ['restock-request', 'restock-kirim'],
  data: DEMO_WAREHOUSES,          // fixed props fed to the real component
  steps: [
    { text: 'Every warehouse you have, in one table. All numbers are in Bks.',
      focus: 'row:*' },
    { text: 'In stock is what is on that shelf right now — nothing else.',
      focus: 'col:shelf' },
    { text: 'Shipping is stock you already sent that has not been counted in yet. Nobody can sell it.',
      focus: 'col:transit' },
    { text: 'Agent inventory has arrived and is loaded on a salesman. This IS sellable.',
      focus: 'col:field' },
    { text: 'Sold counts the last 7 days. Avg / month is that × 30 ÷ 7 — an estimate, so it shows ≈.',
      focus: 'col:permonth', tick: 'permonth' },
    { text: 'Est. days left = In stock ÷ daily rate. Red means under a week — send there first.',
      focus: 'col:daysleft' },
    { text: 'Now open a warehouse. The total said 348 days, but this one product has 20.',
      focus: 'row:MASTER', act: 'open:MASTER' },
    { text: 'That is why the drawer exists: a warehouse total hides the product about to run dry.',
      focus: 'item:chocolate' },
  ],
}
```

- `focus` — what to spotlight. Resolved against `data-ponder="…"` attributes on the component.
- `act`   — a state change the engine performs (open a drawer, switch a tab).
- `tick`  — a number that counts up rather than appearing, for the beats that teach a calculation.
- Everything a scene needs is a **string or a key**. Writing a new scene must never require React.

---

## 4. Prerequisite refactor (small, do it first)

For demo data to work, the visual part of a panel must accept its rows as a prop instead of
computing them internally.

**Sebaran Stok today:** `BranchWarehouseManager` computes `logistics` in a `useMemo` from
`motorists / transactions / branchStockMap / requests`, then renders the table inline.

**Change:** extract the table into `SebaranStokTable({ rows, openGudang, onToggle })` —
presentational only, no Firestore, no maths. `BranchWarehouseManager` passes `logistics`; Ponder
passes `DEMO_WAREHOUSES`. Same component, so the tutorial cannot drift from the real screen.

Repeat per component as each scene is written. **Do not refactor them all up front** — do it one at
a time, with the scene, or it is speculative work.

---

## 5. Files

```
src/ponder/
  PonderButton.jsx     the ? chip. Props: sceneId. Sits in a panel's header.
  PonderOverlay.jsx    the modal: stage view, caption bar, ← → replay, progress dots, Esc
  registry.js          sceneId → scene. One import site, so an unknown id fails loudly.
  useSpotlight.js      resolves focus keys to elements and positions the cutout
  scenes/
    sebaran-stok.js
    restock-request.js
    ...
  demo/
    warehouses.js      the fixed demo dataset(s)
```

---

## 6. Traps specific to THIS codebase

- **Palette law.** No blue, no green. `slate-*` IS the blue. Gold is never text on light — use
  `text-accent-ink`. The overlay must use tokens or light mode loses it, exactly as happened to
  RestockVaultView before 2026-08-26.
- **"Lite mode" means performance.** Nothing rotates. Animate `transform` and `opacity` only.
- **`prefers-reduced-motion`** must jump to each step's end state and keep the captions. The
  tutorial has to still *teach* with motion off.
- **Dialog gate law.** Never `window.confirm` / `window.prompt` anywhere near this.
- **Mobile.** The rail is off-canvas under 1024px. The overlay must be full-screen there, and the
  caption bar must not cover the thing it is pointing at.
- **🔴 The footnote migration.** Deleting the Sebaran Stok footnote is part of the FIRST scene's
  slice, never before it. That paragraph is currently the only written record of the two formulas,
  and audit check 631 pins them to the screen. The check must **move** to assert the formulas appear
  in `scenes/sebaran-stok.js` — not be deleted. A check deleted to make a change pass is how the
  thing it protected comes back.

---

## 7. Checks to add with the engine

1. Every `sceneId` referenced by a `PonderButton` exists in the registry (a typo'd id must fail the
   audit, not render a dead `?`).
2. Every scene step has non-empty `text` — a silent step is a black screen.
3. Every `focus` key used in a scene exists as a `data-ponder` attribute in the component it targets.
   This is the one that stops scenes rotting when a panel is rewritten.
4. The Sebaran Stok formulas (`Sold (7d) ÷ 7 × 30`, `In stock ÷ (Sold (7d) ÷ 7)`) appear in the
   scene file — migrated check 631.

---

## 8. Build order

**Slice 1 — engine, on one panel.** `PonderButton` + `PonderOverlay` + registry + spotlight, with a
two-step placeholder scene. Nothing user-facing is claimed yet. Checks 1 and 2.

**Slice 2 — Sebaran Stok, for real.** The §4 refactor, `DEMO_WAREHOUSES`, the full scene above,
delete the footnote, migrate check 631. Check 3. **This is the slice that proves the format**, and
the scene content is already written above.

**Slice 3+ — one component per slice**, in this order, because these are where money goes wrong and
where a mistake is expensive:

| # | Component | The thing a user actually gets wrong |
|---|---|---|
| 1 | **Sales Terminal** | Titip vs paid; what a nota commits |
| 2 | **EOD Setoran** | What the cash count is compared against, and why it cannot be edited after |
| 3 | **Stock Opname** | Blind counting, and why the number is hidden on purpose |
| 4 | **Restock Vault · Request** | Siapkan Pengiriman deducts HQ stock immediately |
| 5 | **Sebaran Stok** | *(done in slice 2)* |
| 6 | **Receivables & Consignment** | Which debts are real vs consigned |
| 7 | **Fleet & Canvas** | Loading a van moves stock, it does not copy it |
| 8 | Dashboard · Map · Reports | read-only, lowest risk, do last |

---

## 9. Open questions for him

1. **Language.** Scenes in Indonesian, English, or both? His 2026-08-27 rule was *"use english terms
   if its shorter and direct"* — but that was for column labels. A teaching sentence is not a label,
   and the branch staff reading these may not read English. **Not assumed either way.**
2. **Autoplay or manual.** Ponder auto-runs a stage then waits. Same here, or press → for every beat?
3. **Does a first-time user get pushed into a scene**, or is `?` always opt-in only?
