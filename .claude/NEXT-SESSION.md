# NEXT SESSION — Restock Vault desk, continued

**Branch:** `phase0-solid-ground` · **Last commit:** `5643bf9` · **616 checks, 0 failures**

## First command, before anything else

```powershell
npm run build; node src/config/integration.audit.mjs
```

Then read `.claude/PROGRESS.md` — the top entry has the full state. **Do not re-read the codebase
to orient.** That habit has cost a quarter of a session before.

---

## Where things stand

The **Restock Vault is finished and driven live**. It is now one surat jalan desk:
**Masuk · Kirim · Buku**, all on theme tokens, verified against his real data.

Five commits today: `aea7de4` `4387c86` `390d5fa` `284602b` `999b5a7` (+ notes `5643bf9`).
Each commit message carries its own full story — read the message, not the diff.

---

## Build queue, in his order

### 1. The Minta tab — the desk's 4th tab
His words: *"redesign the request panel as well or maybe just add it on the panel that we just
made, just add extra tab for request"*.

This **closes the old Active Pipeline question**. The panel is NOT redundant with Buku:
it holds **"Siapkan Pengiriman"** (`BranchWarehouseManager.jsx:1350`), the only way HQ fulfils a
branch request. Buku only reads history.

- The queue is `stockRequests` filtered to `PENDING` / `DISPUTED` — **already loaded** in
  `RestockVaultView`, no new listener.
- Row style: reuse the Buku row + drawer already in the file.
- ⚠️ The fulfilment modal is ~150 lines in `BranchWarehouseManager`. **Do not duplicate it.**
  Decide deliberately: move it, lift it to a shared component, or have Minta surface the queue and
  hand off to the existing control (both render on the same page). Say which and why.

### 2. Tujuan from the roster
His words: *"make sure that every team registered on the fleet and roster have their own storage
option"*.

- Teams live in `artifacts/{appId}/users/{uid}/motorists`, each with `.location` (= its branch).
- Today `RestockVaultView` builds Tujuan from `stockRequests[].branch` — **so a team never shipped
  to is invisible**. Build it from `[...new Set(motorists.map(m => m.location))]` instead.
- `motorists` is not currently passed to `RestockVaultView`. Add the prop in `App.jsx:4421`.

### 3. Global Logistics Command readout
His words: *"redesign that make it more elegant and cool to show the regional warehouse current
stock, on field, sold as well just like what we have on the dashboard, so HQ know how many bks
should be send to them again"*.

Columns per warehouse: **di gudang · di jalan · di tangan agen · terjual**.

| Column | Source | Status |
|---|---|---|
| di gudang | `branches/{name}/inventory` → `branchStock` (`useDatabaseSync.js:175`) | ✅ loaded |
| di jalan | `stock_requests` IN_TRANSIT for that branch, sum `fulfilledItems[].qty` | ✅ loaded |
| di tangan agen | `motorists[].activeCanvas`, grouped by `motorists[].location` | ✅ available |
| terjual | `transactions` | 🔴 **no branch/location field** |

🔴 **The gate:** *terjual per gudang* must be derived by joining a transaction to its agent and
reading that agent's `.location`. **Confirm a transaction actually carries an agent id first.**
If it does not — ship three columns and say why the fourth is missing. Never print a number whose
collection you cannot name.

### Also queued
Branch Manager redesign · split Stok Kritis + a per-warehouse minimum · route the four inline
`minStock` fallbacks (`useTransactionEngine.js:270`, `MerchantSalesView.jsx:2423`,
`ResidentEvilInventory.jsx:236` say 50; `StockOpnameView.jsx:1003` says **5**) through the shared rule.

---

## One thing he still owes an answer on

**The sidebar is NOT broken** — it is the collapsed capsule, a black circle with a package icon at
the **very top-left** (totem at x=4, y=12, 56×56). Hovering it expands the rail to 351px. Proved by
forcing `width:351px`: rail → 351, pod → x=0, all 17 marks visible.

🔴 The only open part: `.kpm-rail-totem { display:none }` in the **base** CSS block means that
circle exists only at **≥1024px**. Below that the rail is a phone drawer parked off-screen right
and **no hamburger was found**. If his window is narrower than 1024px, that is a real bug.
**Ask his window width before touching the shell.**

---

## Traps — each of these already cost time

- **Run the build BEFORE writing "build green".** A commit message claiming it was green had to be
  amended on 2026-08-26.
- **A JSX comment after `&& (` does not parse** — it is a second expression inside the parentheses.
  It broke the build twice in one turn.
- **A duplicate `style` prop is legal JSX and the last one silently wins.** That killed
  `touchAction` on the rail nav for weeks.
- **Never trust a layout measurement taken during a transition.** "pod at x=-124" was junk, read
  mid-animation on a 380ms width transition with a 220ms delay.
- **Artifact pages on claude.ai cannot be driven** — locked frame, no input reaches them. To test a
  prototype, copy it into `public/`, open `https://localhost:5173/<file>.html`, delete it after.
- **The nav rail is off-canvas at 1463px**, so reach a screen with
  `document.querySelectorAll('button')` + `.click()`, not a mouse click.
- **The "L-CLICK / SCROLL / NAVIGATE" strip is not his app** — it is the Claude-in-Chrome overlay
  drawn into his real Chrome. Zero matches in the DOM. Never hunt for it.
- **The vault gate re-locks on reload.** He must type the password; you cannot.
- **`graphify` call edges undercount** — confirm "who calls X" with grep.
