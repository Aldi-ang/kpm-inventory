# The one job for next session

## 📋 PASTE THIS — it is the whole prompt, nothing else needed

```
/alucard

Do the control-colour sweep in .claude/NEXT-SESSION.md — the segmented switches, sliders and
toggles that still read brown or bright-orange. Ask me to open the app first so you can see
it; the route that works is in the file. Show me each control before and after.
```

---

## ⚠️ READ THIS FIRST — THE VIEWING PATH, AND THE THREE THAT DO NOT WORK

**Ask him to keep his dev server on `https://localhost:5173` and drive HIS Chrome:**
`mcp__claude-in-chrome__*` — `tabs_context_mcp` → `navigate` → `computer{screenshot}`.
His browser is already logged in and has already accepted the certificate.

⛔ **Do NOT retry these — an hour was spent proving each one dead on 2026-08-24:**
the in-app Browser pane (never composites: *"the Browser pane is not displayed"*) ·
`agent-browser` (hung 30 minutes, had to be aborted) · your own `preview_start` dev server
(HTTPS self-signed + Google login, and the in-app browser refuses the cert).

**Opening the rail:** its events live on the pod only. `hover` at **(35, 42)** and do not move the
mouse. `read_page{filter:"interactive"}` then gives every nav button as a ref.
**Measuring, not guessing:** `javascript_tool` with `getComputedStyle` settled the Lite Mode bug
in one call after three wrong theories. Reach for it early.

---

## 🎨 THE JOB — the controls still read brown and bright-orange

His words, 2026-08-24, with nine screenshots:

> *"make sure u change all this button as well, slider color as well, most of the brown and
> yellow color looks bad here"*

The button PLATES are done (near-black stencil, `--gold #1B1917`). **These are the controls that
did not follow**, each measured against its own ground:

| control | now | problem |
|---|---|---|
| segmented switch ON (`FULL`/`LITE`, `MASTER VAULT`/`BOSS CAR`) | `--lamp-on #FF9D00` slab | **a large amber SLAB — his 2026-08-21 law bans exactly this** |
| toggle track fill (permission matrix) | `--sw-on #6B3400` | deep brown; he says brown reads bad |
| mascot SIZE slider | `accent-color: var(--accent-edge)` `#7A5A12` | olive-brown track and thumb |
| `ALL` / `SKT` chips | brown fill + brown border | the "yellow/brown looks bad" complaint |
| `EXCHANGE (TUKAR)` | olive `#6B5A18`-ish slab | same |

🔴 **THE DECISION HE STILL OWES, AND IT UNBLOCKS ALL FIVE ROWS.** Ask it before editing:

> The buttons are near-black now. The switches and sliders are still amber or brown. **Should a
> switched-ON control be near-black like the buttons, or stay amber?** Near-black now measures
> **9.39:1** against its track, so it is legible either way — this is only taste. If you say
> near-black, the `--sw-on` token I added today disappears and everything matches.

**Whichever he picks, the same rule applies to all five rows** — do not let the segmented switch
and the toggle end up different.

⚠️ **`--lamp-on` is NOT in scope.** The little amber disc on the rail is the one thing he has said
he likes. Small and bright is legal; his law is about SLABS.

## Verify

```
npm run build; node src/config/integration.audit.mjs; node src/config/logicFixes.selfcheck.mjs; node src/config/contrast.selfcheck.mjs
```
Baseline: **606/606**, **762/762**, all contrast pairs.
⚠️ `integration.audit` reads the BUILT output — rebuild on both sides of any probe, and it will
refuse to report on a stale dist. The other two read source directly.
⚠️ **Any new pair must measure the state against ITS OWN ground**, not against its own fill — a
pair that graded a rim against the fill it sits on went red on a perfectly visible control today.

**When you finish, rewrite this file with the next single job.**

<details>
<summary>The rest of the queue — do not paste this, it is here so the next session knows what to promote</summary>

### 🔨 THE REDESIGN PROGRAM — 8 screens, his ask, one at a time

> *"we also need to redesign the restock vault, history reports, consignment and receivable,
> master vault, fleet and roster, journey map, dashboard and agent profile as well to follow our
> theme and also looks good for the UI design and animation as well"*

**These are not all the same job.** Two groups, and the order matters:

**Group A — NOT off-theme, UN-themed. Zero tokens, navy and blue, palette law broken outright:**
- **Transactions / History Reports** — navy panel, a purple `PULL ARCHIVE` button, blue location
  cards, blue money figures. `HistoryReportView.jsx` has 23 banned colour classes.
- **Fleet & Roster** — navy, blue avatars, purple region rows. `FleetCanvasManager.jsx` has 25.
- **Consignment & Receivables** — 15. ⚠️ `A-Brain/Backlog/Redesign Receivables and Fleet - logic
  must survive.md` — Receivables writes nothing, seven callbacks are the whole contract; Fleet has
  two `runTransaction` stock moves that must not be touched.
- **Restock Vault / Master Vault** — black panels with orange accents, and a purple gradient
  behind the product image.

**Group B — themed already, just not good enough yet:** Dashboard (the olive EXECUTIVE TARGETS
slabs sit oddly against the cream money cards), Agent Profile, Journey Map.

**Recommended order: Group A first, biggest violation first** — Transactions, then Fleet & Roster,
then Consignment, then the vaults. A screen with zero tokens cannot be "adjusted"; it has to be
rebuilt against the token set, and that is a whole session each. Group B afterwards.

### Other open items
- 🔴 **HE STILL OWES TWO OLDER ANSWERS** (verbatim in `.claude/PROGRESS.md` under WAITING ON ALDI):
  tier 3 is a toggle-for-toggle copy of the owner including Settings and both [GOD] switches ·
  which logic he wants redesigned in Fleet + Receivables.
- ▶ **Rank 1 per screen.** All 63 buttons are stencil plates right now, which is too many loud
  things. One plate per screen, everything else the outline pattern (`.kpm-btn.key`).
- ⚠️ **DARK rail resting icons are 2,78:1** (`#6b5845` on `#14110e`). Pre-existing, reported by
  `softInDark` every run, his call.
- 📄 **Roadmap:** `A-Brain/Wiki/Concepts/The Eight Warehouse Gaps.md`. G7, G6, G3 done. Remaining:
  **G5** accuracy/shrinkage · **G1** batch identity · **G2** age and oldest-first · **G4** ids.
- ⚠️ **STILL UNSEEN:** the arrival check, the HQ branch-shelf panel, the G3 reorder advice — all
  need a branch with a shipping history.
- **Merge to main** — last of all.

</details>
