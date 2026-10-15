---
name: project-kpm-merchantsales-redesign-brief
description: "Sales terminal traps and locked decisions. The resume point itself is .claude/NEXT-SESSION.md in the repo (2026-09-13)."
metadata: 
  node_type: memory
  type: project
  modified: 2026-09-13T13:25:00.000Z
  originSessionId: a743ff40-be42-4ecd-9749-eb1f0ad65336
---

# Sales terminal — resume point

**As of 2026-09-13 the resume point is `.claude/NEXT-SESSION.md` in the repo** — one job, printed
by the SessionStart hook with `.claude/PROGRESS.md`. This file is the terminal's TRAPS and LOCKED
DECISIONS only; where it and the repo disagree, the repo wins and fixing this file is the first job.

Branch `phase0-solid-ground`. Aldi is on **PowerShell** — `;` between commands, never `&&`.

## ▶ First command, before reading any code

```powershell
npm run build; node src/config/integration.audit.mjs
```

**115 checks over the BUILT output.** Faster and more honest than reading source, and it *is*
the design spec: merchant, 3D wares, every rail state, the ledger, hover and cursor, phone
strip, touch gating, sidebar shift, palette law, and that no old feature was lost. Passing
means the terminal is intact — start from there, not from a re-read.

Pure-function checks, no Firebase, all in `src/config/` unless noted:
`customerBrief` · `mixedUnits` · `dayStats` · `txSize` · `nextStop` · `src/hooks/useSound`

## State

**Desktop and phone are both DONE and proven.** The Duke's Ledger redesign is fully
integrated into `src/MerchantSalesView.jsx`; the prototype is history. `git log --oneline`
is the changelog — do not duplicate it here.

## The hand-test pass is DONE (2026-08 → 2026-09-12)

`SALES_TERMINAL_TEST_LIST.md` was walked; the 2026-09 queue in `NEXT-SESSION.md` is what survived it.
UGLY is still identified by two facts: window width, and whether the sidebar was open — ask first.

## Next after testing — Aldi has not chosen

- **(A)** Next stop + directions is DONE (`c14d5f0`, `src/utils/nextStop.js`). Still open from
  that design: auto-select the customer when he parks inside their geofence, and the two-store
  swap. `https://claude.ai/code/artifact/8feebaa4-f8a2-414d-a4a6-2c642a27af48`
- **(B)** The cost chain — needs the journey map and leaderboard changed first.
  [[project-kpm-cost-fix-workflow]] holds the blockers and the measured Firebase numbers.
- **(C)** Regional warehouse in the rail — own region only, field is `location`.
  [[project-kpm-terminal-next-features]]

## 🔴 Traps — each cost real time once

**Data / money**
- **Never write `item.product` into Firestore.** Six base64 photos per line blew the 1 MiB doc
  cap and sales failed outright. `helpers.stripCartItemForStorage` is the chokepoint.
- **Notifications use `agentId`** — NOT `targetId`/`targetRole`. A filter on those matches
  nothing, silently. Tried and reverted twice.
- **Day boundaries use LOCAL midnight**, never `helpers.getCurrentDate()` (UTC — rolls at
  07:00 WIB, mid-route).

**Interaction**
- **Never guard anything with `window.confirm`.** Aldi's browser suppresses dialogs, so it
  returns `false` silently and the guard fails closed and invisible. Twice this looked like
  "nothing happens when I click". Build in-page confirmation instead.

**Layout / CSS**
- **`2xl:` emits NOTHING here.** `xl:` works. Use `[@media(min-width:N)]` above that. The
  escaped selector is `.\32 xl\:…`, so a `.2xl\:` needle can never match.
- **`min-h-0` on flex children that must shrink**, or the column outgrows the viewport.
- **Tailwind breakpoints measure the VIEWPORT**, not the terminal's space. The sidebar takes
  256px — hence `html.kpm-nav-open` and the shifted thresholds.
- **A fixed width inside a grid fights the track.** `w-[260px]` on cards is what stopped the
  third column ever appearing.
- **Gate every hover rule** behind `@media (hover: hover) and (pointer: fine)` — touch fires
  `:hover` on tap and KEEPS it.

**The merchant**
- **Frames are 200×200. Both figures must be 200px, unscaled.** A smaller box crops every
  frame and walks the coin off his palm. Never set `background-size` on him.
- The corner figure is anchored `absolute; right:0; bottom:0` — that anchor is what makes his
  bubble land on him. Both bubbles sit at `bottom: 214px`.

**Verification**
- Check the BUILT output with literal needles. The minifier rewrites `::before` → `:before`;
  Tailwind escapes `:`. Loose substrings have produced false passes repeatedly.
- **A failing check after a rename: fix the needle to the STRONGER claim.** "Nothing overlaps
  the picture" survives a refactor; "the eye is at bottom-3" does not.

## Locked decisions — do not re-litigate

- The printed nota keeps **KPM's blue**; palette law stops at the print block.
  [[project-kpm-receipt-is-company-theme]]
- **Never gate the receipt behind the deal animation** — the merchant draws *on* it.
- Customer-profile sharing is **its own session**, out of terminal scope.
- Mobile gets the *information*, never the rail. One card, chosen by context.

Related: [[project-kpm-terminal-next-features]], [[project-kpm-cost-fix-workflow]],
[[project-kpm-palette-law]], [[project-kpm-manual-test-checklist]]
