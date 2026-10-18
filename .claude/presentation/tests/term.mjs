import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';
const b = await chromium.launch(); const out = [];
for (const w of [390, 768, 1024, 1100, 1280, 1440, 1920]) {
  const pg = await b.newPage({ viewport: { width: w, height: 900 } });
  await pg.goto('file://' + process.cwd() + '/kpm-presentation.html#still,nointro,all'); await pg.waitForTimeout(300);
  await pg.evaluate(() => document.getElementById('terminal').scrollIntoView());
  const r = await pg.evaluate(() => {
    const t = document.querySelector('#terminal .tray').getBoundingClientRect(), n = document.querySelector('#terminal .slot').getBoundingClientRect();
    const kids = [...document.querySelectorAll('#terminal .tray *')].map((e) => e.getBoundingClientRect()).filter((r) => r.width);
    const maxR = Math.max(...kids.map((r) => r.right));
    const side = n.top < t.bottom && n.bottom > t.top;
    return { spill: Math.round(maxR - t.right), overlap: side ? Math.round(t.right - n.left) : 0 };
  });
  const bad = r.spill > 0 || r.overlap > 0;
  out.push(`${bad ? 'FAIL' : 'PASS'} ${w}px tray content past its edge: ${r.spill}px, tray under nota: ${r.overlap}px`);
  if (w === 1100 || w === 1440) await (await pg.$('#terminal')).screenshot({ path: `shots/term-${w}.png` });
  await pg.close();
}
console.log(out.join('\n')); await b.close();
