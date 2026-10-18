import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';
const b = await chromium.launch(); const errs = [];
for (const w of [390, 1440]) {
  const pg = await b.newPage({ viewport: { width: w, height: 900 } }); pg.on('pageerror', (e) => errs.push(e.message));
  await pg.goto('file://' + process.cwd() + '/kpm-presentation.html#nointro,all'); await pg.waitForTimeout(400);
  await pg.evaluate(() => document.getElementById('selisih').scrollIntoView());
  await pg.waitForTimeout(1500); await (await pg.$('#selisih .vis')).screenshot({ path: `shots/sel-mid-${w}.png` });
  await pg.waitForTimeout(5000);
  const r = await pg.evaluate(() => ({ lines: document.querySelectorAll('#selLines .line').length, total: document.getElementById('selNx').textContent.replace(/\D/g, '').slice(-5), ok: document.querySelectorAll('#selChk .srow.ok').length, bad: document.querySelectorAll('#selChk .srow.bad').length }));
  console.log(w, JSON.stringify(r));
  await (await pg.$('#selisih .vis')).screenshot({ path: `shots/sel-end-${w}.png` });
  await pg.evaluate(() => document.getElementById('uang').scrollIntoView()); await pg.waitForTimeout(600);
  await (await pg.$('#uang')).screenshot({ path: `shots/uang-${w}.png` });
  await pg.close();
}
console.log(errs.length ? errs : 'no errors'); await b.close();
