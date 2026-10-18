// Hover probe for the feature wheel (his 2026-10-19 ask): a mouse on it slows the spin GRADUALLY to a quarter, it never
// stops dead, and it speeds back up gradually when the mouse leaves. Real clock, headless Chrome over CDP, real mouse moves.
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
await send('Page.navigate', { url }); await sleep(3000);
await ev(`document.getElementById('introGo').click()`); await sleep(3500);   /* opening gone, the wheel up to full speed */
/* degrees a second, measured in the page: how far wTheta turned over ms */
const speed = async (ms) => +Number(await ev(`(async () => { const a = wTheta, t = performance.now(); await new Promise((r) => setTimeout(r, ${ms})); return -(wTheta - a) / ((performance.now() - t) / 1000); })()`)).toFixed(2);
const [cx, cy] = await ev(`(() => { const r = document.getElementById('wheel').getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; })()`);
const v0 = await speed(500);
await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: cx, y: cy });
const v1 = await speed(250); await sleep(1500); const v2 = await speed(500);
await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: cx, y: 5 });   /* off the wheel, onto the top bar */
const v3 = await speed(250); await sleep(1500); const v4 = await speed(500);
let fails = 0;
const ok = (name, pass, got) => { if (!pass) fails++; console.log((pass ? 'PASS ' : 'FAIL ') + name + '  (' + got + ')'); };
ok('full speed before the mouse', v0 > 8 && v0 < 11.5, v0 + ' deg/s');
ok('first 0.25 s on it: slowing, not stopped and not already slow', v1 > 3 && v1 < 9.8, v1 + ' deg/s');
ok('settled under the mouse: slow, never stopped', v2 > 1.5 && v2 < 4, v2 + ' deg/s');
ok('first 0.25 s after it leaves: speeding up, not a jump', v3 > 1.5 && v3 < 9, v3 + ' deg/s');
ok('full speed again', v4 > 8 && v4 < 11.5, v4 + ' deg/s');
ok('no script errors', !errors.length, errors.join(' | ') || 'none');
console.log(`${w}x${h}: ${6 - fails}/6`);
chrome.kill(); process.exit(fails ? 1 : 0);
