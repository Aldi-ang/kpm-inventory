import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';
const url = 'file://' + process.cwd() + '/kpm-presentation.html';
const b = await chromium.launch(); const R = []; const errs = [];
const ok = (n, c, i = '') => R.push(`${c ? 'PASS' : 'FAIL'} ${n} ${i}`);
for (const [w, h] of [[390, 844], [360, 640], [1440, 900]]) {
  const pg = await b.newPage({ viewport: { width: w, height: h } }); pg.on('pageerror', (e) => errs.push(`${w}: ${e.message}`));
  await pg.goto(url); await pg.waitForTimeout(150);
  const t = `[${w}x${h}]`;
  ok(t + ' intro covers screen', await pg.evaluate(() => { const r = document.getElementById('intro').getBoundingClientRect(); return r.width === innerWidth && r.height === innerHeight; }));
  await pg.mouse.wheel(0, 2000); await pg.waitForTimeout(300);
  ok(t + ' page does not scroll under intro', await pg.evaluate(() => scrollY === 0), await pg.evaluate(() => scrollY));
  await pg.waitForTimeout(500); if (w !== 360) await pg.screenshot({ path: `shots/intro-early-${w}.png` });
  await pg.waitForTimeout(2200); await pg.screenshot({ path: `shots/intro-full-${w}.png` });
  ok(t + ' button visible + fits on screen', await pg.evaluate(() => { const r = document.getElementById('introGo').getBoundingClientRect(); return r.bottom <= innerHeight && r.top >= 0 && getComputedStyle(document.getElementById('introGo')).opacity === '1'; }), await pg.evaluate(() => JSON.stringify(document.getElementById('introGo').getBoundingClientRect())));
  ok(t + ' content fits (no horizontal spill)', await pg.evaluate(() => document.querySelector('.in-wrap').scrollWidth <= innerWidth));
  ok(t + ' counter shows 22', await pg.evaluate(() => [...document.querySelectorAll('#inNx .kpm-nixie-reel')].map((r) => r.querySelector('.lit')?.textContent).join('')) === '22');
  ok(t + ' button has focus', await pg.evaluate(() => document.activeElement?.id === 'introGo'));
  if (w === 1440) { await pg.keyboard.press('Enter'); } else { await pg.click('#introGo'); }
  await pg.waitForTimeout(450); if (w !== 360) await pg.screenshot({ path: `shots/intro-doors-${w}.png` });
  ok(t + ' doors shut on press', await pg.evaluate(() => document.getElementById('intro')?.classList.contains('shut')));
  await pg.waitForTimeout(500); if (w === 1440) await pg.screenshot({ path: `shots/intro-opening-${w}.png` });
  await pg.waitForTimeout(800);
  ok(t + ' intro gone, page unlocked', await pg.evaluate(() => !document.getElementById('intro') && !document.documentElement.classList.contains('intro-on')));
  ok(t + ' scroll lock lifted (home = the wheel)', await pg.evaluate(() => getComputedStyle(document.documentElement).overflowY !== 'hidden' && getComputedStyle(document.getElementById('fitur')).display !== 'none'));
  await pg.close();
}
{ const pg = await b.newPage({ viewport: { width: 390, height: 844 } }); pg.on('pageerror', (e) => errs.push('still: ' + e.message));
  await pg.goto(url + '#still'); await pg.waitForTimeout(200); await pg.screenshot({ path: 'shots/intro-still-390.png' });
  ok('[still] button visible at once', await pg.evaluate(() => getComputedStyle(document.getElementById('introGo')).opacity === '1'));
  await pg.click('#introGo'); await pg.waitForTimeout(100);
  ok('[still] press opens at once', await pg.evaluate(() => !document.getElementById('intro')));
  await pg.close(); }
{ const pg = await b.newPage(); await pg.goto(url + '#nointro'); await pg.waitForTimeout(200);
  ok('[#nointro] skipped', await pg.evaluate(() => !document.getElementById('intro') && !document.documentElement.classList.contains('intro-on'))); await pg.close(); }
{ const pg = await b.newPage(); await pg.goto(url); await pg.waitForTimeout(300); await pg.keyboard.press('Escape'); await pg.waitForTimeout(1600);
  ok('[Esc] opens too', await pg.evaluate(() => !document.getElementById('intro'))); await pg.close(); }
{ const pg = await b.newPage(); await pg.goto(url); await pg.waitForTimeout(300);
  ok('[receipt] generic header', await pg.evaluate(() => document.querySelector('.nota .nh').textContent === 'NAMA PERUSAHAAN · NOTA PENJUALAN' && !document.body.innerText.includes('KPM'))); await pg.close(); }
console.log(R.join('\n')); console.log(errs.length ? 'ERRORS ' + errs.join(' | ') : 'no page errors'); await b.close();
