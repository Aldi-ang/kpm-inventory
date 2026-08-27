# NEXT SESSION — read this, then `.claude/PONDER-PLAN.md`. Read no code to orient.

**Written 2026-08-27 13:18 WIB. 651/651. Branch `phase0-solid-ground`, clean at `7b353a3`.**
`PROGRESS.md` is the state. This file is the one job. The tutorial engine, the book and the first
scene are all shipped and were looked at.

## First command

```
npm run build; node src/config/integration.audit.mjs
```

He is on **PowerShell**: `;` not `&&`.

---

## 🔴 THE ONE JOB — write the Sales Terminal tutorial: **Titip vs Lunas**

The book already lists it (`Kasir` tab, first card, marked *belum ditulis*). It is first in the
build order because it is where a mistake costs the most money: a consignment booked as a paid sale
is money the app thinks it has already collected.

### What has to exist

1. **`src/ponder/scenes/kasir-titip-vs-lunas.js`** — a data file, no React. Copy the shape of
   `scenes/stock-by-warehouse.js`: `{ id, title, section, blurb, stage, steps[] }`, each step
   `{ text, focus, at, tone, act, hold }`. **Indonesian sentences, English feature names in `**`.**
2. **A stage.** Two honest options, and the first one that works wins:
   - **Extract the wares list / nota strip** the way `StockByWarehouseTable` was extracted, and
     feed it demo data. Best, because the tutorial then cannot drift from the screen.
   - **A schematic stage** if the terminal resists extraction. `MerchantSalesView` is the most
     check-covered file in the repo and it is the money path — **if pulling the visual half out
     starts touching anything that computes a total, stop and build a schematic instead.** Ponder's
     own world is a schematic, not your base, so this is not a downgrade. Say which was chosen.
3. **`data-ponder` keys on whatever the stage renders**, and the scene's `focus` keys must match.
   Group 56 fails otherwise — it resolves a key either as a literal `data-ponder="k"` or as a
   prefix the stage builds from data (`data-ponder={\`item:${...}\`}`) plus that value existing.
4. **Register it**: `SCENES` in `registry.js`, `STAGES` if a new stage, and flip the `Kasir` entry
   in `src/ponder/sections.js` from `soon: true` to `sceneId: 'kasir-titip-vs-lunas'`.

### What the scene has to teach

The one thing a person gets wrong, and it is not a UI question: **titip** leaves the building but is
still your stock and not yet your money; **lunas** is money in. Then what a printed nota commits.
Grep the terminal for the real field names before writing a word — a scene that teaches a label the
screen does not have is worse than no scene.

### Traps, each of which has already cost time here

- **🔴 A `requestAnimationFrame` scheduled inside an effect can be cancelled by that effect's own
  cleanup before it ever fires.** It happened twice in one session: once the spotlight silently
  dimmed nothing, once the book rendered at `opacity: 0`. **Nothing errored and every check stayed
  green both times.** Measure synchronously in a layout effect; use a keyframe when something must
  animate on mount, and a transition only when it must reverse.
- **🔴 A headless screenshot narrower than ~518px on Windows is a CROP, not a layout.** Chrome will
  not open a window under that width, so `--window-size=375` lays out at 518 and saves the left
  375px. Open the lab with `?probe` and read `innerWidth` out of the DOM before believing a narrow
  frame.
- **A beat with an `act` changes the layout after it is measured.** The overlay watches the stage
  with a `ResizeObserver` for exactly this; a new stage that animates needs nothing extra, but a
  stage that renders in a portal would escape it.
- **Splitting a component splits its checks.** Five group-55 checks had to be repointed when the
  stock table moved files. Grep the audit for the old filename before assuming a check still reads
  what it used to.
- **A JSX block comment that starts `{/* X */` closes itself.** It broke the build once.
- **The vault gate re-locks and you cannot type the password.** Use the lab; do not spend ten tool
  calls proving the notes were right.

### How to see it

```
npx vite build --config tools/ponder-lab.config.mjs
python -m http.server 4187 -d dist-ponderlab
```

`http://localhost:4187/tools/ponder-lab.html` with `?scene=<id>`, `?step=N`, `?book`, `?light`,
`?lite`, `?probe`. It mounts the REAL components against the REAL stylesheet, no login. Frames:

```
"/c/Program Files/Google/Chrome/Application/chrome.exe" --headless=new --disable-gpu --hide-scrollbars --virtual-time-budget=5000 --screenshot=out.png --window-size=1280,900 "http://localhost:4187/tools/ponder-lab.html?step=5"
```

---

## Where things live

| Thing | Path |
|---|---|
| Session state | `.claude/PROGRESS.md` |
| Ponder design | `.claude/PONDER-PLAN.md` |
| The clock | `src/ponder/useScenePlayer.js` |
| The player (captions, highlight, controls) | `src/ponder/PonderOverlay.jsx` |
| The book | `src/ponder/PonderBook.jsx` · contents in `src/ponder/sections.js` |
| The `?` chip | `src/ponder/PonderButton.jsx` |
| Scene ↔ stage wiring | `src/ponder/registry.js` |
| Scenes | `src/ponder/scenes/` |
| Stages + the extracted stock table | `src/ponder/stages/` |
| Demo world | `src/ponder/demo/warehouses.js` |
| Book sounds | `src/ponder/sfx.js` (app's own audio, re-pointed) |
| Stock maths | `src/components/BranchWarehouseManager.jsx` · `src/utils/supply.js` |
| The 651 checks | `src/config/integration.audit.mjs` (group **56** is Ponder) |
| Viewing harness | `tools/ponder-lab.*` |
| Lessons | `~/.claude/skills/alucard/lessons.md` |

<details>
<summary>Queued behind this — do not start these</summary>

- **Identify-on-hover.** Ponder's pause is really *Identify*: it freezes the scene so you can hover
  a part and have it named. The stage now has named parts, so this is finally possible — hovering a
  frozen `data-ponder` element shows its one-line definition. Small engine change, improves every
  scene ever written.
- **The rest of the sections**, in the order `sections.js` already lists them: Setoran → Stock
  Opname → Restock Vault (Siapkan deducts HQ stock immediately) → Piutang → Armada → Laporan.
- **Real book audio.** Drop `book-open.mp3` / `page-turn.mp3` / `book-close.mp3` into
  `public/sounds/`, add them to `SOURCES` in `src/hooks/useSound.js`, change four names in
  `src/ponder/sfx.js`. The wiring is done; only the files are missing.
- **Untested by anyone: the Siapkan Pengiriman button and the shipping modal.** He has zero open
  branch requests and no fake ones were written into live Firestore. The first real one is the test.
- **Open, and his to answer:** the panel name `Stock by Warehouse` was my call, not his. If he
  vetoes it, it is one string at `BranchWarehouseManager.jsx` plus the scene's `title`.

</details>

**Before you finish: rewrite this file with the next single job.**
