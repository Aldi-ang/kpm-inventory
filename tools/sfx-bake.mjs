/* Renders the van-loading chest's sounds from Aldi's SOUND STUDIO into files for the app.
   Run: node tools/sfx-bake.mjs   (needs ffmpeg on PATH; writes public/sounds/chest-*.mp3)

   The studio (the prototype artifact, https://claude.ai/artifact/M3xbaPAJ9LT7FL1ETmXvuu) plays each moment
   as: his recording, cut to his start/end, at his pitch, 4 ms in / 25 ms out, at loudness x master, plus a
   share of a dark room (a 0.9 s convolution tail) set by ROOM. An <audio> element can do none of that live,
   so it is rendered here the way the studio's Web Audio graph does it, and the app plays the result as is.
   He changes a sound: he presses SIMPAN in the studio, the new numbers from sfx/settings go into SET below,
   and this runs again. The recordings are the ones the studio plays (tools/sfx-kenney.js, Kenney, CC0). */
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

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

const SR = 44100;
const pack = fs.readFileSync(new URL('./sfx-kenney.js', import.meta.url), 'utf8');
const OUT = new URL('../public/sounds/', import.meta.url);

function recording(name) {
  const m = pack.match(new RegExp('"' + name + '": "([^"]+)"'));
  if (!m) throw new Error('no recording named ' + name);
  const r = spawnSync('ffmpeg', ['-v', 'error', '-f', 'mp3', '-i', 'pipe:0', '-f', 'f32le', '-ac', '1', '-ar', String(SR), 'pipe:1'],
    { input: Buffer.from(m[1], 'base64'), maxBuffer: 1 << 26 });
  if (r.status) throw new Error(String(r.stderr));
  /* The browser's decoder clamps to full scale and ffmpeg's does not: metalLatch decodes to a 1.71 peak here and
     1.00 in the studio (measured 2026-09-24). He heard the clamped one, so it is clamped here too. */
  return new Float32Array(new Uint8Array(r.stdout).buffer).map(v => Math.max(-1, Math.min(1, v)));
}

/* the studio's room(), sample for sample: two channels of darkened noise, silent for 8 ms, dying over ~0.2 s */
function rng(seed) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296 * 2 - 1; }; }
const N = Math.floor(SR * .9);
const IR = [0, 1].map(ch => {
  const d = new Float32Array(N), r = rng(7 + ch); let y = 0;
  for (let i = 0; i < N; i++) { y += .28 * (r() - y); d[i] = i < SR * .008 ? 0 : y * Math.exp(-i / (SR * .2)); }
  return d;
});
/* a ConvolverNode normalises its impulse by default (Web Audio spec, ConvolverNode "normalize"); same scale */
let power = 0;
for (const d of IR) for (const v of d) power += v * v;
const NORM = 0.00125 / Math.max(Math.sqrt(power / (2 * N)), 0.000125);

function render(s) {
  const b = recording(s.src), dur = b.length / SR;
  const start = Math.min(s.start, dur - .02), end = Math.max(start + .02, Math.min(s.end, dur));
  const len = (end - start) / s.rate, n = Math.round(len * SR), v = s.vol * SET.master, hold = Math.max(.005, len - .025);
  const x = new Float64Array(n);
  for (let k = 0; k < n; k++) {
    const t = k / SR, p = start * SR + k * s.rate, i = Math.floor(p), f = p - i;   // playbackRate = linear read
    const g = t < .004 ? v * t / .004 : t < hold ? v : v * Math.max(0, (len - t) / (len - hold));
    x[k] = ((b[i] ?? 0) * (1 - f) + (b[i + 1] ?? 0) * f) * g;
  }
  /* dry (mono, heard in both ears) + ROOM x the room, per channel */
  const out = IR.map(h => {
    const o = new Float64Array(n + N - 1);
    for (let k = 0; k < n; k++) {
      o[k] += x[k];
      const w = x[k] * SET.room * NORM; if (!w) continue;
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

for (const [ev, s] of Object.entries(SET.ev)) {
  const { pcm, seconds, peak } = render(s);
  if (peak > .99) throw new Error(ev + ' peaks at ' + peak.toFixed(3) + ' - it would clip; lower its loudness in the studio');
  const file = new URL(FILE[ev] + '.mp3', OUT);
  const r = spawnSync('ffmpeg', ['-v', 'error', '-y', '-f', 'f32le', '-ar', String(SR), '-ac', '2', '-i', 'pipe:0',
    '-c:a', 'libmp3lame', '-b:a', '96k', fileURLToPath(file)], { input: Buffer.from(pcm.buffer) });
  if (r.status) throw new Error(String(r.stderr));
  console.log(FILE[ev].padEnd(18), seconds.toFixed(2) + ' s', 'peak ' + peak.toFixed(2),
    (fs.statSync(file).size / 1024).toFixed(1) + ' KB', '<- ' + s.src);
}
