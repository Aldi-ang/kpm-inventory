# NEXT SESSION — read this, then `.claude/PROGRESS.md`. Read no code to orient.

**Written 2026-08-30 08:25 WIB. 666/666 audit · 831/831 selfcheck. Branch `phase0-solid-ground`,
tree clean at `b1cdcaa`.**

🟠 **PONDER IS PARKED.** His words, 2026-08-30: *"dont worry about the ponder book for now we focus
on system functionality"*. Do not start a tutorial chapter. The live front is the **Restock Vault**.

## First command

```
npm run build; node src/config/integration.audit.mjs; node src/config/logicFixes.selfcheck.mjs
```

He is on **PowerShell**: `;` not `&&`.

🔴 **RUN AND QUOTE BOTH SUITES.** `logicFixes.selfcheck` sat at **823/825** for four days and every
report said green, because reports only ever quote the first number. That is how two stale checks
hid. Both numbers, every time.

---

## 🔴 THE ONE JOB — feature "A": the reorder advice on the HQ side

**What it is.** `BranchWarehouseManager.jsx:1128` holds the *how many should I ask for* panel (G3,
built `33700ec`). Pick a product in the branch's Reorder Stock box and it prints, all measured from
real shipping history:

| Line | Meaning |
|---|---|
| Di gudang **N** | packs on that branch's shelf now |
| Di jalan **N** | shipped, not arrived |
| Keluar **± N/hari** | measured outflow, from `productArrivals` |
| Habis dalam **± N hari** | when the shelf hits zero |
| red: *kiriman butuh ± N hari, **pesan sekarang*** | runs dry BEFORE a shipment ordered today lands |
| Saran **N Bks** + `PAKAI` | suggested order size, one press to fill the box |

**The defect.** That panel lives inside `{isAreaAdmin && ...}` — `isAreaAdmin = !isAdmin` at
`BranchWarehouseManager.jsx:267`. So **the tier that ASKS gets the arithmetic and the tier that
SHIPS gets nothing.** HQ's push form and the Request tab both let you type a quantity from memory.

**The job.** Mount the same panel on the HQ side. He was asked `request` / `push` / `both` and never
answered — **`both` unless he says otherwise**, since it is one component and one extra mount.

**Where it goes:** the Request tab and the push/Kirim form, both now on the surat jalan desk in
`src/RestockVaultView.jsx` (moved there by `76de71a`).

**The trap that would make a lazy port wrong.** Everything the panel computes is keyed on
`branchLocation` — one branch, the viewer's own. HQ has no `branchLocation`; it has a **chosen**
branch per row. `productArrivals(requests, branch, productId)`, `shipmentRhythm(requests, branch)`
and `inTransitQty(requests, branch, productId)` all already take the branch as an argument, so the
maths ports unchanged — **but they are not exported.** Export them from
`BranchWarehouseManager.jsx` (they sit beside `receiptLines`, which is already exported and already
imported elsewhere), or lift them into `utils/supply.js` beside `supplyByProduct`. **Do not
re-derive the arithmetic in the desk file** — a second copy of "how fast does this leave" is the
exact fault [[A Ratio of Sums Is Not a Rate]] and `20c4a0a` were both about.

**Second trap:** `reorderAdvice` needs the branch's shelf figure. Branch-side it reads
`branchStock`; HQ-side the equivalent is `branchStockMap[branch]`, which `BranchWarehouseManager`
already receives as a prop from `App.jsx:4450`. `RestockVaultView` does **not** get it today —
check the prop list before writing the component, not after.

**Verify:** build, both suites, and one check that the HQ panel and the branch panel call the SAME
function (the guarantee, not the markup). Then look at it — `tools/ponder-lab.jsx` mounts real
components; see `?pov` for the pattern of adding a slice.

---

## What just shipped, and the two laws it left

`b1cdcaa` — the POV costume can be posted anywhere. His ask: *"i want the option for tier 1 so that
i can assign the test agent into different places with no problems"*.

- He first asked to **disable the roster form's email requirement**. **Refused, correctly:** that
  email is the document ID of the `employee_directory` row, the record that lets a human sign in,
  and `povPreview.js` deliberately never writes one for a test agent. Relaxing it mints a login for
  a fake person. The real blocker was `testAccountDoc`'s `defaults.location` — a parameter nobody
  ever passed, so every costume was born at `Headquarters`.
- **Headquarters IS the master vault, not a cabang** (`supply.js`, `NON_BRANCH`). Nothing posted
  there can ever see branch stock. Full page: `A-Brain/Wiki/Concepts/Headquarters Is Not a Cabang.md`.
- **A check points at a file, not at a behaviour.** Second instance of the split-component trap.
  Full page: `A-Brain/Wiki/Concepts/A Check Points at a File, Not at a Behaviour.md`.

---

## Traps — every one of these has already cost time

- **🔴 WHEN YOU MOVE CODE OUT OF A FILE, GREP THE CHECK SUITES FOR THAT PATH.**
  `grep -n "components/Foo.jsx" src/config/*.mjs`. Two guards read a file the code had left and
  nobody noticed for four days. Prefer `read(a) + read(b)` over re-pointing when a behaviour's home
  is genuinely ambiguous.
- **🔴 ONE PLACE LIST, EVER.** `warehouseList` / `NON_BRANCH` in `utils/supply.js` is the only
  source of "which warehouses exist". A private copy is not a copy, it is a second answer —
  `20c4a0a` paid for this once when the Tujuan dropdown offered Headquarters twice.
- **🔴 VERIFY IN A REAL BROWSER, NOT FROM THE DIFF.** `npx vite build --config
  tools/ponder-lab.config.mjs` then `python -m http.server 4187 -d dist-ponderlab`.
  **Screenshots must be written to the scratchpad, not the repo root — Chrome gets `Access is
  denied` there.** `--dump-dom | grep -o '<option[^>]*>[^<]*</option>'` proves a select's contents;
  a screenshot only shows it closed.
- **🔴 `?pov` MOUNTS THE COSTUME RACK.** It cannot be reached any other way — hidden sidebar door,
  gated on the owner's true email, behind the vault gate. `?pov=solo` is the fresh-company case.
- **🔴 A HOVER CANNOT BE SCREENSHOTTED — use `?hover`.** Headless Chrome has no pointer.
- **🔴 `preserve-3d` sorts children by DEPTH, not document order**, and if the element is animated
  the `translateZ` goes in the KEYFRAME, never on the element.
- **The palette law holds, with two written exemptions:** the book's cream pages, and the book's
  hover glow. No blue, no green anywhere else. Amber is an edge and an ink, never a fill.
- **Aldi is 14 and skims.** One bold line first saying what he must do. Define every term. Mark
  asks 🔴 DECIDE / ❓ ANSWER / ✅ TEST.

## Where things live

| Thing | Path |
|---|---|
| Session state | `.claude/PROGRESS.md` |
| The reorder advice (the thing to port) | `src/components/BranchWarehouseManager.jsx:1128` |
| `reorderAdvice` · `shipmentRhythm` · `productArrivals` · `inTransitQty` | same file, `:122`–`:264` |
| HQ's surat jalan desk — Request tab, push form, `REQ_RANK` | `src/RestockVaultView.jsx` |
| Where every pack is — the one warehouse-list function | `src/utils/supply.js` |
| POV rack + costume posting | `src/components/TierPovSwitch.jsx` · `src/App.jsx` |
| The 666 checks | `src/config/integration.audit.mjs` |
| The 831 checks | `src/config/logicFixes.selfcheck.mjs` |
| Viewing harness | `tools/ponder-lab.*` |
| The warehouse roadmap | `A-Brain/Wiki/Concepts/The Eight Warehouse Gaps.md` |

<details>
<summary>Queued behind this — do not start these</summary>

- **G1 + G2, one job, his doc calls it the money item.** Batch identity dies at the HQ door
  (`batchNo` is captured at intake, never copied onto `branches/{loc}/inventory`), and nothing
  enforces oldest-ships-first — age is *displayed* only.
- **G5** — inventory accuracy and shrinkage are never calculated, though the raw numbers now exist.
- **G4** — records joined by name, not id. A spelling fix silently splits one product into two.
  Biggest and riskiest; touches everything.
- **Redesign `BranchWarehouseManager` into Duke's Ledger.** It carries 0 `duke-` tokens. Palette is
  clean (semantic tokens only), so this is a look job, not a correctness one.
- **Ponder's remaining 15 chapters**, in `sections.js` order — parked at his word.
- **Untested by anyone: Siapkan Pengiriman and the shipping modal.**

</details>

**Before you finish: rewrite this file with the next single job.**
