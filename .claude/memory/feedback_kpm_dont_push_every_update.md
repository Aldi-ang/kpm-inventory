---
name: feedback_kpm_dont_push_every_update
description: Work on localhost and commit locally; never offer or run a push unless Aldi asks for one
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 746db1d4-1dfd-49f8-8c7e-4bcc66b26f9c
  modified: 2026-10-19T12:54:15.332Z
---

**Updated 2026-10-19:** when he DOES ask ("publish", "push", "fix the publish"), push it yourself, no
approval window - his *"actually i like it this way that u can push it yourself make sure the cloud
session can do that too"*, said when offered a confirm-every-push prompt. Workflow and the cloud
caveat: A-Brain `Wiki/Concepts/Publishing a Fix.md`; short form in the repo's CLAUDE.md "Publishing".
Unasked, the rule below still holds.

Aldi, 2026-09-06, right after the first real deploy of the day: *"well now we'll start working on
localhost again dont need to push the update everytime"*.

Default is **commit locally, do not push**. Testing happens on `npm run dev`. A push is a separate
thing he asks for by name, usually because he wants to show somebody the live link.

**Why:** every push triggers a Vercel rebuild and puts unverified work in front of whoever has the
link. The 2026-09-06 push carried 17 commits, several of them screens nobody had looked at yet.
He wants that to be a deliberate act, not the tail end of every task.

**How to apply:** finish a task with `git commit` and stop there. Do not end a reply with "say go
and I'll push". If a change only matters once deployed — anything touching hosting, the auth
domain, or `vercel.json` — say so in one line and let him decide when.

Related: [[feedback_verify_before_claiming_committed]] — committing is still verified the same way,
with `git show --stat`. This changes what happens *after* the commit, not the commit itself.
