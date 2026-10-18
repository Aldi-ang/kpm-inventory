import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';
const url = 'file://' + process.cwd() + '/kpm-presentation.html';
const b = await chromium.launch(); const R = []; const errs = [];
const ok = (n, c, i = '') => R.push(`${c ? 'PASS' : 'FAIL'} ${n} ${i}`);
const th = (pg) => pg.evaluate(() => document.getElementById('ring').style.transform);
const back = async (pg) => { if (!await pg.evaluate(() => document.getElementById('snav').classList.contains('open'))) { await pg.click('#snavDot'); await pg.waitForTimeout(450); } await pg.click('#snavHome'); const wb = await (await pg.$('#wheel')).boundingBox(); if (wb) await pg.mouse.move(wb.x + wb.width / 2, wb.y + wb.height / 2); };   /* a viewer's mouse rests on the wheel, which pauses its spin */
const front = (pg) => pg.evaluate(() => document.querySelector('.wcard.front .wn').textContent);
for (const [w, h] of [[390, 844], [1440, 900]]) {
  const pg = await b.newPage({ viewport: { width: w, height: h } }); pg.on('pageerror', (e) => errs.push(`${w}: ${e.message}`));
  await pg.goto(url); await pg.waitForTimeout(400); await pg.click('#introGo'); await pg.waitForTimeout(1800);
  const t = `[${w}]`;
  ok(t + ' wheel is first on screen after the intro', await pg.evaluate(() => { const r = document.getElementById('fitur').getBoundingClientRect(); return r.top <= 1 && r.bottom > innerHeight * .8; }));
  ok(t + ' 23 cards', await pg.evaluate(() => document.querySelectorAll('.wcard').length === 23));
  await pg.mouse.move(2, 2); await pg.waitForTimeout(100); const a = await th(pg); await pg.waitForTimeout(700); const b2 = await th(pg);
  ok(t + ' turns by itself', a !== b2);
  await pg.screenshot({ path: `shots/wheel-${w}.png` });
  const f0 = await front(pg);
  const bx = await (await pg.$('#wheel')).boundingBox();
  await pg.mouse.move(bx.x + bx.width / 2, bx.y + bx.height / 2); await pg.mouse.down(); await pg.mouse.move(bx.x + bx.width / 2 - 260, bx.y + bx.height / 2, { steps: 8 }); await pg.mouse.up(); await pg.waitForTimeout(1600);
  ok(t + ' drag moves to another card and settles', (await front(pg)) !== f0, f0 + ' -> ' + (await front(pg)));
  await pg.click('#wNext'); await pg.waitForTimeout(700); const f1 = await front(pg);
  await pg.keyboard.press('Tab'); await pg.focus('#wheel'); await pg.keyboard.press('ArrowLeft'); await pg.waitForTimeout(700);
  ok(t + ' arrow key steps one card', (+await front(pg)) === ((+f1 - 2 + 23) % 23) + 1, f1 + ' -> ' + (await front(pg)));
  /* tap a side card: comes to front */
  const side = await pg.evaluate(() => { const cs = [...document.querySelectorAll('.wcard')]; const f = cs.findIndex((c) => c.classList.contains('front')); return (f + 1) % cs.length; });
  await pg.evaluate(() => { window.__hover = true; });
  const sr = await pg.evaluate((i) => { const r = document.querySelectorAll('.wcard')[i].getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; }, side);
  await pg.mouse.click(sr.x, sr.y); await pg.waitForTimeout(800);
  ok(t + ' tap side card brings it to the front', await pg.evaluate((i) => document.querySelectorAll('.wcard')[i].classList.contains('front'), side));
  /* tap the front card: zoom, then the slide */
  const target = await pg.evaluate(() => { const c = document.querySelector('.wcard.front'); return c.querySelector('b').textContent; });
  const fr = await pg.evaluate(() => { const r = document.querySelector('.wcard.front').getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; });
  await pg.mouse.click(fr.x, fr.y); await pg.waitForTimeout(380); await pg.screenshot({ path: `shots/wheel-zoom-${w}.png` });
  ok(t + ' zoom card appears', await pg.evaluate(() => !!document.querySelector('.wzoom')));
  await pg.waitForTimeout(1400);
  ok(t + ' opens ONLY that slide', await pg.evaluate((n) => { const vis = [...document.querySelectorAll('main > .scene')].filter((x) => getComputedStyle(x).display !== 'none'); return vis.length === 1 && vis[0].dataset.name === n && Math.abs(vis[0].getBoundingClientRect().top) < 4 && getComputedStyle(document.getElementById('fitur')).display === 'none'; }, target), target);
  ok(t + ' zoom card removed', await pg.evaluate(() => !document.querySelector('.wzoom')));
  ok(t + ' slide picker visible on the slide', await pg.evaluate(() => { const r = document.getElementById('snav').getBoundingClientRect(); return r.width > 0 && r.bottom <= innerHeight && r.left >= 0 && r.right <= innerWidth; }));
  await pg.waitForTimeout(400); await pg.screenshot({ path: `shots/solo-${w}.png` });
  await back(pg); await pg.waitForTimeout(250); await pg.screenshot({ path: `shots/solo-back-${w}.png` }); await pg.waitForTimeout(700);
  ok(t + ' back plate returns to the wheel, its card in front', await pg.evaluate((n) => !document.documentElement.classList.contains('solo') && getComputedStyle(document.getElementById('fitur')).display !== 'none' && document.querySelector('.wcard.front b').textContent === n && !document.querySelector('.wzoom') && [...document.querySelectorAll('main > .scene')].every((x) => getComputedStyle(x).display === 'none'), target), await pg.evaluate(() => JSON.stringify({ solo: document.documentElement.classList.contains('solo'), front: document.querySelector('.wcard.front b')?.textContent, zoom: !!document.querySelector('.wzoom'), vis: [...document.querySelectorAll('main > .scene')].filter((x) => getComputedStyle(x).display !== 'none').map((x) => x.id), open: document.getElementById('snav').className })) + ' target=' + target);
  await pg.click('#wOpen'); await pg.waitForTimeout(1500); await pg.keyboard.press('Escape'); await pg.waitForTimeout(900);
  ok(t + ' Esc goes back too', await pg.evaluate(() => !document.documentElement.classList.contains('solo')));
  await pg.click('#wOpen'); await pg.waitForTimeout(1500); await pg.click('#hubBtn'); await pg.waitForTimeout(900);
  ok(t + ' top-bar Fitur goes back too', await pg.evaluate(() => !document.documentElement.classList.contains('solo')));
  ok(t + ' no sideways scroll', await pg.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  await pg.close();
}
{ const pg = await b.newPage({ viewport: { width: 390, height: 844 } }); await pg.goto(url + '#still,nointro'); await pg.waitForTimeout(300);
  const a = await th(pg); await pg.waitForTimeout(800); ok('[still] does not turn by itself', a === await th(pg));
  await pg.click('#wOpen'); await pg.waitForTimeout(200); ok('[still] Buka opens the slide at once', await pg.evaluate(() => !document.querySelector('.wzoom') && document.documentElement.classList.contains('solo')));
  await back(pg); await pg.waitForTimeout(150); ok('[still] back at once', await pg.evaluate(() => !document.documentElement.classList.contains('solo') && !document.querySelector('.wzoom')));
  /* the closing slide (card 23) and its list of slides */
  await pg.evaluate(() => { document.querySelectorAll('.wcard')[22].click(); }); await pg.waitForTimeout(600); await pg.evaluate(() => { document.querySelectorAll('.wcard')[22].click(); }); await pg.waitForTimeout(300);
  ok('[still] card 23 opens the closing slide', await pg.evaluate(() => document.querySelector('.scene.solo-on')?.id === 'angka'));
  await pg.evaluate(() => document.querySelector('#recap a[href="#stok"]').click()); await pg.waitForTimeout(200);
  ok('[still] the closing list opens that slide alone', await pg.evaluate(() => document.querySelector('.scene.solo-on')?.id === 'stok' && document.querySelectorAll('main > .scene.solo-on').length === 1));
  await pg.close(); }
console.log(R.join('\n')); console.log(errs.length ? 'ERRORS ' + errs.join(' | ') : 'no page errors'); await b.close();
