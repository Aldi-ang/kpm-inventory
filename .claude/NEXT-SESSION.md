# NEXT SESSION — the Restock Vault desk, after the 2026-08-27 run

**Branch:** `phase0-solid-ground` · **Last commit:** `d042520` · **630 checks, 0 failures**

## First command, before anything else

```powershell
npm run build; node src/config/integration.audit.mjs
```

Then read `.claude/PROGRESS.md`. **Do not re-read the codebase to orient** — that habit has cost a
quarter of a session before.

---

## Where things stand

**The whole 2026-08-27 queue is DONE and driven live.** The Request tab, Tujuan from the roster and
the Global Logistics readout all shipped, and the readout was then redesigned twice on his notes.
Nothing is blocked. Nothing is half-built.

`git show 76de71a 20c4a0a 4cc71af b667e78 d042520` carries every decision. Read the messages, not
the diffs.

---

## The only open item

**✅ The Siapkan Pengiriman button and the shipping modal are UNTESTED.** He has zero open branch
requests — all six in the Buku are DELIVERED — and **fake rows must never be written into his live
Firestore** to manufacture one. When a real branch request arrives: Restock Vault → **Request** tab
→ the orange **Siapkan** button on a PENDING row → the shipping modal → ship it.

## Queued, not started

- Branch Manager redesign
- Split Stok Kritis, and a per-warehouse minimum
- Route the four inline `minStock` fallbacks through the shared rule
  (`useTransactionEngine.js`, `MerchantSalesView.jsx`, `ResidentEvilInventory.jsx` say **50**;
  `StockOpnameView.jsx` says **5**)
- The per-SHIPMENT breakdown, if he ever wants it back: deleting Isi Gudang Cabang gave up
  `stockCard`'s `<details>`, which named each individual kiriman behind a product's stock. He was
  told and chose the delete. `stockCard` itself still lives, for the branch-side view.

---

## Traps — each of these cost time, most of them THIS session

- **Run the build BEFORE writing "build green".** A commit message claiming it had to be amended.
- **A JSX comment after `&& (` does not parse.** It is a second expression inside the parentheses.
- **A `*/` inside a JSX comment closes it early.** Broke the build on 2026-08-27 writing a header
  comment that opened `{/* ====== HEADER ====== */` and then kept writing.
- **A duplicate `style` prop is legal JSX and the last one silently wins.**
- **A `<button>` inside a `<button>` renders without a warning and kills the inner click.** The
  Buku/Request row is a flex PAIR for exactly this reason; check 54 pins it open.
- **A check that greps source also reads the comment explaining the fix.** Strip comments first —
  `noCmt` exists in the audit. G53 was written without it and fired on prose about a colour.
- **Anchor a check on the CLAIM, never the punctuation or a callback signature.** Two checks fired
  this session on pure copy tweaks and had to be re-anchored.
- **The vault gate re-locks on every new tab and you cannot type the password.** Do not spend calls
  proving this. **Ask him to unlock the tab you opened** — that is the whole fix, and it is instant.
- **`agent_browser_open` can hang for its full 1800s idle timeout.** Not a fallback.
- **The dev server is HTTPS with a self-signed cert**, so the in-app Browser pane cannot load it.
  Use the `claude-in-chrome` tools against his real Chrome instead.
- **Never `SendUserFile` an HTML prototype with `display:"render"`** — the panel runs no scripts.
- **`graphify` call edges undercount** — confirm "who calls X" with grep.
