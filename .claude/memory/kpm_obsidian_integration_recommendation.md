---
name: kpm_obsidian_integration_recommendation
description: "Decided against building an Obsidian/Claudian knowledge-graph integration for KPM — Claude's own memory system already fills that role; Obsidian's better fit here is a personal learning journal, not project source of truth"
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 99571c27-8b07-410b-9cd3-38a283d72ba5
  modified: 2026-07-26T13:07:08.754Z
---

Recommendation given (2026-07-26) when asked to propose a genuine Obsidian/Claudian integration for the KPM project: don't build one. The "browsable linked graph of decisions/bugs/architecture" idea is already implemented — by the Claude memory system itself (`memory/*.md` + `MEMORY.md` index, cross-linked with `[[name]]`, exactly the Obsidian graph-of-notes model), which updates automatically during normal work with no separate app to open or keep in sync.

**Why:** Layering Obsidian notes that summarize/link to `MANUAL_TEST_CHECKLIST.md`, `SECURITY_RULES_DEPLOY_CHECKLIST.md`, etc. would create a second index that has to be manually kept in sync with the same repo files the memory system already tracks — pure upkeep, no new capability. The vault also sits untracked inside the repo (see [[project_kpm_obsidian_claudian_vault]]), adding a real footgun risk (accidental commit) to any workflow that leans on it as a serious project tool.

**How to apply:** If the user later asks "should I use Obsidian for X" on this project, default answer is: use it for personal stuff Claude's memory system doesn't cover — a learning journal ("today I learned..."), freeform brainstorming for features that don't exist as code yet, or unrelated projects/hobbies — not as a companion knowledge base for KPM's own docs/decisions. Don't propose sync automation between the vault and repo docs unless the user pushes back on this reasoning with a concrete gap the memory system doesn't cover.
