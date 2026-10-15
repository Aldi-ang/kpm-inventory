---
name: kpm-obsidian-claudian-vault
description: "Obsidian vault \"KPM APP\" is nested inside the kpm-inventory-main repo root, untracked+ungitignored; Claudian plugin tested safely, round-trip confirmed"
metadata: 
  node_type: memory
  type: project
  originSessionId: 99571c27-8b07-410b-9cd3-38a283d72ba5
  modified: 2026-07-26T13:06:42.413Z
---

The Obsidian vault named "KPM APP" lives at `D:\APP DEVELOPMENT\kpm inventory main FILES\kpm-inventory-main\KPM APP` — a subfolder physically inside the real git repo root, not a separate folder. Confirmed via Obsidian's `obsidian.json` vault registry and the launcher UI.

It is currently **untracked and NOT in `.gitignore`** — `git status` in the main repo shows `KPM APP/` as an untracked entry. A careless `git add -A` or `git add .` in the main repo would sweep vault files (including `.obsidian/` and `.claudian/` config) into a commit.

**Why:** The user installed Claudian (an Obsidian plugin embedding Claude Code as a chat sidebar) and asked for a safe first test before real use, since the vault sitting inside the repo means Claudian's file read/write reaches the live codebase.

**How to apply:** Before recommending any Obsidian/Claudian workflow that touches this vault, remember it is inside the repo tree. Recommend adding `KPM APP/` to `.gitignore` as a standalone follow-up (not yet done — needs explicit user approval, it's a repo file change) to prevent accidental commits.

**Claudian test (2026-07-26):** Ran a full create → read/summarize → delete round-trip on a test note via the live Obsidian app (computer-use). Result: worked correctly, `git status` identical before/after.

Findings on Claudian's permission settings (plugin v2.0.41):
- There's a quick "Safe" toggle in the chat panel that flips to "YOLO" when clicked — YOLO was OFF by default (good), confirmed via zoomed screenshot.
- The "Safe" mode's underlying permission level is configurable in plugin settings → Claude tab → "Safe mode" dropdown: options are `acceptEdits` (default out of the box — auto-accepts file edits without asking), `auto`, and `default` (asks before every action). Set it to `default` for the first test — this is the actual cautious setting, not just the Safe/YOLO toggle.
- Caveat: even with Safe mode = `default`, a `Bash rm` command Claudian ran to delete the test file did NOT show a visible permission prompt (unlike the earlier Write, which did prompt). Plugin settings has a "Load user Claude settings" toggle (loads `~/.claude/settings.json`) that is ON by default and explicitly documented as able to "bypass Safe mode" — likely explains why Bash slipped through. Worth knowing before assuming every action will prompt.

See [[kpm_obsidian_integration_recommendation]] for the Step 3 proposal outcome.
