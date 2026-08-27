/* PAPER SOUNDS, SYNTHESISED. No audio files, and no sales sounds.

   The first version re-pointed the app's own SFX at the book — `commit` for the cover, `tap` for a
   pick. Aldi, 2026-08-27: *"u re crazy using sales SFX for the book, use paper or book SFX la
   bro"*. He is right: those sounds MEAN something else in this app. A till sound on a page turn
   teaches the ear that a page turn is a transaction.

   There are no paper recordings on hand and a PWA that must work offline should not grow three
   more MP3s for a tutorial index. So these are built from noise: paper IS broadband noise shaped
   by a filter and an envelope, which is the one family of sound synthesis gets convincingly right.

     page   a short bright rustle — bandpassed noise, fast attack, ~190ms
     open   a longer, softer sweep plus a low body thump: a cover being lifted
     pick   one dry paper tap, quieter and shorter than a page
     close   the thump first, then the rustle settling: a cover dropping shut

   ⚠️ SILENT IN LITE MODE, checked at play time rather than captured. A value captured once goes
   stale the moment he flips the toggle, which is the bug `useSound` already documents.
   ⚠️ The context is created lazily and never resumed by force. Browsers refuse audio before a real
   gesture; the book is opened by a click, so by the time anything here runs the gesture has
   happened. If the context still refuses, every function below simply does nothing. */

const liteOn = () => typeof document !== 'undefined'
  && document.documentElement.classList.contains('lite-mode');

let ctx = null;
let noise = null;   // one shared buffer of white noise, reused by every sound

function audio() {
  if (liteOn()) return null;
  if (ctx) return ctx.state === 'closed' ? null : ctx;
  try {
    const Ctx = globalThis.AudioContext || globalThis.webkitAudioContext;
    if (!Ctx) return null;
    ctx = new Ctx();
  } catch { return null; }
  return ctx;
}

function noiseBuffer(c) {
  if (noise) return noise;
  const len = Math.floor(c.sampleRate * 0.7);
  noise = c.createBuffer(1, len, c.sampleRate);
  const d = noise.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  return noise;
}

/* One rustle: noise through a bandpass that slides down as it decays, which is what makes it read
   as a sheet moving rather than as static. */
function rustle(c, { at = 0, dur = 0.19, from = 3400, to = 1500, q = 0.9, gain = 0.16 } = {}) {
  const src = c.createBufferSource();
  src.buffer = noiseBuffer(c);
  src.playbackRate.value = 0.9 + Math.random() * 0.25;

  const bp = c.createBiquadFilter();
  bp.type = 'bandpass';
  bp.Q.value = q;
  const t = c.currentTime + at;
  bp.frequency.setValueAtTime(from, t);
  bp.frequency.exponentialRampToValueAtTime(Math.max(120, to), t + dur);

  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(gain, t + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);

  src.connect(bp); bp.connect(g); g.connect(c.destination);
  src.start(t); src.stop(t + dur + 0.02);
}

/* The body of a book: a short low thud, the sound of covers meeting. */
function thump(c, { at = 0, freq = 92, dur = 0.16, gain = 0.22 } = {}) {
  const o = c.createOscillator();
  o.type = 'sine';
  const t = c.currentTime + at;
  o.frequency.setValueAtTime(freq, t);
  o.frequency.exponentialRampToValueAtTime(freq * 0.55, t + dur);

  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(gain, t + 0.008);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);

  o.connect(g); g.connect(c.destination);
  o.start(t); o.stop(t + dur + 0.02);
}

export function bookOpen() {
  const c = audio(); if (!c) return false;
  rustle(c, { dur: 0.34, from: 2600, to: 900, q: 0.7, gain: 0.13 });
  thump(c, { at: 0.05, freq: 78, dur: 0.2, gain: 0.16 });
  rustle(c, { at: 0.14, dur: 0.22, from: 4200, to: 1800, gain: 0.09 });
  return true;
}

export function bookPage() {
  const c = audio(); if (!c) return false;
  rustle(c, { dur: 0.19, from: 3600, to: 1400, gain: 0.15 });
  rustle(c, { at: 0.06, dur: 0.13, from: 5200, to: 2400, q: 1.4, gain: 0.07 });
  return true;
}

export function bookPick() {
  const c = audio(); if (!c) return false;
  rustle(c, { dur: 0.1, from: 4800, to: 2200, q: 1.6, gain: 0.1 });
  return true;
}

export function bookClose() {
  const c = audio(); if (!c) return false;
  thump(c, { freq: 96, dur: 0.18, gain: 0.2 });
  rustle(c, { at: 0.03, dur: 0.26, from: 2200, to: 700, q: 0.6, gain: 0.11 });
  return true;
}
