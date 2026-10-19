// Drag probe for the feature wheel (his 2026-10-19 ask: "reduce the sensitivity ... too sensitive and move too much",
// "slower and smoother"). A slow drag moves about one card per ~100 px, a hard flick glides at most two cards past the
// finger, and after release the wheel never jumps (frame-to-frame step stays small). Real clock, headless Chrome, CDP.
// node pc-drag.mjs <file url> <out dir> [width] [height]   (under 1024 wide = touch, else mouse)
import { spawn } from 'node:child_process';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const [, , url, out, w = '390', h = '844'] = process.argv;
const touch = +w < 1024;
const port = 9300 + Math.floor(Math.random() * 500);
const chrome = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${port}`, `--user-data-dir=${out}/cdp-prof-drag-${w}`, '--hide-scrollbars', '--allow-file-access-from-files', 'about:blank']);
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
await send('Emulation.setDeviceMetricsOverride', { width: +w, height: +h, deviceScaleFactor: 1, mobile: touch });
if (touch) await send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
await send('Page.navigate', { url: url + '?drag=' + w + '#nointro' }); await sleep(3000);
/* the lift, read inside the page the moment it happens: the time and where the wheel stood (pointerup, capture phase) */
await ev(`addEventListener('pointerup', () => { window.__up = performance.now(); window.__lift = wTheta; }, true)`);
const [cx, cy] = await ev(`(() => { const r = document.getElementById('wheel').getBoundingClientRect(); return [Math.round(r.left + r.width / 2), Math.round(r.top + r.height * .45)]; })()`);
const down = (x) => touch ? send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y: cy }] }) : send('Input.dispatchMouseEvent', { type: 'mousePressed', x, y: cy, button: 'left', clickCount: 1 });
const move = (x) => touch ? send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y: cy }] }) : send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y: cy, button: 'left', buttons: 1 });
const up = (x) => touch ? send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }) : send('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y: cy, button: 'left', clickCount: 1 });
/* one gesture: drag `dist` px left in `steps` moves `gap` ms apart, hold `hold` ms, lift; then wait until the wheel has
   settled (no drag, no tween) and return how far it turned in cards, and its biggest frame-to-frame step after the lift */
async function gesture(dist, steps, gap, hold) {
  await ev(`(() => { window.__th = []; window.__up = Infinity; const s = () => { window.__th.push([performance.now(), wTheta]); window.__raf = requestAnimationFrame(s); }; s(); window.__t0 = wTheta; })()`);
  await down(cx);
  for (let k = 1; k <= steps; k++) { await move(cx - dist * k / steps); await sleep(gap); }
  if (hold) await sleep(hold);
  await up(cx - dist);
  const r = await ev(`(async () => { const t = performance.now(); await new Promise((ok) => { const chk = () => { if (performance.now() - t > 3500 || (!wDrag && !wTween && performance.now() - t > 250)) ok(); else setTimeout(chk, 30); }; chk(); });
    cancelAnimationFrame(window.__raf); const after = [[window.__up, window.__lift], ...window.__th.filter(([tm]) => tm > window.__up)]; let mx = 0; for (let i = 1; i < after.length; i++) mx = Math.max(mx, Math.abs(after[i][1] - after[i - 1][1]));
    return [+(Math.abs(wTheta - window.__t0) / WSTEP).toFixed(2), +mx.toFixed(2), +(Math.abs(window.__lift - window.__t0) / WSTEP).toFixed(2)]; })()`);
  await sleep(1200); return r;
}
const [slowCards, , slowDrag] = await gesture(120, 24, 16, 160);
const [flickCards, flickStep] = await gesture(200, 5, 16, 0);
/* "make the screen fixed when on the carousel" / "the sliding feels bad on the phone": a steep swipe that starts on the
   wheel must leave the page where it is (touch only - a mouse drag never scrolls a page) */
const lock = [await ev(`getComputedStyle(document.getElementById('wheel')).touchAction`), 0, await ev('document.documentElement.scrollHeight')];
if (touch) {
  await ev(`window.__pc = 0; document.getElementById('wheel').addEventListener('pointercancel', () => { window.__pc++; })`);
  const y0 = await ev('scrollY + (visualViewport ? visualViewport.offsetTop : 0)');
  await send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: cx, y: cy }] });
  for (let k = 1; k <= 12; k++) { await send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: cx - k * 3, y: cy - k * 14 }] }); await sleep(16); }
  await send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await sleep(900);
  lock[1] = Math.round((await ev('scrollY + (visualViewport ? visualViewport.offsetTop : 0)')) - y0); lock[3] = await ev('window.__pc');
}
let fails = 0;
const ok = (name, pass, got) => { if (!pass) fails++; console.log((pass ? 'PASS ' : 'FAIL ') + name + '  (' + got + ')'); };
ok('slow 120 px drag turns the wheel about two thirds of a card', slowDrag >= .5 && slowDrag <= .9, slowDrag + ' cards under the finger, ' + slowCards + ' after it settles');
ok('hard flick stays within three cards of the start', flickCards >= .5 && flickCards <= 3.5, flickCards + ' cards');
ok('after the lift it glides, no jumps (max step per frame)', flickStep <= 3, flickStep + ' deg');
ok('touches on the wheel belong to the wheel (touch-action)', lock[0] === 'none', lock[0]);
ok('a steep swipe on the wheel does not move the page', lock[1] === 0, `page moved ${lock[1]} px; page ${lock[2]} px tall, screen ${h}`);
ok('a steep swipe is not taken from the wheel (no pointercancel)', !lock[3], (lock[3] ?? 'mouse, n/a') + ' cancels');
ok('no script errors', !errors.length, errors.join(' | ') || 'none');
console.log(`${w}x${h} ${touch ? 'touch' : 'mouse'}: ${7 - fails}/7`);
chrome.kill(); process.exit(fails ? 1 : 0);
