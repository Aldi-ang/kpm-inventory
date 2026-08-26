/* NO-UNDEF CHECK — the one class of mistake that ships a blank screen.
   ────────────────────────────────────────────────────────────────────────────
   2026-08-25. The dashboard rebuild passed `npm run build`, the 607-check integration audit, 813
   logic checks, 26 threshold checks and every contrast pair — and then rendered
   "[DASHBOARD] FAILED TO LOAD" the first time anyone opened it. The cause was one line:

       useEffect(() => { setArrived(false); setScrub(null); ... })   <- setScrub no longer existed

   The chart had moved into its own component and taken its state with it. Nothing caught it
   because NOTHING IN THE VERIFICATION LOOP LOOKS FOR AN UNDEFINED IDENTIFIER. A bundler resolves
   imports, not free variables; a grep for "scrub" misses "setScrub" on case; and every existing
   self-check reads source as TEXT, so none of them knows what a scope is.

   ESLint already knew. `npm run lint` reports it as `no-undef` and the repo has had eslint
   installed the whole time — it just has ~290 other findings, so nobody runs it and it is not a
   gate. This file is the gate for the one rule that means the app is BROKEN rather than untidy.

   ⚠️ THE BASELINE BELOW IS NOT A LIST OF THINGS THAT ARE FINE. Two of the four are real bugs
   somebody has to fix; they are pinned so that a NEW one fails loudly instead of hiding in a
   crowd. Fix one, delete its line.

   Run: node src/config/undef.check.mjs                                                          */
import { ESLint } from 'eslint';

/* file:identifier -> why it is tolerated, for now */
const BASELINE = {
  'src/App.jsx:__BUILD_ID__':
    'a Vite `define`, replaced at build time. Not a real free variable.',
  'src/config/career.js:process':
    'guarded by a typeof check for the Node-side test harness.',
  'src/MapMissionControl.jsx:getDoc':
    '🔴 A REAL BUG, NOT AN EXCEPTION. Same shape as logic-review bug #24: a getDoc call that was '
    + 'never imported, sitting inside a try/catch, so it fails silently forever. Aldi has not '
    + 'ranked it yet — it is outside the dashboard work. Fix it and delete this line.',
};

const eslint = new ESLint();
const results = await eslint.lintFiles(['src']);

const found = [];
for (const file of results) {
  const rel = file.filePath.replace(/\\/g, '/').split('/kpm-inventory-main/').pop();
  for (const m of file.messages) {
    if (m.ruleId !== 'no-undef') continue;
    const name = (m.message.match(/'([^']+)'/) || [])[1] || '?';
    found.push({ key: `${rel}:${name}`, rel, name, line: m.line });
  }
}

const unexpected = found.filter(f => !(f.key in BASELINE));
const seen = new Set(found.map(f => f.key));
const fixed = Object.keys(BASELINE).filter(k => !seen.has(k));

for (const f of unexpected) {
  console.log(`  FAIL ${f.rel}:${f.line}  '${f.name}' is not defined`);
}
for (const k of fixed) {
  console.log(`  note  ${k} is gone — delete its line from BASELINE in this file`);
}
if (!unexpected.length) {
  console.log(`  ok   no new undefined identifiers in src (${Object.keys(BASELINE).length} pinned)`);
}

console.log(`\n${unexpected.length ? `${unexpected.length} NEW undefined identifier(s)` : 'clean'}`);
process.exit(unexpected.length ? 1 : 0);
