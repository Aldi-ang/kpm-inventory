import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';
const url = 'file://' + process.cwd() + '/kpm-presentation.html';
const b = await chromium.launch(); const R = []; const errs = [];
const ok = (n, c, i = '') => R.push(`${c ? 'PASS' : 'FAIL'} ${n} ${i}`);
const st = (pg) => pg.evaluate(() => { const n = document.getElementById('snav'), r = n.getBoundingClientRect(), s = document.getElementById('snavList');
  return { open: n.classList.contains('open'), w: Math.round(r.width), l: r.left, r: r.right, b: r.bottom, dot: document.querySelector('#snavDot b').textContent, sn: document.getElementById('sn').textContent,
    cur: document.querySelector('main > .scene.solo-on')?.id, sw: s.scrollWidth, cw: s.clientWidth, sl: s.scrollLeft, chips: s.children.length, solo: document.documentElement.classList.contains('solo'), vw: innerWidth, vh: innerHeight }; });
const curVisible = (pg) => pg.evaluate(() => { const s = document.getElementById('snavList').getBoundingClientRect(), c = document.querySelector('.snav-c[aria-current="true"]').getBoundingClientRect(); return c.left >= s.left - 1 && c.right <= s.right + 1; });
for (const [w, h] of [[320, 568], [390, 844], [1440, 900]]) {
  const pg = await b.newPage({ viewport: { width: w, height: h } }); pg.on('pageerror', (e) => errs.push(`${w}: ${e.message}`)); const t = `[${w}]`;
  await pg.goto(url + '#nointro'); await pg.waitForTimeout(500);
  await pg.click('#wOpen'); await pg.mouse.move(5, 300); await pg.waitForTimeout(1300);
  let s = await st(pg);
  ok(t + ' slide opens with the dot, collapsed', s.solo && !s.open && s.w === 56 && s.dot === s.sn, JSON.stringify(s));
  ok(t + ' dot inside the screen', s.l >= 0 && s.r <= s.vw && s.b <= s.vh);
  await pg.waitForTimeout(1300); s = await st(pg);
  ok(t + ' opens once by itself (the peek)', s.open && Math.abs(s.w - Math.min(s.vw - 24, 760)) <= 2, `w=${s.w}`);
  ok(t + ' 23 chips, strip scrolls sideways', s.chips === 23 && s.sw > s.cw, `${s.sw}>${s.cw}`);
  ok(t + ' current slide chip is in view', await curVisible(pg));
  await pg.screenshot({ path: `shots/nav-open-${w}.png` });
  await pg.waitForTimeout(3000); s = await st(pg);
  ok(t + ' folds back after ~2.5s untouched', !s.open && s.w === 56, `w=${s.w}`);
  await pg.screenshot({ path: `shots/nav-dot-${w}.png` });
  await pg.click('#snavDot'); await pg.waitForTimeout(170); await pg.screenshot({ path: `shots/nav-mid-${w}.png` }); await pg.waitForTimeout(700);
  ok(t + ' tap the dot opens it', (await st(pg)).open);
  await pg.evaluate(() => { const s = document.getElementById('snavList'); s.scrollLeft = s.scrollWidth; }); await pg.waitForTimeout(150);
  await pg.click('.snav-c:last-child'); await pg.waitForTimeout(700); s = await st(pg);
  ok(t + ' chip 23 opens the closing slide, picker stays open', s.cur === 'angka' && s.sn === '23' && s.dot === '23' && s.open, JSON.stringify(s));
  await pg.evaluate(() => { const s = document.getElementById('snavList'); s.scrollLeft = 0; }); await pg.waitForTimeout(150);
  await pg.click('.snav-c:nth-child(3)'); await pg.waitForTimeout(700); s = await st(pg);
  ok(t + ' chip 03 opens slide 03', s.sn === '03' && s.cur === 'ulang', s.cur);
  await pg.mouse.click(10, 200); await pg.waitForTimeout(500);
  ok(t + ' tap outside folds it at once', !(await st(pg)).open);
  if (w === 1440) {
    await pg.click('#snavDot'); await pg.waitForTimeout(600);
    const sb = await (await pg.$('#snavList')).boundingBox(); await pg.mouse.move(sb.x + sb.width / 2, sb.y + sb.height / 2);
    const l0 = (await st(pg)).sl; await pg.mouse.wheel(0, 400); await pg.waitForTimeout(300);
    ok(t + ' mouse wheel scrolls the strip sideways', (await st(pg)).sl > l0);
    await pg.mouse.move(sb.x + sb.width / 2 + 100, sb.y + sb.height / 2, { steps: 2 }); await pg.mouse.down(); await pg.mouse.move(sb.x + 60, sb.y + sb.height / 2, { steps: 6 }); await pg.mouse.up(); await pg.waitForTimeout(100);
    ok(t + ' mouse drag scrolls the strip, no slide change', (await st(pg)).sl > l0 + 100 && (await st(pg)).sn === '03');
    await pg.waitForTimeout(3200); ok(t + ' stays open while the mouse is on it', (await st(pg)).open);
    await pg.mouse.move(5, 300); await pg.waitForTimeout(3200); ok(t + ' folds after the mouse leaves', !(await st(pg)).open);
  }
  await pg.click('#snavDot'); await pg.waitForTimeout(500); await pg.keyboard.press('Escape'); await pg.waitForTimeout(400); s = await st(pg);
  ok(t + ' Esc folds the picker first, slide stays', !s.open && s.solo);
  await pg.keyboard.press('Escape'); await pg.waitForTimeout(900);
  ok(t + ' second Esc goes back to the wheel', !(await st(pg)).solo);
  await pg.click('#wOpen'); await pg.waitForTimeout(1500);
  await pg.focus('#snavDot'); await pg.keyboard.press('Enter'); await pg.waitForTimeout(300);
  ok(t + ' keyboard: Enter on the dot opens it, focus on the current chip', await pg.evaluate(() => document.activeElement?.getAttribute('aria-current') === 'true' && document.getElementById('snav').classList.contains('open')));
  await pg.waitForTimeout(3000); ok(t + ' keyboard focus keeps it open', (await st(pg)).open);
  await pg.click('#snavHome'); await pg.waitForTimeout(900); s = await st(pg);
  ok(t + ' gold button goes back to the wheel', !s.solo && !s.open);
  ok(t + ' no sideways page scroll', await pg.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  await pg.close();
}
{ const pg = await b.newPage({ viewport: { width: 390, height: 844 } }); pg.on('pageerror', (e) => errs.push(`still: ${e.message}`));
  await pg.goto(url + '#still,nointro'); await pg.waitForTimeout(300); await pg.click('#wOpen'); await pg.waitForTimeout(150);
  await pg.click('#snavDot'); await pg.waitForTimeout(60); let s = await st(pg);
  ok('[still] opens at once, full width', s.open && s.w === 366, `w=${s.w}`);
  await pg.click('.snav-c:nth-child(2)'); await pg.waitForTimeout(100); s = await st(pg);
  ok('[still] chip changes slide at once', s.sn === '02');
  await pg.click('#snavHome'); await pg.waitForTimeout(100); ok('[still] back to the wheel', !(await st(pg)).solo);
  await pg.close(); }
console.log(R.join('\n')); console.log(errs.length ? 'ERRORS ' + errs.join(' | ') : 'no page errors'); await b.close();
