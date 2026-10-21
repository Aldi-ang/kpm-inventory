// Real-clock driver for the presentation: headless Chrome over CDP, timed screenshots + state reads.
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
const STATE = `(() => { const d = document, r = d.documentElement, sc = d.querySelector('main > .scene.solo-on'), i = d.getElementById('intro');
  return 'solo=' + r.classList.contains('solo') + ' slide=' + (sc ? sc.id : '-') + ' wheelShown=' + (getComputedStyle(d.getElementById('fitur')).display !== 'none')
    + ' leftover=' + !!d.querySelector('.wfly, .wcover') + ' busy=' + wBusy + ' intro=' + (i ? i.className : 'none') + ' mainInert=' + d.querySelector('main').inert
    + ' bar=' + [...d.querySelectorAll('.bar .hubbtn')].filter((b) => getComputedStyle(b).display !== 'none').map((b) => b.id).join('+'); })()`;
const log = [];
const step = async (name) => log.push(name + ': ' + await ev(STATE));
await step('load');
await ev(`document.getElementById('introGo').click()`); await sleep(1900); await step('pressed opening'); await shot('a-wheel', 'wheel after the opening');
await ev(`wTheta = 0; wDraw(); wOpen(0)`);
await sleep(140); await shot('b-open1', 'open ~150 ms'); await sleep(140); await shot('b-open2', 'open ~330 ms'); await sleep(160); await shot('b-open3', 'open ~520 ms');
await sleep(700); await step('opened 01'); await shot('b-open4', 'open done');
await ev(`sGo(1)`); await sleep(110); await shot('c-chip1', 'chip 01->02 ~120 ms'); await sleep(700); await step('chip to 02'); await shot('c-chip2', 'chip done');
await ev(`soloOff()`); await sleep(160); await shot('d-close1', 'back to wheel ~180 ms'); await sleep(170); await shot('d-close2', 'back to wheel ~380 ms');
await sleep(700); await step('back to wheel'); await shot('d-close3', 'back to wheel done');
await ev(`document.getElementById('wBack').click()`); await sleep(240); await shot('e-back1', 'Pembuka ~260 ms: doors shut');
await sleep(480); await shot('e-back2', 'Pembuka ~760 ms: doors part'); await sleep(2300); await step('Pembuka 3 s'); await shot('e-back3', 'Pembuka 3 s: opening again');
await ev(`document.getElementById('introGo').click()`); await sleep(1900); await step('pressed opening again'); await shot('f-again', 'pressed again: wheel');
await ev(`wOpen(wIndex())`); await sleep(1300); await step('open again (2nd round)');
writeFileSync(`${out}/${w}-log.json`, JSON.stringify({ log, errors, shots }, null, 1));
console.log(log.join('\n') + '\nerrors: ' + (errors.length ? errors.join(' | ') : 'none'));
ws.close(); chrome.kill();
