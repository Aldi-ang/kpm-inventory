# PROGRESS — read this, search for nothing

**Updated: 2026-08-26 21:03 WIB (🟠 KPM app session)** · ✅ **RESTOCK VAULT DONE + DRIVEN LIVE**, double scrollbar killed — `999b5a7`, **616/616** · 🟢 Sidebar answered (top-left circle) · 🔨 **NEXT: the desk gets a Minta tab.** · branch `phase0-solid-ground`

## 🟢 2026-08-26 21:03 — DOUBLE SCROLLBAR KILLED, SIDEBAR EXPLAINED. `999b5a7`. **616/616.**

**NOW:** Restock Vault done and driven live. Five commits today: `aea7de4` `4387c86` `390d5fa`
`284602b` `999b5a7`. **Next build: the desk's 4th tab (Minta).** Nothing is blocked.

**What just landed**
- **Double scrollbar** — his *"why do we have double slider"*. Restock Vault was the only tab that
  both scrolled itself AND guessed its height from `100vh`; the guess ran ~38px taller than the
  shell's padded workspace, so the workspace overflowed by that sliver and drew a second bar.
  `lg:h-[calc(100vh-140px)]` → **`lg:h-full`** at `App.jsx:4424`. Scroll stays on that box — the tab
  strip and the completeness footer are pinned by it.
- ⚠️ **I broke the build and almost reported it green.** The note explaining the fix was a JSX
  comment placed after `&& (` — a second expression inside those parentheses, which does not parse.
  Committed a "build green" message before checking, then amended. **Run the build BEFORE writing
  the claim, every time.** The warning now sits in the comment itself.

**🟢 SIDEBAR — ANSWERED, no longer blocking**
It is **not gone**. It is the collapsed capsule: a **black circle with a package icon at the very
top-left** (totem at x=4, y=12, 56×56, `pointer-events:auto`). Hovering it expands the rail to
351px. **Proved** by forcing `width:351px`: rail → 351, pod → x=0, **all 17 marks visible**.
⚠️ My earlier "pod at x=-124" reading was **junk** — measured mid-transition (380ms width animation,
220ms delay). Do not chase it again.
⚠️ **Synthetic hover never fires `:hover` here**, so this can only be confirmed by a human.
🔴 **The one remaining unknown:** `.kpm-rail-totem { display:none }` in the BASE block means the
circle only exists at **≥1024px**. Below that the rail is a phone drawer parked off-screen right and
**no hamburger was found**. If his window is narrower than 1024px, that is a real bug. His question
was *"the real question is where is the side bar?"* — answer given; awaiting only his window width.

**HIS QUEUE, verbatim, none built yet**
> "redesign the request panel as well or maybe just add it on the panel that we just made, just add
> extra tab for request"

Closes the old Active Pipeline question — it becomes the desk's 4th tab (Minta), carrying
**"Siapkan Pengiriman"** (`BranchWarehouseManager.jsx:1350`), the only way HQ ships a request.

> "make sure that every team registered on the fleet and roster have their own storage option"

🔴 Find where fleet/roster teams are registered first. Today Tujuan is derived from
`stockRequests[].branch` — a team never shipped to is invisible.

> "for the global logistic command i want u to redesign that ... regional warehouse current stock,
> on field, sold as well ... so HQ know how many bks should be send to them again"

Shape agreed: **di gudang · di jalan · di tangan agen · terjual**. 🔴 Name the collection for
on-field and sold before promising either number.

**📍 DATA MAP for that readout — traced 2026-08-26 21:1x, 3 of 4 columns are sourceable:**

| Column | Source | Verdict |
|---|---|---|
| **di gudang** | `artifacts/{appId}/users/{uid}/branches/{name}/inventory` — already live in `branchStock` (`useDatabaseSync.js:175`), keyed by branch name | ✅ loaded already |
| **di jalan** | `stock_requests` where `status==='IN_TRANSIT'` && `branch===name`, sum `fulfilledItems[].qty` — already live in RestockVaultView | ✅ loaded already |
| **di tangan agen** | `motorists/{id}.activeCanvas`, grouped by `motorists[].location` (that field IS the branch — `App.jsx:492`, `:4455`) | ✅ available, needs the roster list App.jsx already holds |
| **terjual** | `artifacts/{appId}/users/{uid}/transactions` | 🔴 **NO branch/location/region field on a transaction.** Cannot be split per warehouse directly. |

🔴 **The one real gap.** *Terjual per gudang* has to be derived by joining a transaction to its
agent and reading that agent's `.location`. **Confirm the transaction actually carries an agent id
before building the column** — if it does not, the honest move is to ship three columns and say why
the fourth is missing, never a number that cannot be sourced.

**Roster:** teams/agents live in `artifacts/{appId}/users/{uid}/motorists`, each with `.location`.
That is also the answer for *"every team registered on the fleet and roster have their own storage
option"* — Tujuan should list `[...new Set(motorists.map(m => m.location))]`, NOT the branches
derived from past `stock_requests`, which is what it uses today and which hides any team never
shipped to.

**Also queued:** Branch Manager redesign · split Stok Kritis + per-warehouse minimum · the four
inline `minStock` fallbacks.

**Where things live (new since 20:41)**
| Thing | Path |
|---|---|
| the Restock Vault page wrapper (one scrollbar) | `src/App.jsx:4424` |
| the rail, totem and capsule CSS | `src/styles/theme.css:1877-1971` |
| all 8 guards | `src/config/integration.audit.mjs` → group **53** |

⚠️ **The "L-CLICK / SCROLL / NAVIGATE" strip is NOT his app** — it is the Claude-in-Chrome overlay
drawn into his real Chrome while the extension is attached. Zero matches in the DOM. Never hunt it.


## 🟢 2026-08-26 20:54 — DATE CAPITALS, A DEAD `style` PROP, AND THE SIDEBAR VERDICT. `284602b`. **616/616.**

**NOW:** Restock Vault is done and driven live. Four commits today: `aea7de4` `4387c86` `390d5fa`
`284602b`. **Next build is the desk's 4th tab (Minta) — he answered the Active Pipeline question.**

**What just landed**
- **Date is `26 Agustus 2026`**, confirmed in the running app. The lowercase was recorded as *his*
  instruction from 16 Aug (*"use this date format 16 agustus 2026"*) — the comment had read his
  typing as the spec. It was the FORMAT that was the instruction. **Both messages now sit beside
  `BULAN` in `BiohazardTheme.jsx`** so nobody restores lowercase from the older one.
- 🔴 **A real bug, found sideways: the rail's `<nav>` had TWO `style` props.** JSX keeps only the
  LAST, silently — so `touchAction:'none'` never ran and the paragraph explaining why it mattered
  described a fix that was not there. Merged. **Nothing warns you about a duplicate prop.**
  Its check anchors on the class name: `/<nav[\s\S]*?>/` reports 0 props because the tag contains
  arrow functions and the scan stops at the `>` in `(e) => {`.
- **The "bottom panel" he asked me to delete is NOT his app.** Zero matches in the whole DOM — it is
  the Claude-in-Chrome overlay painted on my screenshots. Never tell him to look for it.

**🔴 WAITING ON ALDI — verbatim**

> "looks like the sidebar is gone bruh or maybe not visible here, check it"

**Checked, and it is NOT gone — but I could not finish the test.** On desktop it is deliberately a
**64px collapsed capsule** (his own 2026-08-14 design: *"a sidebar that shrink in to 1 button big
and when it hover it opens all the way"*). `[data-kpm-rail][data-kpm-rail]` (0,2,0) outranks
`.lg:relative` (0,1,0), so it stays `position:fixed; width:64px` under
`(min-width:1024px) and (hover:hover) and (pointer:fine)`. **The marks sit at x=-124 inside a box
that starts at 0 and clips**, and **synthetic hover never fired `:hover`** — so I cannot tell
whether the expand is broken or whether automation simply cannot trigger it.
**The question put to him:** *"does the sidebar open when you hover it on your screen?"*
🔴 **Do not rewrite the shell until he answers** — it has burned multiple sessions before.

**HIS QUEUE, verbatim, none of it built yet**

> "redesign the request panel as well or maybe just add it on the panel that we just made, just add
> extra tab for request"

**This ANSWERS the old Active Pipeline question** — it moves into the desk as a 4th tab (Minta),
carrying **"Siapkan Pengiriman"** (`BranchWarehouseManager.jsx:1350`), which is the only way HQ can
ship a request. Buku only reads.

> "make sure that every team registered on the fleet and roster have their own storage option"

Not started. 🔴 **Find where fleet/roster teams are registered first** — today Tujuan is derived from
`stockRequests[].branch`, i.e. only branches that have already been shipped to. A team with no
history is invisible.

> "for the global logistic command i want u to redesign that ... regional warehouse current stock,
> on field, sold as well just like what we have on the dashboard, so HQ know how many bks should be
> send to them again"

Shape agreed: per-warehouse **di gudang · di jalan · di tangan agen · terjual**.
🔴 **Name the collection for on-field and sold before promising either number.**

**Also queued:** Branch Manager redesign · split Stok Kritis + per-warehouse minimum · route the
four inline `minStock` fallbacks through the shared rule.

**Where things live (new since 19:0x)**
| Thing | Path |
|---|---|
| gallery-vs-camera tier rule | `src/config/permissions.js` → `canPickFromGallery` |
| the date table + both of his instructions | `src/components/BiohazardTheme.jsx` → `BULAN` |
| the rail nav (one style prop now) | `src/components/BiohazardTheme.jsx` → `.kpm-rail-grid` |
| all 8 guards | `src/config/integration.audit.mjs` → group **53** |


## 🟢 2026-08-26 20:41 — CAMERA-ONLY PHOTOS + THE NOTA UNBLOCKED. `390d5fa`. **615/615.**

**NOW:** Restock Vault is fully integrated and driven in the live app. Three commits today:
`aea7de4` (the surat jalan desk), `4387c86` (live verification), `390d5fa` (photo source + nota).
**Next build is the Global Logistics Command readout** — he asked for it explicitly.

**What just landed**
- **The nota was never broken.** He was on **Kirim**, where I had disabled it. A greyed control that
  never says why is the silence he calls a bug. Now live in both directions, reading `opsional` on
  the way out. Guarded by a check: `disabled={isOut}` may never come back.
- **Evidence photos are camera-only.** Both inputs spread `capture="environment"` unless
  `canPickFromGallery(userRole)` — **new helper in `src/config/permissions.js`**, beside
  `isFieldLevelTier`, reusing the same `translateLegacyRole` (that file's comment records that a
  second copy of the translation caused every tier bug so far). Verified across all six tiers:
  T1/T2/T3 gallery, **T4/T5/T6 camera only**, unknown role → camera.
- ⚠️ **`capture` is a request, not a lock.** Phones open the camera; desktop browsers ignore it and
  open a picker. Enforceable where photos are actually taken. Written down beside the helper.
- `App.jsx` now passes `userRole` to `RestockVaultView`.

**🔴 WAITING ON ALDI — his words, and mine, verbatim**

> "we dont need active pipeline panel anymore right"

**I pushed back with evidence and he has not answered.** Active Pipeline is NOT a duplicate of Buku:
it holds **"Siapkan Pengiriman"** (`BranchWarehouseManager.jsx:1350`), the button that opens the
fulfilment modal. **Buku only reads history; it cannot ship anything.** Delete the panel and HQ loses
the only way to answer a branch request. My proposal, still unanswered:

> "Active Pipeline stops being a history list and becomes a **short action queue** — only what's
> waiting on you (PENDING / DISPUTED), with the ship button. Everything settled disappears into Buku."

> "for the global logistic command i want u to redesign that make it more elegant and cool to show
> the regional warehouse current stock, on field, sold as well just like what we have on the
> dashboard, so HQ know how many bks should be send to them again"

**Approved by him, not yet built.** Shape agreed: per-warehouse **di gudang · di jalan · di tangan
agen · terjual**. 🔴 **Do this first:** confirm where *on-field* and *sold* actually live per branch
before promising a number. Do not source a figure you cannot name the collection for.

**✅ TEST HE STILL OWES:** reload and confirm the nota photo opens (it does on Kirim now).

**Also still queued:** Branch Manager redesign · build order step 1 (split Stok Kritis +
per-warehouse minimum) · route the four inline `minStock` fallbacks through the shared rule.

**Where things live (new this session)**
| Thing | Path |
|---|---|
| the surat jalan desk | `src/RestockVaultView.jsx` (rewritten) |
| gallery-vs-camera tier rule | `src/config/permissions.js` → `canPickFromGallery` |
| its 7 guards | `src/config/integration.audit.mjs` → group **53** |
| where HQ ships a request | `src/components/BranchWarehouseManager.jsx:1350` |
| the design story | A-Brain `66c5f30`, `Wiki/Concepts/Logistics and Stock Movement.md` |

⚠️ **Two traps found today.** Artifact pages on claude.ai **cannot be driven** — locked frame, no
input reaches them; serve the prototype from `public/` and delete it after. And **the nav rail sits
off-canvas at x=-124** in a 1463px window, so a screen has to be reached with
`document.querySelectorAll('button')` + `.click()`.


## 🟢 2026-08-26 ~19:0x — RESTOCK VAULT **INTEGRATED**. Committed `aea7de4`. Needs his eyes.

**The artifact is now the app.** `src/RestockVaultView.jsx` rewritten: Asal→Tujuan route with
searchable pickers, **Kirim (HQ push — new capability)**, flat Buku whose rows open into the whole
document + Proses timeline, batch as a column, live landed cost + price drift, evidence row
(foto/nota/resi+kurir), completeness meter, Target demoted to a strip, **every colour a token**.

**Full story is in the commit message `aea7de4`. Read that, not this.**

- `npm run build` green · **613 checks, 0 failures** (5 new in group 53).
- Delete-glyph count 14→13 — a migration (both deletes now say "Hapus"), with a paired check.
- **No firestore.rules change needed** — `stock_requests` already allows create for `isSalesman`.

✅ **DRIVEN IN THE LIVE APP, 2026-08-26 20:1x.** Vault opened, screen opened, all of it works on his
real data: two lines added, **drift printed `sama · SJ-568714`** under @ Landed, readout `Rp 7.500.000`
/ `Rp 7.500` per Bks, Kelengkapan 25%. **Buku showed 6 real records**; SJ-568714 opened into its whole
document + Proses (Dicatat → Barang dihitung 2.000 Bks lengkap → Masuk ke Master Vault, landed
Rp 9.038/Bks). Old rows read `UNASSIGNED` for batch — the honest fallback working. **Kirim** relabelled
itself, auto-picked **MUNTILAN**, hid cukai + upah, and switched the ware list to `di gudang N`.
**Kirim sekarang was NOT pressed** — it moves real stock; that one is his to press.
Only console errors are the pre-existing dev-server service-worker SSL warnings.

⚠️ **The nav rail sits off-canvas at x=-124 in a 1463px window** — nav buttons cannot be clicked by
mouse at this width. Reach a screen with `document.querySelectorAll('button')` + `.click()`.

⚠️ Artifact-viewer tabs on claude.ai **cannot be driven** — locked frame, no input reaches the page.
To test a prototype: copy it into `public/`, open `https://localhost:5173/<file>.html`, delete after.

## 🟠 2026-08-26 16:4x — RESTOCK VAULT v2. The route field. Vault has the whole story.

His question: *"where is the tujuan textbox tho?"* — and the answer explained the screen.
**Full write-up: A-Brain `66c5f30`, `Wiki/Concepts/Logistics and Stock Movement.md`.** Read that,
not this. Artifact (same URL, redeployed): `https://claude.ai/code/artifact/b7c1dd78-30f2-4061-a161-7cc08f4b52bf`

One-line version: **Tujuan was never there**, and every other field he asked for already exists —
just on the wrong half of the screen. Photo writes only from the branch screen, resi is outbound
only, nota is inbound only, and the factory's own SJ number has no field. So: **one form, two
directions**, Target demoted to a strip, its tab given to **Kirim**.

🔴 **VERIFICATION IS PARTIAL AGAIN — say so, do not round up.** Seen: dark mode, layout, the
Rp total on one line, the completeness meter computing live (proves the script runs clean).
**Not seen: any interaction, light mode, the Kirim tab.** Chrome's renderer froze on
`Page.captureScreenshot` twice, in two fresh tabs. **This is the second session in a row.**
The in-app Browser pane cannot substitute — it is not logged into claude.ai (401/403).


---

*Older entries trimmed — `git log -p .claude/PROGRESS.md` has every one of them.*
