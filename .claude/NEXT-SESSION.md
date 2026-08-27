# NEXT SESSION — read this, then `.claude/PONDER-PLAN.md` §4. Read no code to orient.

**Written 2026-08-27 12:18 WIB. 645/645. Branch `phase0-solid-ground`.**
`PROGRESS.md` is the state. This file is the one job. Slice 1 of Ponder is live and was looked at.

## First command

```
npm run build; node src/config/integration.audit.mjs
```

He is on **PowerShell**: `;` not `&&`.

---

## 🔴 THE ONE JOB — PONDER SLICE 2: put the REAL table on the stage

Right now the tutorial plays against `src/ponder/stages/PlaceholderStage.jsx`, a three-row
schematic that exists only to prove a `focus` key can light a cell. It is marked disposable in its
own header. **Slice 2 deletes it and renders the actual Stock by Warehouse table instead**, fed a
fixed demo dataset — so the tutorial and the screen it teaches can never drift apart.

### What the code does today

`src/components/BranchWarehouseManager.jsx`:

| Line | What is there |
|---|---|
| `332` | `const [openGudang, setOpenGudang] = useState(null)` — which warehouse drawer is open |
| `333` | `const logistics = useMemo(...)` — reads `motorists / transactions / branchStockMap / requests` and returns the rows |
| `1273` | `const COLS = 'grid grid-cols-[...]'` — the column template |
| `1275`–`1428` | the `<section>`: header, the chip, the column head, the rows, the drawers, the footnote |

The maths and the markup are welded together in one component, which is why the tutorial cannot
render it.

### The smallest change that works

Extract **only the visual half** into `src/ponder/stages/StockByWarehouseTable.jsx`:

```
StockByWarehouseTable({ rows, openGudang, onToggle })
```

Presentational only — **no Firestore, no `useMemo`, no supply maths**. `BranchWarehouseManager`
passes `logistics` and its real `openGudang`; the Ponder stage passes `DEMO_WAREHOUSES` from a new
`src/ponder/demo/warehouses.js` and its own local open state. Register it in `registry.js` as
`STAGES['stock-table']` and change the scene's `stage: 'placeholder'` to `stage: 'stock-table'`.

Then, and only then:

1. delete `PlaceholderStage.jsx`
2. delete the footnote at line ~1425
3. **MOVE audit check 631** onto the scene file — do not delete it. Group 56 already asserts the
   scene text carries `Sold (7d) ÷ 7 × 30` and `In stock ÷ (Sold (7d) ÷ 7)`, so the coverage
   exists before the footnote goes.
4. add the `data-ponder` attributes to the extracted table: `col:shelf`, `col:transit`,
   `col:field`, `col:permonth`, `col:daysleft`, and `row:<name>` per row. The scene's focus keys
   are already written against exactly these names, and group 56 fails if one goes missing.

### The traps, each of which has already cost time

- **🔴 A HEADLESS SCREENSHOT NARROWER THAN ~518px ON WINDOWS IS A CROP, NOT A LAYOUT.** Chrome
  refuses to open a window narrower than that, so `--window-size=375` lays out at 518 and saves the
  left 375px. Three phone shots "proved" an overflow bug that did not exist. Open the lab with
  `?probe` and read `innerWidth` out of the DOM before believing any narrow frame.
- **The demo data must carry the last beat.** Beat 7 says a warehouse total can look safe while one
  product inside it is nearly out. If `DEMO_WAREHOUSES` has no such product, the scene teaches
  nothing at its most important moment.
- **`supplyByProduct` drops any product whose shelf+field+sold is 0.** Demo rows have to survive
  that, or a warehouse waiting on its first delivery renders empty — check 55 exists for this.
- **A check anchored on display copy fires on every wording change.** Anchor on the CLAIM.
- **A JSX block comment that starts `{/* X */` closes itself.** It broke the build once.
- **The vault gate re-locks and you cannot type the password.** Do not spend ten tool calls proving
  it — use the lab below, or ask him to open Chrome.

### How to actually see it

```
npx vite build --config tools/ponder-lab.config.mjs
python -m http.server 4187 -d dist-ponderlab
```

Then `http://localhost:4187/tools/ponder-lab.html` with any of `?light`, `?lite`, `?step=N`,
`?scene=<id>`, `?probe`. It mounts the REAL overlay against the REAL stylesheet, no login. Frames
come from headless Chrome:

```
"/c/Program Files/Google/Chrome/Application/chrome.exe" --headless=new --disable-gpu --hide-scrollbars --virtual-time-budget=3500 --screenshot=out.png --window-size=1200,860 "http://localhost:4187/tools/ponder-lab.html?step=5"
```

---

## Where things live

| Thing | Path |
|---|---|
| Session state | `.claude/PROGRESS.md` |
| Ponder design | `.claude/PONDER-PLAN.md` |
| The engine | `src/ponder/useScenePlayer.js` · `PonderOverlay.jsx` · `PonderButton.jsx` · `registry.js` |
| The first scene | `src/ponder/scenes/stock-by-warehouse.js` |
| Stock by Warehouse panel | `src/components/BranchWarehouseManager.jsx` |
| Supply maths, shared with the dashboard | `src/utils/supply.js` |
| The 645 checks | `src/config/integration.audit.mjs` (group 56 is Ponder) |
| Viewing harness | `tools/ponder-lab.*` |
| Lessons | `~/.claude/skills/alucard/lessons.md` |

<details>
<summary>Queued behind this — do not start these</summary>

- **Slice 3+, one component per slice**, ranked by where a mistake costs money: Sales Terminal
  (titip vs paid) → EOD Setoran → Stock Opname (why the count is hidden) → Restock Vault Request
  (Siapkan deducts HQ stock immediately) → Receivables → Fleet & Canvas (loading a van *moves*
  stock) → Dashboard/Map/Reports last.
- **Identify-on-hover**, Ponder's real pause behaviour: while frozen, hovering a column names it.
  It needs a stage with real named parts, so it can only follow slice 2.
- **Untested by anyone: the Siapkan Pengiriman button and the shipping modal.** He has zero open
  branch requests and no fake ones were written into live Firestore. The first real one is the test.

</details>

**Before you finish: rewrite this file with the next single job.**
