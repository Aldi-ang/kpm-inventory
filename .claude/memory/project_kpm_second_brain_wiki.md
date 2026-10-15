---
name: project-kpm-second-brain-wiki
description: "KPM Second Brain built in kpm-notes-vault — CLAUDE.md rulebook + Raw/Inbox/Wiki structure, first ingest pass done (6 Entities, 4 Concepts, 9 Summaries, 13 real sources)"
metadata: 
  node_type: memory
  type: project
  originSessionId: 99571c27-8b07-410b-9cd3-38a283d72ba5
  modified: 2026-07-27T01:35:56.281Z
---

2026-07-27: built the "second brain" wiki layer inside the `kpm-notes-vault` Obsidian vault
(separate repo, github.com/Aldi-ang/kpm-notes — see [[project_kpm_notes_vault_relocated]]),
following a plan the project owner supplied (`PLAN-second-brain-integration.md`, now living
in the vault root as a real, update-as-you-go living document). Adapts the Karpathy
"Obsidian is the IDE, Claude Code is the programmer, the wiki is the codebase" pattern.

**Division of responsibility this system establishes**: the `kpm-inventory` git repo stays
the ONLY source of truth for actual code/deployed-rules state; Claude Code's own memory (this
file and its siblings) stays the source of truth for operational facts needed to resume work;
the Wiki (`kpm-notes-vault/Wiki/`) is a periodic, deliberately-lagging distillation of
**understanding** — concepts, patterns, decisions, the "why" — for the project owner to
browse and learn from. Never treat the Wiki as authoritative for "is X deployed/fixed right
now."

**Structure**: `CLAUDE.md` (rulebook), `Raw/` (13 real sources, verbatim, immutable —
copied straight from this memory system, git log, and firestore.rules, not invented),
`Inbox/` (empty, for future unprocessed material), `Wiki/Index.md`, `Wiki/Log.md`,
`Wiki/Entities/` (Multi-Tenant Architecture, Tier System, Firestore Rules, Fleet Captain
Permission Gap, Rank Config and Achievement Badges, Git Worktrees), `Wiki/Concepts/`
(UI-Says-Yes-Server-Says-No Pattern, Anti-Recurrence Check, Draft-Then-Deploy Discipline,
Ponytail Philosophy), `Wiki/Summaries/` (9 pages, one per ingested story). Every page
cross-linked, verified with a script that checks every `[[wikilink]]` resolves and none are
broken by mid-link line wraps (a real bug caught 3 times while writing this).

**Honest gaps flagged (not silently glossed over), documented in Wiki/Index.md**: no
Entity page yet for offline/PWA-specific quirks (the offline-login-lockout summary didn't
cleanly fit Entities-vs-Concepts); feature-level "how it actually works" knowledge (Fleet &
Canvas, Stock Opname, EOD Reconciliation) isn't covered in this first pass — permissions/
Firestore-rules material and the worktree/process incidents were the focus since that's
where this project's real incident history is richest.

**PLAN revision log updated** (not silently deviated from) with 4 real lessons from
building it: (1) a "story" often spans multiple memory records, group into one Summary
rather than 1:1; (2) not everything fits Entities-vs-Concepts cleanly, admit the gap rather
than force it; (3) a requested ingest topic ("Firestore Security Rules escalation
vulnerability") didn't match any memory verbatim — mapped to the closest genuinely real
thing (the Rank Config/Achievement Badges cross-tenant shared-doc gap) rather than inventing
a separate incident; (4) line-wrapped wikilinks silently break in Obsidian, worth a
standing verification step.

**How to apply**: if a future session is asked to "ingest" new material into this wiki,
follow `kpm-notes-vault/CLAUDE.md`'s Operation: ingest steps, and re-read
`Wiki/Index.md`/`Wiki/Log.md` first rather than re-deriving what's already there. If asked
whether something is "documented in the wiki now," that's a real yes/no — but if asked
whether something is "actually true/live right now," always defer to the real
`kpm-inventory` repo, per this system's own core rule.

**2026-07-27 — tidy pass, no new content.** Added `title`/`description` frontmatter to
every note in the vault (19 Wiki pages, 12 `Raw/` sources — display fields only, source text
untouched, 9 `Backlog/` cards, 2 `Brainstorm/` pages). Built `Wiki/MOC.md`, a Map of Content
organized by topic (Security & Permissions / Process & Discipline / Architecture /
Incidents) as the actual human browsing entry point — `Wiki/Index.md` stays as the flat
A-Z catalog for AI queries, they now cross-link. Deleted `Welcome.md` and
`create a link.md` (Obsidian's stock onboarding notes, empty/unlinked). Verified zero
dangling `[[wikilinks]]` were introduced; the vault's only unresolved links are pre-existing
ones inside `Raw/` pointing at the original memory system's slugs, out of scope since `Raw/`
can't be edited. No filenames were renamed — `Raw/`'s `date_source_slug` naming is the
documented immutable-source convention, not a defect, so it got a display `title:` instead
of a rename.
