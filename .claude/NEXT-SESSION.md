# The one job for next session

## 📋 PASTE THIS — it is the whole prompt, nothing else needed

```
/alucard

The amber plate swap is BLOCKED by a rule in contrast.selfcheck, and last session proved
it is impossible, not just hard. Read .claude/NEXT-SESSION.md — the proof and the one
decision I owe you are in it. Ask me the decision first, then do the work.
```

---

## ⛔ THE TWO-LINE SWAP IS DEAD. IT WAS MEASURED, NOT GUESSED.

The previous brief said: change `--gold` to amber, flip `--gold-ink` to near-black, done.
**It was tried on 2026-08-24 10:5x and it fails 4 contrast pairs.** Trial run, real output:

```
FAIL  2.14:1  (needs 3)  the gold PLATE against a panel   #E07C00 on #E1DAC8
FAIL  1.60:1  (needs 3)  the gold PLATE against a well    #E07C00 on #C6BDA9
FAIL  2.41:1  (needs 3)  the gold PLATE against raised    #E07C00 on #EDE7D8
FAIL  2.16:1  (needs 3)  the ON plate against the rail    #E07C00 on #e3dbca
```
(The ink half was fine — `#2B2318` on `#E07C00` measured **5.20:1**, clearing 4.5.)
Reverted. `contrast.selfcheck` is green again on the committed file.

### And no other amber saves it — the two windows do not overlap

Computed from the real ground tokens:

| requirement | what it forces |
|---|---|
| plate must clear **3:1** vs the darkest light ground (`well`, `#C6BDA9`) | plate luminance **≤ 0.1376** |
| plate must carry **dark ink** `#2B2318` at 4.5:1 | plate luminance **≥ 0.2552** |

**0.1376 < 0.2552, so no colour exists.** Not "no amber" — *no colour at all*. Any plate dark
enough to be seen against cream is too dark to carry dark ink, and that is exactly why
`--gold` is `#7A4C0C` today with pale ink `#FCF7EE` (pale ink only needs plate L ≤ 0.1686, and
`#7A4C0C` sits at **0.0933**). **The plate is brown because the check forces it to be brown.**

## 🔴 THE DECISION HE OWES — ask this before touching anything

`contrast.selfcheck.mjs` lines ~91-93 and ~133 measure the gold **plate core** against the
ground, needing 3:1. Its own comment says why: *"a gold plate marks every ON in this app"* —
the ON state must be visible.

But the app already has `--gold-edge`, and in the trial it measured **4.57:1 against a panel**.
**A rimmed plate is visible; the rule just measures the wrong part of it.** That is the same
technique the anodised rail shipped with on 2026-08-24 — core stays bright, the rim carries the
separation.

So the question for Aldi, in plain words:

> Right now the app proves a button is switched ON by making the button's *filling* dark
> enough to stand out from the page. That is what forces the brown. The alternative is to
> prove it with a dark *outline* around a bright amber filling instead — the same trick the
> new sidebar rail already uses, and it measures 4.57:1, well past the 3:1 needed.
>
> **Do you want the ON plates to be bright amber with a dark outline, instead of dark brown
> with no outline?** If yes, the rule changes from "measure the filling" to "measure the
> outline", and 68 plates go amber.

## If he says yes — the actual job, in order

1. **Confirm every gold plate really has the rim.** `--gold` is used as a fill in **68**
   places. A plate that goes amber *without* `--gold-edge` becomes an invisible ON state, and
   the check will no longer catch it. Grep the fills, list any with no border/outline. **This
   is the step that makes or breaks it — do it before the token edit, not after.**
2. Only then swap `src/styles/theme.css` light block, **line 283 and line 284**:
   `--gold: #7A4C0C` → `#E07C00` · `--gold-ink: #FCF7EE` → `#2B2318`.
   (`#E07C00` is not invented — it is the amber plate the Duke's Ledger already ships, already
   paired with `#2B2318` ink at 5.20:1. Do not use raw `--lamp-on` `#FF9D00` for a large fill;
   his own note is *"dense LED means darker on a pale plate"*.)
3. **`--accent-ink` never moves.** Gold as text on cream is 1,9:1. That half of the palette law
   stands and is not what he is complaining about.
4. Repoint the three `gold PLATE against …` pairs plus `the ON plate against the rail` to
   measure `gold-edge` vs ground. **Leave the 3:1 threshold alone** — move what is measured,
   never the bar.
5. Verify, then get eyes on glass. A ratio is proof of a ratio; only a frame is proof of a look.

```
npm run build; node src/config/integration.audit.mjs; node src/config/logicFixes.selfcheck.mjs; node src/config/contrast.selfcheck.mjs
```
Baseline before any edit: **599/599**, **762/762**, all contrast pairs pass.
⚠️ `integration.audit` reads the BUILT output — rebuild on both sides of it or it describes the
previous build. The other two read source directly.

✅ Then his Chrome, `https://localhost:5173/`, the three screens he photographed:
**Sampling · Customer Directory · Settings**.

**If he says no** — the browns stay, and the honest answer is that they are brown by law, not by
neglect. Promote the Receivables redesign below instead.

**When you finish, rewrite this file with the next single job.**

<details>
<summary>The rest of the queue — do not paste this, it is here so the next session knows what to promote</summary>

🔴 **HE STILL OWES TWO OTHER ANSWERS** (verbatim in `.claude/PROGRESS.md` under WAITING ON ALDI):
tier 3 is a toggle-for-toggle copy of the owner including Settings and both [GOD] switches ·
which logic he wants redesigned in Fleet + Receivables.

✔️ **Answered, do not re-ask:** *"i wast expecting to find some skills to help this task to be
more effective"* — no skill helps here. The leverage was his own `contrast.selfcheck`, and it is
what caught this. Loading `impeccable`/`ui-ux-pro-max` to change two hex values is the spend the
caveman and ponytail rules exist to prevent. ⛔ Never load a style pack (brutalism, neon,
terracotta…) at KPM — they overwrite the palette law. ⛔ No workflows, no fan-out: *"okay then no
workflow"*, settled 2026-08-20.

- **Redesign Receivables & Fleet** — `A-Brain/Backlog/Redesign Receivables and Fleet - logic must
  survive.md`. Both are **0% tokenised** (293 and 191 banned colour classes, ZERO tokens), so the
  token swap above would not have touched them either way — they have no light mode at all.
  Receivables first: it writes nothing, seven callbacks are the whole contract. Fleet has two
  `runTransaction` stock moves that must not be touched.
- ⚠️ **DARK rail resting icons are 2,78:1** (`#6b5845` on `#14110e`). Pre-existing, reported by
  `softInDark` every run, his call whether to fix.
- ⚠️ **The left column's lamps land in the rail's middle gutter** on the two-column layout. Seen,
  not changed, he has not objected.
- 📄 **Roadmap:** `A-Brain/Wiki/Concepts/The Eight Warehouse Gaps.md`. G7, G6 and G3 are done
  (G6 was never a gap — read the correction there before touching the list).
  Remaining: **G5** accuracy and shrinkage panel · **G1** batch identity · **G2** age and
  oldest-first · **G4** ids instead of names.
- ⚠️ **STILL UNSEEN ON A REAL SCREEN:** the arrival check, the HQ branch-shelf panel, and the new
  G3 reorder advice. All three need a branch with a shipping history.
- **Merge to main** — last of all.

</details>
