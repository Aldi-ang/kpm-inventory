import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';
const b = await chromium.launch(); const errs = [];
for (const w of [390, 1440]) {
  const pg = await b.newPage({ viewport: { width: w, height: 900 }, deviceScaleFactor: w < 500 ? 2 : 1 }); pg.on('pageerror', (e) => errs.push(e.message));
  await pg.goto('file://' + process.cwd() + '/kpm-presentation.html#still,nointro,all'); await pg.waitForTimeout(400);
  await pg.evaluate(() => document.getElementById('omzet').scrollIntoView()); await pg.waitForTimeout(300);
  const n = await pg.evaluate(() => [...document.querySelectorAll('#tags3 .tag')].map((t) => t.textContent));
  console.log(w, n.length, 'labels:', n.join(' | '));
  await (await pg.$('#omzet .vis')).screenshot({ path: `shots/omz-${w}.png` });
  await pg.close();
}
console.log(errs.length ? errs : 'no errors'); await b.close();
