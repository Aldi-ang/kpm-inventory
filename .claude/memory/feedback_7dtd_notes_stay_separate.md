---
name: feedback_7dtd_notes_stay_separate
description: "7 Days to Die work must never write to the KPM repo's .claude notes — it has its own MODS-NOTES.md and NEXT-JOB.md"
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 2d3166a9-14f1-4872-8d57-2616d0d46dd9
  modified: 2026-09-04T04:28:21.962Z
---

**His instruction, 2026-09-04, verbatim:** *"use other notes dont collide with my work app notes"*.

The 7DTD mod track writes ONLY to:

- `C:\Users\ASUS\AppData\Roaming\7DaysToDie\MODS-NOTES.md` — the full record
- `C:\Users\ASUS\AppData\Roaming\7DaysToDie\NEXT-JOB.md` — its one next job

It must NOT write to `.claude/PROGRESS.md` or `.claude/NEXT-SESSION.md` in kpm-inventory, even
when a Stop hook demands it. Those two belong to the KPM app track.

**Why:** on 2026-09-04 a KPM session was mid-build on the tech SFX job — `useSound.js`,
`PonderPad.jsx`, `sfx.js`, `integration.audit.mjs` all dirty and uncommitted — and rewriting
`NEXT-SESSION.md` from the 7DTD side would have replaced a brief that session was actively
following. An `Edit` did in fact fail with "file has been modified since read", because the other
session was writing it at that moment.

**How to apply:** when the progress-note Stop hook fires during 7DTD work, the change it detected
almost certainly belongs to the other track. Check `git status` before assuming a dirty file is
yours. Record the 7DTD state in the game folder's own notes and say in one line that the KPM notes
were deliberately left alone. His instruction outranks the hook.

Related: [[project_kpm_ui_rework_phases]]
