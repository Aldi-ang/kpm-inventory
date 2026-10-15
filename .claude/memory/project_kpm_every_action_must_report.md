---
name: project_kpm_every_action_must_report
description: "Design law for KPM — every user action must visibly report what happened; silence is treated as a bug, not a minor polish issue"
metadata: 
  node_type: memory
  type: project
  originSessionId: cdf73b9b-7622-49dd-a8e5-f546485895e4
  modified: 2026-08-07T11:49:52.470Z
---

Aldi, 2026-08-07, unprompted: *"i really hate when my action is untold by the app, i dont even
know it work or not"*. Treat this as a standing design law for KPM, on par with the palette law.

An action that succeeds silently, fails silently, or is refused silently is a **bug**, not a
missing nicety. Do not deprioritise it as polish.

**Why:** he is not the only user — salesmen in the field press a button once, see nothing, and
either give up or press it five more times. Silence is what made the 69 browser-dialog calls
dangerous: they did not throw, they just quietly did nothing, and the app read as broken for
weeks without a single error anywhere. See [[project_kpm_dialog_gate]].

**How to apply:**
- Any new action path needs a visible outcome — a banner, a toast, a state change on screen.
  "It worked, so nothing needs to be said" is not acceptable here.
- Prefer a standing banner over anything auto-dismissing when a decision is still live; prefer
  a toast for "done, it worked".
- Never build a guard on something that can fail closed and invisibly.
- When reporting to him, apply the same rule to yourself: say plainly what was verified and what
  was skipped. He extends this preference to how work is reported, not just to the app.
