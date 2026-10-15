---
name: project-kpm-rules-draft-process
description: "How Firestore rules changes are handled in the kpm-inventory-main project — draft-and-report, never auto-deployed"
metadata: 
  node_type: memory
  type: project
  originSessionId: 7d2121b6-4ca0-4f59-b71e-9c415c5ffa5c
  modified: 2026-07-24T10:44:50.361Z
---

`firestore.rules` in this repo is a **draft, not the live rules** — the file header says so explicitly ("RECONCILED DRAFT — NOT DEPLOYED"). The actual live rules are deployed manually by the owner via `firebase deploy --only firestore:rules` after reviewing the diff.

**Convention used throughout this file**: when a security/scoping question is investigated and found to be NOT safely fixable without a larger change, the finding is documented as an inline comment block directly above the relevant `match` block — explaining what was checked, why it can't be done today, and what a real fix would require. These comments make NO functional change (no `allow` lines touched). See the `transactions` block for the original example (Personal/Regional/Global scoping investigation) and the `customers`/`notifications` blocks for a repeat of the same pattern (2026-07-24).

**Why**: the owner wants a paper trail of "we looked at this, here's exactly why it's blocked" rather than silent gaps or half-applied fixes that break the app. [[project-kpm-customer-notification-scoping]]

**How to apply**: any time a task asks to "investigate whether X can be scoped/restricted" in this repo, follow this exact pattern — investigate, and if blocked, add a comment block (not a behavior change) to `firestore.rules` documenting it, matching the existing house style. Never edit an `allow` line without being explicitly asked to, and never assume the file's current content is deployed.
