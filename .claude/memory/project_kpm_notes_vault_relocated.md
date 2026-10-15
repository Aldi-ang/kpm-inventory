---
name: project-kpm-notes-vault-relocated
description: "Obsidian vault moved out of kpm-inventory-main into its own sibling folder + separate git repo (kpm-notes-vault), with a Bases backlog board and brainstorm space"
metadata: 
  node_type: memory
  type: project
  originSessionId: 99571c27-8b07-410b-9cd3-38a283d72ba5
  modified: 2026-07-26T13:54:05.701Z
---

2026-07-26: moved the "KPM APP" Obsidian vault (previously nested untracked inside the `kpm-inventory-main` git repo — see [[project_kpm_obsidian_claudian_vault]]) to its own genuinely separate location and repo, per the user's explicit request to avoid this project's history of branch/worktree confusion.

**New location:** `D:\APP DEVELOPMENT\kpm inventory main FILES\kpm-notes-vault` — a sibling folder to `kpm-inventory-main`, NOT inside it, NOT a subfolder of any git repo. (Note: `D:\APP DEVELOPMENT\` itself only grants read/execute to this Windows user — only Administrators/SYSTEM can write directly under it — so the vault landed one level down, inside the writable `kpm inventory main FILES` container, rather than directly under `D:\APP DEVELOPMENT\`. Still fully outside the `kpm-inventory-main` git working tree.)

Moved via verified copy-then-delete (not a raw move) since Obsidian had the vault open live. `kpm-inventory-main`'s `git status` confirmed clean before and after — no `KPM APP` folder anywhere in it now.

**New git repo:** initialized locally at the new path, 3 commits (initial content, untrack plugin binaries from `.obsidian/plugins/realclaudian/` since those are reinstallable third-party code not vault content, then the backlog+brainstorm content). **NOT yet pushed to GitHub** — no `gh` CLI or authenticated GitHub connector was available in that session, so remote repo creation (`kpm-notes` under `Aldi-ang`) and the push are still a manual step for the user.

**Backlog board:** `Backlog/Backlog.base` (Obsidian Bases, 4 filtered table views: To Do / Ready to Deploy / Parked / Done), with one `.md` card per item in `Backlog/`. Content is real, not placeholder — pulled from live memory + a fresh git audit that turned up [[project_kpm_batch2_unmerged_discovery]] (a whole second batch of tested fixes sitting unmerged).

**Brainstorm space:** `Brainstorm/` folder, two starter notes (Rank Config redesign, Crown Transfer) linking back to their backlog cards. Deliberately left thin — real brainstorming is the owner's to do over time.

**How to apply:** Obsidian's `obsidian.json` vault registry still points at the OLD path until the user manually removes/re-adds the vault in Obsidian's UI — don't assume the live app is using the new location without checking. If a future session needs to touch the backlog/brainstorm content, it lives at the path above, in its own repo, unrelated to kpm-inventory-main's git history.
