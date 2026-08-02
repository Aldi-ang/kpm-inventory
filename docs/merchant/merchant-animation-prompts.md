---
title: "Merchant animation prompts — Pip-Boy style, capybara"
description: Detailed 2D and 3D generation prompts for the capybara merchant, using Fallout 4 Pip-Boy animation as the motion reference. Written 2026-08-02.
type: asset-brief
---

# Animation prompts — Pip-Boy style, capybara merchant

Aldi's direction, 2026-08-02: *"i want to use fallout 4 simple animation for us to use on, i was
talking about the pipboy animation but capybara."*

## Why this reference is a good fit

Fallout 4's Pip-Boy animations are **short, looping, flat-shaded, low frame-count** cartoon
loops of a single character against a plain background. That is almost exactly the constraint
this app already has:

- they loop forever without needing a beginning or end
- they read at small size because the silhouette does the work, not detail
- they are **sprite sheets**, so they cost one image request and zero runtime 3D
- they survive being frozen on one frame — which is what Lite Mode will do

Do NOT copy Bethesda's Vault Boy. Same *technique*, original capybara.

---

## PROMPT — 2D animation sprite sheet (paste this)

```
Create a looping animation sprite sheet of a cartoon CAPYBARA MERCHANT.

CHARACTER (must stay identical in every frame):
An upright capybara trader. Long weathered brown travelling coat, open at the front
over a cream shirt. Wide-brimmed brown leather hat pushed back off the face. Brown
satchel on a strap across the chest. Wide belt with a gold buckle and small pouches.
Fingerless dark gloves. Calm heavy-lidded eyes, blunt rounded snout, small round ears.
Warm brown fur, cream chest. Gold coin accents.
Mood: gruff, warm, unhurried, quietly amused. A trader who likes you because you move
stock. Not cute-chibi, not scary, not zany.

STYLE:
Flat cartoon with clean bold outlines and simple cel shading. Limited palette. The
look of a retro instructional cartoon or an in-game menu animation — readable shape
first, detail second. NO gradients, NO photo-realism, NO 3D render look.

PALETTE: warm browns, near-black, cream, ONE gold accent. NO BLUE. NO GREEN.

ANIMATION: [pick one per generation]
  A) IDLE   — 6 frames, gentle breathing loop, hat brim shifts slightly, tail flick
  B) TALKING — 8 frames, mouth opens and closes, one hand gestures outward and back
  C) DEAL   — 8 frames, brings a small stack of gold coins up into view, tips the hat,
              one slow satisfied blink

OUTPUT FORMAT (critical):
- ONE horizontal sprite sheet, all frames in a single row, left to right in order
- Every frame EXACTLY the same size and the character EXACTLY the same scale and
  position, so the loop does not jitter
- Each frame 200x200 pixels
- FULLY TRANSPARENT background, real alpha, no white, no checkerboard drawn in
- No text, no labels, no frame numbers, no watermark, no border, no drop shadow
- Full body, feet near the lower edge of each frame
```

**Why one row and identical framing:** the app plays it with CSS `steps()` on
`background-position`, exactly like the existing coin sprite in `theme.css`. Any drift in scale
or position between frames shows up as the character jumping.

**Frame budget:** 6–8 frames. More than 12 costs bytes and buys nothing at 46 px.

---

## PROMPT — 3D, only if a rotating merchant is ever wanted

```
Model a stylised cartoon CAPYBARA MERCHANT for a low-end mobile game UI.

BODY: upright bipedal capybara, sturdy rounded build, short limbs, blunt rounded
snout, small round ears, calm heavy-lidded eyes.
CLOTHING: long weathered brown travelling coat open over a cream shirt, wide-brimmed
leather hat pushed back, satchel on a chest strap, wide belt with gold buckle and
pouches, fingerless gloves.

STYLE: stylised cartoon realism. Clean quad topology, LOW polygon count for real-time
rendering on a cheap Android phone. Simple hand-painted diffuse textures only.
NO PBR, NO subsurface scattering, NO high-poly sculpt detail.

PALETTE: warm brown, near-black, cream, gold accents. NO BLUE. NO GREEN.

RIG + LOOPS: rigged skeleton with three short looping animations —
  IDLE (quiet breathing), TALKING (hand gesture, jaw moves), DEAL (raises coins,
  tips hat, slow blink). Each loop 1-2 seconds.

DELIVER:
  1. GLB under 3 MB total including textures
  2. A 3/4 front camera render of each loop's midpoint, 200x200, transparent PNG
  3. A front / side / back orthographic turnaround for reference
```

**Standing objection, unchanged:** shipping a real 3D model into this app means megabytes of
JavaScript plus continuous GPU work on cheap Android phones, in an app whose whole brief is
"light, works on all phones". The cheap win is to build the model, then **render sprite frames
from it** and ship those. Same look, zero runtime cost.

---

## How a sprite sheet gets wired (already possible today)

The pattern exists in `src/styles/theme.css` — `.kpm-coin` plays an 8-frame sheet with
`steps(8, end)` and freezes on one frame under Lite Mode. Copy that block, change the frame
count and pixel width. **Step in PIXELS, never percentages** — percentage stepping lands
between frames and tears.

Everything else is done: `public/sprites/` is precached, `CapybaraMascot` takes per-appearance
art via `CAPY_COMMS`, `useSound` is pooled and Lite-Mode-silenced.

---

## When Aldi generates more images

Keep every generation. Name them by state, and save the **transparent** version, not the
preview mockup — the mockup carries window chrome and labels that get cut straight into the
sprite. That already happened once on 2026-08-02.
