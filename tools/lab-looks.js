/* LAB ONLY — proposal CSS behind short names, so a board option can be opened LIVE as
   `?shell&customers&look=cust-a` instead of a 6 KB ?css= link. Each entry is a candidate Aldi has
   not decided on yet; when one ships, its rules move into the component and the entry is deleted.
   2026-09-18: the Customers look, the Quarantine badge and the competitor table were decided (all B)
   and shipped as .kpm-key / .kpm-well / .kpm-stamp / .kpm-plate / .kpm-led in theme.css — their
   entries are gone from here. Only the 375 pin remains. */
export const PIN = '#root{width:375px}';

/* 2026-09-18 later: the EOD Setoran deck (board 1 YES) and count rows (board 2 B) were decided the
   same morning and shipped into EODCardDeck.jsx — their entries are gone from here too. */

/* Customers on the phone, round two (2026-09-18, his four asks) — candidates, none decided.
   The boss's header: the three admin tools sit beside the title in one row and run 146 px past
   the edge (the "customer page moves sideways"). hdr-a folds them behind one ADMIN TOOLS row
   under the gold bar (hdr-a-open shows them unfolded); hdr-b lays them as three tiles.
   The folder row's DEL / EDIT: acts-a hides them behind a ⋯ key at the right (acts-a-open shows
   the strip that unfolds under the row). The hold: hold-a draws an amber charge line along the
   bottom edge while held; hold-b fills the icon well from the bottom like a gauge. Both leave the
   lamp black (the lamp is the ponder pad's signal, his "repetitive"). */
const ROOT = '.biohazard-content [class*="max-w-5xl"]';
const HDR = `${ROOT} > div:first-child`;
const HDR_COMMON =
  `${ROOT}{display:flex;flex-direction:column}` +
  `${HDR}{display:contents}` +
  `${HDR} > h2{order:0}` +
  `${ROOT} > button.kpm-plate{order:1;margin-top:16px}` +
  `${HDR} > div.flex.gap-2{order:2;margin-top:12px}` +
  `${ROOT} > div:nth-child(n+3){order:3}` +
  `${HDR} > div.flex.gap-2 > *{background:var(--raised);border:1px solid var(--line-2);color:var(--ink);box-shadow:none}`;
const TOOLS_ROW = (arrow, edge) =>
  `${HDR} > div.flex.gap-2::before{content:"⚙  ADMIN TOOLS  ${arrow}";display:flex;align-items:center;justify-content:center;min-height:44px;border:1px solid ${edge};border-radius:12px;background:var(--raised);color:var(--ink);font-size:12px;font-weight:800;letter-spacing:.15em;text-transform:uppercase}`;
const HDR_A = HDR_COMMON + `${HDR} > div.flex.gap-2{display:block}` + TOOLS_ROW('▾', 'var(--line-2)') +
  `${HDR} > div.flex.gap-2 > *{display:none}`;
const HDR_A_OPEN = HDR_COMMON + `${HDR} > div.flex.gap-2{display:block}` + TOOLS_ROW('▴', 'var(--accent-edge)') +
  `${HDR} > div.flex.gap-2 > *{display:flex;width:100%;min-height:44px;margin-top:8px;justify-content:center;font-size:12px;letter-spacing:.12em;border-radius:12px}`;
const HDR_B = HDR_COMMON +
  `${HDR} > div.flex.gap-2{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}` +
  `${HDR} > div.flex.gap-2 > *{flex-direction:column;gap:4px;min-height:56px;padding:6px 4px;font-size:10px;letter-spacing:.08em;text-align:center;justify-content:center;border-radius:10px}`;
const KEY = `${ROOT} .kpm-key.kpm-hot`;
const DOTS = (edge, ink) =>
  `${KEY} > div:first-child::before{content:"⋯";position:absolute;right:12px;top:50%;translate:0 -50%;width:44px;height:44px;border:1px solid ${edge};border-radius:10px;background:var(--inset);color:${ink};font-size:22px;line-height:42px;text-align:center}` +
  `${KEY} > h3, ${KEY} > p{padding-right:56px}`;
const ACTS_A = DOTS('var(--line-2)', 'var(--ink-dim)') + `${KEY} div.flex.gap-1{display:none}`;
const ACTS_A_OPEN = DOTS('var(--accent-edge)', 'var(--accent-ink)') + `${KEY} > div:first-child::before{top:14px;translate:none}` +
  `${KEY}{padding-bottom:70px !important}` +
  `${KEY} div.flex.gap-1{position:absolute;left:12px;right:12px;bottom:10px;display:flex;gap:8px;border-top:1px solid var(--line-2);padding-top:10px}` +
  `${KEY} div.flex.gap-1 > button{display:flex;flex:1;min-height:44px;justify-content:center;font-size:12px;border-radius:10px;background:var(--raised)}` +
  `${KEY} div.flex.gap-1 > button:first-child{border-color:var(--danger);color:var(--danger-ink)}`;
/* the held row: `:active` on the phone, `.lab-held` for the still */
const HELD = `${ROOT} .kpm-key:active, ${ROOT} .kpm-key.lab-held`;
const HOLD_COMMON = `${HELD} .kpm-well::after{background:#000;border-color:var(--line-2)}`;
const HOLD_A = HOLD_COMMON +
  `${ROOT} .kpm-key{background-image:linear-gradient(90deg,var(--amber),var(--amber)),linear-gradient(180deg,color-mix(in srgb,var(--ink) 12%,transparent) 0 1px,transparent 1px),linear-gradient(180deg,color-mix(in srgb,var(--raised) 88%,var(--gold) 12%) 0,var(--raised) 56px);background-repeat:no-repeat;background-size:0% 3px,100% 100%,100% 100%;background-position:left bottom,0 0,0 0;transition:translate 120ms ease-out,border-color 160ms ease-out,border-bottom-width 120ms ease-out,background-size 360ms cubic-bezier(.2,.8,.2,1)}` +
  `${HELD}{background-size:100% 3px,100% 100%,100% 100%}`;
const HOLD_B = HOLD_COMMON +
  `${ROOT} .kpm-well{background-image:linear-gradient(var(--amber),var(--amber)),linear-gradient(180deg,rgba(0,0,0,.45) 0,transparent 55%,color-mix(in srgb,var(--ink) 8%,transparent) 100%);background-repeat:no-repeat;background-size:100% 0%,100% 100%;background-position:left bottom,0 0;transition:background-size 300ms cubic-bezier(.2,.8,.2,1),color 200ms ease-out}` +
  `${HELD} .kpm-well{background-size:100% 100%,100% 100%;color:var(--gold-ink)}`;

/* `?look=a,b` — comma-separated names, injected after the app's stylesheet like ?css= */
export const LOOKS = {
  pin: PIN,
  'hdr-a': HDR_A, 'hdr-a-open': HDR_A_OPEN, 'hdr-b': HDR_B,
  'acts-a': ACTS_A, 'acts-a-open': ACTS_A_OPEN, 'acts-b': `${KEY} div.flex.gap-1{display:none}`,
  'hold-a': HOLD_A, 'hold-b': HOLD_B,
};
