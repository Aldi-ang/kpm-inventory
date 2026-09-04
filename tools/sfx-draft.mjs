/* THE FIELD TERMINAL'S SOUNDS — DRAFT GENERATOR, FOR REVIEW ONLY.

   Aldi asked for tech SFX on the phone's tutorial panel and then asked to hear a draft before
   anything is wired: *"can u make tech sound and give me the draft so i can review before u
   integrate"*.

   ⚠️ READ `src/ponder/sfx.js` BEFORE TRUSTING ANYTHING HERE. Synthesis lost round 2 of the book's
   audio — *"SFX sound really bad as well"* — and the conclusion written there was that synthesis
   was the clever answer to the wrong question. This exists because he asked for it WITH a review
   gate, which is the part round 2 never had. Nothing here is wired into the app; it writes files
   into tools/sfx-draft/ and a page that plays them, and stops.

   WHY THE SOUNDS ARE SHAPED THE WAY THEY ARE. Three things make a synthesised UI sound read as
   cheap, and all three are avoided on purpose:

   1. A RAW SQUARE OR SAW IS HARSH, and worse, naive ones alias — the harmonics above 22 kHz fold
      back down as an inharmonic buzz that no amount of volume trimming fixes. Every tone here is
      built from summed SINES, so there is nothing above the partials actually asked for.
   2. AN INSTANT ATTACK CLICKS. A waveform that starts at full amplitude is a step, and a step is
      broadband noise. Every voice gets a few ms of attack and every file gets a short fade at both
      ends.
   3. A LINEAR DECAY SOUNDS SYNTHETIC. Physical things lose energy exponentially, so the envelopes
      are exp(-kt).

   Durations are the constraint Aldi set by his own use: the rail has seventeen keys and he presses
   them one after another while reading, so the key must be short enough that two presses do not
   smear. Everything else is paced against the panel's own animation — ARRIVE_BASE 932ms and
   LEAVE_BASE 380ms in PonderPad.jsx, both multiplied by PACE (2.5).

   Run:  node tools/sfx-draft.mjs
   Hear: http://localhost:4190/tools/sfx-draft.html   (preview_start "ponder-lab") */

import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const SR = 44100;
const OUT = 'tools/sfx-draft';

/* ── the small synthesis kit ──────────────────────────────────────────────────────────────────
   Buffers are plain Float32Array in -1..1. Everything composes by adding into one. */

const buf = (ms) => new Float32Array(Math.round((ms / 1000) * SR));
const at = (i) => i / SR;                              // sample index -> seconds

/* Exponential decay with a short linear attack. `k` is how fast it dies: bigger = drier. */
const env = (t, attackMs, k) => {
  const a = attackMs / 1000;
  if (t < a) return t / a;
  return Math.exp(-k * (t - a));
};

/* A sine partial swept from f0 to f1 over the buffer. Phase is integrated rather than computed
   per-sample from t*f, because the naive version glissandos wrongly and clicks at the seams. */
const tone = (out, { f0, f1 = f0, gain = 1, attackMs = 3, k = 12, curve = 1 }) => {
  const n = out.length, dur = n / SR;
  let phase = 0;
  for (let i = 0; i < n; i++) {
    const t = at(i), p = dur ? t / dur : 0;
    const f = f0 + (f1 - f0) * Math.pow(p, curve);
    phase += (2 * Math.PI * f) / SR;
    out[i] += Math.sin(phase) * env(t, attackMs, k) * gain;
  }
};

/* Filtered noise — the "contact" half of a key press, and the air in a scan sweep. A one-pole
   lowpass is enough; a steeper filter would only be audible on a sound this short as a difference
   in brightness, which the cutoff already gives. */
const noise = (out, { gain = 1, attackMs = 1, k = 40, cut = 4000, seed = 1 }) => {
  const n = out.length;
  /* Own PRNG, not Math.random: a draft that sounds different on every run cannot be reviewed. */
  let s = seed >>> 0;
  const rnd = () => { s = (s * 1664525 + 1013904223) >>> 0; return (s / 0xffffffff) * 2 - 1; };
  const a = Math.exp(-2 * Math.PI * cut / SR);
  let z = 0;
  for (let i = 0; i < n; i++) {
    z = rnd() * (1 - a) + z * a;
    out[i] += z * env(at(i), attackMs, k) * gain;
  }
};

/* Peak-normalise to `peak`, then fade both ends so no file can start or end on a step. */
const finish = (out, peak = 0.72, fadeMs = 4) => {
  let mx = 0;
  for (const v of out) mx = Math.max(mx, Math.abs(v));
  const g = mx > 0 ? peak / mx : 1;
  const f = Math.round((fadeMs / 1000) * SR);
  for (let i = 0; i < out.length; i++) {
    let v = out[i] * g;
    if (i < f) v *= i / f;
    const tail = out.length - 1 - i;
    if (tail < f) v *= tail / f;
    out[i] = Math.tanh(v * 1.08) * 0.94;   // gentle soft-knee, catches any partial that stacked
  }
  return out;
};

const wav = (samples) => {
  const data = Buffer.alloc(samples.length * 2);
  for (let i = 0; i < samples.length; i++) {
    const v = Math.max(-1, Math.min(1, samples[i]));
    data.writeInt16LE(Math.round(v * 32767), i * 2);
  }
  const head = Buffer.alloc(44);
  head.write('RIFF', 0); head.writeUInt32LE(36 + data.length, 4); head.write('WAVE', 8);
  head.write('fmt ', 12); head.writeUInt32LE(16, 16); head.writeUInt16LE(1, 20);
  head.writeUInt16LE(1, 22); head.writeUInt32LE(SR, 24); head.writeUInt32LE(SR * 2, 28);
  head.writeUInt16LE(2, 32); head.writeUInt16LE(16, 34);
  head.write('data', 36); head.writeUInt32LE(data.length, 40);
  return Buffer.concat([head, data]);
};

/* ── the sounds ───────────────────────────────────────────────────────────────────────────────
   Each entry: the moment it belongs to, in Aldi's terms, and the file it writes. */

const SOUNDS = [];
const add = (name, moment, ms, build) => {
  const b = buf(ms);
  build(b);
  SOUNDS.push({ name, moment, ms, data: finish(b) });
};

/* 1 — THE RAIL KEY. Seventeen of these down the right edge, pressed in a row while reading, so it
   is the one sound that must not smear. A contact tick plus two high partials, dead in ~70ms.
   Three takes so he can pick a character rather than approve or reject one guess. */
add('key-a', 'rail key — dry tick, the safe one', 90, (b) => {
  noise(b, { gain: 0.55, k: 90, cut: 5200, seed: 7 });
  tone(b, { f0: 2450, gain: 0.34, k: 62, attackMs: 1 });
  tone(b, { f0: 3670, gain: 0.16, k: 78, attackMs: 1 });
  tone(b, { f0: 190, gain: 0.22, k: 70, attackMs: 1 });      // the body you feel more than hear
});

add('key-b', 'rail key — with a small pitched blip', 110, (b) => {
  noise(b, { gain: 0.4, k: 105, cut: 4600, seed: 11 });
  tone(b, { f0: 1180, f1: 1560, gain: 0.4, k: 42, attackMs: 2 });
  tone(b, { f0: 2360, f1: 3120, gain: 0.14, k: 55, attackMs: 2 });
  tone(b, { f0: 170, gain: 0.2, k: 66, attackMs: 1 });
});

add('key-c', 'rail key — softer, more switch than beep', 95, (b) => {
  noise(b, { gain: 0.66, k: 78, cut: 3200, seed: 23 });
  tone(b, { f0: 880, gain: 0.26, k: 58, attackMs: 2 });
  tone(b, { f0: 240, gain: 0.24, k: 52, attackMs: 2 });
});

/* 2 — THE SCAN-IN. The panel powers on under a travelling scan bar; ARRIVE_BASE * PACE is 2330ms,
   so the sound deliberately does NOT fill the arrival — it leads it and gets out of the way. A
   rising sweep with air over it, then one confirm blip as the display settles. */
add('boot', 'panel powering on — the scan-in', 760, (b) => {
  tone(b, { f0: 160, f1: 1240, gain: 0.5, k: 2.6, attackMs: 12, curve: 1.7 });
  tone(b, { f0: 320, f1: 2480, gain: 0.16, k: 3.4, attackMs: 14, curve: 1.7 });
  noise(b, { gain: 0.3, k: 3.1, cut: 2600, attackMs: 40, seed: 31 });
  const blip = buf(150);
  tone(blip, { f0: 1760, gain: 0.42, k: 26, attackMs: 2 });
  tone(blip, { f0: 2640, gain: 0.15, k: 32, attackMs: 2 });
  const off = Math.round(0.60 * SR);
  for (let i = 0; i < blip.length && off + i < b.length; i++) b[off + i] += blip[i];
});

/* 3 — THE DEPLOY SHUT. The exit is the arrival reversed, which is what PonderOverlay's own note
   says about the book. LEAVE_BASE * PACE is 950ms; this runs shorter so the silence lands before
   the panel is gone rather than after. */
add('down', 'panel leaving — the deploy shut', 480, (b) => {
  tone(b, { f0: 1080, f1: 150, gain: 0.5, k: 4.4, attackMs: 4, curve: 0.62 });
  tone(b, { f0: 2160, f1: 300, gain: 0.13, k: 6.0, attackMs: 4, curve: 0.62 });
  noise(b, { gain: 0.22, k: 7.5, cut: 1800, attackMs: 3, seed: 47 });
  tone(b, { f0: 96, gain: 0.3, k: 11, attackMs: 6 });        // the thud it lands on
});

/* 4 — OPENING AN ENTRY. Today the Buka buttons play ponder-open.mp3, a paper sound, on a slate
   panel. Two rising tones, confirming rather than announcing. */
add('open', 'pressing Buka — opening a lesson', 260, (b) => {
  tone(b, { f0: 620, gain: 0.42, k: 15, attackMs: 3 });
  tone(b, { f0: 930, gain: 0.34, k: 12, attackMs: 26 });
  tone(b, { f0: 1860, gain: 0.1, k: 18, attackMs: 26 });
  noise(b, { gain: 0.14, k: 46, cut: 5200, seed: 53 });
});

/* 5 — CLOSING A LESSON, the bug he reported: PonderOverlay.jsx:373 plays bookClose() when a scene
   exits, so on a phone the tech panel's own flow ends on a paper sound. Quieter than `down`,
   because this closes a lesson and not the whole terminal. */
add('back', 'closing a lesson — replaces the paper book-close on the phone', 300, (b) => {
  tone(b, { f0: 760, f1: 300, gain: 0.42, k: 9, attackMs: 3, curve: 0.7 });
  tone(b, { f0: 1520, f1: 600, gain: 0.1, k: 12, attackMs: 3, curve: 0.7 });
  noise(b, { gain: 0.16, k: 16, cut: 2200, seed: 67 });
});

/* ── write ────────────────────────────────────────────────────────────────────────────────────
   WAV is written first because it needs nothing. mp3 is written next to it when ffmpeg is on the
   PATH, so the review is of the same format the app actually ships (`SOURCES` in useSound.js maps
   every name to a /sounds/*.mp3). */

fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });

let mp3 = 0;
for (const s of SOUNDS) {
  const w = path.join(OUT, s.name + '.wav');
  fs.writeFileSync(w, wav(s.data));
  try {
    execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', w, '-codec:a', 'libmp3lame',
                            '-q:a', '4', path.join(OUT, s.name + '.mp3')]);
    mp3++;
  } catch { /* no ffmpeg, or no lame — the wav is still reviewable */ }
}

fs.writeFileSync(path.join(OUT, 'manifest.json'),
  JSON.stringify(SOUNDS.map(({ name, moment, ms }) => ({ name, moment, ms })), null, 2));

for (const s of SOUNDS) {
  let peak = 0;
  for (const v of s.data) peak = Math.max(peak, Math.abs(v));
  console.log(String(s.name).padEnd(6), String(s.ms + 'ms').padStart(7),
              'peak ' + peak.toFixed(2), ' ', s.moment);
}
console.log('\n' + SOUNDS.length + ' wav written to ' + OUT + (mp3 ? ', ' + mp3 + ' mp3 alongside' : ', no mp3 (ffmpeg missing)'));
console.log('Hear them: preview_start "ponder-lab" then http://localhost:4190/tools/sfx-draft.html');
