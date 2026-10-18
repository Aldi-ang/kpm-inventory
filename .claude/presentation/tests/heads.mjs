import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';
const b = await chromium.launch();
for (const w of [320, 390, 1024, 1440]) {
  const pg = await b.newPage({ viewport: { width: w, height: 800 } });
  await pg.goto('file://' + process.cwd() + '/kpm-presentation.html#still,nointro,all'); await pg.waitForTimeout(400);
  const bad = await pg.evaluate(() => [...document.querySelectorAll('h1,h2')].filter((h) => { const r = h.getBoundingClientRect(), p = h.closest('.copy').getBoundingClientRect(); return h.scrollWidth > h.clientWidth + 1 || r.right > p.right + 1; }).map((h) => h.textContent));
  const lines = await pg.evaluate(() => Math.max(...[...document.querySelectorAll('h1,h2')].map((h) => Math.round(h.getBoundingClientRect().height / parseFloat(getComputedStyle(h).lineHeight)))));
  console.log(w, bad.length ? 'CUT: ' + bad.join(' | ') : 'all headlines fit', '· most lines:', lines);
  if (w === 390) { await pg.evaluate(() => document.getElementById('catatan').scrollIntoView()); await (await pg.$('#catatan .copy')).screenshot({ path: 'shots/h-390.png' }); }
  await pg.close();
}
await b.close();
