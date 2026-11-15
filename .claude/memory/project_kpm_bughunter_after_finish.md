---
name: project-kpm-bughunter-after-finish
description: "When the KPM app is finished, offer a bug hunt with the Claude-BugHunter skills stored in A-Brain (his 2026-11-15 ask); stored, never installed"
metadata:
  node_type: memory
  type: project
  originSessionId: ef9874a7-c8f9-441f-a3f4-2cf740d83442
  modified: 2026-11-15T00:59:19.912Z
---

His 2026-11-15: *"btw i want u to have this skills with u when this app finishes https://github.com/elementalsouls/Claude-BugHunter.git"*.
Stored (not installed) at `A-Brain/Skills-Library/claude-bughunter`, indexed for `skill-find`; safety verdict and
how-to in the vault page `Wiki/Concepts/Bug Hunt Kit (Claude-BugHunter).md`.

**Why:** he wants his app checked for real security bugs before big companies use it; installing 83 auto-loading
skills globally would cost context in every chat, and its installer edits shell startup files.

**How to apply:** when he says the app is finished, or asks for a security review, offer the bug hunt: skill-find the
bug class, load one SKILL.md at a time, code-reading hunts first, only his own app, never run its installer, never
scan the live app or its Firebase without his word. Links [[feedback-abrain-is-the-only-memory]].
