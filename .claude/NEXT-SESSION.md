# NEXT SESSION — read this, then `.claude/PROGRESS.md`. Read no code to orient.

**Written 2026-08-31 08:30 WIB. 667/667 audit · 915/915 selfcheck. Branch `phase0-solid-ground`,
tree clean at `e5d7e76`.**

## First command

```
npm run build; node src/config/integration.audit.mjs; node src/config/logicFixes.selfcheck.mjs
```

PowerShell: `;` not `&&`. **Quote BOTH numbers in every report.**

---

## 🔴 THE ONE JOB — the tutorial caption lands on top of what it explains, on a phone

**Not a guess. Six frames at 375px prove it**, shot through `tools/ponder-lab.jsx` on 2026-08-31.
Desktop is fine at every width tried, including 1440. The phone is where it breaks.

| Scene · beat | What the frame shows at 375px |
|---|---|
| product-performance 5 · Revenue | caption covers the column header and half the warning banner |
| product-performance 6 · Share | covers the header; the Share column is off-screen entirely |
| product-performance 8 · Cello Kopi | caption ~90% below the visible edge, unreadable |
| product-performance 9 · Total | caption fully off-screen, nothing visible |
| product-performance 11 · missing months | covers the exact banner it is describing |
| stock-by-warehouse 7 · Sold (7d) | covers the first warehouse row it is pointing at |

**Scope: 36 `near` beats across four scenes** — `stock-by-warehouse` 18 · `goods-received` 10 ·
`product-performance` 5 · `shipment-plan` 3. Every one is a candidate.

**The suspect line, and it is one line.** `src/ponder/PonderOverlay.jsx:328`:

```js
top: below ? spot.y + spot.h + PAD + GAP : spot.y - PAD - GAP - boxH,
```

That `top` is returned RAW. The beside-branch eight lines above it does
`const top = clampY(cy - boxH / 2)` — same function, same `useMemo`, clamped. The comment at line
287 says the box "gets clamped inside the stage", which is true of one branch and not the other.

**Do not patch it blind. The measurement first:** the stage (`wrapRef`) has `overflow-auto`, and
line 219 calls `scrollIntoView` on the target, so `spot.y` may be in SCROLLED content coordinates
while `H = wrap.clientHeight` is the visible height. If the wrap really scrolls on a phone, a plain
`clampY(top)` clamps into content space and moves the caption to the wrong place instead of the
right one. **Read `wrap.scrollTop` and `wrap.scrollHeight` in the running lab before editing** —
`javascript_tool` on the pane, one line, settles which fix is correct.

**Aldi was asked to choose and had not answered when this was written:**

> **A) Fix the engine** — one line in `PonderOverlay.jsx`, fixes all 36 beats in every scene.
> Re-shoot every scene on both sizes afterwards, because it moves desktop captions too.
> **B) Fix this scene only** — five beats from `near` to `bottom` in `product-performance.js`.
> Ten minutes, but leaves Stock by Warehouse's 18 beats broken on the phone.

If he has answered, do that. If he has not, **ask before writing code** — it is his call, and A
touches every tutorial in the app.

**The check this needs, whichever way it goes:** a beat's caption box must never overlap its own
highlighted spot, and must sit fully inside the stage. That is an assertion about geometry, so it
belongs in the lab as a `?probe`-style measurement, not as a string match in the audit.

---

## How to look at any of this

```
npx vite build --config tools/ponder-lab.config.mjs
python -m http.server 4187 -d dist-ponderlab
```

Then `preview_start` on `http://localhost:4187/tools/ponder-lab.html`, and `resize_window` to
`mobile` for the 375px case. **Reset to `desktop` when finished** — the emulation is sticky.

| Slice | URL |
|---|---|
| Any beat, frozen | `?scene=<id>&step=N` — **`step` is 0-based, the counter on screen is 1-based** |
| Product Performance panel, loading | `?perf` |
| ” , failed read | `?perf=failed` |
| Sebaran Stok · Rencana Kirim | `?minkirim` · `?plan` |
| Light · Lite Mode | add `&light` · `&lite` |

**Write screenshots to the scratchpad, never the repo root — Chrome gets `Access is denied` there.**

---

## 🔴 THE QUOTA METER IS BLIND, AND ONLY ALDI CAN FIX IT

`.claude/plan-quota.mjs` is wired as a UserPromptSubmit hook and it is correct: it warns at 70%,
tells the session to finish up at 85%, and at 95% it prints a full STOP with the note-writing order
Aldi asked for. **It has never once run past its second line.** `9router-claude-id.txt` and
`9router-cookie.txt` in `C:/Users/ASUS/` are both MISSING, and the hook exits silently when the id
is absent. That is why the 2026-08-30 session ran to 95% with nobody saying anything.

Until he creates those two files, **there is no 5-hour quota meter at all** — `[context-watch]`
measures the context window, which is a different thing entirely and `/clear` only helps that one.

**So the notes cannot wait for a warning that will not come.** Write `NEXT-SESSION.md` and then
`PROGRESS.md` right after the FIRST commit of the session, and update them as work lands.

<details>
<summary>Queued behind this — do not start these</summary>

- **G1 + G2, his own doc calls it the money item.** Batch identity dies at the HQ door (`batchNo`
  captured at intake, never copied onto `branches/{loc}/inventory`), and nothing enforces
  oldest-ships-first — age is displayed only.
- **G5** — inventory accuracy and shrinkage never calculated, though the raw numbers exist.
- **G4** — records joined by name, not id. A spelling fix silently splits one product into two.
- **Redesign `BranchWarehouseManager` into Duke's Ledger.** A look job, not a correctness one.
- **Untested by anyone: Siapkan Pengiriman and the shipping modal.**
- **He must still press Rebuild sales totals once** — Settings › Company · 07. Until he does,
  every month before 2026-08-30 is empty and Product Performance correctly says so.

</details>

**Before you finish: rewrite this file with the next single job.**
