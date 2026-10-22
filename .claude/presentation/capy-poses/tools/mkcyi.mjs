// node mkcyi.mjs <gen dir> <deal.png> <frames.json> <out dir>
// builds cyi.js (the capybara poses as data URIs; missing ones fall back, CYI_HAS says which are real),
// frames-js.js (LV_HTML + LV_FILTERS) and frames.css from the extracted rank frames
import { readFileSync, existsSync, writeFileSync } from 'node:fs';
const [, , G, DEAL, FJ, OUT] = process.argv;
const want = { wave: 'm-wave', point: 'm-point', give: 'm-give', run: 'm-run', stamp: 'm-stamp', receive: 'm-receive', cheer: 'm-cheer', wstand: 'w-stand', wcarry: 'w-carry', wshock: 'w-shock', wwave: 'w-wave' };
const fall = { run: 'point', stamp: 'deal', receive: 'wave', cheer: 'deal', wstand: 'point', wcarry: 'wave', wshock: 'point', wwave: 'wave' };
const uri = (f) => 'data:image/png;base64,' + readFileSync(f).toString('base64');
const has = { deal: 1 }, map = { deal: uri(DEAL) };
for (const [k, f] of Object.entries(want)) { const p = `${G}/cut/${f}.png`; if (existsSync(p)) { map[k] = uri(p); has[k] = 1; } }
let js = `const CYI_HAS = ${JSON.stringify(has)};\nconst CYI = ${JSON.stringify(map)};\n`;
for (const [k, f] of Object.entries(fall)) if (!has[k]) js += `CYI.${k} = CYI.${f};\n`;
writeFileSync(`${OUT}/cyi.js`, js);
const j = JSON.parse(readFileSync(FJ, 'utf8'));
writeFileSync(`${OUT}/frames-js.js`, `const LV_HTML = ${JSON.stringify(j.html)};\nconst LV_FILTERS = ${JSON.stringify(j.filters)};\n`);
writeFileSync(`${OUT}/frames.css`, j.css);
console.log('real poses:', Object.keys(has).join(','), '| cyi bytes', js.length);
