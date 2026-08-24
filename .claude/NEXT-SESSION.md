# The one job for next session

## 📋 PASTE THIS — it is the whole prompt, nothing else needed

```
/alucard

Do the brown-plate swap in .claude/NEXT-SESSION.md. Read that file first — the amber
value, the plate-and-ink trap and the verify order are all in it. Start with the
two-line token edit, run contrast.selfcheck before and after, then show me the three
screens on my Chrome: Sampling, Customer Directory, Settings.
```

Everything below is the briefing that prompt refers to. He does not need to read it; the
next session does.

## 🧰 THE SKILLS THIS WORK RUNS ON — `/alucard` loads all of them, do not load them by hand

His ask, 2026-08-24: *"make sure all the skills use here is included in the next session"*.
**Typing `/alucard` is the whole answer** — it is one word and it pulls in everything below.
Listed here so the next session can tell at a glance whether it is actually running them,
and so nothing gets loaded twice.

| Loaded by `/alucard` | What it does here |
|---|---|
| `anthropic-skills:caveman` **at ULTRA** | terse register. §0 of alucard forces it, first action, every invocation |
| `anthropic-skills:karpathy-guidelines` | plan before coding · simplest thing · surgical diffs · verifiable criteria |
| `ponytail` (its own hook, already on) | laziest working solution. Do not restate it, do not fight it |
| `graphify` | code navigation. Query BEFORE grepping — a hook reminds but does not block |

**Design work auto-loads a second stack (alucard §1a) — this job counts as design work:**
`A-Brain/Wiki/Concepts/Aldi's Design Taste.md` (his taste, outranks every skill) ·
`Design Inspiration Sources.md` · `impeccable` · `emil-design-eng` · `ui-ux-pro-max` ·
`ui-styling` when actually writing code · `web-design-guidelines` as the review pass.

⚠️ **FOR THIS PARTICULAR JOB, MOST OF THAT STACK IS THE WRONG TOOL AND HE ALREADY ASKED ABOUT IT.**
*"i wast expecting to find some skills to help this task to be more effective"* — the honest answer
given, and it still holds: **no skill makes a two-line token swap safer.** The leverage is
`src/config/contrast.selfcheck.mjs`, which already measures gold/gold-ink on five grounds in both
themes. Read `Aldi's Design Taste.md` (it now carries the Ark Lab entry from this work), then use
the check. Loading `impeccable` and `ui-ux-pro-max` to change two hex values is the kind of spend
the caveman/ponytail rules exist to prevent.

⛔ **NEVER load one of the 67 style packs** (brutalism, glassmorphism, neon, terracotta…). They are
competing looks and they will happily overwrite the palette law. His theme is RE9 "Ark Lab" and it
is locked.

⛔ **No workflows, no subagent fan-out.** Settled 2026-08-20 in his own words: *"okay then no
workflow"*. A mode telling you to be exhaustive does not outrank him.

---

/alucard

**Swap ONE token pair and 68 brown plates across the app go Ark Lab amber. Start with the two-line edit, then let the contrast suite tell you what else moved.**

Aldi, 2026-08-24, with three screenshots (Sampling, Customer Directory, Settings):

> *"sc1 is sampling,customer directory and seeting most of them have brown color not ARK Lab
> enough lol"*

and earlier the same hour:

> *"apply this color to other components as well because most of them is too brown, but make sure
> that its not too bright that sharp to the eye level"*

## ⚠️ READ THIS BEFORE YOU BELIEVE THE OLD NOTE

The previous session pushed back on this ask and **was wrong**. The reasoning was "those browns are
brown because they are TEXT, and gold as text on cream is 1,9:1" — true as a law, false as a
diagnosis of what he photographed. **Every brown in his three screenshots is a FILLED PLATE**, not
text: New Sample, View Analytics, FULL, FIND DUPLICATES, DATA SCRUB, IMPORT MAP MARKER, Auto-Find.

Measured 2026-08-24, and this is what makes the job small:

| token | light value | used as |
|---|---|---|
| `--gold` | `#7A4C0C` | **68 fills**, 1 text |
| `--gold-ink` | `#FCF7EE` | 60 — its paired ink, *"ink to place ON gold"* |
| `--accent-ink` | `#4F3603` | the gold-as-TEXT token, 129 sites |

**The fill token and the text token are already separate, and every plate already pairs them
correctly.** So this is not 217 hand edits. It is a two-line change:

```
src/styles/theme.css, the light block (~line 252 and ~284)
  --gold:      #7A4C0C   ->  a dense Ark Lab amber
  --gold-ink:  #FCF7EE   ->  near-black (#2B2318 is the value the rail and the Duke's Ledger use)
```

`--accent-ink` **does not move.** Gold as text on cream really is unreadable; that half of his
palette law stands and is not what he is complaining about.

## The trap that makes a lazy version wrong

⚠️ **The ink must flip in the same edit as the plate.** `--gold-ink` is pale today because the
plate is dark today. Change the plate to amber and leave the ink pale and you get white on
`#FF9D00` — **1,9:1**, which is precisely the *"too bright that sharp to the eye level"* he warned
about. They are one change or the app gets worse.

⚠️ **Which amber?** The rail settled this on 2026-08-24 and it is measured: core `#FF9D00`, the
same value in both themes, with the 3:1 separation carried by a **rim**, never by darkening the
core. Darkening a lamp until it passes a check is how it came out brown the first time and he
photographed that too. Start from `--lamp-on` and only deviate with a measurement.

⚠️ **`--gold` has ONE text use.** Find it (`grep -rn "color: *var(--gold)" src/`) and give it
`--accent-ink` before the swap, or it becomes amber text on cream.

## Verify

```
npm run build; node src/config/integration.audit.mjs; node src/config/logicFixes.selfcheck.mjs; node src/config/contrast.selfcheck.mjs
```
Currently **599/599**, **762/762**, all contrast pairs pass.

**`contrast.selfcheck` is the whole safety net here** — it already measures gold/gold-ink pairs on
five grounds in both themes, so the swap either comes back green or it hands you the exact list of
places to fix. Run it FIRST, before the edit, and keep the output: the diff between the two runs is
the work.

⚠️ **`integration.audit` reads the BUILT output.** A probe that edits source without rebuilding
proves nothing — it silently describes the previous build. Rebuild on both sides of any audit
probe. `logicFixes.selfcheck` and `contrast.selfcheck` read source directly and do not need it.

✅ **Then get eyes on it.** He opens the Claude side panel in Chrome, then `navigate` to
`https://localhost:5173/`. Check the three screens he named: Sampling, Customer Directory,
Settings. A ratio is proof of a ratio; only a frame is proof of an appearance.

**When you finish, rewrite this file with the next single job.**

<details>
<summary>The rest of the queue — do not paste this, it is here so the next session knows what to promote</summary>

🔴 **HE STILL OWES TWO ANSWERS** (both verbatim in `.claude/PROGRESS.md` under WAITING ON ALDI):
tier 3 is a toggle-for-toggle copy of the owner including Settings and both [GOD] switches · which
logic he wants redesigned in Fleet + Receivables.

❓ **He asked about skills:** *"i wast expecting to find some skills to help this task to be more
effective"*. The honest answer is that no skill helps here — the leverage is his own
`contrast.selfcheck`, and the reason this job is two lines instead of 217 edits is that the theme
already separates the fill token from the text token. Tell him that rather than loading a stack.

- **Redesign Receivables & Fleet** — `A-Brain/Backlog/Redesign Receivables and Fleet - logic must
  survive.md`. Both are **0% tokenised** (293 and 191 banned colour classes, ZERO tokens), so they
  will NOT be fixed by the token swap above — they have no light mode at all. Receivables first:
  it writes nothing, seven callbacks are the whole contract. Fleet has two `runTransaction` stock
  moves that must not be touched.
- ⚠️ **DARK rail resting icons are 2,78:1** (`#6b5845` on `#14110e`). Pre-existing, reported by
  `softInDark` every run, his call whether to fix.
- ⚠️ **The left column's lamps land in the rail's middle gutter** on the two-column layout. Seen,
  not changed, he has not objected.
- 📄 **Roadmap:** `A-Brain/Wiki/Concepts/The Eight Warehouse Gaps.md`. G7, G6 and G3 are done
  (G6 was never a gap — it shipped long ago; read the correction there before touching the list).
  Remaining: **G5** accuracy and shrinkage panel · **G1** batch identity · **G2** age and
  oldest-first · **G4** ids instead of names.
- ⚠️ **STILL UNSEEN ON A REAL SCREEN:** the arrival check, the HQ branch-shelf panel, and the new
  G3 reorder advice. All three need a branch with a shipping history.
- **Merge to main** — last of all.

</details>
