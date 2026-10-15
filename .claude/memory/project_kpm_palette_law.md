---
name: project-kpm-palette-law
description: "Aldi's locked visual law for KPM Inventory — no blue, no green, warm neutrals + one gold + red for danger; slate is the hidden blue"
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 9bb79f83-b3cc-43f8-bfa9-ebd105f2d0ab
  modified: 2026-07-31T00:46:56.154Z
---

Aldi rejected the Phase 2 v1 design with **"i really hate that overall blue color combo with the
black, it feels cheap and not in the class with resident evil minimalistic design."** The palette law
he approved instead, now locked for every later phase:

- **Banned outright:** blue, cyan, teal, indigo, navy, violet — AND green. He named green alongside
  blue as hated ("it doesnt goes along with that green and blue color that i hated"). No emerald
  success colour; "verified/complete" is signalled by platinum (dark) / graphite (light) + a filled
  plate, never a hue.
- **Allowed:** black → warm steel → white neutrals, **one gold** (`#D4AF37` dark, re-darkened to
  `#7A5A12` on light), **red→black gradient** for danger/power only — he called that gradient
  "kinda cool" unprompted.

**The root cause, and the highest-value fact here:** the app's whole neutral ramp is Tailwind
`slate-*`, which is a **blue-biased grey** (`slate-900` = `#0f172a`, visibly navy). Verified
2026-07-31: **8.534 `slate-*` occurrences across 147 files** in `src/`. So the app read blue to him
even where no blue accent existed. Any future restyle must swap slate → a warm ramp (stone family),
not just change accents. [[project-kpm-ui-rework-phases]]

**Why light mode "killed all the colors":** the colours were reused from dark mode. Gold `#D4AF37`
on a white ground measures **1,52:1** contrast — mathematically invisible. Every semantic hue needs
its own light value (gold→`#7A5A12` = 4,61:1). Also: light mode ground must be **bench steel
`#C4C1BB`, never `#FFFFFF`** — he reads white as cheap/unstyled, steel as an instrument. And the
rank ladder **inverts** on light (dark→bright becomes light→dark) because on steel, authority is ink
density; a pale "platinum" rank would be the most invisible thing on screen.

**Hatch density:** he rejected 6px stroke / 12px pitch as "no effort". Correct value is a fine
engraved **1–1,5px stroke on a 3–4px pitch**.

**EXCEPTION granted 2026-07-31 — purple is allowed on the Mythic rank frame only.** He asked for it
directly: *"the mythic should have crazier animation just like the boss warlord and use purple color
for the fire just like the one we have in the folder."* The ban still holds everywhere else. Orange
is also now actively wanted (*"btw i like the orange color as well, you should use that more"*) — the
Steam "gold frame" reference is molten orange, not yellow, and the Gold tier uses `gold flame`.

**Final rank → Steam reference mapping** (`RE UI/Avatar frame/*.mp4`, revised after rev 1):
Bronze `wooden frame` · Silver `silver` · Gold **`gold flame`** · Platinum **`corruptet grace`**
(black/white marble, note his spelling) · Diamond `time winder platinum` · Mythic `boss warlord`.
Gold and Platinum changed from the rev-1 picks — do not use `gold frame` or `spell`.

**Tool caveat:** querying ui-ux-pro-max for "inventory dashboard" returns Bento Grids +
`#334155` slate + `#059669` green — exactly what he hates. Query the *aesthetic*
("luxury industrial black steel gold minimal") to get the Luxury/Premium stone+gold palette instead.
