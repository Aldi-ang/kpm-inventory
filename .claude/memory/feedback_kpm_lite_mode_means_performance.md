---
name: feedback-kpm-lite-mode-means-performance
description: "When Aldi says 'lite/light mode' about KPM he usually means the PERFORMANCE mode, not the white theme — and rank borders are exempt from it"
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 9bb79f83-b3cc-43f8-bfa9-ebd105f2d0ab
  modified: 2026-07-31T00:27:56.211Z
---

**"Lite mode" in Aldi's vocabulary = the app's PERFORMANCE mode, not the light/white colour theme.**
He said it explicitly on 2026-07-31 after I spent a whole pass fixing the white theme:
*"light mode mean here is not about the white and black is about the performance BTW."*

**Why:** the app has both a light colour theme and a Lite Mode performance switch, and he uses
"light/lite mode" for the second one. Reading it as the colour theme sent me down a long wrong path
(recomputing white-theme contrast ratios) when he was talking about animation cost.

**How to apply:** when he says lite/light mode, assume PERFORMANCE unless he is clearly talking about
colour. If genuinely ambiguous, ask in one line — it is cheap, and guessing wrong costs a whole pass.

**The rule this produced (now in the plan):** rank borders are **EXEMPT** from the Lite-Mode-first
constraint and may be heavy — `filter: blur()`, `drop-shadow`, `mix-blend-mode`, multiple animated
layers. His words: *"we have lite mode to make everything lighter... u can use heavy animation for
the border... i dont want cheap and low performance animation just for the border."* **Lite Mode is
the fallback for weak phones, not the design target.** Everything OUTSIDE the borders still follows
Lite-Mode-first. See [[project-kpm-ui-rework-phases]] and [[project-kpm-palette-law]].

**Related lesson about his references:** he judges animation quality against **Steam avatar frames
and MLBB**, not against web UI. Frame-by-frame study of the six he supplied
(`RE UI/Avatar frame/*.mp4`) gives the law: **nothing rotates** — the structure is dead still and
only light moves, with uneven hot spots at unrelated periods, 2-3 motion systems at once, and real
bloom over hard structure. Uniform rotation is what he called "cheap".
