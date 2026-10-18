import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';
const url = 'file://' + process.cwd() + '/kpm-presentation.html';
const R = []; const ok = (n, c, i = '') => R.push(`${c ? 'PASS' : 'FAIL'} ${n} ${i}`);
let b = await chromium.launch();
for (const [w, h] of [[844, 390], [667, 375], [568, 320], [1024, 420]]) {
  const pg = await b.newPage({ viewport: { width: w, height: h }, hasTouch: true, isMobile: w < 1000 });
  await pg.goto(url); await pg.waitForTimeout(3000);
  const r = await pg.evaluate(() => { const r = document.getElementById('introGo').getBoundingClientRect(); return { top: r.top, bottom: r.bottom, ih: innerHeight }; });
  ok(`[${w}x${h}] button on screen`, r.bottom <= r.ih && r.top >= 0, JSON.stringify(r));
  if (w === 844) await pg.screenshot({ path: 'shots/intro-land-844.png' });
  await pg.touchscreen.tap(w / 2, Math.min(h - 10, r.top + 20)); await pg.waitForTimeout(1700);
  ok(`[${w}x${h}] tap opens`, await pg.evaluate(() => !document.getElementById('intro')));
  await pg.close();
}
{ const pg = await b.newPage({ viewport: { width: 1440, height: 900 } }); await pg.goto(url); await pg.waitForTimeout(3200);
  for (let i = 0; i < 5; i++) await pg.keyboard.press('Tab');
  ok('[Tab x5] page under intro did not scroll', await pg.evaluate(() => scrollY === 0), await pg.evaluate(() => scrollY));
  await pg.keyboard.press('Enter'); await pg.waitForTimeout(1700);
  ok('[Tab then Enter] opens at the top (the wheel)', await pg.evaluate(() => scrollY === 0 && document.getElementById('sn').textContent === '00'), await pg.evaluate(() => scrollY + ' ' + document.getElementById('sn').textContent));
  ok('[after] page no longer inert', await pg.evaluate(() => !document.querySelector('main').inert && !document.querySelector('.bar').inert));
  await pg.close(); }
for (const w of [390, 1440]) { const pg = await b.newPage({ viewport: { width: w, height: 844 } }); await pg.goto(url);
  const tops = []; for (let t = 0; t < 26; t++) { tops.push(await pg.evaluate(() => document.querySelector('.in-title').getBoundingClientRect().top)); await pg.waitForTimeout(80); }
  const hop = Math.max(...tops.slice(12).map((v, i, a) => (i ? Math.abs(v - a[i - 1]) : 0)));
  ok(`[${w}] no hop of the title after 1s`, hop < 1, hop.toFixed(1) + 'px'); await pg.close(); }
{ const pg = await b.newPage({ viewport: { width: 1280, height: 800 } }); await pg.goto(url); await pg.waitForTimeout(3200);
  await pg.click('#introGo'); const rz = []; for (let t = 0; t < 14; t++) { await pg.waitForTimeout(100); rz.push(await pg.evaluate(() => [document.getElementById('intro')?.className || 'gone', document.getElementById('rig1').style.getPropertyValue('--rz')])); }
  const moving = rz.filter(([c, z]) => c.includes('open') && z !== '-8.0deg').length;
  ok('[orb] map turns while the doors open', moving > 0, rz.map(([c, z]) => (c.includes('open') ? 'O' : c === 'gone' ? 'G' : 'S') + z).join(' ')); await pg.close(); }
await b.close();
b = await chromium.launch({ ignoreDefaultArgs: ['--hide-scrollbars'] });
{ const pg = await b.newPage({ viewport: { width: 520, height: 800 } }); await pg.goto(url); await pg.waitForTimeout(3200); await pg.click('#introGo'); await pg.waitForTimeout(1800);
  const fw1 = await pg.evaluate(() => document.getElementById('p3Orb').style.getPropertyValue('--fw'));
  await pg.evaluate(() => dispatchEvent(new Event('resize'))); await pg.waitForTimeout(200);
  const fw2 = await pg.evaluate(() => document.getElementById('p3Orb').style.getPropertyValue('--fw'));
  ok('[scrollbar] 3D sizes re-fit after the intro', fw1 === fw2, fw1 + ' vs ' + fw2); await pg.close(); }
await b.close(); console.log(R.join('\n'));
