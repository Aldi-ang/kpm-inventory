import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';
const b = await chromium.launch();
for (const w of [320, 360, 390, 768, 1440]) { const pg = await b.newPage({ viewport: { width: w, height: 800 } });
  await pg.goto('file://' + process.cwd() + '/kpm-presentation.html#nointro'); await pg.waitForTimeout(400);
  const r = await pg.evaluate(() => { const bar = document.querySelector('.wbar').getBoundingClientRect(); const kids = [...document.querySelectorAll('.wbar > *')].map((e) => e.getBoundingClientRect()); return { fits: kids.every((k) => k.left >= 0 && k.right <= innerWidth), label: document.getElementById('sname').textContent }; });
  console.log(w, r.fits ? 'controls fit' : 'CUT', '| top bar:', r.label); if (w === 390) await (await pg.$('.wbar')).screenshot({ path: 'shots/wbar-390.png' }); await pg.close(); }
await b.close();
