import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';
const b = await chromium.launch(); const errs = [];
for (const w of [390, 1440]) {
  const pg = await b.newPage({ viewport: { width: w, height: 900 } }); pg.on('pageerror', (e) => errs.push(e.message));
  await pg.goto('file://' + process.cwd() + '/kpm-presentation.html#nointro,all'); await pg.waitForTimeout(400);
  await pg.evaluate(() => document.getElementById('ho').scrollIntoView({ block: 'center' }));
  for (const [t, n] of [[700, 'a'], [1700, 'mid'], [3300, 'ok'], [4800, 'b']]) { await pg.waitForTimeout(t - (n === 'a' ? 0 : 0)); }
  await pg.close();
  const p2 = await b.newPage({ viewport: { width: w, height: 900 } }); p2.on('pageerror', (e) => errs.push(e.message));
  await p2.goto('file://' + process.cwd() + '/kpm-presentation.html#nointro,all'); await p2.waitForTimeout(400);
  await p2.evaluate(() => document.getElementById('ho').scrollIntoView({ block: 'center' }));
  const shots = [[2400, 'wait'], [1500, 'stamp'], [1900, 'done']];
  for (const [t, n] of shots) { await p2.waitForTimeout(t); await (await p2.$('#ho')).screenshot({ path: `shots/ho-${n}-${w}.png` });
    console.log(w, n, await p2.evaluate(() => [document.getElementById('hoCard').className, document.getElementById('hoChain').textContent].join(' | '))); }
  await p2.close();
}
console.log(errs.length ? errs : 'no errors'); await b.close();
