import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';
const b = await chromium.launch(); let bad = 0;
for (const w of [390, 1024, 1280, 1440, 1920]) {
  for (const hash of ['#still', '']) {
    const pg = await b.newPage({ viewport: { width: w, height: 900 } });
    await pg.goto('file://' + process.cwd() + '/kpm-presentation.html#nointro,all' + hash); await pg.waitForTimeout(400);
    for (const id of ['secOrb', 'stkOrb', 'p3Orb', 'netOrb']) { await pg.evaluate((id) => document.getElementById(id).scrollIntoView({ block: 'center' }), id); await pg.waitForTimeout(hash ? 150 : 1800); }
    const r = await pg.evaluate(() => [...document.querySelectorAll('.hint')].map((h) => {
      const hr = h.getBoundingClientRect(), orb = h.closest('.orb');
      const hit = (e) => { const r = e.getBoundingClientRect(); return r.width && hr.left < r.right && hr.right > r.left && hr.top < r.bottom && hr.bottom > r.top; };
      const parts = [...orb.querySelectorAll('.b3 > i, .b3 .val, .dev, .cl3, .flab, .contoh')].filter(hit).length;
      const out = [...h.closest('.scene').querySelectorAll('.box3, .trust, .vault, .colnames, .feed, .prd, .keys, #tiers, .hd3')].filter((e) => !e.contains(orb)).filter(hit).length;
      return parts + out ? `${orb.id}: ${parts} picture parts, ${out} panels` : '';
    }).filter(Boolean));
    bad += r.length; if (r.length) console.log(w, hash || 'moving', r.join(' | '));
    if (w === 1440 && hash) { await pg.evaluate(() => document.getElementById('secOrb').scrollIntoView({ block: 'center' })); await (await pg.$('#secOrb')).screenshot({ path: 'shots/hint2-1440.png' }); }
    if (w === 390 && hash) { await pg.evaluate(() => document.getElementById('p3Orb').scrollIntoView({ block: 'center' })); await (await pg.$('#p3Orb')).screenshot({ path: 'shots/hint2-390.png' }); }
    await pg.close();
  }
}
console.log('overlaps:', bad); await b.close();
