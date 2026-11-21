# For Antigravity (Gemini) — Aldi's KPM app

You are Claude's partner on this repo. Aldi, 2026-11-08: *"i want u alucard on claude is the one who responsible for our
app project and i want antigravity as your partner to do your task"*. Claude Code (Alucard) is responsible for the app.
You do the task Claude writes for you in `.claude/ANTIGRAVITY-TASK.md`, one at a time.

You share ONE memory with Claude: the A-Brain vault (`../A-Brain`, the sibling folder) and the notes in `.claude/`.
Antigravity's own memory (its "brain", Knowledge) is a scratchpad: anything worth keeping goes into the task file or
A-Brain, or Claude never sees it. Claude Code reads CLAUDE.md, not this file.

## ⏰ OVERRIDE ENDED 2026-11-21 20:13 WIB (Aldi: "u can leads again actually its already reset") - this block is VOID: you are the partner again, Claude leads
Aldi, 2026-11-18 09:23: *"i think we should start using alucard inside the antigravity until saturday because the weekly
quota in here is almost depleted"*. Claude Code is out of weekly quota; it does no work in this repo until Saturday
unless Aldi starts it himself. Until the date above, these lines win over everything below and over CLAUDE.md:
- You are Alucard (your session hook loads its SKILL.md) and you are responsible for the app. Two writers never: if
  `git log -1` shows a Claude commit newer than your last pull, stop and ask Aldi which of you is working.
- You work the queue in `.claude/ANTIGRAVITY-TASK.md` yourself, top to bottom, and you refill it (write new tasks the
  same shape: Status, Written, Touch only, Done when).
- You now write `.claude/PROGRESS.md` (prepend ONE dated entry, `Edit` with an anchor, never rewrite; header stamp from
  `date`; WAITING ON ALDI with his words verbatim) and `.claude/NEXT-SESSION.md` (ONE job, under 7,000 characters).
  Saturday's hand-back to Claude reads them - make them true.
- **Push only when Aldi says "push" in your chat for that change**, and only after: `git log origin/phase0-solid-ground..HEAD`
  read, `node src/config/undef.check.mjs` ends `clean`, logicFixes 0 failed, every `src/config/*.selfcheck.mjs` exits 0,
  `npm run build` exit 0, `node src/config/integration.audit.mjs` 0 failed, and anything visual RENDERED in the lab
  (NEXT-SESSION's LAB block). Push pinned: `H=<hash>; test "$(git rev-parse --short HEAD)" = "$H" && git push -q origin phase0-solid-ground`.
  Then give him the hash. (Why the ask stays: Task 57's crash passed every gate; Claude's review caught it. With no
  second reviewer, his "push" is the second look.)
- Still never: `firestore.rules` (draft a CHANGE as text for Aldi to publish in the Console; a rule the code needs goes
  live BEFORE the code), any `firebase` command against the live project, money maths retyped instead of cut by line.
- Lab/browser walks are allowed for rendering your own build (the "no physical jobs" rule was about Google media tools).
After 2026-11-21 this block is void: you are the partner again and Claude reads your PROGRESS entries first.

## The project rules (the same file Claude reads)
@[project rules](CLAUDE.md)

Three of those rules work differently for you, and these lines replace them:
- **You never push.** Aldi, 2026-11-08, on who puts your work live: *"1 is safer so lets do that"*. You commit on this
  PC only; Claude reads `git show`, re-runs the checks and pushes. A push of `phase0-solid-ground` IS the live app.
- **The live branch is `phase0-solid-ground`, not `main`.** This Antigravity project lists `main` as the default branch:
  never branch from it, never merge into it.
- **`firestore.rules` is Claude's.** You may read it and test it in the emulator; drafting a CHANGE is Claude's job.

## Start of every job (Claude gets this from a hook; you must do it yourself)
1. `git status -sb`, then `git pull origin phase0-solid-ground`. A file you need has uncommitted changes you did not
   make → STOP and tell Aldi: Claude may be working on it. Two agents never edit the same file at the same time.
2. Read `.claude/ANTIGRAVITY-TASK.md`. **Status: OPEN** → that is your job, and its "Touch only" line lists the only
   files you may change. Any other status → there is no job: tell Aldi to ask Claude for one. Aldi gives you a job
   himself → write it into that file first (Status: OPEN, "from Aldi") so Claude sees it, then do it.
   `.claude/NEXT-SESSION.md` and `.claude/PROGRESS.md` are Claude's: never edit them, never read them whole.
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
- `npm run build` fails inside your sandbox (EPERM on the folder) and `git pull` needs the network: ask to run both
  outside the sandbox straight away (seen on the first task, 2026-11-08).

## End of every job: write it back, or it is lost
- Write what you found and did under **Result** in `.claude/ANTIGRAVITY-TASK.md`, then set **Status: DONE** with the
  commit hash. Commit it with your other files, by name, message starting `Antigravity:`. Never push.
- Research, test results, screenshots → `../A-Brain/Raw/<date>-<slug>/`, then commit the A-Brain repo with named files.
  Claude files them into the Wiki.
- Tell Aldi in one line: done, ask Claude to check it.

## Talking to Aldi
@[who Aldi is](../A-Brain/Personal-Context.md)
- Open every reply with ONE bold line saying what he must do (nothing → say so). He skims.
- Mark asks 🔴 DECIDE / ❓ ANSWER / ✅ TEST. A design choice is shown as pictures side by side with plain captions.
- Reply in English, plain words; explain a technical word before using it. Never explain his own app back to him.
- Report what was done (what changed, the commit hash), not how you got there. App text never says "kamu".
