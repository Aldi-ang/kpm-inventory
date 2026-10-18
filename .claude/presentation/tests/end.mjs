import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';
const b = await chromium.launch(); const pg = await b.newPage({ viewport: { width: 1440, height: 900 } }); const errs = []; pg.on('pageerror', (e) => errs.push(e.message));
await pg.goto('file://' + process.cwd() + '/kpm-presentation.html#still,nointro,all'); await pg.waitForTimeout(400);
for (const id of ['angka', 'stok']) { await pg.evaluate((id) => document.getElementById(id).scrollIntoView(), id); await pg.waitForTimeout(300); await (await pg.$('#' + id)).screenshot({ path: `shots/${id}-final.png` }); }
console.log(await pg.title(), errs.length ? errs : 'no errors'); await b.close();
