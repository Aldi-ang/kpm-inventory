/* LAB ONLY — proposal CSS behind short names, so a board option can be opened LIVE as
   `?shell&customers&look=cust-a` instead of a 6 KB ?css= link. Each entry is a candidate Aldi has
   not decided on yet; when one ships, its rules move into the component and the entry is deleted.
   2026-09-18: the Customers look, the Quarantine badge and the competitor table were decided (all B)
   and shipped as .kpm-key / .kpm-well / .kpm-stamp / .kpm-plate / .kpm-led in theme.css — their
   entries are gone from here. Only the 375 pin remains. */
export const PIN = '#root{width:375px}';

/* 2026-09-18 later: the EOD Setoran deck (board 1 YES) and count rows (board 2 B) were decided the
   same morning and shipped into EODCardDeck.jsx — their entries are gone from here too. */

/* 2026-09-18 16:40: the Customers round-two candidates (the boss's header fold, the ⋯ strip, the
   charge line) were decided A / A / A and shipped into CustomerManager.jsx + theme.css — gone.
   When a look needs the HELD state of a row for a still, `&held` puts `lab-held` on the first
   .kpm-key; write the look against `.kpm-key:active, .kpm-key.lab-held`. */

/* 2026-09-18 19:10: the Stock Opname floor (title, 11 px, 44 px, the 2x2 tabs, the 92 px reel row,
   the pickers) is SHIPPED (kpm f72ef35) — op-1..op-4 are gone. What is left undecided is the
   PRESENTATION he refused: the counting card ("too much red, no animation or effect") and the
   boss's audit item ("too compact in a small space"). `?shell&opname&look=op-5a|op-5b` with
   `&tab=count:400/3,3%20damaged`, and `?shell&opname&admin&look=op-6a|op-6b` with
   `&tab=hq%20audits,bandung`. Stills only — the motion is described in the caption. */
const C = '.biohazard-content ';
const K = `${C}div.relative.overflow-hidden.rounded-xl[class*="bg-[var(--raised)]"]`;   /* one counting card (the list box around them is --sunk) */
const PLATE = 'linear-gradient(180deg, rgba(255,255,255,.3) 0 1px, transparent 1px, transparent calc(100% - 2px), rgba(0,0,0,.28) calc(100% - 2px))';
/* the red reduction both count-card options share: a first-pass difference is a REQUEST to count
   again (amber), red waits for a confirmed difference or a refused submit; "expected damaged" is
   just a number; the BLIND COUNT badge is a status, not an alarm */
const OP_5_BASE = `
  ${K}[class*="border-[var(--danger)]"]{border-color:var(--accent-edge)}
  ${K}>span.w-1[class*="bg-[var(--danger)]"]{background:var(--accent-edge)}
  ${K} div.grid.gap-px>div[class*="border-[var(--danger)]"]{border-color:var(--accent-edge)}
  ${K} div.grid.gap-px>div:nth-child(2)>div:first-child{color:var(--ink-dim)}
  ${K} div.grid.gap-px>div:nth-child(2)>div:last-child{color:var(--ink)}
  ${K} div.grid.gap-px>div:nth-child(4)>div{color:var(--accent-ink)}
  ${K} div.p-3.rounded-lg[class*="border-[var(--danger)]"]{border-color:var(--accent-edge)}
  ${K} div.p-3.rounded-lg span[class*="text-[var(--danger-ink)]"]{color:var(--ink)}
  ${K} div.p-3.rounded-lg span>span.font-black{color:var(--accent-ink)}
  ${K} button[class*="min-h-11 lg:min-h-[40px]"]{border-color:var(--accent-edge);color:var(--accent-ink);background:transparent;letter-spacing:.12em}
  ${K} label.cursor-pointer{border-style:solid;border-color:var(--line-2);color:var(--ink-muted)}
  ${K} button[aria-expanded][class*="border-[var(--danger)]"]{border-color:var(--accent-edge);color:var(--accent-ink)}
  ${K} button[aria-expanded] span[class*="text-[var(--danger-ink)]"]{color:var(--accent-ink)}
  ${C}span[class*="bg-[var(--danger-well)]"]{background:transparent;border-color:var(--accent-edge);color:var(--accent-ink)}
`;
/* A — the plates get the control system's top light, the DIFFERENCE is an LED window (rolling
   digits when the figure changes; the lamp amber until the count is confirmed), and the whole
   verdict block slides open under the boxes on the first typed number (grid-rows fold) */
const OP_5A = OP_5_BASE + `
  ${K} div.grid.gap-px>div{background-image:${PLATE}}
  ${K} div.grid.gap-px>div:nth-child(4)>div:last-child{display:inline-flex;align-items:center;justify-content:center;position:relative;min-width:64px;height:24px;margin-top:2px;padding:0 8px 0 18px;background:#000;color:var(--led-ink);border:1px solid var(--line-2);border-radius:3px;font-size:15px;letter-spacing:.06em}
  ${K} div.grid.gap-px>div:nth-child(4)>div:last-child::before{content:"";position:absolute;left:6px;top:50%;width:5px;height:5px;margin-top:-2.5px;border-radius:50%;background:var(--amber)}
`;
/* B — no bar and no coloured edge on the card at all; the verdict is ONE stamp in the corner
   (COUNT AGAIN / MATCH / DIFFERENCE −17) that drops onto the card, the plates stay plain */
const OP_5B = OP_5_BASE + `
  ${K}{border-color:var(--line) !important}
  ${K}>span.w-1{display:none}
  ${K}:not([class*="border-[var(--line)]"])::after{content:"COUNT AGAIN";position:absolute;right:12px;top:12px;font:800 11px/1 var(--font-mono);letter-spacing:.14em;padding:5px 8px;border:1px solid var(--accent-edge);color:var(--accent-ink);border-radius:4px;background:var(--inset)}
  ${K} div.grid.gap-px>div:nth-child(4){border-color:transparent}
  ${K} div.grid.gap-px>div:nth-child(4)>div{color:var(--ink)}
`;

/* the boss's audit item — TODAY packs the name, SYS → FND and the difference into one line */
const I = `${C}div.flex.flex-col.p-3.rounded-lg`;                 /* one item in the itemized report */
const OP_6_BASE = `
  ${I}{padding:16px}
  ${I}>div.justify-between.border-b{flex-direction:column;align-items:stretch;gap:10px;border-bottom:0;padding-bottom:0;margin-bottom:12px}
  ${I} span.text-xs.uppercase{font-size:14px}
  ${I}>div.flex.flex-wrap.gap-1\\.5{gap:6px;margin-bottom:12px}
  ${I}>div.flex.gap-4.items-center{flex-direction:column;align-items:stretch;gap:6px}
  ${I}>div.flex.gap-4.items-center>div{padding:10px 12px;font-size:12px}
  ${I}>div.mt-2{margin-top:12px}
`;
/* A — three plates, the same language the salesman's card speaks: EXPECTED · FOUND · DIFFERENCE */
const OP_6A = OP_6_BASE + `
  ${I} div.gap-4.font-mono{display:grid;grid-template-columns:1fr 1fr 1fr;gap:1px;background:var(--line);border-radius:8px;overflow:hidden}
  ${I} div.gap-4.font-mono>span{background:var(--sunk);background-image:${PLATE};padding:8px 4px;text-align:center;font-size:16px;font-weight:900;width:auto}
  ${I} div.gap-4.font-mono>span:nth-child(2){display:none}
  ${I} div.gap-4.font-mono>span:first-child,${I} div.gap-4.font-mono>span:nth-child(3){color:var(--ink)}
`;
/* B — the verdict leads: the difference is the big figure, the two counts follow it small */
const OP_6B = OP_6_BASE + `
  ${I} div.gap-4.font-mono{display:flex;align-items:baseline;gap:12px}
  ${I} div.gap-4.font-mono>span.w-12{order:-1;width:auto;text-align:left;font-size:28px;line-height:1}
  ${I} div.gap-4.font-mono>span{font-size:12px}
`;

/* `?look=a,b` — comma-separated names, injected after the app's stylesheet like ?css= */
export const LOOKS = { pin: PIN, 'op-5a': OP_5A, 'op-5b': OP_5B, 'op-6a': OP_6A, 'op-6b': OP_6B };
