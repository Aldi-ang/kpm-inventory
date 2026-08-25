# The one job for next session

## 📋 PASTE THIS — it is the whole prompt, nothing else needed

```
/alucard

Redesign the Dashboard layout — the brief is in .claude/NEXT-SESSION.md. The palette is
already fixed; this is the LAYOUT and MOTION half. Ask me to keep the dev server on 5173
so you can see it, and show me the layout before you build all of it.
```

---

## ⚠️ THE VIEWING PATH — this is the only one that works

**`claude-in-chrome` against HIS Chrome on `https://localhost:5173`.**
`tabs_context_mcp` → `navigate` → `computer{screenshot}`. Already logged in, cert accepted.
⛔ **Do not retry:** the in-app Browser pane (never composites) · `agent-browser` (hung 30 min) ·
your own `preview_start` server (self-signed cert + Google login).
**Rail opens on `hover (35, 42)`** and its events live on the pod only — do not move the mouse.
**`javascript_tool` + `getComputedStyle` before theorising.** It has settled three bugs in one
call each today, after wrong guesses every time.

---

## 🎨 THE JOB — the Dashboard LAYOUT, not its colours

> *"the dark screen and the UI on the dashboard is not fixed yet, panel looks dark and bad the
> the layout is pretty bad i want u to redesign a new one for this dashboard"*

✅ **The colour half is DONE and seen** — `bg-black/50` and `bg-white/5` became `--panel` /
`--raised` / `--inset`, and 16 inks that had been sized for dark cards were repaired. Nothing on
this screen is dark or unreadable any more. **Do not redo that. The complaint left is LAYOUT.**

### What is actually wrong with it, from the frames

| problem | what to do |
|---|---|
| **Two card rows say the same thing twice.** EXECUTIVE TARGETS (3 cards) then TOTAL VAULT / GLOBAL REVENUE / NET PROFIT (3 cards) — six equal boxes, no hierarchy, nothing tells you where to look | one hero figure, then supporting rows. Money the business is judged on gets size; benchmarks get a strip |
| **Every card is the same size and weight** | rank them. His own rule from the buttons applies here: **one loud thing per screen** |
| **The status bar (CLOUD SYNC / USB SAFE / SAVE POINTS) is a wide empty band** carrying three tiny labels across 1400px | it is a status STRIP — compress it, or fold it into the header |
| **AGENT LEADERBOARD is a huge empty panel** saying *"NO SALES RECORDED TODAY"* | an empty state should be small. A panel earns its height by having content |
| **VAULT VELOCITY is the densest, most useful thing on the screen** and it is below the fold, same weight as an empty box | promote it |
| **No motion at all** | he asked for it. Numbers that count up on load, a bar that fills. **Keep it under 300ms, `ease-out`, and it must survive Lite Mode** (no shadow/blur/filter carrying meaning) |

### The laws this must not break

- **Palette:** no blue, no green. Slate IS the blue. Plates are `--gold` (near-black stencil) with
  `--gold-ink`; marks may be amber; `--verified` is the neutral "settled" ink; `--alt-ink` is the
  sanctioned purple.
- ⛔ **Amber is an EDGE, an INK and a LAMP — never a slab.** Stated twice, and he hates it.
- ⚠️ **Lite Mode strips shadow, blur and filter.** Nothing may depend on them to be visible.
- ⚠️ **A plate carries its OWN ink** — `--gold` with `--ink` is 1.04:1. `G51` enforces it.
- 📖 Read `A-Brain/Wiki/Concepts/Aldi's Design Taste.md` first — the whole restyle is recorded
  there, including the two reversals and why.

**Show him a layout before building all of it.** He reversed a colour decision today after seeing
it in the app; a swatch is not a screen, and a layout described in prose is not a layout.

## Verify

```
npm run build; node src/config/integration.audit.mjs; node src/config/logicFixes.selfcheck.mjs; node src/config/contrast.selfcheck.mjs
```
Baseline: **607/607**, **762/762**, all contrast pairs.
⚠️ `integration.audit` reads BUILT output and refuses to run on a stale `dist` — rebuild on both
sides of any probe. A check that reads built CSS must match the MINIFIED form (the minifier drops
quotes inside attribute selectors).

**When you finish, rewrite this file with the next single job.**

<details>
<summary>The rest of the queue — do not paste this</summary>

### 🔨 SIX SCREENS LEFT of his eight

**Group A — un-themed, not off-theme.** Zero tokens, 15–25 banned colour classes each. A session
apiece. **Reuse the mapping table: `scratchpad/convert.mjs`** — point it at the file, it does the
palette in one pass, then LOOK for what it cannot see (arbitrary `rgba()` glows, decorative blur
blobs, inks that were sized for a dark surface).
- **Fleet & Roster** (`FleetCanvasManager.jsx`) ⚠️ two `runTransaction` stock moves must not be
  touched — `A-Brain/Backlog/Redesign Receivables and Fleet - logic must survive.md`
- **Consignment & Receivables** (`ConsignmentFinanceView.jsx`) — writes nothing, seven callbacks
  are the whole contract
- **Restock Vault** (`RestockVaultView.jsx`) — **56 `bg-black/` + `bg-white/` literals**, the worst
  remaining
- **Master Vault** (`BranchWarehouseManager.jsx`, 17)

**Group B — themed, polish only:** Agent Profile, Journey Map.
⚠️ **Agent Profile's 7-day revenue chart is purple/cyan** — those are the **rank colours**
(Platinum `#22d3ee`, Diamond `#c084fc`), a deliberate exception, not stray literals. Ask before
changing them; recolouring ranks changes what the badges mean.

### Also open
- 🔴 **Two older answers he owes** — verbatim in `PROGRESS.md` under WAITING ON ALDI: tier 3 as a
  toggle-for-toggle copy of the owner · which logic to redesign in Fleet + Receivables.
- ▶ **Rank 1 per screen.** All 63 buttons are stencil plates; that is too many loud things. One
  plate per screen, the rest outline (`.kpm-btn.key`). History Reports has two competing already.
- ⚠️ **`ALL`/`SKT` chips and `BUYBACK`/`EXCHANGE (TUKAR)`** from his screenshots are generated
  dynamically and were not findable by search — catch them by looking at the screen that owns them.
- ⚠️ **DARK rail resting icons are 2,78:1**, pre-existing, his call.
- 📏 **`PROGRESS.md` is ~960 lines against a ~350 cap** — cut the oldest 🟠 entries into
  `A-Brain/Archive/`. ⚠️ Never trim across tracks; 🔧 and 🟢 belong to other sessions.
- **Merge to main** — last of all.

</details>
