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
await send('Page.addScriptToEvaluateOnNewDocument', { source: "if (location.hash.indexOf('robot') < 0) Object.defineProperty(navigator, 'webdriver', { get: () => false })" });
await send('Emulation.setDeviceMetricsOverride', { width: +w, height: +h, deviceScaleFactor: 1, mobile: +w < 1024 });
await send('Page.navigate', { url }); await sleep(3000);

// --- capybara scenario (appended after cdp.mjs lines 1-24) ---
const CAPY = `(() => { const c = document.querySelector('.capy'); if (!c) return 'no capy';
  const r = c.getBoundingClientRect(), f = c.querySelector('.fig');
  return 'shown=' + (getComputedStyle(c).display !== 'none') + ' x=' + Math.round(r.left) + '..' + Math.round(r.right) + ' y=' + Math.round(r.top) + '..' + Math.round(r.bottom)
    + ' deal=' + f.classList.contains('deal') + ' fig=' + f.style.transform; })()`;
const log = [];
const at = async (name, cap) => { log.push(name + ': ' + await ev(CAPY)); await shot(name, cap); };
await ev(`document.getElementById('introGo').click()`); await sleep(2000);
await at('capy-0', 'wheel, 5 s after load: not yet');
for (let k = 1; k <= 8; k++) { await sleep(1500); await at('capy-' + k, `wheel, +${(k * 1.5).toFixed(1)} s`); }
await ev(`(() => { const f = document.querySelector('.capy .fig'); if (getComputedStyle(document.querySelector('.capy')).display !== 'none') f.click(); })()`);
await sleep(400); await at('capy-tap', 'tapped: thumbs-up?');
await ev(`wTheta = 0; wDraw(); wOpen(0)`); await sleep(1200); await at('capy-slide', 'a slide opened while he is out');
await ev(`scrollTo(0, 400)`); await sleep(1500); await at('capy-scroll', 'after a scroll: he walks off');
await ev(`still = true; setMode()`); await sleep(500); await at('capy-lite', 'Lite on: gone');
writeFileSync(`${out}/${w}-log.json`, JSON.stringify({ log, errors, shots }, null, 1));
console.log(log.join('\n') + '\nerrors: ' + (errors.length ? errors.join(' | ') : 'none'));
ws.close(); chrome.kill();
