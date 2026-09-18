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

/* 2026-09-18 evening — Stock Opname on the phone, four boards, undecided. `?shell&opname&look=…`
   (T5 count) and `?shell&opname&admin&look=…` (the boss). Delete when he answers. */
const C = '.biohazard-content ';
const OP_TYPE = `
  ${C}p[class*="text-[10px]"].font-mono{font-size:11px}
  ${C}h2.text-2xl.tracking-widest{font-size:20px;line-height:28px}
`;
/* board 1 — the counting card: title one line, every label 11, CLEAR AND COUNT AGAIN and UPLOAD
   PROOF 44, SUBMIT TO HQ on one line */
const OP_1 = OP_TYPE + `
  ${C}div[class*="text-[10px]"].font-mono{font-size:11px}
  ${C}label>span[class*="text-[10px]"]{font-size:11px}
  ${C}div.grid.gap-px>div>div[class*="text-[9px]"]{font-size:11px}
  ${C}button[class*="min-h-[40px]"]{min-height:44px;font-size:11px}
  ${C}label.cursor-pointer.border-dashed{min-height:44px;font-size:11px}
  ${C}span[class*="text-[9px]"].font-mono{font-size:11px}
  ${C}button.px-8{padding-left:1rem;padding-right:1rem}
  ${C}div.flex.w-full.gap-3>button:first-child{flex:0 0 auto}
`;
/* board 2 — the kinds-of-damage reel: A the two arrows become 44 px keys (the row grows to 92),
   B the arrows go and the face itself is the key (tap = next kind) */
const OP_2A = `
  ${C}.kpm-dmg-win{--dmg-row:92px}
  ${C}.kpm-dmg-face>button{align-self:stretch}
  ${C}.kpm-dmg-face input{width:64px;height:44px;font-size:16px}
  ${C}.kpm-dmg-win+div.flex-col>button{width:44px;font-size:14px}
`;
const OP_2B = `
  ${C}.kpm-dmg-win+div.flex-col{display:none}
  ${C}.kpm-dmg-face>button{align-self:stretch}
  ${C}.kpm-dmg-face input{width:64px;height:44px;font-size:16px}
`;
/* board 3 — the boss's four tabs: A two rows of two keys, B one row of four squeezed */
const OP_STRIP = `${C}div.overflow-x-auto.rounded-lg.p-1`;
const OP_3A = `
  ${OP_STRIP}{display:grid;grid-template-columns:1fr 1fr;gap:4px;overflow:visible}
  ${OP_STRIP}>button{justify-content:center;min-height:44px;font-size:11px;padding:0 8px}
`;
const OP_3B = `
  ${OP_STRIP}{overflow:visible}
  ${OP_STRIP}>button{flex:1 1 0;min-width:0;justify-content:center;min-height:44px;font-size:11px;padding:0 2px;gap:3px;letter-spacing:.02em}
  ${OP_STRIP}>button>svg{display:none}
`;
/* board 4 — the boss's lists: the three pickers 44 tall, 11 px everywhere, names and the
   quarantine line wrap instead of clipping */
const OP_4 = OP_TYPE + `
  ${C}select{min-height:44px}
  ${C}[class*="text-[10px]"],${C}[class*="text-[9px]"]{font-size:11px}
  ${C}span.truncate.text-xs{white-space:normal;overflow:visible}
  ${C}div.flex.items-center.gap-3.mt-1.font-mono{flex-wrap:wrap;row-gap:2px}
`;

/* `?look=a,b` — comma-separated names, injected after the app's stylesheet like ?css= */
export const LOOKS = { pin: PIN, 'op-1': OP_1, 'op-2a': OP_1 + OP_2A, 'op-2b': OP_1 + OP_2B, 'op-3a': OP_4 + OP_3A, 'op-3b': OP_4 + OP_3B, 'op-4': OP_4 };
