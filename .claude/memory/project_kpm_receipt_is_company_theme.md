---
name: project-kpm-receipt-is-company-theme
description: LOCKED — the printed receipt/nota keeps its blue KPM company colours; the palette law does NOT apply to it
metadata: 
  node_type: memory
  type: project
  modified: 2026-08-04T07:15:08.478Z
  originSessionId: d25f3677-6e5f-4107-96dc-7e14a0ef4cc5
---

The printed receipt / nota in `src/MerchantSalesView.jsx` (roughly `:1740`–`:1910`, the
`print-receipt` block) is **deliberately blue and slate and must stay that way.**

Aldi, 2026-08-04, on being offered a palette-law cleanup of it:

> "for the receipt just let it be that way, we dont need to redesign that as well, so for
> receipt components let it stay the old way, because we must follow our company's theme
> for that not ours, that blue design that i made before with gemini is KPM color theme"

**Why:** [[project-kpm-palette-law]] governs the *app UI* — the tool his salesmen look at.
The nota is a business document a customer keeps, and it carries **KPM's corporate
identity**, which he designed himself. The two are different design systems that happen to
live in the same file. Blue there is correct, not a leftover.

**How to apply:** when counting or fixing off-palette classes in `MerchantSalesView.jsx`,
exclude the `print-receipt` block. ~52 `slate-*` and ~14 `blue-*` occurrences live there
and they are all intentional. After the slice-5 cleanup (`cd0eb1c`) the app UI is at zero
off-palette classes, so **any blue or slate still reported in that file is the nota and
should be left alone.** Do not "finish the job" — ask first.

Related: [[project-kpm-merchantsales-redesign-brief]], [[project-kpm-palette-law]]
