# NEXT SESSION — read this, then `.claude/PROGRESS.md`. Read no code to orient.

**Written 2026-08-31 09:25 WIB. 670/670 audit · 915/915 selfcheck. Branch `phase0-solid-ground`,
tree clean at `c4f2f1b`.**

## First command

```
npm run build; node src/config/integration.audit.mjs; node src/config/logicFixes.selfcheck.mjs
```

PowerShell: `;` not `&&`. **Quote BOTH numbers in every report.** The audit refuses to run against a
stale `dist/`, so build first or it tells you to.

---

## 🔴 THE ONE JOB — three caption/ring overlaps in Stock by Warehouse, on DESKTOP

The phone half is finished and checked. These three are what is left, they were found by the same
sweep, and they are **not** caused by the scroll fix in `aef7f03` — both changed lines are provably inert at
desktop width (the stage does not scroll there, `scrollHeight === clientHeight` at 1440, and
`boxW` 380 never exceeds the 715px bail threshold).

Measured at 1440 walking the beats in order, stage `W=1022 H=439`:

| beat | caption box (t/b, l/r) | ring (t/b, l/r) | why it is wrong |
|---|---|---|---|
| 7 | 136–260, 129–480 | 13–202, 13–139 | box starts inside the ring's column |
| 16 | 83–208, 463–815 | 96–216, **−6–966** | ring is full-width; there is no beside |
| 22 | 286–411, 304–656 | 206–305, **−6–966** | same, and the box overlaps below |

**The shape:** beats 16 and 22 highlight a **full-width row** (`l=-6, r=966` on a 1022px stage).
A caption cannot stand beside a subject that spans the whole stage, so `near` must place it above or
below — and the room test currently lets it choose a position that still intersects. Beat 7's
subject is a tall narrow block instead, so it is likely a different case; check it separately.

**Do this first, before any edit:** reproduce each on a FRESH load, not by clicking through.
`?scene=stock-by-warehouse&step=6` / `&step=15` / `&step=21` (step is 0-based; the on-screen counter
is 1-based). A click-through walk and a fresh load gave different stage heights and different
geometry when this was measured — **439 walking, 525 fresh** — and two "failures" evaporated on a fresh load.

**And use a 2-D overlap test.** A 1-D vertical test flags every *beside* caption, which is correct
behaviour, and it cost a full round trip when this was measured:

```js
const hit = !(B.b<=R.t || B.t>=R.b) && !(B.r<=R.l || B.l>=R.r);
```

**The trap that will bite:** do not "fix" this by clamping. The same instinct produced a whole
handoff brief aimed at an unclamped `top` in `PonderOverlay.jsx` that was real, visible in
the source, explained every symptom, and was **not the bug**. Measure what the browser is actually
doing before editing anything. `A-Brain/Wiki/Concepts/A Smooth Scroll That Never Runs.md` has the
whole story.

**Where it lives:** the `near` `useMemo` in `src/ponder/PonderOverlay.jsx` (~line 300). Whatever
lands there needs a check beside checks 668, 669 and 670, and it must be mutation-tested red before green.

---

## How to look at any of this

```
npx vite build --config tools/ponder-lab.config.mjs
python -m http.server 4187 -d dist-ponderlab
```

Then `preview_start` on `http://localhost:4187/tools/ponder-lab.html`, and `resize_window` to
`mobile` for 375px. **Reset to `desktop` when finished** — the emulation is sticky per tab.

| Slice | URL |
|---|---|
| Any beat, frozen | `?scene=<id>&step=N` — **0-based** |
| Product Performance panel: loading · failed read | `?perf` · `?perf=failed` |
| Sebaran Stok · Rencana Kirim | `?minkirim` · `?plan` |
| Light · Lite Mode | add `&light` · `&lite` |

Scenes: `product-performance` (12 beats) · `stock-by-warehouse` (23) · `goods-received` (30) ·
`shipment-plan` (13). **Screenshots go to the scratchpad, never the repo root — Chrome gets
`Access is denied` there.**

---

## 🔴 TWO THINGS ONLY ALDI CAN DO, both still open

1. **The quota meter is blind.** `.claude/plan-quota.mjs` warns at 70/85/95 and has never run:
   `C:/Users/ASUS/9router-claude-id.txt` and `9router-cookie.txt` do not exist, and the hook exits
   silently without the id. He creates both by hand from the Quota Tracker; the cookie is a
   credential and never goes in the repo or in chat. Until then **there is no 5-hour meter at all**,
   so write `NEXT-SESSION.md` then `PROGRESS.md` right after the first commit, not at the end.
   The Stop hook now blocks on either being stale, so this is enforced rather than remembered.
2. **Rebuild sales totals**, Settings › Company · 07, pressed once. Until then every month before
   2026-08-30 is empty and Product Performance correctly says so.

<details>
<summary>Queued behind this — do not start these</summary>

- **G1 + G2, his own doc calls it the money item.** Batch identity dies at the HQ door (`batchNo`
  captured at intake, never copied onto `branches/{loc}/inventory`), and nothing enforces
  oldest-ships-first — age is displayed only.
- **G5** — inventory accuracy and shrinkage never calculated, though the raw numbers exist.
- **G4** — records joined by name, not id. A spelling fix silently splits one product into two.
- **Redesign `BranchWarehouseManager` into Duke's Ledger.** A look job, not a correctness one.
- **Untested by anyone: Siapkan Pengiriman and the shipping modal.**
- **The book never shuts when you pick a scene from it.** Found 2026-08-31 while fixing the panel's
  own exit. `PonderBookButton`'s `onPick` does `setLibOpen(false)` and unmounts the Library on the
  spot, so the shut-and-fly-back it already owns (`leafShut 520 → flyOut 480`, guarded by
  `closingRef`) only ever plays if you close the BOOK. Open a scene from it and the book simply
  vanishes. Aldi has not asked for this — mention it before building it, because the honest fix
  hands the close over to the Library and that is surgery on a delicate animation.

</details>

**Before you finish: rewrite this file with the next single job.**
