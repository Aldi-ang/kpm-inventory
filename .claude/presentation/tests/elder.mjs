// The elder presentation (kpm-sederhana.html), every screen, phone 375 + PC 1440, light + dark.
// Fails on: text under 20px on the phone, a page that scrolls sideways, blue or green anywhere, gold text on the
// light page, a buttons under 48px, a screen whose bottom the big button cannot bring into view, a theme toggle
// that does nothing, any page error. Runs on the PC with system Chrome (no Playwright here):
//   node .claude/presentation/tests/elder.mjs [shotsDir]
import fs from 'fs';
import os from 'os';
import path from 'path';
import { spawn } from 'child_process';
import { fileURLToPath, pathToFileURL } from 'url';

const CHROME = process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const page = process.env.PAGE ? pathToFileURL(process.env.PAGE).href : pathToFileURL(path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'kpm-sederhana.html')).href;
const shots = process.argv[2];
if (shots) fs.mkdirSync(shots, { recursive: true });
const port = 9334, sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const proc = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${port}`, `--user-data-dir=${fs.mkdtempSync(path.join(os.tmpdir(), 'elder-'))}`,
  '--hide-scrollbars', '--no-first-run', 'about:blank'], { stdio: 'ignore' });
let tgt;
for (let i = 0; i < 50 && !tgt; i++) { await sleep(200); try { tgt = (await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()).find((t) => t.type === 'page'); } catch {} }
const ws = new WebSocket(tgt.webSocketDebuggerUrl);
await new Promise((r) => ws.addEventListener('open', r));
let id = 0; const wait = new Map(), errs = [];
ws.addEventListener('message', (m) => {
  const d = JSON.parse(m.data);
  if (d.id && wait.has(d.id)) { wait.get(d.id)(d); wait.delete(d.id); }
  if (d.method === 'Runtime.exceptionThrown') errs.push(d.params.exceptionDetails?.exception?.description?.split('\n')[0]);
});
const send = (method, params = {}) => new Promise((r) => { const i = ++id; wait.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
const ev = async (expression) => { const r = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
  if (r.result?.exceptionDetails) throw new Error(r.result.exceptionDetails.exception?.description); return r.result.result.value; };
await send('Runtime.enable'); await send('Page.enable');

/* measured inside the page for the screen on show */
const METRICS = `(() => {
  const vis = [...document.querySelectorAll('body *')].filter((e) => e.getClientRects().length);
  const txt = vis.filter((e) => [...e.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim()));
  const hsl = (c) => { const m = c.match(/rgba?\\(([\\d.]+), ([\\d.]+), ([\\d.]+)(?:, ([\\d.]+))?/); if (!m || (m[4] !== undefined && +m[4] === 0)) return null;
    const [r, g, b] = [+m[1], +m[2], +m[3]], mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
    let h = 0; if (d) h = mx === r ? 60 * (((g - b) / d) % 6) : mx === g ? 60 * ((b - r) / d + 2) : 60 * ((r - g) / d + 4);
    return { h: (h + 360) % 360, s: d ? d / (255 - Math.abs(mx + mn - 255)) : 0, l: (mx + mn) / 510 }; };
  const bad = [];
  for (const e of vis) { const cs = getComputedStyle(e);
    for (const p of ['color', 'backgroundColor', 'borderTopColor', 'borderBottomColor']) { const c = hsl(cs[p]);
      if (c && c.s > .2 && c.h > 75 && c.h < 265) bad.push('blue/green ' + e.tagName + ' ' + p + ' ' + cs[p]); } }
  if (document.documentElement.dataset.tema !== 'gelap') for (const e of txt) { const c = hsl(getComputedStyle(e).color);
    if (c && c.h > 25 && c.h < 50 && c.s > .5 && c.l > .45) bad.push('gold text on light: ' + e.textContent.trim().slice(0, 30)); }
  for (const b of document.querySelectorAll('button')) if (b.getClientRects().length && b.getBoundingClientRect().height < 48) bad.push('small button ' + b.id);
  /* names of screens and screen parts this page never shows: his 2026-10-27 "dont tell the viewer something u dont show" */
  const tell = document.querySelector('main').innerText.match(/\\bpeti\\b|Di aplikasi|Putar Ulang|diputar ulang|Replay|Fleet & Roster|Notification Bell|Ponder|Lite Mode|Restock Vault|Master Vault|Agent Inventory|Muat Van|WANTED|Auto locator|blind count|menyeret|bingkai|brankas|kartu toko|layar yang sama/i);
  if (tell) bad.push('tells what it does not show: "' + tell[0] + '"');
  /* his next call, same day: "Data contoh" goes, and every screen carries a picture ("all text is overwhelming") */
  if (/Data contoh/i.test(document.body.innerText)) bad.push('"Data contoh" is back');
  if (document.querySelector('.say') && !document.querySelector('.pic')) bad.push('a screen with no picture');
  for (const im of document.querySelectorAll('main img')) if (!im.complete || !im.naturalWidth) bad.push('picture did not load: ' + im.getAttribute('src'));
  return { min: Math.min(...txt.map((e) => parseFloat(getComputedStyle(e).fontSize))), wide: document.documentElement.scrollWidth > innerWidth,
    bad: [...new Set(bad)], kick: (document.querySelector('.kick') || document.querySelector('h1')).textContent.slice(0, 60) };
})()`;

const fails = [], tall = {};
let total = 0;
for (const [w, h] of [[375, 812], [1440, 900]]) {
  for (const tema of ['terang', 'gelap']) {
    await send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 1, mobile: w < 768 });
    await send('Page.navigate', { url: 'about:blank' }); await sleep(100);
    await send('Page.navigate', { url: `${page}?tema=${tema}#0` }); await sleep(800);
    await ev('document.fonts.ready.then(() => document.fonts.check("700 22px \\"Atkinson Hyperlegible\\""))').then((ok) => { if (!ok) fails.push('font did not load'); });
    total = await ev('S.length');
    for (let i = 0; i < total; i++) {
      const m = await ev(`(async () => { location.hash = '${i}'; render();
        await Promise.all([...document.querySelectorAll('main img')].map((im) => im.decode().catch(() => {}))); return ${METRICS}; })()`);
      const tag = `${w} ${tema} #${i} (${m.kick})`;
      if (w < 768 && m.min < 20) fails.push(`${tag}: text ${m.min}px`);
      if (m.wide) fails.push(`${tag}: scrolls sideways`);
      for (const b of m.bad) fails.push(`${tag}: ${b}`);
      if (shots) { const s = await send('Page.captureScreenshot', { format: 'png' }); fs.writeFileSync(path.join(shots, `${tema}-${w}-${String(i).padStart(2, '0')}.png`), Buffer.from(s.result.data, 'base64')); }
      const r = await ev(`(() => { let n = 0; while (below() && n < 12) { document.querySelector('#next').click(); n++; } return { n, stuck: below(), at: location.hash }; })()`);
      if (r.stuck || r.at !== '#' + i) fails.push(`${tag}: bottom not reachable with the big button (${JSON.stringify(r)})`);
      if (r.n && tema === 'terang') (tall[w] ||= []).push(i);
    }
  }
}
/* the toggle flips the look and names the other one */
const t = await ev(`(() => { const a = document.documentElement.dataset.tema; document.querySelector('#tema').click();
  return [a, document.documentElement.dataset.tema, document.querySelector('#tema').textContent, getComputedStyle(document.body).backgroundColor]; })()`);
if (t[0] === t[1] || !/terang|gelap/.test(t[2])) fails.push('toggle: ' + JSON.stringify(t));
if (errs.length) fails.push(...errs.map((e) => 'page error: ' + e));
ws.close(); proc.kill();
console.log(`${total} screens x 2 widths x 2 themes, toggle ${t[0]} -> ${t[1]} ("${t[2]}")`);
for (const w in tall) console.log(`taller than the screen at ${w} (big button scrolls first): ${tall[w].length} - #${tall[w].join(' #')}`);
console.log(fails.length ? 'FAIL\n' + fails.join('\n') : 'PASS');
process.exit(fails.length ? 1 : 0);
