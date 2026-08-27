# NEXT SESSION — read this, then `.claude/PONDER-PLAN.md`. Read no code to orient.

**Written 2026-08-27 09:10 WIB. Tree clean at `76f1ef3`. 632/632. Branch `phase0-solid-ground`.**
`PROGRESS.md` is the state. This file is the plan. Both are current — nothing is half-done.

## First command

```
npm run build; node src/config/integration.audit.mjs
```

632 checks over the BUILT output. He is on **PowerShell**: `;` not `&&`.

---

## 🔴 ANSWER THESE THREE BEFORE BUILDING ANYTHING

They are the open questions from `.claude/PONDER-PLAN.md` §9. He has not answered them. Do not
assume — ask him in the first reply, all three together, then build.

> 1. **Language.** Scenes in Indonesian, English, or both? His 2026-08-27 rule was *"use english
>    terms if its shorter and direct"* — but that was for column labels. A teaching sentence is not
>    a label, and the branch staff reading these may not read English.
> 2. **Autoplay or manual.** Ponder auto-runs a stage then waits. Same here, or press → for every beat?
> 3. **Does a first-time user get pushed into a scene**, or is `?` always opt-in only?

---

## What is queued

**PONDER — an in-app tutorial on every component, modelled on Create mod's Ponder.**
The whole design is written already: **`.claude/PONDER-PLAN.md`**. Read it, do not re-derive it.

Decided with him, do not re-litigate:
- **Scripted scenes, NOT recorded video.** Eight labels were renamed on 2026-08-27 alone; clips
  would have been stale the same day, cannot follow dark mode, and bloat an offline PWA.
- **Scenes render the real component fed a FIXED DEMO DATASET**, not a spotlight over his live
  screen. Ponder's world is a schematic, not your base. A live-data tour of Sebaran Stok today
  would teach using Bandung's all-zero row — a wall of `—`.

Build order: **slice 1** engine on one panel with a placeholder scene → **slice 2** Sebaran Stok for
real (its scene script is already written out in the plan, ready to paste).

---

## Traps that cost real time this session

- **🔴 A check anchored on display copy fires on every wording change.** The "7 days" check tripped
  TWICE on pure label edits. Anchor on the CLAIM, never the punctuation or the language.
- **🔴 A total ÷ a total is only a rate if the things are interchangeable.** A warehouse-level
  "days left" shipped and was WRONG by 17× — he caught it, not the audit. Every check passed and
  the arithmetic was correct; the statistic was meaningless. **Verifying a number computes is not
  verifying it means anything.**
- **Do NOT delete the Sebaran Stok footnote before the first Ponder scene exists.** It is the only
  written record of the two formulas and check 631 pins them to the screen. The check **moves** into
  the scene file. A check deleted to make a change pass is how the bug it caught comes back.
- **A JSX block comment that starts `{/* X */` closes itself.** Broke the build once.
- **The vault gate re-locks on a new tab and you cannot type the password.** Ask him to unlock;
  do not spend ten tool calls proving it. One `agent_browser_open` hung for its full 1800s timeout.
- **Screenshots catch the drawer mid-animation.** Wait ~3s after toggling, or re-shoot.

---

## Untested by anyone

**The Siapkan Pengiriman button and the shipping modal** on the Restock Vault Request tab. He has
**zero** open branch requests and no fake ones were written into his live Firestore. **The first
real branch request that arrives is the test.** Everything else this session was driven live in his
Chrome against real data.

---

## Where things live

| Thing | Path |
|---|---|
| Session state | `.claude/PROGRESS.md` |
| Ponder design | `.claude/PONDER-PLAN.md` |
| The desk (Masuk · Kirim · Request · Buku) | `src/RestockVaultView.jsx` |
| Sebaran Stok + branch warehouse screen | `src/components/BranchWarehouseManager.jsx` |
| Supply maths, shared with the dashboard | `src/utils/supply.js` |
| The 632 checks | `src/config/integration.audit.mjs` |
| Lessons | `~/.claude/skills/alucard/lessons.md` |

---

## The prompt he pastes after `/clear`

> Read .claude/NEXT-SESSION.md first, then run:
> npm run build; node src/config/integration.audit.mjs
>
> Ask me the three Ponder questions before building anything.
