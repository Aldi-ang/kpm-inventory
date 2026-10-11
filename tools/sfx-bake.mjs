/* Renders Aldi's SOUND STUDIO saves into files for the app.
   Run: node tools/sfx-bake.mjs   (needs ffmpeg on PATH; writes public/sounds/chest-*.mp3 and msg-*.mp3)

   Each studio (a prototype artifact) plays a moment as: his recording, cut to his start/end, at his pitch,
   through a high-pass at his bass cut (the message studio only), 4 ms in / 25 ms out, at loudness x master,
   plus a share of that studio's room (a short convolution tail) set by ROOM. An <audio> element can do none
   of that live, so it is rendered here the way the studio's Web Audio graph does it, and the app plays the
   result as is. He changes a sound: he presses Save in the studio, the new numbers from sfx/settings go into
   the studio's block below, and this runs again.
     - the van-loading chests: https://claude.ai/artifact/M3xbaPAJ9LT7FL1ETmXvuu (tools/sfx-kenney.js, Kenney RPG Audio, CC0)
     - the message strip:      https://claude.ai/artifact/AmgCRrR8s8MfPaAxfPQtNr (Kenney Interface Sounds, CC0, read from
       the A-Brain vault's Raw/2026-10-10-sfx-packs - not in the repo; if missing, re-download kenney.nl "Interface Sounds") */
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { CAPY_VOICE, INTRO_MIX, capyFiles, capyFile } from '../src/config/capyVoice.js';
import './chip.js';                         // the studio's own synth (a byte copy of the published studio's chip.js) -> globalThis.KPM_CHIP

/* sfx/settings version 2, saved by Aldi 2026-09-23 11:58 WIB; MUAT VAN (done) kept as is 2026-09-24 */
const SET = { room: .33, master: .62, ev: {
  enderOpen:  { src: 'cloth2',             start: 0,    end: .415, vol: .6,  rate: .96 },
  enderClose: { src: 'doorClose_4',        start: 0,    end: .38,  vol: .75, rate: .77 },
  woodOpen:   { src: 'cloth1',             start: 0,    end: .36,  vol: .55, rate: .89 },
  woodClose:  { src: 'doorClose_4',        start: 0,    end: .54,  vol: .55, rate: 1 },
  pick:       { src: 'handleSmallLeather', start: .04,  end: .22,  vol: 1.5, rate: 1.1 },
  land:       { src: 'bookPlace1',         start: .055, end: .09,  vol: .35, rate: .97 },
  page:       { src: 'bookFlip3',          start: 0,    end: .231, vol: .9,  rate: .95 },
  refuse:     { src: 'dropLeather',        start: 0,    end: .28,  vol: .8,  rate: .9 },
  done:       { src: 'metalLatch',         start: 0,    end: .262, vol: .8,  rate: 1 },
} };
/* the studio's moment -> the app's file (woodOpen/woodClose are the brown van chest; done is MUAT VAN) */
const FILE = { enderOpen: 'chest-ender-open', enderClose: 'chest-ender-close', woodOpen: 'chest-van-open',
  woodClose: 'chest-van-close', pick: 'chest-pick', land: 'chest-land', page: 'chest-page',
  refuse: 'chest-refuse', done: 'chest-load' };

/* the message studio's sfx/settings version 1, saved by Aldi 2026-10-10 22:24 WIB. Only the two he accepted:
   the capybara and the intro he rejected (*"the capybara talk is not satisfying enough"*), so they are not baked. */
const MSG = { room: .6, master: 1, ev: {
  msg:  { src: 'confirmation_002', start: 0, end: .575, vol: .29, rate: 1.8, hp: 180 },
  fail: { src: 'error_002',        start: 0, end: .194, vol: .14, rate: 1,   hp: 0 },
} };
const MSG_FILE = { msg: 'msg-in', fail: 'msg-fail' };

const SR = 44100;
const pack = fs.readFileSync(new URL('./sfx-kenney.js', import.meta.url), 'utf8');
const KENNEY = new URL('../../A-Brain/Raw/2026-10-10-sfx-packs/kenney_interface-sounds/Audio/', import.meta.url);
const OUT = new URL('../public/sounds/', import.meta.url);

function decode(mp3) {
  const r = spawnSync('ffmpeg', ['-v', 'error', '-f', 'mp3', '-i', 'pipe:0', '-f', 'f32le', '-ac', '1', '-ar', String(SR), 'pipe:1'],
    { input: mp3, maxBuffer: 1 << 26 });
  if (r.status) throw new Error(String(r.stderr));
  /* The browser's decoder clamps to full scale and ffmpeg's does not: metalLatch decodes to a 1.71 peak here and
     1.00 in the studio (measured 2026-09-24). He heard the clamped one, so it is clamped here too. */
  return new Float32Array(new Uint8Array(r.stdout).buffer).map(v => Math.max(-1, Math.min(1, v)));
}
function chestRecording(name) {
  const m = pack.match(new RegExp('"' + name + '": "([^"]+)"'));
  if (!m) throw new Error('no recording named ' + name);
  return decode(Buffer.from(m[1], 'base64'));
}
/* the message studio played each .ogg as the mp3 its build-pack.mjs made (mono, 44.1 kHz, 112k) - same here */
function studioRecording(name) {
  const r = spawnSync('ffmpeg', ['-v', 'error', '-i', fileURLToPath(new URL(name + '.ogg', KENNEY)),
    '-ac', '1', '-ar', '44100', '-b:a', '112k', '-f', 'mp3', 'pipe:1'], { maxBuffer: 1 << 26 });
  if (r.status) throw new Error(name + ': ' + r.stderr);
  return decode(r.stdout);
}

/* a studio's room(), sample for sample: two channels of darkened noise, silent for the first few ms, dying away */
function rng(seed) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296 * 2 - 1; }; }
function room(seconds, dark, quiet, decay, seed) {
  const N = Math.floor(SR * seconds);
  const IR = [0, 1].map(ch => {
    const d = new Float32Array(N), r = rng(seed + ch); let y = 0;
    for (let i = 0; i < N; i++) { y += dark * (r() - y); d[i] = i < SR * quiet ? 0 : y * Math.exp(-i / (SR * decay)); }
    return d;
  });
  /* a ConvolverNode normalises its impulse by default (Web Audio spec, ConvolverNode "normalize"); same scale */
  let power = 0;
  for (const d of IR) for (const v of d) power += v * v;
  return { N, IR, NORM: 0.00125 / Math.max(Math.sqrt(power / (2 * N)), 0.000125) };
}

/* the message studio's BiquadFilterNode 'highpass', Q .707 - for this type the Web Audio spec reads Q in dB */
function highpass(x, f, q) {
  const w = 2 * Math.PI * f / SR, c = Math.cos(w), a = Math.sin(w) / (2 * Math.pow(10, q / 20)), a0 = 1 + a;
  const b0 = (1 + c) / 2 / a0, b1 = -(1 + c) / a0, a1 = -2 * c / a0, a2 = (1 - a) / a0;
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  return x.map(v => { const y = b0 * v + b1 * x1 + b0 * x2 - a1 * y1 - a2 * y2; x2 = x1; x1 = v; y2 = y1; y1 = y; return y; });
}

function render(s, set, rec, { N, IR, NORM }) {
  const b = rec(s.src), dur = b.length / SR;
  const start = Math.min(s.start, dur - .02), end = Math.max(start + .02, Math.min(s.end, dur));
  const len = (end - start) / s.rate, n = Math.round(len * SR), v = s.vol * set.master, hold = Math.max(.005, len - .025);
  let x = new Float64Array(n);
  for (let k = 0; k < n; k++) {
    const p = start * SR + k * s.rate, i = Math.floor(p), f = p - i;   // playbackRate = linear read
    x[k] = (b[i] ?? 0) * (1 - f) + (b[i + 1] ?? 0) * f;
  }
  if (s.hp != null) x = highpass(x, Math.max(10, s.hp), .707);          // the studio: source -> high-pass -> gain
  for (let k = 0; k < n; k++) {
    const t = k / SR;
    x[k] *= t < .004 ? v * t / .004 : t < hold ? v : v * Math.max(0, (len - t) / (len - hold));
  }
  /* dry (mono, heard in both ears) + ROOM x the room, per channel */
  const out = IR.map(h => {
    const o = new Float64Array(n + N - 1);
    for (let k = 0; k < n; k++) {
      o[k] += x[k];
      const w = x[k] * set.room * NORM; if (!w) continue;
      for (let j = 0; j < N; j++) o[k + j] += w * h[j];
    }
    return o;
  });
  /* the tail ends where it drops under -60 dB, with a 10 ms fade so the end is not a click */
  let last = out[0].length - 1;
  while (last > n && Math.abs(out[0][last]) < 1e-3 && Math.abs(out[1][last]) < 1e-3) last--;
  const size = last + 1, fade = Math.round(SR * .01), pcm = new Float32Array(size * 2);
  let peak = 0;
  for (let k = 0; k < size; k++) {
    const g = k > size - fade ? (size - k) / fade : 1;
    for (let ch = 0; ch < 2; ch++) { const y = out[ch][k] * g; pcm[k * 2 + ch] = y; peak = Math.max(peak, Math.abs(y)); }
  }
  return { pcm, seconds: size / SR, peak };
}

const STUDIOS = [
  { set: SET, file: FILE, rec: chestRecording, room: room(.9, .28, .008, .2, 7) },
  { set: MSG, file: MSG_FILE, rec: studioRecording, room: room(.6, .35, .006, .12, 11) },
];
for (const { set, file: names, rec, room: rm } of STUDIOS) for (const [ev, s] of Object.entries(set.ev)) {
  const { pcm, seconds, peak } = render(s, set, rec, rm);
  if (peak > .99) throw new Error(ev + ' peaks at ' + peak.toFixed(3) + ' - it would clip; lower its loudness in the studio');
  const file = new URL(names[ev] + '.mp3', OUT);
  const r = spawnSync('ffmpeg', ['-v', 'error', '-y', '-f', 'f32le', '-ar', String(SR), '-ac', '2', '-i', 'pipe:0',
    '-c:a', 'libmp3lame', '-b:a', '96k', fileURLToPath(file)], { input: Buffer.from(pcm.buffer) });
  if (r.status) throw new Error(String(r.stderr));
  console.log(names[ev].padEnd(18), seconds.toFixed(2) + ' s', 'peak ' + peak.toFixed(2),
    (fs.statSync(file).size / 1024).toFixed(1) + ' KB', '<- ' + s.src);
}

/* ── the capybara's voice and the vault intro: studio round 6, his save 2026-10-11 13:13 (src/config/capyVoice.js) ──
   Both come from tools/chip.js, so each file is what he heard in the studio. The capybara is one file per syllable the
   app's plan can ask for (the app picks them and sets pitch and loudness per syllable, the way the studio did), each at
   his loudness with the message studio's short room at his echo. The intro is one stereo file through the studio's
   2.4 s hall at his echo. "Volume, all" is a listening level and stays out (see capyVoice.js). */
const CHIP = globalThis.KPM_CHIP;
function encode(pcm, channels, name, kbps) {
  const file = new URL(name + '.mp3', OUT);
  const r = spawnSync('ffmpeg', ['-v', 'error', '-y', '-f', 'f32le', '-ar', String(SR), '-ac', String(channels), '-i', 'pipe:0',
    '-c:a', 'libmp3lame', '-b:a', kbps, fileURLToPath(file)], { input: Buffer.from(pcm.buffer, pcm.byteOffset, pcm.byteLength) });
  if (r.status) throw new Error(String(r.stderr));
  return fs.statSync(file).size;
}
/* dry + the room, one channel; the tail cut where it drops under -60 dB, a 10 ms fade so the end is not a click */
function trimTail(o, from) {
  let last = o.length - 1;
  while (last > from && Math.abs(o[last]) < 1e-3) last--;
  const size = last + 1, fade = Math.round(SR * .01), out = new Float32Array(size);
  for (let k = 0; k < size; k++) out[k] = o[k] * (k > size - fade ? (size - k) / fade : 1);
  return out;
}

const SHORT = room(.6, .35, .006, .12, 11);
let capyBytes = 0, capyPeak = 0;
for (const f of capyFiles()) {
  const s = CHIP.syllable(CAPY_VOICE, f.v, f.on, f.len, f.rise, SR), n = s.length, h = SHORT.IR[0];
  const o = new Float64Array(n + SHORT.N - 1);
  for (let k = 0; k < n; k++) {
    const x = s[k] * CAPY_VOICE.vol; o[k] += x;
    const w = x * CAPY_VOICE.echo * SHORT.NORM; if (!w) continue;
    for (let j = 0; j < SHORT.N; j++) o[k + j] += w * h[j];
  }
  const pcm = trimTail(o, n);
  for (const v of pcm) capyPeak = Math.max(capyPeak, Math.abs(v));
  capyBytes += encode(pcm, 1, capyFile(f.on, f.v, f.len, f.rise), '64k');
}
if (capyPeak > .99) throw new Error('a capybara syllable peaks at ' + capyPeak.toFixed(3) + ' - it would clip');
console.log('capy-*'.padEnd(18), capyFiles().length + ' files', 'peak ' + capyPeak.toFixed(2), (capyBytes / 1024).toFixed(1) + ' KB', '<- Agent (firm)');

/* the hall is 2.4 s and the intro ~10.5 s: a direct convolution would be ~90 G multiply-adds, so it goes through an FFT */
function fft(re, im, inverse) {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1; for (; j & bit; bit >>= 1) j ^= bit; j ^= bit;
    if (i < j) { let t = re[i]; re[i] = re[j]; re[j] = t; t = im[i]; im[i] = im[j]; im[j] = t; }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const ang = (inverse ? 2 : -2) * Math.PI / len, half = len >> 1;
    for (let k = 0; k < half; k++) {
      const cr = Math.cos(ang * k), ci = Math.sin(ang * k);
      for (let i = k; i < n; i += len) {
        const b = i + half, vr = re[b] * cr - im[b] * ci, vi = re[b] * ci + im[b] * cr;
        re[b] = re[i] - vr; im[b] = im[i] - vi; re[i] += vr; im[i] += vi;
      }
    }
  }
  if (inverse) for (let i = 0; i < n; i++) { re[i] /= n; im[i] /= n; }
}
function convolve(x, h) {
  const n = x.length + h.length - 1; let size = 1; while (size < n) size <<= 1;
  const ar = new Float64Array(size), ai = new Float64Array(size), br = new Float64Array(size), bi = new Float64Array(size);
  ar.set(x); br.set(h); fft(ar, ai, false); fft(br, bi, false);
  for (let k = 0; k < size; k++) { const r = ar[k] * br[k] - ai[k] * bi[k]; ai[k] = ar[k] * bi[k] + ai[k] * br[k]; ar[k] = r; }
  fft(ar, ai, true);
  return ar.subarray(0, n);
}
{ /* the FFT must agree with the plain sum before it is trusted with his intro */
  const a = Float64Array.from({ length: 300 }, (_, i) => Math.sin(i * .37)), b = Float64Array.from({ length: 77 }, (_, i) => Math.cos(i * 1.3) * Math.exp(-i / 20));
  const c = convolve(a, b); let err = 0;
  for (let k = 0; k < a.length + b.length - 1; k++) { let s = 0; for (let j = 0; j < b.length; j++) if (k - j >= 0 && k - j < a.length) s += a[k - j] * b[j]; err = Math.max(err, Math.abs(s - c[k])); }
  if (err > 1e-9) throw new Error('FFT convolution is wrong by ' + err);
}
const { L, R } = CHIP.intro(INTRO_MIX, (name) => { throw new Error('a typing RECORDING (' + name + ') needs a decoder here - his save uses a made tick'); }, SR);
const H = CHIP.hall(SR);
let hp = 0; for (const d of H) for (const v of d) hp += v * v;
const HNORM = 0.00125 / Math.max(Math.sqrt(hp / (2 * H[0].length)), 0.000125);
const wet = [convolve(L, H[0]), convolve(R, H[1])], dry = [L, R], n = wet[0].length;
const ch = [0, 1].map((c) => { const o = new Float64Array(n); for (let k = 0; k < n; k++) o[k] = (dry[c][k] || 0) + wet[c][k] * INTRO_MIX.echo * HNORM; return o; });
let last = n - 1; const end0 = Math.round(CHIP.T.total * SR);
while (last > end0 && Math.abs(ch[0][last]) < 1e-3 && Math.abs(ch[1][last]) < 1e-3) last--;
const size = last + 1, fade = Math.round(SR * .01), ipcm = new Float32Array(size * 2);
let ipeak = 0;
for (let k = 0; k < size; k++) {
  const g = k > size - fade ? (size - k) / fade : 1;
  for (let c = 0; c < 2; c++) { const y = ch[c][k] * g; ipcm[k * 2 + c] = y; ipeak = Math.max(ipeak, Math.abs(y)); }
}
if (ipeak > .99) throw new Error('the intro peaks at ' + ipeak.toFixed(3) + ' - it would clip; lower a part in the studio');
console.log('vault-intro'.padEnd(18), (size / SR).toFixed(2) + ' s', 'peak ' + ipeak.toFixed(2), (encode(ipcm, 2, 'vault-intro', '96k') / 1024).toFixed(1) + ' KB', '<- his intro mix');
