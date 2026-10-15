---
name: project_kpm_dialog_gate
description: All 69 browser confirm/prompt dialogs in KPM were replaced by src/components/ConfirmGate.jsx — never reintroduce window.confirm/prompt/alert-as-a-gate
metadata: 
  node_type: memory
  type: project
  originSessionId: cdf73b9b-7622-49dd-a8e5-f546485895e4
  modified: 2026-08-07T11:50:01.987Z
---

`window.confirm` and `window.prompt` return **false / null without drawing anything** in a
browser where the user ticked "prevent this page from creating more dialogues". Aldi's browser
has it ticked. Every guard built on one therefore failed **closed and invisibly**.

Fixed 2026-08-07 in commits `f2060f1` (the sales terminal) and `5091e25` + `87156f8` (the other
69 sites, 16 files). Everything now routes through `src/components/ConfirmGate.jsx`:
`confirmAction(msg)` → `Promise<boolean>`, `promptAction(msg, default)` → `Promise<string|null>`.
`ConfirmHost` is mounted in `src/main.jsx` as a **sibling of `<App />`**, never a child, so no
screen can unmount it.

**Why it matters beyond the fix:** a blocked dialog makes an action do *nothing*. It cannot
create or corrupt data — so it explains "I clicked delete and it stayed", but it can NOT explain
duplicate records. Do not let it absorb blame for unrelated data problems. See
[[project_kpm_every_action_must_report]].

**How to apply:**
- Never add `window.confirm` / `window.prompt` back. Audit group 10 in
  `src/config/integration.audit.mjs` fails the build if one appears; it strips comments first,
  so prose explaining the ban is allowed.
- 180 `alert(` calls remain and are deliberately untouched — a suppressed alert only fails to
  inform. Aldi has not yet chosen modal-box vs toast for them.
- Adding a field to the gate? There is ONE host. Do not mount a second.
