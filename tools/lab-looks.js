/* LAB ONLY — proposal CSS behind short names, so a board option can be opened LIVE as
   `?shell&customers&look=cust-a` instead of a 6 KB ?css= link. Each entry is a candidate Aldi has
   not decided on yet; when one ships, its rules move into the component and the entry is deleted.
   2026-09-18: the Customers look (A lit rows / B key caps), the Quarantine badge (A hazard tag /
   B LED counter), the competitor table stacked under 375. */
const ROWS = '.biohazard-content [class*="grid-cols-[auto_1fr]"],.biohazard-content [class*="p-3 lg:p-5 rounded-xl border shadow-sm flex flex-col"]';
const FOLD ='.biohazard-content [class*="grid-cols-[auto_1fr]"]';
const HEAD = '.biohazard-content [class*="justify-between items-center bg-[var(--raised)] p-3 rounded-xl"]';
const ADD = '.biohazard-content button[class*="min-h-[48px]"]';

const each = (sel, rule) => sel.split(',').map((s) => s + rule).join(',');

export const CUST_A = [
  // rows: a top light, a hairline highlight, a soft drop; the RE hover (wash from the left + amber bar); press sinks
  `${ROWS}{position:relative;overflow:hidden;isolation:isolate;border-color:var(--line-2);background-image:linear-gradient(180deg,color-mix(in srgb,var(--raised) 88%,var(--gold) 12%) 0,var(--raised) 56px);box-shadow:inset 0 1px 0 color-mix(in srgb,var(--ink) 12%,transparent),0 10px 20px -14px rgba(0,0,0,.95);transition:scale 160ms ease-out,border-color 160ms ease-out;animation:kpmRowRise 280ms cubic-bezier(.23,1,.32,1) both}`,
  `@keyframes kpmRowRise{from{opacity:0;translate:0 10px}}`,
  `${each(ROWS, ':nth-child(2)')}{animation-delay:45ms}${each(ROWS, ':nth-child(3)')}{animation-delay:90ms}${each(ROWS, ':nth-child(4)')}{animation-delay:135ms}${each(ROWS, ':nth-child(5)')}{animation-delay:180ms}`,
  `${each(ROWS, '::before')}{content:"";position:absolute;inset:0;z-index:-1;pointer-events:none;background:linear-gradient(90deg,var(--sweep-hi) 0,var(--sweep-mid) 34%,transparent 78%);opacity:0;transform:translateX(-14%);transition:opacity 240ms cubic-bezier(.16,1,.3,1),transform 240ms cubic-bezier(.16,1,.3,1)}`,
  `${each(ROWS, '::after')}{content:"";position:absolute;left:0;top:0;bottom:0;width:3px;z-index:-1;pointer-events:none;background:var(--amber);transform:scaleY(0);transition:transform 200ms cubic-bezier(.16,1,.3,1)}`,
  `${each(ROWS, ':hover::before')},${each(ROWS, ':active::before')}{opacity:1;transform:none}${each(ROWS, ':hover::after')},${each(ROWS, ':active::after')}{transform:none}${each(ROWS, ':active')}{scale:.985}`,
  // folder icon: a bezelled well, ink not red
  `${FOLD} .p-3.rounded-lg{background:var(--inset);color:var(--ink-muted);border:1px solid var(--line-2);box-shadow:inset 0 2px 5px rgba(0,0,0,.55),inset 0 -1px 0 color-mix(in srgb,var(--ink) 8%,transparent)}`,
  // the count: a printed mono chip
  `${FOLD}>p{font-family:var(--font-mono);font-variant-numeric:tabular-nums;background:var(--inset);border:1px solid var(--line-2);border-radius:4px;padding:2px 8px;width:max-content;letter-spacing:.14em}`,
  // level header: a printed rule, not a second card; FOLDER is a routine act (hairline + mono), not a second gold plate
  `${HEAD}{background:transparent;border:0;border-bottom:1px solid var(--line-2);border-radius:0;padding-left:4px;padding-right:0}`,
  `${HEAD}>button{background:transparent;color:var(--ink-muted);border:1px solid var(--line-3);font-family:var(--font-mono);letter-spacing:.14em;border-radius:4px;transition:transform 160ms ease-out,border-color 160ms ease-out}${HEAD}>button:active{transform:scale(.96);border-color:var(--accent-edge);color:var(--accent-ink)}`,
  // ADD: the one gold plate — lit top edge, sinks on press
  `${ADD}{box-shadow:inset 0 1px 0 rgba(255,255,255,.3),inset 0 -2px 0 rgba(0,0,0,.28),0 10px 18px -12px var(--gold);transition:transform 160ms ease-out}${ADD}:active{transform:scale(.97)}`,
  // search: a well
  `.biohazard-content input[placeholder^="Search store"]{background:var(--inset);border-color:var(--line-2);box-shadow:inset 0 2px 6px rgba(0,0,0,.4)}`,
].join('');

// B = A + key-cap depth: rows stand 3 px proud and sink 2 px when pressed; a lamp dot on the folder well
export const CUST_B = CUST_A + [
  `${ROWS}{box-shadow:inset 0 1px 0 color-mix(in srgb,var(--ink) 12%,transparent),0 3px 0 var(--line-2),0 12px 20px -12px rgba(0,0,0,.95);transition:translate 120ms ease-out,box-shadow 120ms ease-out,scale 160ms ease-out}`,
  `${each(ROWS, ':active')}{translate:0 2px;scale:1;box-shadow:inset 0 1px 0 color-mix(in srgb,var(--ink) 12%,transparent),0 1px 0 var(--line-2)}`,
  `${FOLD} .p-3.rounded-lg{position:relative}${FOLD} .p-3.rounded-lg::after{content:"";position:absolute;right:5px;top:5px;width:6px;height:6px;border-radius:50%;background:#000;box-shadow:inset 0 1px 1px rgba(255,255,255,.15);transition:background 160ms ease-out,box-shadow 160ms ease-out}`,
  `${FOLD}:hover .p-3.rounded-lg::after,${FOLD}:active .p-3.rounded-lg::after{background:var(--amber);box-shadow:0 0 6px var(--amber)}`,
].join('');

const BADGE = '.biohazard-content button span[class*="bg-danger-badge"]';
// A: a hazard tag — well fill, red rail, mono digits, a slow breathing edge while anything waits
export const QA = `${BADGE}{background:var(--danger-well);color:var(--danger-text);border:1px solid var(--danger-rail);border-left-width:3px;border-radius:2px;min-width:28px;height:22px;font:800 13px/1 var(--font-mono);font-variant-numeric:tabular-nums;letter-spacing:.04em;padding:0 7px;box-shadow:0 0 0 0 color-mix(in srgb,var(--danger-rail) 40%,transparent);animation:kpmQBreathe 2.4s ease-in-out infinite}@keyframes kpmQBreathe{50%{box-shadow:0 0 0 4px color-mix(in srgb,var(--danger-rail) 30%,transparent)}}`;
// B: an LED counter — black well, glowing red digits, a pulsing lamp
export const QB = `${BADGE}{position:relative;background:#000;color:var(--danger-text);border:1px solid var(--line-2);border-radius:3px;min-width:34px;height:22px;font:800 13px/1 var(--font-mono);font-variant-numeric:tabular-nums;letter-spacing:.06em;text-shadow:0 0 6px color-mix(in srgb,var(--danger-text) 70%,transparent);box-shadow:inset 0 0 0 1px rgba(255,255,255,.04),inset 0 2px 4px rgba(0,0,0,.85);padding:0 8px 0 16px}${BADGE}::before{content:"";position:absolute;left:6px;top:50%;width:5px;height:5px;margin-top:-2.5px;border-radius:50%;background:var(--danger-rail);box-shadow:0 0 5px var(--danger-rail);animation:kpmQLamp 1.6s ease-in-out infinite}@keyframes kpmQLamp{50%{opacity:.3;box-shadow:none}}`;

const TBL = '.biohazard-content table[class*="min-w-[600px]"]';
// the competitor table as stacked rows under 375: no sideways scroll
export const TABLE_FIX = `${TBL}{min-width:0}${TBL} thead{display:none}${TBL} tbody{display:block}${TBL} tr{display:grid;grid-template-columns:1fr auto;column-gap:12px;padding:10px 0;border-bottom:1px solid var(--line)}${TBL} td{display:block;padding:2px 0!important;text-align:left}${TBL} td:nth-child(1){grid-column:1;grid-row:1}${TBL} td:nth-child(2){grid-column:2;grid-row:1;text-align:right}${TBL} td:nth-child(3){grid-column:1;grid-row:2}${TBL} td:nth-child(4){grid-column:1/-1;grid-row:3;max-width:none!important}${TBL} td:nth-child(5){grid-column:2;grid-row:2;text-align:right}${TBL} td .max-w-\\[150px\\]{max-width:none}`;

export const PIN = '#root{width:375px}';

/* `?look=a,b` — comma-separated names, injected after the app's stylesheet like ?css= */
export const LOOKS = { 'cust-a': CUST_A, 'cust-b': CUST_B, 'badge-a': QA, 'badge-b': QB, 'table': TABLE_FIX, 'pin': PIN };
