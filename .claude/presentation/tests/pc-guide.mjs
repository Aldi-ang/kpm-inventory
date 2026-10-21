// THIS WAY (v36): the "Mulai di sini" tag on the wheel, the next-slide plate in every slide, the closing slide sending the viewer to
// the first unseen slide, and the wheel turning to it on the way back. Real clock, headless Chrome over CDP.
// node cdp.mjs <file url> <out dir> <width> <height>
import { spawn } from 'node:child_process';
import { writeFileSync } from 'node:fs';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const [, , url, out, w = '390', h = '844'] = process.argv;
const port = 9300 + Math.floor(Math.random() * 500);
const chrome = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${port}`, `--user-data-dir=${out}/cdp-prof-${w}`, '--hide-scrollbars', '--allow-file-access-from-files', 'about:blank']);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let list = [];
for (let i = 0; i < 60 && !list.length; i++) { try { list = (await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()).filter((t) => t.type === 'page'); } catch { /* not up yet */ } if (!list.length) await sleep(200); }
const ws = new WebSocket(list[0].webSocketDebuggerUrl);
await new Promise((r) => { ws.onopen = r; });
let id = 0; const pend = new Map(), errors = [];
ws.onmessage = (m) => { const d = JSON.parse(m.data); if (d.id && pend.has(d.id)) { pend.get(d.id)(d); pend.delete(d.id); }
  if (d.method === 'Runtime.exceptionThrown') errors.push(d.params.exceptionDetails.exception?.description || d.params.exceptionDetails.text); };
const send = (method, params = {}) => new Promise((r) => { const i = ++id; pend.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
const ev = async (expr) => { const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true });
  return r.result?.exceptionDetails ? 'EXC ' + (r.result.exceptionDetails.exception?.description || r.result.exceptionDetails.text) : r.result?.result?.value; };
const shots = [];
const shot = async (name, cap) => { const r = await send('Page.captureScreenshot', { format: 'png' }); writeFileSync(`${out}/${w}-${name}.png`, Buffer.from(r.result.data, 'base64')); shots.push([`${w}-${name}.png`, cap]); };
await send('Page.enable'); await send('Runtime.enable');
await send('Emulation.setDeviceMetricsOverride', { width: +w, height: +h, deviceScaleFactor: 1, mobile: +w < 1024 });
await send('Page.navigate', { url }); await sleep(3000);
/* what the viewer is told: the front card, the card carrying the wheel tag and its words, the plate's words, opacity and box,
   the ticked cards, and whether the plate overlaps the picker's dot */
const STATE = `(() => { const d = document, r = d.documentElement, sc = d.querySelector('main > .scene.solo-on'), g = d.querySelector('.guide');
  const wg = d.querySelector('.wguide'), card = wg && wg.closest('.wcard'), gb = g.getBoundingClientRect(), db = d.getElementById('snavDot').getBoundingClientRect();
  return 'slide=' + (sc ? sc.id : '-') + ' front=' + (wIndex() + 1) + ' tag=' + (card ? card.querySelector('.wn').textContent + ':' + wg.textContent.trim() : 'none')
    + ' plate=' + (getComputedStyle(g).display === 'none' ? 'hidden' : JSON.stringify(g.textContent.trim()) + '@' + (+getComputedStyle(g).opacity).toFixed(2) + ' to=' + g.dataset.to
      + ' box=' + [gb.left, gb.top, gb.width, gb.height].map(Math.round).join(',') + ' overDot=' + (gb.left < db.right && gb.right > db.left && gb.top < db.bottom && gb.bottom > db.top))
    + ' picker=' + (d.getElementById('snav').classList.contains('open') ? 'open' : 'dot')
    + ' chev=' + [...d.querySelectorAll((r.classList.contains('solo') ? '.guide' : '.wguide') + ' .chev > span')].map((s) => (+getComputedStyle(s).opacity).toFixed(2)).join('/') + ' done=' + [...d.querySelectorAll('.wcard.wdone .wn')].map((n) => n.textContent.slice(0, 2)).join(',') + ' hold=' + (wHold > performance.now()) + ' busy=' + wBusy; })()`;
const log = [];
const step = async (name) => log.push(name + ': ' + await ev(STATE));
await step('load (opening up)');
await ev(`document.getElementById('introGo').click()`); await sleep(2600); await step('opening closed'); await shot('a-wheel', 'wheel: Mulai di sini on 01');
await ev(`wOpen(wIndex())`); await sleep(400); await step('01 opening ~400 ms (plate waits)'); await sleep(1400); await step('01 at 1.8 s (the picker peeks once, the plate waits under it)');
await shot('b-peek', 'slide 01, picker peeking'); await sleep(3400); await step('01 at 5.2 s (picker folded)'); await shot('b-slide1', 'slide 01 + plate');
await ev(`document.querySelector('.guide').click()`); await sleep(1600); await step('plate pressed -> 02'); await shot('c-slide2', 'slide 02 + plate');
await ev(`sGo(22)`); await sleep(1600); await step('jumped to 23 (closing)'); await shot('d-close', 'closing: first unseen');
await ev(`document.querySelector('.guide').click()`); await sleep(1600); await step('closing plate pressed');
await ev(`soloOff()`); await sleep(1500); await step('back to the wheel'); await shot('e-back', 'wheel turned to the next unseen');
await sleep(5200); await step('6 s later (spin resumes)');
writeFileSync(`${out}/${w}-guide.json`, JSON.stringify({ log, errors, shots }, null, 1));
console.log(log.join('\n') + '\nerrors: ' + (errors.length ? errors.join(' | ') : 'none'));
ws.close(); chrome.kill();
