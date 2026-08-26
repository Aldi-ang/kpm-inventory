# PROGRESS — read this, search for nothing

**Updated: 2026-08-26 20:41 WIB (🟠 KPM app session)** · ✅ **RESTOCK VAULT DONE + DRIVEN LIVE** — `aea7de4` `4387c86` `390d5fa`, build green, **615/615** · 🔴 **NEXT: Global Logistics Command readout.** One open question below. · branch `phase0-solid-ground`

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

## 🟠 2026-08-26 15:5x — RESTOCK VAULT REDESIGN. Artifact shipped, partly verified.

**Artifact:** `https://claude.ai/code/artifact/b7c1dd78-30f2-4061-a161-7cc08f4b52bf` — **"Surat Jalan"**.
His instruction: *"design restock vault first we can move on on the branch manager later"*.

**The finding that framed it:** his own code numbers every intake `SJ-######` — **surat jalan**. The
screen just never looked like one. So the redesign makes the document the layout.

**Measured against `src/RestockVaultView.jsx` (1 097 lines)**
- **0 theme tokens.** 58 × `text-white`, 17 raw Tailwind colours, 32 `bg-black/xx`. Branch Manager
  is the same: 0 tokens, 27 × `text-white`, 37 washes. **These two are the last unmigrated screens
  in the app** — that is why he dislikes them, and why "change the colour" does NOT mean the
  palette law changes.
- **Three modes, three DIFFERENT nav bars.** Intake→[Targets][Master Ledger] · Ledger→[Targets]
  [New Entry] · Targets→[Set Target][Ledger][New Entry]. Same destinations, moved and renamed.
- Landed cost is last on the screen; history needs **3 clicks** (year→month→date) before anything
  shows; `bg-orange` slabs + a `from-gold to-gold` gradient (amber-as-fill, twice over).

**The redesign:** one nav (Masuk · Buku · Target) fixed in place with counts · document order
(header → lines → costs) · **batch as a column** · **landed cost live per pack as you type** ·
flat book filtered by direction instead of a date drill · every colour a token.

⚠️ **TWO BUGS I SHIPPED AND FIXED, both caught by looking:**
1. `.body{display:grid}` **outranks the UA sheet's `[hidden]{display:none}`** — all three tabs
   rendered stacked. Fixed with `.body[hidden]{display:none}`. **Worth remembering for the real
   app**, which uses the same pattern.
2. `Rp 2.420.000` wrapped across two lines in the total cell. Fixed with `nowrap` + wider basis.

🔴 **VERIFICATION IS PARTIAL — do not claim otherwise.** Seen with my own eyes: dark mode, the
whole prototype shell, and the stacking bug before/after. **NOT seen on the fixed build:** the
click-to-add interaction, the no-wrap total, and light mode. Chrome's renderer began timing out on
`Page.captureScreenshot` and stopped responding to scroll. Those three need one look.



## 🟠 2026-08-26 15:0x — THE LOGISTICS AUDIT + REDESIGN. Artifact published and verified.

**Artifact:** `https://claude.ai/code/artifact/dab76630-8f26-402b-8a41-f6dad8049000` — "Ark Lab
Logistics". Rendered in **dark, light AND Lite Mode** before claiming it (screenshots taken).
Design stack loaded per SKILL.md §1a: his taste file + Design Inspiration Sources + `impeccable`
(audit) + `redesign-skill` + `taste-skill` + `emil-design-eng` + `artifact-design`.
**Dropped `ui-ux-pro-max`** — it is palette/font LOOKUP data and the palette here is locked by law,
so there was nothing for it to decide. Said so out loud, per the §1a clash order.

**The four answers, all read from code with file:line**
- **ADD:** a cause on damaged units (`BranchWarehouseManager.jsx:534` writes a bare int) · its own
  minimum + own Stok Kritis (`App.jsx:1296`) · carry `batchNo` (**0 occurrences** in the branch
  screen) · age flag on uncollected `IN_TRANSIT` · an HQ send entry point.
- **BROKEN:** 🔴 **"low stock" means FOUR different things** — three files say 50,
  `StockOpnameView.jsx:1003` says **5** · `MapMissionControl.jsx:1551`/`:1553` `getDoc` unimported
  inside try/catch, silent for months · 3 screens re-open branch listeners · over-ship guard reads
  a pre-upload copy.
- **MORE WORKFLOW? NO.** The 5 states are right. Missing = a door in, a window on the middle
  state, a cause field. A 2nd collection = two inboxes for the branch.
- **REDESIGN:** *one waybill, two directions*. Three reusable parts — **Transit Strip**,
  **Count Sheet** (blind), **Waybill Row** (lamp/route/age).

⚠️ **I CORRECTED MYSELF:** in-transit is NOT "summed nowhere" — `BranchWarehouseManager.jsx:1145`
already shows Di gudang / Di jalan / Keluar per product with a lead-time warning. Only the
**company-wide** figure at HQ is missing. Correction written into the vault in place.

⚠️ **Two mistakes I made and fixed this session, both caught by reading the commit stat:**
1. An append anchored on a heading that lives in the OTHER logistics note → the "audit saved"
   commit contained only a timestamp. Re-done against a real anchor, grep-verified before commit.
2. `graphify update Wiki` rewrites the ROOT `manifest.json` as a side effect, so the new Stop hook
   dirtied ~2,200 lines of a stale graph every session. **Root `graphify-out/` is now untracked**
   (files kept on disk, history intact). A-Brain `8f72f6f` + the follow-up.

🔴 **STILL UNANSWERED BY HIM:** the haiku model line (`settings.json:7`) that kills `WebSearch` ·
the broken `ask` guard path on SKILL.md · whether to commit this repo's new Stop-hook line.



## 🟠 2026-08-26 14:1x — ALUCARD'S MEMORY WAS BROKEN. FIXED AND VERIFIED. No app code touched.

**Why this came first:** he asked why alucard answered a logistics question from cold knowledge
while researched notes sat in the vault. *"i want my brain recall and my agentic agent alucard to
work"*. Three separate breaks, all measured before anything changed:

1. A-Brain's graph was built **2026-08-13** and never refreshed — 13 days of notes invisible.
2. `graphify query "logistic"` → **"No matching nodes found."** Rebuilding at the vault ROOT made
   it worse: it swallowed the 1,200-skill `Skills-Library/`, 1,778 → **67,224 nodes, 71 MB**, and
   answered "Eight Warehouse Gaps" with a **ransomware tabletop template**.
3. **Nothing was TITLED with his word.** Graphify matches node NAMES, not meaning.

**Fixed:**
- Recall graph scoped to **`Wiki/` alone** — 629 nodes, 8s, no LLM. `warehouse` → The Eight
  Warehouse Gaps · `permission tier` → Tier System + Fleet Captain Permission Gap ·
  **Skills-Library leakage = 0**. Polluted root graph restored from `ad3eec8`.
- **`A-Brain/automation/wiki-graph-refresh.mjs`** on the **Stop** hook — rebuilds only when a note
  changed. ⚠️ v1 used `graph.json`'s mtime and fired forever, because graphify caches by CONTENT
  and leaves the file alone when nothing changed; it stamps `.last-refresh` itself now. Falsified
  4 ways (stale→rebuild, current→silent, touch→rebuild, →silent).
- New hub **`Wiki/Concepts/Logistics and Stock Movement.md`** — the general repair: when a topic
  returns nothing, write a hub note, do NOT add a rule.
- `SKILL.md`: §2 now carries ONE topic-agnostic memory-query rule (his correction: *"alucard is
  not only use for logistic so pulling logistic knowledge everytime will not worth doing"*), and
  §11a's four A-Brain triggers became **five** — research/brainstorm counts **even with no
  decision yet**. My earlier hardcoded topic→file row was reverted.

⚠️ **`.claude/settings.json` (this repo) has the new Stop hook and is UNCOMMITTED** — his call.
⚠️ **Web research is dead:** `settings.json:7` points haiku at `cc/claude-haiku-4-5-20251001`,
which this account cannot reach, and `WebSearch`/`WebFetch` both run on it. He has not answered.


---

*Older entries trimmed 2026-08-26 20:41 — `git log -p .claude/PROGRESS.md` has every one of them.*
