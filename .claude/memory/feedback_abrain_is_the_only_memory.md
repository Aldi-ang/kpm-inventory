---
name: feedback-abrain-is-the-only-memory
description: A-Brain is the single home for every fact and memory about the KPM app; the repo is workspace only
metadata: 
  node_type: memory
  type: feedback
  originSessionId: cc70e7ae-7888-4158-b297-2dbf39b9b10c
  modified: 2026-11-15T00:55:38.586Z
---

Aldi, 2026-08-14: *"this app memories and facts should be take noted inside the A-Brain, this app
folder is just for workspace, all the memories regarding anything should be taken from A-Brain"*.

**Why:** he is building Alucard into an agent that carries knowledge between projects. A fact
written into the app repo is scoped to that repo and dies with it — and `.claude/PROGRESS.md` in
particular is trimmed to about five entries, so anything durable left there is on a timer. He
wants one place he can point any future session at.

**How to apply:** the vault at `D:\APP DEVELOPMENT\kpm inventory main FILES\A-Brain` is the
authority for every fact, decision, incident and taste note. Anything written elsewhere — the
repo, a skill reference file, this memory folder — is a **pointer or a summary**, and when the two
disagree, A-Brain wins and the other copy gets fixed. `.claude/PROGRESS.md` stays, because it is
session state (where the work stands, what is half-done, what he was asked) rather than knowledge;
it is what makes `/clear` free. Knowledge that appears in it must also be written to A-Brain in the
same session. See [[project-kpm-second-brain-wiki]] and [[project-kpm-abrain-rename-and-graphify]].

**Uploading it (2026-11-15):** *"yes u should upload every information to A brain"* - after the auto-mode guard
refused a vault push. Push every A-Brain commit you make (named files, `git diff --cached --stat` first), no ask.
The vault's remote also receives an automated tobacco-notes agent ("Nolan A-Brain" commits to Tobacco-Business/),
so a push can be refused as non-fast-forward: `git pull --rebase --autostash`, check the incoming files do not
touch yours, then push. See [[feedback-kpm-dont-push-every-update]].
