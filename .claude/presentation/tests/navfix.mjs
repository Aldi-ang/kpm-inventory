/* the 11 bugs the 2026-10-18 review confirmed in the slide picker - each one a check, so it cannot come back */
import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';
const url = 'file://' + process.cwd() + '/kpm-presentation.html';
const b = await chromium.launch(); const R = []; const errs = [];
const ok = (n, c, i = '') => R.push(`${c ? 'PASS' : 'FAIL'} ${n} ${i}`);
const isOpen = (pg) => pg.evaluate(() => document.getElementById('snav').classList.contains('open'));
const slide = (pg) => pg.evaluate(() => document.getElementById('sn').textContent);
const enter = async (pg, h = '#nointro') => { await pg.goto(url + h); await pg.waitForTimeout(500); await pg.evaluate(() => document.getElementById('wOpen').click()); await pg.waitForTimeout(1500); };
/* ---- phone, real touch ---- */
for (const [w, h] of [[667, 375], [390, 844]]) {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, hasTouch: true, isMobile: true }); const pg = await ctx.newPage(); pg.on('pageerror', (e) => errs.push(`${w}: ${e.message}`));
  const cdp = await ctx.newCDPSession(pg); const t = `[touch ${w}x${h}]`;
  const touch = async (type, x, y) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y }] });
  await enter(pg); await pg.waitForTimeout(1500);   /* let the peek finish */
  if (await isOpen(pg)) { await pg.mouse.click(5, 150); await pg.waitForTimeout(400); }
  await pg.evaluate(() => { window.__mx = { l: 1e9, r: -1e9 }; const s = () => { const r = document.getElementById('snav').getBoundingClientRect(); __mx.l = Math.min(__mx.l, r.left); __mx.r = Math.max(__mx.r, r.right); if (performance.now() < __end) requestAnimationFrame(s); }; window.__end = performance.now() + 1200; requestAnimationFrame(s); });
  await pg.tap('#snavDot'); await pg.waitForTimeout(1300);
  const mx = await pg.evaluate(() => __mx);
  ok(t + ' spring overshoot stays on screen', mx.l >= 3 && mx.r <= w - 3, JSON.stringify(mx));
  const sb = await (await pg.$('#snavList')).boundingBox(); const cx = sb.x + sb.width / 2, cy = sb.y + sb.height / 2;
  const y0 = await pg.evaluate(() => scrollY), can = await pg.evaluate(() => document.documentElement.scrollHeight - innerHeight);
  await touch('touchStart', cx, cy); for (let k = 1; k <= 8; k++) { await touch('touchMove', cx, cy - k * 25); await pg.waitForTimeout(16); } await touch('touchEnd');
  await pg.waitForTimeout(600); const y1 = await pg.evaluate(() => scrollY);
  ok(t + ' swipe up on the open strip scrolls the slide', can < 20 || y1 > y0 + 20, `${y0} -> ${y1} (can ${can})`);
  await pg.evaluate(() => scrollTo(0, 0)); await pg.waitForTimeout(200);
  if (!(await isOpen(pg))) { await pg.tap('#snavDot'); await pg.waitForTimeout(500); }
  const sb2 = await (await pg.$('#snavList')).boundingBox();
  await touch('touchStart', sb2.x + 40, sb2.y + sb2.height / 2); await pg.waitForTimeout(3300);
  ok(t + ' a finger resting on the strip keeps it open', await isOpen(pg));
  await touch('touchEnd'); await pg.waitForTimeout(3100);
  ok(t + ' it folds after the finger lifts', !(await isOpen(pg)));
  await ctx.close();
}
/* ---- PC ---- */
{ const pg = await b.newPage({ viewport: { width: 1440, height: 900 } }); pg.on('pageerror', (e) => errs.push(`1440: ${e.message}`)); const t = '[1440]';
  await enter(pg); await pg.mouse.move(5, 300); await pg.waitForFunction(() => !document.getElementById('snav').classList.contains('open') && performance.now() > 4500, null, { timeout: 8000 }); await pg.waitForTimeout(400);
  ok(t + ' folded: strip is inert, dot is a Tab stop', await pg.evaluate(() => !document.getElementById('snav').classList.contains('open') && document.querySelector('.snav-in').inert && document.getElementById('snavDot').tabIndex === 0));
  /* ghost tap: tap the dot right as it folds */
  const d = await (await pg.$('#snavDot')).boundingBox(); const dx = d.x + d.width / 2, dy = d.y + d.height / 2;
  await pg.mouse.click(dx, dy); await pg.mouse.move(5, 300); await pg.waitForTimeout(400);
  ok(t + ' open: strip live, hidden dot not a Tab stop', await pg.evaluate(() => !document.querySelector('.snav-in').inert && document.getElementById('snavDot').tabIndex === -1));
  ok(t + ' a mouse click leaves no focus inside the picker', await pg.evaluate(() => !document.getElementById('snav').contains(document.activeElement)));
  await pg.keyboard.press('ArrowDown'); const s0 = await slide(pg);
  await pg.waitForFunction(() => !document.getElementById('snav').classList.contains('open'), null, { timeout: 4000, polling: 5 }).catch(() => {});
  ok(t + ' a key press after a mouse click does not pin it open', !(await isOpen(pg)));
  await pg.mouse.click(dx, dy); await pg.waitForTimeout(600);
  ok(t + ' tap on the dot while it folds reopens it, same slide', (await isOpen(pg)) && (await slide(pg)) === s0, `slide ${s0} -> ${await slide(pg)}`);
  /* the peek does not reopen what the viewer closed */
  await pg.goto('about:blank'); await pg.goto(url + '#nointro'); await pg.waitForTimeout(500); await pg.evaluate(() => document.getElementById('wOpen').click());
  await pg.waitForFunction(() => document.documentElement.classList.contains('solo'), null, { timeout: 4000, polling: 10 });
  await pg.click('#snavDot'); await pg.waitForTimeout(150); await pg.mouse.click(5, 300); await pg.waitForTimeout(1300);
  ok(t + ' the peek does not reopen a picker he closed', !(await isOpen(pg)));
  /* keyboard */
  await pg.focus('#snavDot');
  ok(t + ' dot focus ring drawn inside the dot', await pg.evaluate(() => { const e = document.getElementById('snavDot'); return e.matches(':focus-visible') && getComputedStyle(e).outlineOffset === '-2px' && getComputedStyle(e).outlineStyle === 'solid'; }));
  await pg.keyboard.press('Enter'); await pg.waitForTimeout(500);
  let clear = true; for (let k = 0; k < 7; k++) { await pg.keyboard.press('Tab'); await pg.waitForTimeout(60);
    clear = clear && await pg.evaluate(() => { const a = document.activeElement; if (!a.classList.contains('snav-c')) return true; const s = document.getElementById('snavList').getBoundingClientRect(), c = a.getBoundingClientRect(); return c.left >= s.left + 20 && c.right <= s.right - 20; }); }
  ok(t + ' tabbing keeps each focused chip clear of the faded edges', clear);
  await pg.keyboard.press('Escape'); await pg.waitForTimeout(400);
  ok(t + ' Esc folds and puts focus on the dot', await pg.evaluate(() => document.activeElement?.id === 'snavDot'));
  await pg.keyboard.press('Tab'); await pg.waitForTimeout(50);
  ok(t + ' Tab right after Esc never lands on the hidden home button', await pg.evaluate(() => document.activeElement?.id !== 'snavHome'));
  await pg.focus('#snavDot'); await pg.keyboard.press('Escape'); await pg.waitForTimeout(900);
  ok(t + ' leaving by keyboard lands focus on "Buka"', await pg.evaluate(() => !document.documentElement.classList.contains('solo') && document.activeElement?.id === 'wOpen'));
  await pg.keyboard.press('Enter'); await pg.waitForTimeout(1500);
  ok(t + ' ...so Enter reopens the slide', await pg.evaluate(() => document.documentElement.classList.contains('solo')));
  await pg.close(); }
console.log(R.join('\n')); console.log(errs.length ? 'ERRORS ' + errs.join(' | ') : 'no page errors'); await b.close();
