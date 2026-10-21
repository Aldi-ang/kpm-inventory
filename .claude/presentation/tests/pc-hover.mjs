// Still-wheel probe (his v37 ask, 2026-10-22, reversing the 2026-10-19 spin): the feature wheel never turns by itself. Card 01 is
// at the front from the first frame, under the opening and after it closes; a mouse resting on it moves nothing; the only turn
// it makes alone is on the way back from a slide (to the next unseen card), and then it stays there. Real clock, headless
// Chrome over CDP, real mouse moves.
// node pc-hover.mjs <file url> <out dir> [width] [height]
import { spawn } from 'node:child_process';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const [, , url, out, w = '1440', h = '900'] = process.argv;
const port = 9300 + Math.floor(Math.random() * 500);
const chrome = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${port}`, `--user-data-dir=${out}/cdp-prof-hover-${w}`, '--hide-scrollbars', '--allow-file-access-from-files', 'about:blank']);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let list = [];
for (let i = 0; i < 60 && !list.length; i++) { try { list = (await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()).filter((t) => t.type === 'page'); } catch { /* not up yet */ } if (!list.length) await sleep(250); }
const ws = new WebSocket(list[0].webSocketDebuggerUrl);
await new Promise((r) => { ws.onopen = r; });
let id = 0; const pend = new Map(), errors = [];
ws.onmessage = (m) => { const d = JSON.parse(m.data); if (d.id && pend.has(d.id)) { pend.get(d.id)(d); pend.delete(d.id); }
  if (d.method === 'Runtime.exceptionThrown') errors.push(d.params.exceptionDetails.exception?.description || d.params.exceptionDetails.text); };
const send = (method, params = {}) => new Promise((r) => { const i = ++id; pend.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
const ev = async (expr) => { const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true });
  return r.result?.exceptionDetails ? 'EXC ' + (r.result.exceptionDetails.exception?.description || r.result.exceptionDetails.text) : r.result?.result?.value ?? r.result?.result?.unserializableValue; };
await send('Page.enable'); await send('Runtime.enable');
await send('Emulation.setDeviceMetricsOverride', { width: +w, height: +h, deviceScaleFactor: 1, mobile: +w < 1024 });
await send('Page.navigate', { url }); await sleep(300);
/* how far the wheel turned over ms, in degrees, and the front card's number (1-based) at the end */
const drift = async (ms) => JSON.parse(await ev(`(async () => { const a = wTheta; await new Promise((r) => setTimeout(r, ${ms})); return JSON.stringify([+Math.abs(wTheta - a).toFixed(2), wIndex() + 1]); })()`));
const [d0, f0] = await drift(2500);   /* the opening is up: the wheel sits behind it */
await ev(`document.getElementById('introGo').click()`); await sleep(2000);
const [d1, f1] = await drift(6000);   /* the old spin was 5 deg/s here, after a 6 s hold */
const [cx, cy] = await ev(`(() => { const r = document.getElementById('wheel').getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; })()`);
await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: cx, y: cy });
const [d2] = await drift(2000);
await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: cx, y: 5 });
await ev(`wOpen(0)`); await sleep(1500); await ev(`soloOff()`);
const [d3, f3] = await drift(1500);   /* the way back: turns from 01 to the next unseen card */
const [d4, f4] = await drift(8000);
let fails = 0;
const ok = (name, pass, got) => { if (!pass) fails++; console.log((pass ? 'PASS ' : 'FAIL ') + name + '  (' + got + ')'); };
ok('under the opening: still, card 01 in front', d0 === 0 && f0 === 1, `${d0} deg, front ${f0}`);
ok('opening closed: still for 6 s, card 01 in front', d1 === 0 && f1 === 1, `${d1} deg, front ${f1}`);
ok('a mouse resting on it moves nothing', d2 === 0, `${d2} deg`);
ok('back from slide 01: turns once, to card 02', d3 > 0 && f3 === 2, `${d3} deg, front ${f3}`);
ok('then stays there 8 s', d4 === 0 && f4 === 2, `${d4} deg, front ${f4}`);
ok('no script errors', !errors.length, errors.join(' | ') || 'none');
console.log(`${w}x${h}: ${6 - fails}/6`);
chrome.kill(); process.exit(fails ? 1 : 0);
