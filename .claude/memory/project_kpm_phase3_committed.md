---
name: project-kpm-phase3-committed
description: "2026-07-31: Phase 0+1 and Phase 3 committed as separate restore points on phase0-solid-ground; theme tokens live but no screen migrated yet"
metadata: 
  node_type: memory
  type: project
  originSessionId: 04ca9c12-d462-4557-a25c-ba3cb8b3a268
  modified: 2026-08-01T00:45:18.935Z
---

**Committed 2026-07-31** on branch `phase0-solid-ground`, deliberately as **two** commits so each
phase can be rolled back independently:

- `13fc5eb` — Phase 0 + Phase 1 (60 files, 27.096 insertions; most of that bulk is generated
  `graphify-out/` data, ~5.400 lines are real code). Includes `src/config/rankBorders.jsx`,
  `career.js`, `AchievementTester`, `CareerDevTools`.
- `cc12344` — Phase 3 theme tokens (3 files, 264 insertions): `src/styles/theme.css`,
  `tailwind.config.js` (17 semantic colour groups), one `@import` in `src/index.css`.

Working tree CLEAN afterwards. `main` still at `3231f21` — the pre-rework app is intact there.
Verified with `git show --stat` on both, and `npx vite build` passes after the split.

**Rollback map (tell Aldi this, he finds it reassuring):**
`git reset --hard HEAD~1` undoes Phase 3 only · `git reset --hard dc6561a` undoes both ·
`git checkout main` returns the original app.

**Phase 4 started.** `24206d7` migrated `AgentInventoryView` — 135 colour swaps, 0 banned classes
left, 19 copy changes, coin sprite added at `public/coin-sprite.png`. Aldi reviewed it live:
*"it look great no problem"*. Financial engine untouched (all 9 calc identifiers verified).

**Migration remaining (banned-class counts, measured 2026-07-31):**
`AgentProfileView` 286 · `MerchantSalesView` 183 · `DashboardView` 23 · `AgentInventoryView` 0 ✅

**NEXT TASK, agreed but NOT started — "Customize Avatar" button.**
Goes in **`AgentProfileView`** (Aldi corrected me: not AgentInventoryView). A small button that
puts avatar-frame + profile-picture changes in one place. **Do not build a new picker** — the
machinery already exists, wire to it:
- `ImageCropper.jsx` + `savePhotoAndGetReference()` / `deletePhotoFromStorage()` in `utils/helpers.js`
- a `borderStyle` `<select>` already exists at `AgentProfileView.jsx:756`, fed by `RANK_BORDERS`
- `RankBorder({styleId,index,hex})` at `rankBorders.jsx:205` renders the frame
- (`borderCache.js` is map-region borders, NOT avatar frames — unrelated, do not confuse them)

**Also pending on `AgentProfileView`:** the six accepted rank frames are **square**, that screen
renders a **round** avatar, and `rankBorders.jsx` is still the old circular gradient system. So
migrating it = colours + avatar shape + rewiring the registry to `A-Brain/Assets/rank-frames/`.
Bigger than the Inventory job was.

See [[project-kpm-palette-law]] for token rules and [[project-kpm-ui-rework-phases]] for phases.

**Teaching note that landed:** Aldi initially wanted to commit only at the very end, believing that
made rollback easier. The unblocking explanation was that **committing is not publishing** — it is
local and private, and does not touch the live app or his employees; push/deploy are separate. Once
he understood a commit is just a save point, he agreed immediately. Reuse that framing.
