---
title: "Merchant prompt pack — capybara merchant for MerchantSalesView"
description: Ready-to-paste prompts for the art, 3D and voice AIs, plus the behaviour spec they have to match. Written 2026-08-02.
type: asset-brief
---

# Merchant prompt pack

Aldi hands these to whichever AI makes art / 3D / voice. Each block is written to be pasted
whole. **The character is a CAPYBARA merchant — original IP, Aldi's own mascot lineage.** No
Capcom asset ships. The RE references inform pose, lighting and attitude only.

---

## 0. Behaviour spec — what the assets have to serve

Locked with Aldi 2026-08-02. Anything produced must fit this or it cannot be used.

- The merchant has **no permanent space on screen.** He slides in, speaks, slides out.
- He appears on **deal commit only** — never on add-to-cart, never idle. A 15-line basket
  produces zero appearances until the sale commits.
- He owns the **bottom-right corner** and replaces the capybara mascot while that screen is open.
- Slide-in is ~700 ms, he holds ~6–8 s, slides out ~1 s. Click dismisses him early.
- **Lite Mode strips all of it** — he must still make sense as a single still frame with a text
  bubble, no motion and no sound.
- He never blocks. The money is already committed before he shows up.

### Sprite states needed

| State | When | Notes |
|---|---|---|
| `idle` | fallback / bubble only | calm, waiting |
| `talking` | while the bubble is up | mouth open, gesturing |
| `deal` | the moment a sale commits | pleased, coins/cash gesture |

### Hard technical limits

- **200 × 200 px**, PNG, **transparent background** (RGBA — not a black or white square).
  The current sprites are 200 px and ~75 KB each; stay in that range.
- Readable at **46 px**, which is the size he actually renders at on a phone. Detail below
  that size is wasted bytes.
- Consistent silhouette, lighting and palette across all three states — they cross-fade.

### Palette (from the app's theme tokens)

- warm near-black ground `#0A0908`, panel `#121110`
- warm off-white ink `#E8E4DE`
- one gold `#D4AF37` for trim/coins, orange `#FF8C1A` for emphasis
- **no blue, no green** — locked palette law for this app

---

## 1. PROMPT — 2D sprite art (paste this)

```
Draw a friendly cartoon CAPYBARA merchant, three separate images, same character.

Character: a capybara standing upright as a travelling goods trader. Long weathered
coat, satchel and belt pouches, a wide-brimmed hat pushed back. Calm heavy-lidded eyes
and the blunt rounded snout capybaras actually have. He is a stock trader who sells to
distributors, not a shopkeeper charming a customer. Warm, gruff, unhurried, slightly
amused. Friendly, not scary, not cute-chibi.

Style: hand-painted cartoon with clean readable shapes, semi-realistic proportions,
soft rim light from the upper left. Think a warm storybook illustration, not flat
vector, not anime.

Palette: warm dark browns and near-black, warm off-white, ONE gold accent for coins and
buckle trim, orange for small highlights. NO blue. NO green.

Output THREE images, identical character and lighting:
1. IDLE — standing calm, hands resting, waiting.
2. TALKING — mouth open mid-sentence, one hand raised in a small gesture.
3. DEAL — pleased, holding up a coin or a small stack of cash, satisfied smile.

Format for each: 200x200 pixels, square, PNG with a FULLY TRANSPARENT background.
The character fills most of the frame, feet near the lower edge, nothing cropped.
Must stay readable when shrunk to 46 pixels tall.
```

**Reference to attach if the tool accepts images:** `RE UI/DUKE/DUKE FRONT.png`,
`DUKE SIDE.png` — for *pose, coat silhouette and merchant posture only*. State clearly to the
tool: do not copy the character, produce an original capybara.

---

## 2. PROMPT — 3D model, only if Aldi wants a rotating merchant

Only worth doing if the merchant is ever shown rotating. **The plan's existing objection still
stands:** three.js plus a model is megabytes of JS and continuous GPU work in an offline-first
PWA that must run on cheap Android phones. The cheaper path is to render this model once and
export the three sprites above from it.

```
Model a stylised cartoon CAPYBARA merchant for a mobile game shop UI.

Body: upright bipedal capybara, sturdy build, short limbs, blunt rounded snout,
small rounded ears, heavy-lidded calm eyes. Wearing a long weathered travelling coat,
a satchel across the chest, belt pouches, a wide-brimmed hat pushed back off the face.

Style: stylised cartoon realism. Clean topology, low polygon count suitable for
real-time rendering on a low-end mobile phone. Simple hand-painted textures, no PBR
complexity, no subsurface scattering.

Palette: warm dark brown coat, warm off-white fur highlights, gold buckle and coin
accents. No blue, no green anywhere.

Deliver: a rigged model with three poses or short loops — IDLE (calm breathing),
TALKING (small gesture, mouth moves), DEAL (holds up a coin, satisfied).
Export as GLB, under 3 MB total, plus a 3/4 front camera render of each pose at
200x200 with a transparent background.
```

**Reference to attach:** `DUKE FRONT.png`, `DUKE BACK.png`, `DUKE SIDE.png` — a proper
orthographic turnaround, which is what a 3D tool actually wants. Say: match the *coat
silhouette and stance*, replace the character with an original capybara.

---

## 3. PROMPT — voiceover (paste this)

```
Record short merchant voice lines for a mobile app used by cigarette-distribution
agents in Indonesia.

Character voice: a gruff, warm, unhurried male travelling trader. Gravelly, low,
slightly amused. Clipped delivery, never theatrical, never a cartoon villain, never
squeaky. He respects the person he is talking to because they move a lot of stock.
Think a tired market trader who likes you.

Language: ENGLISH ONLY. Aldi's call, 2026-08-02 — no Indonesian in the voice lines.
Neutral accent, not American-announcer, not British-posh. Plain and worn.

Delivery: each line under 2 seconds. Dry, low volume, spoken not shouted. He is
appearing AFTER a sale is already completed, so there is no urgency and nothing to
sell.

Output: separate files per line, mono, 22 kHz is enough, MP3 or M4A,
under 15 KB per line. Total budget for all lines is 100 KB.
```

### Lines to record — original writing, not from any game

```
DEAL (plays when a sale commits):
  1. "Deal's done. Good haul."
  2. "Stock's moving. I like that."
  3. "Clean trade. Next route?"
  4. "Counted and paid. We're square."

ADD (optional, only if add-to-cart reactions are ever enabled):
  5. "Into the bag."
  6. "Good pick."
  7. "Still plenty in the back."

IDLE (optional):
  8. "Take your time."
  9. "I'll be here."
```

**Must not be recorded:** any line that pitches smoking at a consumer. The first delegated batch
produced "ayo merokok", "habiskan", "toko rokok buka 24/7" — all cut. He talks to distribution
agents about stock, margin and routes, never to a smoker about smoking. This is a business tool
used by real employees.

---

## 5. Aldi's own art — what it needs before it can ship

Source: `RE UI/our own capybara mascott by aldi/DREAMINA/` (Dreamina-generated, 2048×2048).
The character is right — brown travelling coat, wide-brim hat, gold coin buttons, satchel
strap, gold belt buckle, calm heavy-lidded eyes, warm browns and gold with no blue or green.

Three blockers, none of them about the art itself:

1. **Background is white, not transparent**, with a soft drop shadow baked in. Dropped into the
   app as-is it renders as a **white square** on the near-black shop panel. Needs a real alpha
   cut-out, and the baked shadow removed with it or it becomes a grey halo.
2. **Two watermarks ship with it** — a Dreamina mark bottom-right and an AI badge top-left.
   Both would appear inside a real business app. Must be removed or cropped out.
3. ~~Bust crop for readability at 46 px.~~ **Aldi chose FULL BODY, 2026-08-02.** He was told the
   face lands around 8 px at the current render size and picked full body anyway. If it reads
   too small on his phone, the fix is to **raise the render size** in `CapybaraMascot`
   (the container is `w-32 h-32 md:w-48 md:h-48` with a `scale` prop), not to re-crop the art.

Once those three are done: downscale to 200 px, save RGBA PNG, drop into `public/sprites/` as
`idle.png` / `talking.png` / `deal.png`. Everything downstream is already wired.

---

## 4. Wiring, once assets exist

Nothing here needs new code architecture — it was all built 2026-08-02, commit `d546670`.

- **Sprites** → drop into `public/sprites/` as `idle.png` / `talking.png` / `deal.png`,
  200 px, RGBA. Already precached by `vite.config.js` (`sprites/*.png`). Nothing else to change.
- **Voice** → drop into `public/sounds/`, add each as a key in `SOURCES` in
  `src/hooks/useSound.js`. Already precached (`sounds/*.mp3`), already pooled, already silenced
  by Lite Mode, already gesture-unlocked.
- **Appearance** → `CapybaraMascot` accepts `{ message, image }` on the `CAPY_COMMS` window
  event as of the same commit, so the merchant can borrow its whole show-up-and-go behaviour.
  Dispatch on deal commit in `MerchantSalesView`.

The only code left is the dispatch call and removing the permanent portrait — Phase A item 4.
