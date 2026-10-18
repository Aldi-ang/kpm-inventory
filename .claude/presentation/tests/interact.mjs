import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';
const url = 'file://' + process.cwd() + '/kpm-presentation.html';
const b = await chromium.launch(); const errs = []; const R = [];
const ok = (name, cond, info = '') => R.push(`${cond ? 'PASS' : 'FAIL'} ${name} ${info}`);
for (const [w, h, hash] of [[1440, 900, ''], [390, 844, ''], [390, 844, '#still']]) {
  const pg = await b.newPage({ viewport: { width: w, height: h }, hasTouch: w < 500 });
  pg.on('pageerror', (e) => errs.push(`${w}${hash}: ${e.message}`));
  await pg.goto(url + (hash ? hash + ',all' : '#all')); await pg.waitForTimeout(500); if (await pg.$('#introGo')) { await pg.click('#introGo'); await pg.waitForTimeout(1700); }
  const tag = `[${w}${hash}]`;
  ok(tag + ' no sideways scroll', await pg.evaluate(() => document.documentElement.scrollWidth <= innerWidth), await pg.evaluate(() => document.documentElement.scrollWidth));
  ok(tag + ' 23 scenes, bar says /23', await pg.evaluate(() => document.querySelectorAll('.scene').length === 23 && document.querySelector('.now').textContent.includes('/ 23')));
  for (const id of ['p3Orb', 'stkOrb', 'secOrb', 'netOrb', 'stage1', 'stage3']) {
    await pg.evaluate((id) => document.getElementById(id).scrollIntoView({ block: 'center' }), id); await pg.waitForTimeout(w < 500 ? 300 : 1700);
    const rig = id === 'stage1' ? '#rig1' : id === 'stage3' ? '#rig3' : '#' + id + ' .rig';
    const before = await pg.evaluate((r) => document.querySelector(r).style.getPropertyValue('--rz'), rig);
    const bx = await (await pg.$('#' + id)).boundingBox();
    await pg.mouse.move(bx.x + bx.width / 2, bx.y + bx.height / 2); await pg.mouse.down(); await pg.mouse.move(bx.x + bx.width / 2 + 120, bx.y + bx.height / 2, { steps: 6 }); await pg.mouse.up();
    const after = await pg.evaluate((r) => document.querySelector(r).style.getPropertyValue('--rz'), rig);
    ok(`${tag} drag turns ${id}`, before !== after, `${before} -> ${after}`);
  }
  /* tap a bar in the products chart: the readout names it */
  await pg.evaluate(() => document.getElementById('p3Orb').scrollIntoView({ block: 'center' })); await pg.waitForTimeout(400);
  await pg.evaluate(() => { const b = document.querySelectorAll('#p3Fl .b3')[0 * 5 + 3]; b.click(); });
  await pg.waitForTimeout(400);
  ok(tag + ' bar tap reads Produk D Hari ini', (await pg.textContent('#p3Read')).startsWith('Produk D · Hari ini · 30 bks'), await pg.textContent('#p3Read'));
  await pg.click('#p3Keys .key[data-r="3"]'); await pg.waitForTimeout(300);
  ok(tag + ' key Tahun lights row 3', (await pg.textContent('#p3Read')).includes('Tahun ini') && await pg.evaluate(() => document.querySelector('#p3Keys .key[data-r="3"]').getAttribute('aria-pressed') === 'true'), await pg.textContent('#p3Read'));
  /* security tower tap lights the matching row of the list */
  await pg.evaluate(() => document.querySelectorAll('#secFl .b3')[0].click()); await pg.waitForTimeout(200);
  ok(tag + ' tower tap lights T2 row', await pg.evaluate(() => document.querySelectorAll('#tiers .tr')[0].classList.contains('on') && !document.querySelectorAll('#secFl .b3')[0].classList.contains('dim')));
  /* remote scene: feed fills */
  await pg.evaluate(() => document.getElementById('dimana').scrollIntoView()); await pg.waitForTimeout(hash ? 400 : 5000);
  ok(tag + ' remote feed has 4 lines', await pg.evaluate(() => document.querySelectorAll('#feed .lg').length) === 4, await pg.evaluate(() => document.querySelectorAll('#feed .lg').length));
  if (hash) { await pg.evaluate(() => document.getElementById('produk').scrollIntoView()); await pg.waitForTimeout(300); await (await pg.$('#produk')).screenshot({ path: 'shots/still-produk.png' }); }
  await pg.close();
}
console.log(R.join('\n')); console.log(errs.length ? 'ERRORS:\n' + errs.join('\n') : 'no page errors');
await b.close();
