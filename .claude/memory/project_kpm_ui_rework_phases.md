---
name: project-kpm-ui-rework-phases
description: "The 6-phase RE-style UI rework plan for KPM Inventory — where the plan lives, what's done, and how Aldi wants it paced"
metadata: 
  node_type: memory
  type: project
  originSessionId: 589705af-fb57-4779-9c14-c7675fb835a4
  modified: 2026-08-13T23:36:40.862Z
---

Aldi's RE-style UI rework is a **6-phase plan deliberately split across sessions** (his call, to keep
context windows small). The full plan lives at
`C:\Users\ASUS\.claude\plans\purring-fluttering-balloon.md` and is written so **each phase block is
readable on its own** — he asked for that explicitly because the whole plan is too much to hold at
once. Read only the current phase's block, not the whole file.

**Aldi calls this "the crown plan"** — that name lives only in the session titles ("CROWN PLAN
PHASE 4 PART 7"), never in the plan file. Same thing.

**Status 2026-08-14: the LOGIN SCREEN and the app SHELL are the live front, ahead of Phase 6's bulk
sweep.** The sign-in screen and the Master Vault gate are now one screen sharing `.kpm-mod.gate`
(colours **and** format); the drawer does not render while signed out and starts closed at every
width, opened by the edge ribbon (right on the phone, left on the desk). **Next unstarted: the DESK
tab list + `UNLOCK MASTER VAULT` onto the control system** — a design round, start it fresh.
🔑 **Two facts that outlive this session live in
`~/.claude/skills/delegate-coding-task/references/kpm-inventory-facts.md`** (Alucard loads that file
for KPM code work): the shell holds two layouts in one file so *"was it redesigned?"* must be
answered with a WIDTH, and *a class that pins its own background must pin its own ink* — the reason
the sign-in panel was invisible in light mode. Design evidence + the incident are in A-Brain
(`128fa7c`): [[The KPM Control System]] rule 5, and **"same colour" ≠ "similar format"** in
[[Aldi's Design Taste]].

**Status 2026-08-13: Phase 5 COMPLETE** (`b25c526`) — the Architect Terminal is on the tokens,
audit group 27 pins it, 303/303. Next unstarted: Phase 6 (bulk standardise, ~25 files), then
Phase 7 (motion + cursor). Phase 6 should read the vault page **Off-Token Colour Migration Map**
for the substitution table instead of re-deriving it.

**Earlier status as of 2026-08-02: Phase 4 COMPLETE.** All four batches migrated and committed —
AgentInventoryView (24206d7), rank frames + AgentProfileView (8e0edcb, 3c1a170), DashboardView +
CareerDevTools (b0cc1b4), the missed-colour sweep (8698981), and the Restock Vault pair +
DashboardBenchmarks (808f9fc). **MerchantSalesView is the one Phase 4 screen deliberately skipped** —
see [[project-kpm-merchantsales-redesign-brief]]. Next unstarted work is plan Phase 5 (Architect
Terminal), then Phase 6 (bulk standardise) and Phase 7 (motion + cursor).

Two rules that emerged during the migration and should carry into Phase 6:
1. **Print receipts are a palette EXCEPTION.** Any `.print-receipt` block is white paper in both
   themes; theme tokens must NOT be applied there (`--ink-muted` prints at 2,3:1 on white). Known
   sites still to fix: `ConsignmentFinanceView.jsx`, `FleetCanvasManager.jsx`.
2. **A colour-audit regex must enumerate all 22 Tailwind families.** A narrow list reports "clean"
   and reads as proof — that is exactly how 39 off-token colours shipped in 8698981.

**Open question never answered by Aldi:** whether to brighten `--line-3` (#6A645C, 3,2:1) app-wide.
He said the card edges were hard to spot, then "not much to change i guess". One line in theme.css.

Earlier status — **Phase 1 complete** (bug fixes + readability), uncommitted. **Phase 2
complete + published** — the design artifact is at
`https://claude.ai/code/artifact/b258814d-899c-4e87-8859-1b5ce0c914d7` (private to Aldi's claude.ai).
Source HTML kept in that session's scratchpad as `phase2-design.html`; republish the SAME file path to
update in place at the same URL. It contains all three required deliverables: (1) border gallery v2 —
his current 7 borders reproduced from `rankBorders.jsx` beside 8 new RE-derived ones, each shown Live
+ Anim-off; (2) three UI directions mocking `AgentInventoryView` — **A Requiem Console** (minimal),
**B Attaché Grid** (warm RE4), **C Field Terminal** (industrial hazard); (3) token sheet, dark palette
+ hardcoded brushed-steel light-mode proof + type/spacing/recipes. Live Theme + Lite-Mode toggles let
Aldi verify tickboxes himself. **Awaiting his decisions:** one UI direction, which borders to keep/retire,
light-mode verdict. Those feed Phase 3.

**RANK FRAMES: ACCEPTED 2026-07-31** after 7 revisions. Aldi: *"this mytic border is fire man i accept
all the border, u may move on with other stuff"*. Final six live at
`A-Brain/Assets/rank-frames/` (rank-frames.css + markup.html + svg-defs.html + README.md) — they were
only ever in a session temp folder, so they were exported there deliberately. Showcase artifact:
`https://claude.ai/code/artifact/3e2378d0-d12c-47a2-b0a2-dba752e7a1c7`.
Bronze=wooden(static) · Silver=silver · Gold=gold frame · Platinum=corrupted grace(SVG turbulence) ·
Diamond=time winder · Mythic=boss warlord(one red eye + violet shards). **Not yet wired into
`rankBorders.jsx`** — that registry is still circular/gradient-based, and the new frames are SQUARE,
which also means `AgentProfileView`'s round avatar needs changing.

Verification done for Phase 2: JS syntax-checked + DOM-build executed in Node (15 cards / 30 frames /
3 mocks / 11 swatches, all tag-balanced, no runtime errors). NOT pixel-verified by me — the Browser pane
isn't logged into claude.ai, so the live visual is Aldi's to eyeball. Known soft spot: `Encryption Sweep`
border uses `mask-composite` (spotty support) — degrades to a full ring, doesn't break.

Reference files: Aldi supplied 62 at `C:\Users\ASUS\OneDrive\Desktop\sementara\RE UI` (RE Requiem /
RE Village / RE4 Remake UI stills, UI-animation videos, Duke merchant model + sprite sheets). Phase 2
used 5 stills (both inventory screens, `rewards white UI` for light mode, pause menu, crafting). Full
annotated inventory is in the plan file's Context section — read it there, don't re-scan the folder.
Key light-mode finding: RE's light mode = brushed steel + black ink + diagonal hatch, NOT a white page.

Aldi's pacing preference, stated explicitly: **one phase per session.** Phase 2 is image-heavy
(~20 screenshots), so it needs a clean context window.

Locked decisions that shape every later phase:
- **Dark by default, light mode STAYS a real feature** (he corrected an earlier "dark only" answer).
  Approach: CSS-variable colour tokens so one semantic class serves both themes, instead of
  maintaining 672 hand-written `dark:` variants.
- Bundle **one** condensed font for headings; system fonts for body. Needs `woff2` added to
  `vite.config.js` workbox globPatterns or it silently breaks offline.
- Borders "rich but static-first" — detail from layered gradients, at most one slow transform. He
  said "a little bit crazy is okay" for visual complexity, but not continuous animation.
- **RE menus are his benchmark for MINIMALISM**, not spectacle. "Working app better than better
  looking app." Must run on cheap Android phones.
- Everything must survive Lite Mode, which kills `backdrop-filter`/`box-shadow`/`text-shadow`/
  `filter` and collapses animations — only borders, background-color and background-image gradients
  survive.

See [[project-kpm-manual-test-checklist]] — each phase adds a numbered "Round" tickbox section to
`MANUAL_TEST_CHECKLIST.md` for him to test against, since he tests in the morning.
