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

/* 2026-09-18 21:45: the Stock Opname looks (op-1..op-8 — the count card, the damage reel, the
   boss's tabs, the audit item, the nixie counter) are all decided and shipped into
   StockOpnameView.jsx, theme.css and components/NixieCount.jsx (kpm f72ef35 + the nixie commit).
   Gone. `?shell&opname&tab=count:400/3,3%20damaged` and `?shell&opname&admin&tab=hq%20audits,bandung`
   still open the real screen inside the shell. */

/* 2026-09-19: Journey Plan on the phone — three candidates, none decided. Every rule sits under
   max-width 1023 (the screen keeps its own lg: layout on the desk) and is scoped to the tag.
   jp-floor = the sizes and the sideways fix (pickers 44 / 11 px, the desk column rule gone, the
   legend + map keys 44, the crumb inside the page, the sector reel wraps, the card keys 44, the
   name whole, the address 11). jp-fold = the MISSION FEED card folds to one row on the phone.
   jp-card = the store card loses its tool bar and its 96 px NO INTEL band; a ⋯ key by the name. */
const JP = 'div.space-y-6.font-mono';
export const JP_FLOOR = `@media (max-width:1023px){
${JP} div.flex-1.min-w-\\[200px\\].border-r{border-right:0;padding-right:0}
${JP} div.flex-1.min-w-\\[200px\\] > div.flex.gap-2.w-full{flex-direction:column}
${JP} div.flex-1.min-w-\\[200px\\] select{min-height:44px;font-size:11px}
${JP} div.flex.items-center.flex-1.bg-black{min-height:44px;padding:0 6px}
${JP} div.flex.items-center.flex-1.bg-black > select{min-height:44px;font-size:11px}
${JP} div.w-max.flex-wrap > button{min-height:44px}
${JP} > div.bg-black\\/40.p-5{padding:12px}
${JP} div.bg-black\\/20.p-5.rounded-3xl{padding:12px}
${JP} label.text-\\[10px\\],${JP} span.text-\\[10px\\],${JP} div.text-\\[10px\\],${JP} p.text-\\[10px\\]{font-size:11px}
${JP} button.rounded-xl.p-2\\.5{min-height:44px;min-width:44px}
${JP} div.w-max.flex-wrap{width:auto;max-width:100%}
${JP} div.overflow-x-auto.hide-scrollbar{flex-wrap:wrap;overflow:visible;margin:0;padding:0 0 8px}
${JP} div.overflow-x-auto.hide-scrollbar > *{flex:1 1 calc(50% - 6px);min-width:0}
${JP} button.w-6.h-6{width:44px;height:44px}
${JP} div.bg-black.border-b.p-1\\.5 > select{min-height:44px}
${JP} h3.truncate{white-space:normal;overflow:visible;text-overflow:clip}
${JP} p.line-clamp-2{font-size:11px}
${JP} button.py-3{min-height:44px}
}`;
export const JP_FOLD = `@media (max-width:1023px){
${JP} > div.bg-black\\/40.p-5{padding:10px 12px}
${JP} > div.bg-black\\/40.p-5 > div.flex.flex-col.lg\\:flex-row{margin-bottom:0}
${JP} h2.text-2xl{font-size:13px;min-height:44px;margin-bottom:4px;letter-spacing:.14em;white-space:nowrap;gap:8px}
${JP} h2.text-2xl > svg{width:20px;height:20px;animation:none}
${JP} h2.text-2xl::after{content:"SATURDAY · ALL ▾";margin-left:auto;font-size:11px;color:#94a3b8;letter-spacing:.1em}
${JP} div.bg-slate-900\\/60.p-4{display:none}
}`;
export const JP_CARD = `@media (max-width:1023px){
${JP} div.bg-black.border-b.p-1\\.5{display:none}
${JP} div.h-24.bg-black.shrink-0{height:auto;min-height:44px}
${JP} div.h-24.bg-black.shrink-0 > div.w-full.h-full{display:none}
${JP} div.h-24.bg-black.shrink-0 > div.absolute.top-2.left-2{position:static;flex-direction:row;flex-wrap:wrap;align-items:center;min-height:44px;padding:6px 8px;gap:6px}
${JP} h3.font-black.text-base{display:flex;align-items:center;gap:8px}
${JP} h3.font-black.text-base::after{content:"⋯";margin-left:auto;flex:none;width:44px;height:44px;display:flex;align-items:center;justify-content:center;border:1px solid #3a342c;border-radius:10px;font-size:22px;color:#d08a2e}
}`;

/* `?look=a,b` — comma-separated names, injected after the app's stylesheet like ?css= */
export const LOOKS = { pin: PIN, 'jp-floor': JP_FLOOR, 'jp-fold': JP_FOLD, 'jp-card': JP_CARD };
