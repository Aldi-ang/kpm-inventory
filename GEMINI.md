# For Antigravity (Gemini) — Aldi's KPM app

You are the second agent on this repo. Claude Code is the first. You share ONE memory with it: the A-Brain vault
(`../A-Brain`, the sibling folder) and the notes in `.claude/`. Antigravity's own memory (its "brain", Knowledge) is a
scratchpad: anything worth keeping goes into A-Brain or the repo notes, or Claude never sees it.

Claude Code reads CLAUDE.md, not this file. Aldi set this up on 2026-11-08 so the two tools work as one team.

## The project rules (the same file Claude reads)
@[project rules](CLAUDE.md)

Three of those rules work differently for you, and these lines replace them:
- **You never push.** "Push yourself, without asking" is Claude's rule. A push of `phase0-solid-ground` IS the live app.
  You commit locally; Claude reads `git show`, then pushes.
- **The live branch is `phase0-solid-ground`, not `main`.** This Antigravity project lists `main` as the default branch:
  never branch from it, never merge into it.
- **`firestore.rules` is Claude's.** You may read it and test it in the emulator; drafting a CHANGE is Claude's job.

## Start of every job (Claude gets this from a hook; you must do it yourself)
1. `git status -sb`, then `git pull origin phase0-solid-ground`. A file you need has uncommitted changes you did not
   make → STOP and tell Aldi: Claude may be working on it. Two agents never edit at the same time.
2. Read ONLY the first 40 lines of `.claude/NEXT-SESSION.md` (the one job) and the top entry of `.claude/PROGRESS.md`.
   Never read either whole (hundreds of KB): grep for the line you need.
3. Before any change to money, stock, permissions or a write: run
   `grep -n "^\*\*Trigger" C:/Users/ASUS/.claude/skills/alucard/lessons.md` and read only the entries that match.
   Those are lessons this project paid for.
4. Designing or judging any screen: first grep the newest entries of `../A-Brain/Wiki/Concepts/Aldi's Design Taste.md`
   (284 KB, never read whole). Palette law: no blue, no green (slate is the blue), gold never as text on a light
   background; the printed receipt keeps the company blue. The skills impeccable, emil-design-eng, ui-ux-pro-max,
   ui-styling, redesign-skill, taste-skill and web-design-guidelines are Claude's own copies, linked in: use them,
   never edit them. His taste outranks every skill.

## How to work (the same discipline Claude follows)
- Say your assumptions. Two readings of an ask → show both, do not pick silently. Smallest change that works.
  Touch only what the job needs. Turn the job into checks you can run, and run them.
- Never claim a look you did not render. Your browser can open the lab: start "ponder-lab" from `.claude/launch.json`
  (port 4190), e.g. `http://localhost:4190/tools/ponder-lab.html?shell&terminal&many&lot`.
- Never deploy Firestore rules; never run `firebase` against the live project (emulator only).

## Before you commit
- After your LAST edit, all green: `node src/config/logicFixes.selfcheck.mjs`, `npm run build`,
  `node src/config/integration.audit.mjs`.
- A fix leaves a check in `src/config/logicFixes.selfcheck.mjs` that would fail if the bug came back.
- A change people can see adds one line (en + id, plain words, no names) to `src/config/patchNotes.js`.
- Commit named files only, never `git commit -a` (graphify-out is always dirty). Run `graphify update .` after code edits.

## End of every job: write it back, or it is lost
- Prepend ONE entry to `.claude/PROGRESS.md`, right under the `**Updated:` line, starting
  `## 🔵 <date time WIB> — ANTIGRAVITY: <what>`. Add, never rewrite or reorder anyone else's entries. Take the time
  from `date`, never type it.
- Job finished → rewrite the top block of `.claude/NEXT-SESSION.md`: one job, never a menu.
- Research, test results, screenshots → `../A-Brain/Raw/<date>-<slug>/`, then commit the A-Brain repo with named files.
  Claude files them into the Wiki.

## Talking to Aldi
@[who Aldi is](../A-Brain/Personal-Context.md)
- Open every reply with ONE bold line saying what he must do (nothing → say so). He skims.
- Mark asks 🔴 DECIDE / ❓ ANSWER / ✅ TEST. A design choice is shown as pictures side by side with plain captions.
- Reply in English, plain words; explain a technical word before using it. Never explain his own app back to him.
- Report what was done (what changed, the commit hash), not how you got there. App text never says "kamu".
