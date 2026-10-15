---
name: project-kpm-manual-test-checklist
description: "Two standing checklists at repo root — MANUAL_TEST_CHECKLIST.md (pre-release QA) and SECURITY_RULES_DEPLOY_CHECKLIST.md (rules deploy process)"
metadata: 
  node_type: memory
  type: reference
  originSessionId: 7d2121b6-4ca0-4f59-b71e-9c415c5ffa5c
  modified: 2026-07-25T01:56:42.376Z
---

`MANUAL_TEST_CHECKLIST.md` (repo root, added 2026-07-24) is the project's standing pre-release manual test checklist — ordered 🔴 business-critical / 🟠 data integrity / 🟡 edge cases / ⚪ skip, plus a short post-rules-deploy subset. It directly encodes lessons from this session's bug fixes (offline login lockout, email-as-doc-ID validation, region-locked roster edits, EOD/damaged-goods routing, cross-company isolation, etc.).

It references a second file, `SECURITY_RULES_DEPLOY_CHECKLIST.md` — this was missing when first checked (2026-07-24) but the owner supplied it the same day and it's now also saved at the repo root. Covers: pre-deploy checks (firebase.json, firestore.rules.deployed-baseline as rollback copy, emulator suite passing, reconciliation-table re-read), the actual `firebase deploy --only firestore:rules` command (be physically present, don't walk away), post-deploy live verification across Tier 1/2/lower-tier accounts plus the specific fix being deployed, a "redeploy the baseline, don't panic-edit live" rollback procedure, and a post-deploy note-taking step.

**How to apply**: when finishing a fix in this project, check whether it falls under one of MANUAL_TEST_CHECKLIST.md's 🔴/🟠 categories and mention the relevant checklist item(s) in the test plan instead of inventing a new one. If a task involves an actual rules *deployment* (not just drafting/emulator-testing, which is the norm in this project — see [[project-kpm-rules-draft-process]]), walk through SECURITY_RULES_DEPLOY_CHECKLIST.md's steps rather than improvising a deploy process.
