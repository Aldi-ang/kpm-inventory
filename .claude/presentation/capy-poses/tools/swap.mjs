// Put the capybara poses in capy-poses/cut/ into the presentation: rebuilds the block between /*CYI*/ and /*CYI-END*/.
// A pose that is not there yet falls back to one that is (CYI_HAS says which are real), so the page always works.
// node .claude/presentation/capy-poses/tools/swap.mjs        (from the repo root)
import { readFileSync, existsSync, writeFileSync } from 'node:fs';
const P = '.claude/presentation', PAGE = `${P}/kpm-semua-terkendali.html`, CUT = `${P}/capy-poses/cut`;
const want = { wave: 'm-wave', point: 'm-point', give: 'm-give', run: 'm-run', stamp: 'm-stamp', receive: 'm-receive', cheer: 'm-cheer', wstand: 'w-stand', wcarry: 'w-carry', wshock: 'w-shock', wwave: 'w-wave',
  /* the flying cameo's extra looks (outfits.sh); missing ones have no fallback, the cameo just skips them */
  think: 'm-think', sit: 'm-sit', osales: 'o-sales', odriver: 'o-driver', ooffice: 'o-office', oguard: 'o-guard', ocashier: 'o-cashier', ochef: 'o-chef' };
const fall = { run: 'point', stamp: 'deal', receive: 'wave', cheer: 'deal', wstand: 'point', wcarry: 'wave', wshock: 'point', wwave: 'wave' };
const uri = (f) => 'data:image/png;base64,' + readFileSync(f).toString('base64');
const has = { deal: 1 }, map = { deal: uri('public/sprites/merchant-deal.png') };
for (const [k, f] of Object.entries(want)) if (existsSync(`${CUT}/${f}.png`)) { map[k] = uri(`${CUT}/${f}.png`); has[k] = 1; }
let js = `const CYI_HAS = ${JSON.stringify(has)};\nconst CYI = ${JSON.stringify(map)};\n`;
for (const [k, f] of Object.entries(fall)) if (!has[k]) js += `CYI.${k} = CYI.${f};\n`;
const h = readFileSync(PAGE, 'utf8'), a = h.indexOf('/*CYI*/'), b = h.indexOf('/*CYI-END*/');
if (a < 0 || b < a || h.indexOf('/*CYI*/', a + 1) >= 0) throw new Error('CYI markers not found exactly once');
writeFileSync(PAGE, h.slice(0, a + 7) + js + h.slice(b));
console.log('real poses:', Object.keys(has).join(', '), '| missing:', Object.keys(want).filter((k) => !has[k]).join(', ') || 'none');
