/* KPM sound synth - the capybara's voice and the vault intro's invented sounds.
   ONE file, loaded by the sound studio (browser) and by the baker (node), so the sound Aldi saves is the sound
   that gets baked: no second implementation to drift. Deterministic - every random choice comes from a seed.

   THE CAPYBARA (round 3, his video "How I Make 8-Bit Dialogue Voices", youtube uv0CgsTU-Ow): the maker cuts a
   tiny slice out of a real vowel and pastes it over and over - measured, 13.4 ms = exactly 5 cycles of a voice at
   372 Hz - so the result is a frozen, buzzing vowel: human colour, chip stiffness. Here the vowel slice is built
   from the vowel's formants (the resonances that make an "a" sound like "a") into one wave cycle, and in "Game Boy"
   shape squeezed into 32 steps of 4 bits - exactly the Game Boy's wave channel. His "some humanity ... similar to
   the Sims": Simlish is gibberish with a real sentence melody, so each syllable of the actual line gets its own
   vowel and consonant, and the line gets a melody - falling at a full stop, rising at a question, lifted at "!".

   THE INTRO (round 3, his "dont make the intro 8 bit bruh, we need elegant for that"): no pulse waves at all -
   soft FM bells, glass, air, a slow chord, wide stereo, a long hall. */
(function (G) {
  'use strict';
  const SR = 44100, TAU = 2 * Math.PI;
  const st2 = (x) => Math.pow(2, x / 12);
  function rng(seed) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
  function hash(str) { let h = 2166136261; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  function add(mix, buf, at, gain, sr = SR) {
    const i0 = Math.round(at * sr);
    for (let k = 0; k < buf.length; k++) { const i = i0 + k; if (i >= 0 && i < mix.length) mix[i] += buf[k] * gain; }
  }
  function resample(buf, rate) {
    const n = Math.max(1, Math.floor(buf.length / rate)), out = new Float32Array(n);
    for (let k = 0; k < n; k++) { const p = k * rate, i = Math.floor(p), f = p - i; out[k] = (buf[i] ?? 0) * (1 - f) + (buf[i + 1] ?? 0) * f; }
    return out;
  }
  /* band-passed noise (a state-variable filter) - breath, hiss, air */
  function noise(len, fc, q, amp, seed, sr = SR) {
    const n = Math.max(1, Math.round(len * sr)), out = new Float32Array(n), r = rng(seed);
    let low = 0, band = 0;
    for (let k = 0; k < n; k++) {
      const u = k / n, f = 2 * Math.sin(Math.PI * Math.min(.45 * sr, fc(u)) / sr);
      const hp = r() * 2 - 1 - low - q * band; band += f * hp; low += f * band; out[k] = band * amp(u);
    }
    return out;
  }

  /* ── the capybara's voice ─────────────────────────────────────────────────────────────────────────── */
  /* His words, in order: *"dont have to be 8 bit TBH why not sound like minecraft character or even sims character"*;
     *"it is annoying if its keep repeating the same sound"*; then (round 5) *"i want more expressive voice and not like
     robotic kind of voice ... variety on the number of syllabus ... slow and fast talking just like human being ...
     since this is agent capybara i want the voice to be tegas and serious but expressive ... elegant manly and focus"*.
     So: a throat (a glottal pulse with a real throat's wobble - jitter in pitch, shimmer in loudness - breath, and at
     the end of a sentence a low creak, "vocal fry", the sound of a deep voice settling) through a mouth (four formant
     resonances that make "a e i o u" or a hummed "mm"), and vowels that MOVE while they are said - a fixed vowel is
     what a machine sounds like. A plan per line decides how many syllables come out this time, how fast each one is,
     which word gets the stress, and the melody - so the same line is never said the same way twice. */
  /* vowel formants, Hz (Peterson & Barney style averages); m = a hummed "mm" (the villager's hum, and the agent's "hm.") */
  const VOWEL = { a: [730, 1090, 2440, 3400], e: [530, 1840, 2480, 3500], i: [300, 2290, 3010, 3700], o: [570, 840, 2410, 3300], u: [320, 870, 2240, 3300], m: [280, 1100, 2300, 3300] };
  const SCHWA = [500, 1500, 2500, 3400];                                   // where a lazy mouth drifts to
  const BWV = [70, 90, 130, 200], BWN = [80, 250, 300, 400];
  const ONSET = { soft: 'm, n, l, r, w, y, h or no consonant', hard: 't, k, p, b, d, g, j', hiss: 's, z, f, v, c, x' };
  const LEN = { s: .075, m: .12, l: .2 };                                  // short / mid / long syllable, seconds at speed 1
  /* how long a syllable file is - the plan and the renderer must agree, so both read it here */
  function sylLen(p, on, len) {
    return { pre: on === 'hiss' ? .035 * p.cons : on === 'hard' ? .012 : 0, lenV: LEN[len] / p.speed * (p.shape === 'hum' ? 1.8 : 1) };
  }
  function normalize(out, to) { let pk = 0; for (const v of out) pk = Math.max(pk, Math.abs(v)); if (pk) for (let k = 0; k < out.length; k++) out[k] *= to / pk; return out; }
  /* the consonant before the vowel: a hiss (noise with its lows removed) or a burst and a puff of air */
  function consonant(out, n0, on, cons, r) {
    let lp = 0;
    for (let k = 0; k < n0; k++) {
      const x = r() * 2 - 1, u = k / n0; lp += .3 * (x - lp);
      out[k] = on === 'hiss' ? (x - lp) * Math.sin(Math.PI * u) * .6 * cons : (u < .4 ? x * .9 : (x - lp) * .35 * (1 - u)) * cons;
    }
  }

  /* the human voice: glottal pulse -> four formant resonators in a row (a "cascade", like Klatt's synthesiser).
     len = s / m / l; rise = the pitch climbs through it (a question's last word) instead of falling.
     Round 6, his *"i dont like the main voice can u add more voice to choose from"* - other THROATS, not other settings:
       voice   the plain throat               gravel  every other cycle weak and late (a rough, raspy, older voice)
       mumble  vowels half through the nose   whisper no throat at all - breath through the mouth
       radio   the voice through a walkie-talkie: only 300-3200 Hz, slightly overdriven, a little static
       brass   a muted trumpet's "wah": a bright buzz through one mouth that opens and closes (no words, all tune) */
  function voiceSyllable(p, v, on, len, rise, sr = SR) {
    const sh = p.shape, { pre, lenV } = sylLen(p, on, len), hum = sh === 'hum' || v === 'm', key = sh + v + on + len + (rise ? 'R' : '');
    const n0 = Math.round(pre * sr), n = n0 + Math.round(lenV * sr), out = new Float32Array(n), r = rng(hash(key));
    const off = [0, 1, 2, 3].map(() => 1 + (r() * 2 - 1) * .03);                // no two syllable files share an exact mouth
    const base = hum ? VOWEL.m : sh === 'mumble' ? VOWEL[v].map((f, i) => (f + VOWEL.m[i]) / 2) : VOWEL[v];
    const tgt = base.map((f, i) => f * (i < 3 ? p.formant : (1 + p.formant) / 2) * off[i]);
    const bw = hum ? BWN : sh === 'mumble' ? BWV.map((b, i) => b * 1.6 + (i ? 40 : 0)) : sh === 'brass' ? [90, 140, 200, 300] : BWV;
    const from = hum || on === 'soft' ? VOWEL.m : on === 'hiss' ? [400, 1700, 2600, 3400] : [350, 1800, 2700, 3500];   // where the consonant leaves the mouth
    const drift = len === 'l' ? .12 : .25;                                     // short vowels slur towards "uh" more
    const fry = !rise && len === 'l' ? (p.fry || 0) : 0;                       // a sentence's last syllable settles into a creak
    consonant(out, n0, on, p.cons, r);
    const st = [[0, 0], [0, 0], [0, 0], [0, 0]];
    let ph = 0, per = 1, amp = 1, prevG = 0, coef = null, tilt = 0, odd = false;
    for (let k = n0; k < n; k++) {
      const tv = (k - n0) / sr, u = tv / lenV, creak = fry * Math.max(0, (u - .62) / .38);
      /* the melody inside one syllable: a slide up into it, then a fall (or a climb), a wobble only on long ones */
      const semis = -p.scoop * Math.max(0, 1 - tv / .06) + (rise ? 3.5 * Math.max(0, (u - .3) / .7) : -p.bend * Math.max(0, (u - .55) / .45))
        - 3 * creak + (len === 'l' && tv > .06 ? p.vib * .4 * Math.sin(TAU * 5.5 * tv) : 0);
      const f0 = p.f * st2(semis);
      ph += f0 * per / sr;
      if (ph >= 1) {                                                            // once per cycle: a real throat is never exact
        ph -= 1; odd = !odd;
        per = (1 + (r() * 2 - 1) * (.012 + .05 * creak)) * (creak > .2 && r() < creak ? 1.6 + .6 * r() : 1) * (sh === 'gravel' && odd ? 1.035 : 1);
        amp = (1 + (r() * 2 - 1) * (.08 + .4 * creak)) * (sh === 'gravel' && odd ? .55 : 1);
      }
      const g = ph < .4 ? .5 * (1 - Math.cos(Math.PI * ph / .4)) : ph < .56 ? Math.cos(Math.PI * (ph - .4) / .32) : 0;   // Rosenberg pulse
      let x;
      if (sh === 'whisper') x = (r() * 2 - 1) * .9;                             // no throat: breath alone carries the vowel
      else if (sh === 'brass') x = (2 * ph - 1) * .7 * amp;                     // a bright buzz, like lips in a mouthpiece
      else { x = (g - prevG) * sr / f0 * .5 * amp; }
      prevG = g;
      if (sh !== 'whisper') {
        tilt += (.35 + .5 * Math.min(1, tv / .05) * (1 - .5 * u)) * (x - tilt); x = tilt;   // brighter at the attack, softer as it dies
        x += (r() * 2 - 1) * (p.breath * (.15 + .35 * g) + .25 * Math.max(0, (u - .85) / .15) + (sh === 'gravel' ? .22 * g : 0));
      }
      if (coef === null || (k - n0) % 16 === 0) {
        const m = Math.min(1, tv / .045), d = drift * u;                         // into the vowel in 45 ms, then a slow drift
        /* the mute opening and closing: the "wah" follows the syllable's own swell */
        const wah = sh === 'brass' ? 450 + 1500 * Math.min(1, tv / .07) * (1 - .6 * u) : 0;
        coef = tgt.map((F, i) => {
          let f = (from[i] + (F - from[i]) * m) * (1 - d) + SCHWA[i] * p.formant * d;
          if (wah) f = i === 0 ? wah : i === 1 ? wah * 2.1 : f;
          const rr = Math.exp(-Math.PI * bw[i] / sr), B = 2 * rr * Math.cos(TAU * f / sr), C = -rr * rr;
          return [1 - B - C, B, C];
        });
      }
      for (let i = 0; i < 4; i++) { const c = coef[i], s = st[i], y = c[0] * x + c[1] * s[0] + c[2] * s[1]; s[1] = s[0]; s[0] = y; x = y; }
      /* a spoken syllable swells to its peak a quarter of the way in, then sags */
      const shape = Math.min(1, tv / (on === 'soft' ? .03 : .008)) * (u < .25 ? .85 + .6 * u : 1 - .35 * (u - .25)) * Math.min(1, (lenV - tv) / .04);
      out[k] = x * shape;
    }
    normalize(out.subarray(n0), .8);                                          // every vowel equally loud; the consonant keeps its own level
    if (sh === 'radio') {
      /* the walkie-talkie: two low-cuts at 300 Hz, two high-cuts at 3200 Hz, a soft overdrive, a little static */
      const a = Math.exp(-TAU * 300 / sr), b = 1 - Math.exp(-TAU * 3200 / sr);
      let h1 = 0, h1x = 0, h2 = 0, h2x = 0, l1 = 0, l2 = 0;
      for (let k = 0; k < out.length; k++) {
        let x = out[k];
        h1 = a * (h1 + x - h1x); h1x = x; x = h1;
        h2 = a * (h2 + x - h2x); h2x = x; x = h2;
        l1 += b * (x - l1); l2 += b * (l1 - l2); x = l2;
        out[k] = Math.tanh(2.6 * x) / Math.tanh(2.6) + (r() * 2 - 1) * .025;
      }
      normalize(out, .8);
    }
    return out;
  }

  /* the 8-bit voice from his video: one vowel cycle squeezed into the Game Boy's 32-step, 4-bit wave, looped */
  function vowelCycle(v, p) {
    const TL = 32, tab = new Float64Array(TL), F = VOWEL[v].slice(0, 3).map((f) => f * p.formant), AMP = [1, .7, .35];
    for (let k = 1; k <= 15 && k * p.f < 9000; k++) {
      const f = k * p.f; let w = .25 / k;
      for (let i = 0; i < 3; i++) w += AMP[i] / (1 + Math.pow((f - F[i]) / BWV[i], 2));
      w *= Math.pow(k, -.3);
      for (let j = 0; j < TL; j++) tab[j] += w * Math.sin(TAU * k * j / TL);
    }
    let pk = 0; for (const x of tab) pk = Math.max(pk, Math.abs(x));
    for (let j = 0; j < TL; j++) tab[j] = Math.round((tab[j] / (pk || 1) + 1) * 7.5) / 7.5 - 1;   // 4 bits = 16 levels
    return tab;
  }
  function chipSyllable(p, v, on, len, rise, sr = SR) {
    const { pre, lenV } = sylLen(p, on, len), tab = vowelCycle(v, p);
    const n0 = Math.round(pre * sr), n = n0 + Math.round(lenV * sr), out = new Float32Array(n), r = rng(hash('gb' + v + on + len + (rise ? 'R' : '')));
    consonant(out, n0, on, p.cons, r);
    let ph = 0;
    for (let k = n0; k < n; k++) {
      const tv = (k - n0) / sr, u = tv / lenV;
      const semis = -p.scoop * Math.max(0, 1 - tv / .045) + (rise ? 3.5 * Math.max(0, (u - .3) / .7) : -p.bend * Math.max(0, (u - .6) / .4));
      ph += p.f * st2(semis) / sr; ph -= Math.floor(ph);
      out[k] = tab[Math.floor(ph * 32)] * .8 * Math.min(1, tv / (on === 'soft' ? .025 : .006)) * (1 - .25 * u) * Math.min(1, (lenV - tv) / .035);
    }
    return out;
  }
  /* round 7, his *"change the sfx for capybara to mumbling insted ... some fat but soft mumbling sound, just imagine the
     duke from resident evil village but inside the sim city"*: shape 'rec' plays a REAL mumbled syllable from his
     reference video (mumble-pack.js, cut by build-mumble-pack.mjs), at the voice's pitch and with the same slide in /
     fall / question rise as a made one - so the plan, the baker and the app treat it like any other voice. Each
     syllable file gets its own clip (picked by its key among the clips nearest its length), pitched down = a bigger
     chest, two soft low-passes = soft lips (the "mouth size" slider moves them). */
  /* `natural` (his *"your pick is good but make it more natural sounding instead of electronic edited sound"*, 19:50):
     the first try forced EVERY clip to one pitch, so one syllable dropped 8 notes and the next 15 - each with a different
     mouth, which is what splicing sounds like - then cut it short, bent a fake melody over the speaker's own, and
     filtered it dark twice. Natural: ONE shift for the whole voice (the pack's middle pitch -> p.f), so every syllable
     keeps the same mouth and the speaker's own melody; no added slide or fall (only a question still rises); a smooth
     cubic read; a syllable that runs long fades out over its last quarter instead of a 30 ms cut; one gentle low-pass
     high up; levels matched by loudness (RMS), not by their loudest peak. */
  const recPcm = {};
  function recSyllable(p, v, on, len, rise, sr = SR) {
    const pack = G.KPM_MUMBLE && G.KPM_MUMBLE[p.rec || 'round'], { lenV } = sylLen(p, on, len), key = 'rec' + v + on + len + (rise ? 'R' : '');
    const nat = !!p.natural, n = Math.round(lenV * (nat ? 1.35 : 1.15) * sr), out = new Float32Array(n);
    if (!pack || !pack.clips.length) return out;
    if (!pack.mid) { const fs = pack.clips.map((c) => c.f0).sort((a, b) => a - b); pack.mid = fs[Math.floor(fs.length / 2)]; }
    const ratio = (c) => (nat ? p.f / pack.mid : p.f / c.f0);
    const near = pack.clips.map((c, i) => ({ i, d: Math.abs(c.len / ratio(c) - lenV) })).sort((a, b) => a.d - b.d).slice(0, 6);
    const ci = near[hash(key) % near.length].i, c = pack.clips[ci];
    if (!recPcm[ci + p.rec]) { const bytes = Uint8Array.from(atob(c.pcm), (ch) => ch.charCodeAt(0)), i16 = new Int16Array(bytes.buffer); recPcm[ci + p.rec] = Float32Array.from(i16, (x) => x / 32768); }
    if (nat) return recNatural(p, c, recPcm[ci + p.rec], pack, lenV, rise, n, sr);
    const src = recPcm[ci + p.rec], cut = 1 - Math.exp(-TAU * 1900 * p.formant / sr);
    const at = (j) => src[Math.min(src.length - 1, Math.max(0, j))];
    let pos = 0, l1 = 0, l2 = 0, k = 0;
    for (; k < n && pos < src.length - 1; k++) {
      const tv = k / sr, u = Math.min(1, tv / lenV);
      const semis = nat ? (rise ? 3.5 * Math.max(0, (u - .3) / .7) : 0)
        : -p.scoop * Math.max(0, 1 - tv / .06) + (rise ? 3.5 * Math.max(0, (u - .3) / .7) : -p.bend * Math.max(0, (u - .55) / .45));
      const j = Math.floor(pos), f = pos - j;
      let x;
      if (nat) { const a = at(j - 1), b = at(j), cc = at(j + 1), d = at(j + 2); x = b + .5 * f * (cc - a + f * (2 * a - 5 * b + 4 * cc - d + f * (3 * (b - cc) + d - a))); }
      else x = src[j] + (src[j + 1] - src[j]) * f;
      l1 += cut * (x - l1); l2 += cut * (l1 - l2);
      out[k] = (nat ? l1 : l2) * (nat ? Math.min(1, (n - k) / (.25 * n)) : Math.min(1, (n - k) / (.03 * sr)));
      pos += (nat ? p.f / pack.mid : p.f / c.f0) * st2(semis) * pack.sr / sr;
    }
    if (!nat) return normalize(out, .8);
    let e = 0; for (let q = 0; q < k; q++) e += out[q] * out[q];
    const g = .2 / Math.sqrt(e / (k || 1) + 1e-9);
    for (let q = 0; q < k; q++) out[q] = Math.tanh(out[q] * g * 1.2) / 1.2;     // matched loudness; tanh only rounds a rare peak
    return out;
  }
  /* the natural way down (19:55, after the first natural try measured high and bright - 235-306 Hz): lowering a
     recording by playing it slower drops the MOUTH with the pitch, the slowed-tape sound. Here only the throat drops:
     1. a small slow-down = a slightly bigger body (mouth size slider, .9 at 1.0);
     2. PSOLA for the rest - cut the voice into two-period grains at its own pulses and lay them down further apart,
        so the pitch falls and the vowel colour and the length stay the speaker's own.
     One ratio for the whole voice (the pack's middle pitch -> p.f): every syllable keeps the same mouth. */
  function recNatural(p, c, src0, pack, lenV, rise, n, sr) {
    const body = .9 * p.formant, total = p.f / pack.mid, pr = total / body;
    const step = body * pack.sr / sr, m = Math.floor((src0.length - 2) / step), src = new Float32Array(m);
    for (let k = 0; k < m; k++) { const x = k * step, j = Math.floor(x), f = x - j; src[k] = src0[j] + (src0[j + 1] - src0[j]) * f; }
    const P = sr / (c.f0 * body);                                              // the source's period after the body step, samples
    const marks = []; let t = 0, best = 0;
    for (let k = 0; k < Math.min(m, P); k++) if (Math.abs(src[k]) > Math.abs(src[best])) best = k;
    for (t = best; t < m; ) { marks.push(t); let nx = Math.round(t + P), b = nx; for (let k = Math.max(0, nx - P / 4 | 0); k < Math.min(m, nx + P / 4); k++) if (src[k] > src[b]) b = k; t = b > t ? b : nx; }
    const out = new Float32Array(n), half = Math.round(P);
    let to = 0, gi = 0;
    while (to < n && marks.length) {
      const u = Math.min(1, to / sr / lenV), semis = rise ? 3.5 * Math.max(0, (u - .3) / .7) : 0;
      const sc = Math.min(m - 1, to * (m / Math.max(n, m)));                   // where in the source this moment is (same speed)
      while (gi < marks.length - 1 && marks[gi + 1] <= sc) gi++;
      const mk = marks[gi];
      for (let k = -half; k < half; k++) { const o = Math.round(to) + k, s = mk + k; if (o >= 0 && o < n && s >= 0 && s < m) out[o] += src[s] * (.5 + .5 * Math.cos(Math.PI * k / half)); }
      to += P / (pr * st2(semis));
      if (mk + half >= m && to > m) break;
    }
    const cut = 1 - Math.exp(-TAU * 2600 * p.formant / sr);
    let l1 = 0, e = 0, last = 0;
    for (let k = 0; k < n; k++) { l1 += cut * (out[k] - l1); out[k] = l1 * Math.min(1, (n - k) / (.25 * n)); e += out[k] * out[k]; if (Math.abs(out[k]) > 1e-4) last = k; }
    const g = .2 / Math.sqrt(e / (last + 1) + 1e-9);
    for (let k = 0; k < n; k++) out[k] = Math.tanh(out[k] * g * 1.2) / 1.2;   // matched loudness; tanh only rounds a rare peak
    return out;
  }
  function syllable(p, v, on, len, rise, sr = SR) { return p.shape === 'gb' ? chipSyllable(p, v, on, len, rise, sr) : p.shape === 'rec' ? recSyllable(p, v, on, len, rise, sr) : voiceSyllable(p, v, on, len, rise, sr); }

  /* the line as syllables: each gets the onset class of its first letter, its first vowel, and which word it is in */
  function syllables(text) {
    const out = []; let word = 0;
    /* a sentence ends at . ! ? followed by a space or the end - never the dot inside "Rp 52.000" or "2.5 Bks", which
       used to cut "Sold Rp 52.000 today." into a sentence of one word */
    for (const m of text.matchAll(/[A-Za-z']+|[.!?]+(?=\s|$)/g)) {
      const w = m[0].replace(/'/g, '');
      if (/^[.!?]+$/.test(w)) { out.push({ end: w.slice(-1) }); continue; }
      if (!w) continue;
      const parts = w.toLowerCase().match(/[^aeiouy]*[aeiouy]+/g) || [w.toLowerCase() + 'e'];
      let pos = m.index;
      parts.forEach((s, i) => {
        const c = s[0], v = s.match(/[aeiouy]/)[0].replace('y', 'i');
        const on = /[aeiouy]/.test(c) || /[mnlrwyh]/.test(c) ? 'soft' : /[szfvcx]/.test(c) ? 'hiss' : 'hard';
        out.push({ v, on, first: i === 0, word, wlen: w.length, from: pos, to: pos + s.length });
        pos += s.length;
      });
      out[out.length - 1].to = m.index + m[0].length;
      word++;
    }
    return out;
  }

  /* MOODS: every line gets one, and a fresh roll of the dice. A friendly voice is calm / cheerful / curious / excited;
     the AGENT is focused / firm / questioning / approving - serious, but never flat. Variety = how far a mood may pull. */
  const MOODS = {
    calm:        { label: 'calm',        pitch: 0,   range: .8,   gap: 1.06, shape: (u) => 1.5 - 3 * u },
    cheerful:    { label: 'cheerful',    pitch: 1.5, range: 1.15, gap: .95,  shape: (u) => 3 * Math.sin(Math.PI * u) - 1.2 },
    curious:     { label: 'curious',     pitch: 1,   range: 1.1,  gap: 1,    shape: (u) => -1 + 2 * u },
    excited:     { label: 'excited',     pitch: 2.5, range: 1.35, gap: .88,  shape: (u, i) => (i % 2 ? 1.2 : -.6) + 1 - 2 * u },
    focused:     { label: 'focused',     pitch: 0,   range: .6,   gap: .92,  shape: (u) => .6 - 1.4 * u },
    firm:        { label: 'firm',        pitch: -.5, range: .95,  gap: 1,    shape: (u) => 1.2 - 2.8 * u },
    questioning: { label: 'questioning', pitch: .5,  range: 1,    gap: 1,    shape: (u) => -.6 + 1.6 * u },
    approving:   { label: 'approving',   pitch: .8,  range: 1.05, gap: 1.04, shape: (u) => 2.2 * Math.sin(Math.PI * u) - .8 },
  };
  function moodFor(text, r, set) {
    const x = r(), ask = /\?\s*\W*$/.test(text), bang = /!/.test(text);
    if (set === 'agent') return ask ? (x < .85 ? 'questioning' : 'focused') : bang ? (x < .6 ? 'firm' : 'approving') : x < .45 ? 'focused' : x < .8 ? 'firm' : 'approving';
    /* his 2026-10-11 "we need more happy emotion": the agent's voice, only bright melodies */
    if (set === 'happy') return ask ? (x < .7 ? 'curious' : 'cheerful') : bang ? (x < .6 ? 'excited' : 'cheerful') : x < .45 ? 'cheerful' : x < .8 ? 'approving' : 'excited';
    return ask ? (x < .8 ? 'curious' : 'cheerful') : bang ? (x < .7 ? 'excited' : 'cheerful') : x < .5 ? 'calm' : 'cheerful';
  }
  /* the plan: which syllable file, at what pitch (a playback rate), how loud, when. The app will run THIS, with a new
     seed on every call. The seed goes through the hash with the line, so seeds close together still differ. */
  function plan(text, p, o = {}) {
    const r = rng(o.seed != null ? hash(text + '#' + o.seed) : hash(text)), out = [];
    const v = p.variety || 0, tv = p.tempo || 0, dv = p.drop || 0, ev = p.emph ?? .5;
    const mood = MOODS[o.mood] || MOODS[moodFor(text, r, p.moods)], lift = (mood.pitch + (r() * 2 - 1) * 1.5) * v;
    const rangeK = 1 + (mood.range - 1) * v, gapK = 1 + (mood.gap - 1) * v;
    /* 1. HOW MANY syllables this time: some unstressed ones swallowed, sometimes an "hm." first, a limit that moves */
    const cap = Math.max(p.minSyl || 2, Math.round(p.maxSyl * (1 + (r() * 2 - 1) * .3 * dv))), dropP = dv * (.1 + .3 * r());
    let sy = syllables(text);
    const lastOf = new Set(); sy.forEach((x, i) => { if (!x.end && (!sy[i + 1] || sy[i + 1].end)) lastOf.add(i); });
    sy = sy.filter((x, i) => x.end || x.first || lastOf.has(i) || r() >= dropP);
    /* the low lone "hm." is the agent's habit - a happy voice does not grunt first */
    if (p.moods !== 'happy' && r() < dv * .3) sy.unshift({ v: 'm', on: 'soft', first: true, word: -1, wlen: 2, from: 0, to: 0, filler: true }, { end: '.' });
    /* 2. HOW FAST: the whole line quicker or slower, and inside it a drift - quick through the middle, slow at the end */
    const pace = 1 + (r() * 2 - 1) * .28 * tv, phase = r();
    const sentences = []; let cur = [];
    for (const s of sy) { if (s.end) { if (cur.length) sentences.push({ s: cur, end: s.end }); cur = []; } else cur.push(s); }
    if (cur.length) sentences.push({ s: cur, end: '.' });
    /* his "minimum of 3 words when saying stuff" (2026-10-11) and "minimum 3 words each sentence remember" (2026-10-12):
       counted per SENTENCE and in WORDS he can hear. The first fix counted sounds per line and glued the extra ones into
       the last word with no gap - "Hi." was 3 sounds heard as ONE, and "Deal's done. Good haul." two words a sentence.
       A short sentence now gets more words made of its own sounds, each its own word (so a word gap follows it). */
    const minW = p.minSyl || 0;
    let made = 0;
    for (const S of sentences) {
      if (S.s.every((x) => x.filler)) continue;
      const words = new Set(S.s.map((x) => x.word)), own = S.s.slice();
      for (let k = 0; words.size < minW; k++) { const w = 'w' + made++; S.s.push({ ...own[k % own.length], first: true, word: w }); words.add(w); }
    }
    /* the limit on a long line cuts between WORDS, never leaves a sentence with fewer than minW of them, and drops a
       whole sentence rather than start one it cannot finish to that minimum */
    let budget = cap;
    for (const S of sentences) {
      if (budget <= 0) { S.s = []; continue; }
      const keep = [], seen = new Set();
      for (const x of S.s) { if (!seen.has(x.word)) { if (keep.length >= budget && seen.size >= minW) break; seen.add(x.word); } keep.push(x); }
      S.s = keep; budget -= keep.length;
    }
    let at = 0, si = 0;
    for (const { s, end } of sentences) {
      if (!s.length) continue;
      si++;
      const n = s.length, bang = end === '!', ask = end === '?', range = p.intonation * (bang ? 1.3 : 1) * rangeK;
      /* 3. WHICH WORD carries the weight: the longest (a filler never does) */
      let hot = -1, best = 0; s.forEach((x) => { if (!x.filler && x.wlen > best) { best = x.wlen; hot = x.word; } });
      s.forEach((x, i) => {
        const u = n > 1 ? i / (n - 1) : 0, last = i === n - 1, nextS = s[i + 1];
        const stress = x.first && x.wlen > 2, emph = x.word === hot && x.first && n > 2;
        const lp = pace * (1 + Math.sin(TAU * (u * 1.3 + phase)) * .15 * tv) * (last ? .78 : 1) * (emph ? 1 - .25 * ev : 1);
        const len = x.filler ? 'm' : last || (emph && lp < 1) ? 'l' : stress || emph ? (lp > 1.12 ? 's' : 'm') : (lp > .95 ? 's' : 'm');
        const rise = last && ask;
        const contour = (1 - v) * (1.5 - 3 * u) + v * mood.shape(u, i);
        let semis = range * contour + (x.first ? .8 * range : 0) + (r() * 2 - 1) * 1.5 * p.jitter + (bang ? 2.5 : 0) + lift + (emph ? 2 * ev : 0);
        if (ask && i >= n - 2) semis = range * (i === n - 1 ? 3 : 2) + lift;
        if (x.filler) semis = -2 + lift;
        const rate = st2(semis), { pre, lenV } = sylLen(p, x.on, len);
        const gain = (x.filler ? .7 : emph ? 1 : stress ? .9 : .76) * (bang ? 1.08 : 1);
        out.push({ v: x.v, on: x.on, len, rise, rate, gain, at: +at.toFixed(4), from: x.from, to: x.to, word: x.word, sent: si });
        /* the gap after it: word breaks, sentence breaks, and now and then a thinking pause. `wordGap` (default .05) is how
           long the breath between two words is - long enough on the capybara that each word is heard as its own */
        const wordBreak = nextS && nextS.word !== x.word, pause = wordBreak && r() < .1 * tv ? .16 : 0;
        at += (pre + lenV) / rate * .92 + ((last ? .2 : wordBreak ? (p.wordGap ?? .05) : 0) / p.speed / lp + pause) * gapK;
      });
    }
    out.mood = mood.label;
    return out;
  }
  function speak(text, p, sr = SR, o) {
    const pl = plan(text, p, o), cache = {}, last = pl[pl.length - 1];
    if (!last) return { mix: new Float32Array(1), plan: pl };
    const mix = new Float32Array(Math.ceil((last.at + .8) * sr));
    for (const x of pl) {
      const key = x.on + x.v + x.len + (x.rise ? 'R' : '');
      cache[key] = cache[key] || syllable(p, x.v, x.on, x.len, x.rise, sr);
      add(mix, resample(cache[key], x.rate), x.at, x.gain, sr);
    }
    return { mix, plan: pl };
  }
  const CAPY = {
    /* round 7 - his "fat but soft mumbling ... the duke from resident evil village but inside the sim city or maybe esquie
       voice from expedition 33 but mumbling": the gentleman merchant, happy, never fewer than 3 sounds a line */
    vidnatural: { label: 'Video mumble - natural', hint: 'your pick, made natural: the same person in every syllable, his own melody, no chopped ends - just a little lower and softer', shape: 'rec', rec: 'round', natural: true, moods: 'happy', f: 108, formant: .9, intonation: .9, jitter: .2, scoop: 0, bend: 0, speed: .9, cons: 0, vib: 0, breath: 0, maxSyl: 12, minSyl: 3, tempo: .5, drop: .5, emph: .5, fry: 0, wordGap: .15 },
    vidmumble: { label: 'Video mumble - first try', hint: 'the first try: the real mumbles from your video, every syllable forced to one low pitch and darkened', shape: 'rec', rec: 'round', moods: 'happy', f: 118, formant: .7, intonation: 1.3, jitter: .3, scoop: 1, bend: 1.5, speed: .9, cons: 0, vib: 0, breath: 0, maxSyl: 12, minSyl: 3, tempo: .6, drop: .5, emph: .6, fry: 0 },
    duke:      { label: 'The Duke (fat, jolly)', hint: 'a big round jolly merchant mumbling - deep chest, soft lips, a happy bounce', shape: 'mumble', moods: 'happy', f: 92, formant: .82, intonation: 1.5, jitter: .3, scoop: 1.6, bend: 2, speed: .85, cons: .35, vib: .25, breath: .28, maxSyl: 12, minSyl: 3, tempo: .6, drop: .5, emph: .6, fry: .12 },
    esquie:    { label: 'Esquie (big, soft, bouncy)', hint: 'a gentle giant - a huge round body, airy and slow, every syllable slides up into a smile', shape: 'mumble', moods: 'happy', f: 125, formant: .74, intonation: 1.8, jitter: .3, scoop: 2.6, bend: 2.4, speed: .8, cons: .2, vib: .35, breath: .35, maxSyl: 11, minSyl: 3, tempo: .5, drop: .5, emph: .5, fry: 0 },
    agent:    { label: 'Agent (firm)', hint: 'low, steady and serious - firm falling endings, one word stressed, a pace that speeds up and slows down like a person', shape: 'voice', moods: 'agent', f: 112, formant: 1, intonation: 1.1, jitter: .35, scoop: 1.2, bend: 2.4, speed: 1, cons: .9, vib: .1, breath: .18, maxSyl: 12, tempo: .7, drop: .6, emph: .7, fry: .35 },
    radio:    { label: 'Radio agent', hint: 'the agent over a walkie-talkie - narrow, a little overdriven, a touch of static', shape: 'radio', moods: 'agent', f: 118, formant: 1, intonation: 1.1, jitter: .35, scoop: 1, bend: 2.2, speed: 1.05, cons: .9, vib: .05, breath: .15, maxSyl: 12, tempo: .7, drop: .6, emph: .7, fry: .2 },
    gravel:   { label: 'Gravel agent', hint: 'a rough, raspy, older voice - every other throat cycle weak and late', shape: 'gravel', moods: 'agent', f: 100, formant: .95, intonation: 1, jitter: .4, scoop: 1, bend: 2.4, speed: .95, cons: .85, vib: .05, breath: .3, maxSyl: 11, tempo: .7, drop: .6, emph: .7, fry: .5 },
    baritone: { label: 'Deep baritone', hint: 'a big, calm, low voice from a large mouth', shape: 'voice', moods: 'agent', f: 92, formant: .9, intonation: 1, jitter: .3, scoop: 1, bend: 2, speed: .92, cons: .8, vib: .15, breath: .12, maxSyl: 11, tempo: .6, drop: .5, emph: .6, fry: .3 },
    whisper:  { label: 'Whisper agent', hint: 'no voice at all, only breath through the mouth - a spy keeping it quiet', shape: 'whisper', moods: 'agent', f: 140, formant: 1.05, intonation: 1, jitter: .3, scoop: 1, bend: 2, speed: 1.05, cons: 1, vib: 0, breath: 0, maxSyl: 12, tempo: .6, drop: .6, emph: .5, fry: 0 },
    mumble:   { label: 'Low mumble', hint: 'vowels half through the nose, lips barely open - talks under his breath', shape: 'mumble', moods: 'agent', f: 115, formant: 1, intonation: .9, jitter: .4, scoop: 1.5, bend: 2, speed: 1.1, cons: .5, vib: .1, breath: .25, maxSyl: 10, tempo: .7, drop: .7, emph: .5, fry: .3 },
    wah:      { label: 'Muted trumpet (wah-wah)', hint: 'no words at all - a muted trumpet that talks in "wah"s, like the grown-ups in Charlie Brown', shape: 'brass', moods: 'agent', f: 165, formant: 1, intonation: 1.3, jitter: .3, scoop: 1.5, bend: 2.5, speed: .95, cons: 0, vib: .4, breath: .05, maxSyl: 9, tempo: .6, drop: .6, emph: .7, fry: 0 },
    grumble:  { label: 'Sleepy grumble', hint: 'low, slow and breathy, half-hummed', shape: 'voice', moods: 'friendly', f: 130, formant: .95, intonation: .7, jitter: .3, scoop: 1.5, bend: 2, speed: .8, cons: .5, vib: .4, breath: .5, maxSyl: 8, tempo: .5, drop: .5, emph: .4, fry: .5 },
    sims:     { label: 'Sims chatter', hint: 'quick made-up syllables over a big, friendly sentence melody - the Sims idea', shape: 'voice', moods: 'friendly', f: 210, formant: 1.1, intonation: 1.7, jitter: .5, scoop: 2, bend: 1, speed: 1.15, cons: .8, vib: .3, breath: .25, maxSyl: 14, tempo: .5, drop: .4, emph: .5, fry: 0 },
    villager: { label: 'Villager hum', hint: 'a nasal "hmm" that rises and falls - the Minecraft villager idea', shape: 'hum', moods: 'friendly', f: 150, formant: 1, intonation: 1.8, jitter: .5, scoop: 3, bend: 3, speed: .8, cons: .2, vib: .2, breath: .35, maxSyl: 3, tempo: .3, drop: .5, emph: .3, fry: .2 },
    gbvoice:  { label: 'Game Boy voice (8-bit)', hint: 'the video\'s method: one vowel cycle squeezed into the Game Boy\'s 32-step wave, looped', shape: 'gb', moods: 'friendly', f: 280, formant: 1.15, intonation: 1, jitter: .35, scoop: 1.5, bend: 0, speed: 1, cons: .6, vib: .3, breath: 0, maxSyl: 12, tempo: .3, drop: .3, emph: .3, fry: 0 },
  };

  /* ── the vault intro: VaultGate.jsx's own clock (T_WAVE, T_WAVE_DUR, T_GATHER, FORMED, OUT, STEP, resolveIn) ── */
  const T = { wave: .1, waveDur: 3, gather: 2.8, gatherDur: 1.7, formed: 4.5, out: 6.7, step: .095, total: 8.5, roll: .046, outHold: .21,
    hello: { text: 'WELCOME BACK', at: 3.1, step: .07, hold: .44, outAt: 6.7, outStep: .034 },
    line: { text: 'KPM APP ACCESS UNLOCKED', at: 4.8, step: .04, hold: .36, outAt: 6.82, outStep: .022 } };
  const easeOut = (t) => 1 - Math.pow(1 - t, 3);
  const easeInOut = (t) => (t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  function invEaseInOut(v) { let lo = 0, hi = 1; for (let i = 0; i < 40; i++) { const m = (lo + hi) / 2; if (easeInOut(m) < v) lo = m; else hi = m; } return (lo + hi) / 2; }

  /* an FM bell: a sine whose phase is pushed by another sine; the push fades faster than the note - a struck bell */
  function bell(f, len, o = {}, sr = SR) {
    const n = Math.round(len * sr), out = new Float32Array(n), ratio = o.ratio ?? 2, I0 = o.index ?? 1.5, tau = o.tau ?? len / 4, ti = o.tauI ?? tau / 2, att = o.attack ?? .003;
    for (let k = 0; k < n; k++) {
      const t = k / sr;
      out[k] = Math.sin(TAU * f * t + I0 * Math.exp(-t / ti) * Math.sin(TAU * f * ratio * t)) * Math.min(1, t / att) * Math.exp(-t / tau) * Math.min(1, (n - k) / (sr * .01));
    }
    return out;
  }
  /* a slow chord: each note doubled 0.3 % sharp, so it breathes */
  function pad(freqs, len, att, rel, sr = SR) {
    const n = Math.round(len * sr), out = new Float32Array(n);
    for (let k = 0; k < n; k++) {
      const t = k / sr, e = t < att ? .5 - .5 * Math.cos(Math.PI * t / att) : t > len - rel ? .5 + .5 * Math.cos(Math.PI * (t - len + rel) / rel) : 1;
      let y = 0; for (const f of freqs) y += Math.sin(TAU * f * t) + .5 * Math.sin(TAU * f * 1.003 * t);
      out[k] = y / (freqs.length * 1.5) * e;
    }
    return out;
  }
  /* stereo: equal-power pan, -1 left .. +1 right */
  function add2(L, R, buf, at, gain, pan, sr = SR) { const a = (pan + 1) * Math.PI / 4; add(L, buf, at, gain * Math.cos(a), sr); add(R, buf, at, gain * Math.sin(a), sr); }
  /* the hall: two channels of soft noise dying over ~2 s - the studio's echo for the intro, and the baker's */
  function hall(sr = SR) {
    const n = Math.floor(sr * 2.4), pre = Math.floor(sr * .02);
    return [0, 1].map((ch) => { const d = new Float32Array(n), r = rng(21 + ch); let y = 0;
      for (let k = 0; k < n; k++) { y += .25 * (r() * 2 - 1 - y); d[k] = k < pre ? 0 : y * Math.exp(-(k - pre) / (sr * .55)); } return d; });
  }

  /* every moment a letter of the two text lines appears, rolls a random glyph (every 46 ms) or leaves */
  function typeEvents() {
    const ev = [];
    for (const L of [T.hello, T.line]) [...L.text].forEach((c, i) => {
      if (c === ' ') return;
      const t0 = L.at + i * L.step, to = L.outAt + i * L.outStep, pan = -.45 + .9 * i / (L.text.length - 1);   // the tick walks left to right with the letters
      ev.push({ t: t0, k: 'in', pan });
      for (let m = 1; m * T.roll < L.hold; m++) ev.push({ t: t0 + m * T.roll, k: 'roll', pan });
      ev.push({ t: to, k: 'out', pan });
      for (let m = 1; m * T.roll < T.outHold; m++) ev.push({ t: to + m * T.roll, k: 'outroll', pan });
    });
    return ev;
  }
  const TYPE = {
    'soft:key':   { label: 'Soft key', make: (sr) => noise(.022, () => 2600, .5, (u) => Math.exp(-u * 5), 17, sr) },
    'soft:tick':  { label: 'Soft tick', make: (sr) => { const a = bell(3000, .03, { ratio: 1, index: 0, tau: .006 }, sr), b = noise(.004, () => 5000, .6, () => .5, 19, sr); for (let k = 0; k < b.length; k++) a[k] += b[k]; return a; } },
    'soft:glass': { label: 'Glass tick', make: (sr) => bell(4186, .12, { ratio: 2, index: .6, tau: .03 }, sr) },
  };
  function trimmed(x) {
    let pk = 0; for (const v of x) pk = Math.max(pk, Math.abs(v));
    let i = 0; while (i < x.length && Math.abs(x[i]) < pk * .01) i++;
    const out = x.slice(i), f = Math.min(out.length, 88);
    for (let k = 0; k < f; k++) out[out.length - 1 - k] *= k / f;
    return out;
  }
  function typeLayer(c, rec, sr, L, R) {
    if (!c.vol || c.src === 'off') return;
    const base = TYPE[c.src] ? TYPE[c.src].make(sr) : rec(c.src) ? trimmed(rec(c.src)) : null;
    if (!base) return;
    const r = rng(29);
    typeEvents().forEach((e) => {
      const roll = e.k === 'roll' || e.k === 'outroll', out = e.k === 'out' || e.k === 'outroll';
      const w = (r() * 2 - 1) * (c.wobble || 0);                          // drawn for every event, so a toggle never reshuffles the rest
      if (out && !c.leave) return;
      const g = roll ? (c.chatter || 0) * .5 : 1;
      if (!g) return;
      add2(L, R, resample(base, (c.pitch || 1) * st2(w)), e.t, c.vol * g, e.pan, sr);
    });
  }

  const PENT = [0, 2, 4, 7, 9];
  /* the invented dot sounds - elegant. p = the pitch knob as a multiplier. Each draws into L/R at the app's own times. */
  const DESIGN = {
    wave: {
      sparkle: { label: 'Sparkle cascade', hint: 'a soft bell for the dots the ring lights - many at first, fewer as it slows, rising and spread wide', fn(L, R, p, sr) {
        const r = rng(41), N = 28;
        for (let j = 1; j <= N; j++) {
          const v = .8 * Math.sqrt(j / N), t = T.wave + T.waveDur * (1 - Math.cbrt(1 - v));   // area the ring has swept = dots it has lit
          const semis = PENT[j % 5] + 12 * Math.floor(j * 2 / N);
          add2(L, R, bell(523 * st2(semis) * p, .9, { ratio: 2, index: 1.2, tau: .28 }, sr), t, .22, r() * 1.6 - .8, sr);
        }
      } },
      air: { label: 'Air', hint: 'a breath of air that swells and settles with the ring, over a low soft chord', fn(L, R, p, sr) {
        const b = noise(T.waveDur, (u) => (700 + 2300 * Math.sin(Math.PI * Math.min(1, u * 1.3))) * p, .7, (u) => Math.pow(Math.sin(Math.PI * u), 1.5) * .6, 43, sr);
        add2(L, R, b, T.wave, .8, -.3, sr); add2(L, R, b.slice().reverse(), T.wave, .5, .3, sr);
        add2(L, R, pad([131 * p, 196 * p], T.waveDur, 1, 1.2, sr), T.wave, .25, 0, sr);
      } },
      bloom: { label: 'Slow chord', hint: 'a warm five-note chord that fades in as the ring opens', fn(L, R, p, sr) {
        const pd = pad([262, 330, 392, 494, 587].map((f) => f * p), 3.3, 1.2, 1.4, sr);
        add2(L, R, pd, T.wave, .3, -.25, sr); add2(L, R, pd, T.wave + .013, .3, .25, sr);
      } },
      bell: { label: 'Deep bell', hint: 'one low bell as the ring leaves, ringing out under everything', fn(L, R, p, sr) {
        add2(L, R, bell(131 * p, 3.2, { ratio: 1.4, index: 3, tau: 1, tauI: .5 }, sr), T.wave, .45, 0, sr);
        add2(L, R, bell(262 * p, 2.6, { ratio: 3.5, index: 1.5, tau: .7 }, sr), T.wave + .02, .2, .2, sr);
      } },
    },
    gather: {
      riser: { label: 'Reverse bell', hint: 'a bell played backwards, swelling up and landing exactly when the name forms', fn(L, R, p, sr) {
        const len = T.gatherDur, b = bell(659 * p, len, { ratio: 2, index: 2, tau: .6 }, sr).reverse();
        add2(L, R, b, T.formed - len, .4, -.2, sr); add2(L, R, b, T.formed - len, .4, .2, sr);
        add2(L, R, pad([330, 415, 494, 659].map((f) => f * p), len, 1.4, .08, sr), T.gather, .18, 0, sr);
      } },
      glass: { label: 'Glass swell', hint: 'a glass-like chord growing louder and brighter while the dots fly in', fn(L, R, p, sr) {
        const len = T.gatherDur, n = Math.round(len * sr), b = new Float32Array(n), F = [330, 415, 494, 659].map((f) => f * p);
        for (let k = 0; k < n; k++) {
          const t = k / sr, u = k / n, vib = st2(.1 * Math.sin(TAU * 5 * t));
          let y = 0; for (const f of F) y += Math.sin(TAU * f * vib * t) + u * .5 * Math.sin(TAU * 2 * f * vib * t);
          b[k] = y / 6 * u * u * Math.min(1, (n - k) / (sr * .06));
        }
        add2(L, R, b, T.gather, .7, 0, sr);
      } },
      twinkle: { label: 'Twinkles', hint: 'tiny soft bells, thickest when the dots move fastest, climbing as the name builds', fn(L, R, p, sr) {
        const N = 36;
        for (let j = 1; j <= N; j++) {
          const t = T.gather + T.gatherDur * invEaseInOut(j / N), semis = PENT[j % 5] + 12 * Math.floor(j * 2 / N);
          add2(L, R, bell(784 * st2(semis) * p, .35, { ratio: 2, index: .9, tau: .1 }, sr), t, .18, j % 2 ? -.5 : .5, sr);
        }
      } },
    },
    formed: {
      chime: { label: 'Chime chord', hint: 'five soft bells rolled into one chord, spread left to right', fn(L, R, p, sr) {
        [523, 659, 784, 988, 1175].forEach((f, i) => add2(L, R, bell(f * p, 2.4, { ratio: 2, index: 1.4, tau: .7 }, sr), T.formed + i * .028, .2, -.6 + .3 * i, sr));
      } },
      onebell: { label: 'One clear bell', hint: 'a single bright bell with a low one under it', fn(L, R, p, sr) {
        add2(L, R, bell(880 * p, 2.6, { ratio: 2, index: 1.8, tau: .8 }, sr), T.formed, .45, 0, sr);
        add2(L, R, bell(440 * p, 2.6, { ratio: 1.4, index: 1, tau: .9 }, sr), T.formed, .2, 0, sr);
      } },
      bloomchord: { label: 'Warm bloom', hint: 'a warm chord that opens quickly and rings out, with a small sparkle on top', fn(L, R, p, sr) {
        const pd = pad([262, 330, 392, 494, 587].map((f) => f * p), 2.4, .04, 2, sr);
        add2(L, R, pd, T.formed, .3, -.25, sr); add2(L, R, pd, T.formed + .011, .3, .25, sr);
        add2(L, R, bell(1568 * p, 1.2, { ratio: 2, index: .8, tau: .3 }, sr), T.formed, .12, .4, sr);
      } },
    },
    leave: {
      fall: { label: 'Falling sparkle', hint: 'soft bells stepping down and drifting left as the name breaks apart', fn(L, R, p, sr) {
        for (let i = 0; i < 8; i++) {
          const semis = -(PENT[i % 5] + 12 * Math.floor(i / 5)) ;
          add2(L, R, bell(1568 * st2(semis) * p, .6, { ratio: 2, index: 1, tau: .18 }, sr), T.out + i * .09, .2, .6 - 1.2 * i / 7, sr);
        }
      } },
      breath: { label: 'Breath', hint: 'a soft breath of air that sinks away', fn(L, R, p, sr) {
        add2(L, R, noise(.8, (u) => (2200 - 1400 * u) * p, .6, (u) => Math.sin(Math.PI * u) * .5, 47, sr), T.out, .5, 0, sr);
      } },
    },
  };
  const PARTS = ['type', 'wave', 'gather', 'formed', 'leave'];
  /* one part alone, or all of them: stereo, dry, the length of the whole intro plus room for the bells to ring */
  function intro(c, rec, sr = SR, only) {
    const n = Math.ceil((T.total + 2) * sr), L = new Float32Array(n), R = new Float32Array(n);
    for (const part of only ? [only] : PARTS) {
      const s = c[part]; if (!s) continue;
      if (part === 'type') { typeLayer(s, rec, sr, L, R); continue; }
      const d = DESIGN[part][s.d]; if (!d || !s.vol) continue;
      const l = new Float32Array(n), r = new Float32Array(n);
      d.fn(l, r, st2(s.pitch || 0), sr);
      for (let k = 0; k < n; k++) { L[k] += l[k] * s.vol; R[k] += r[k] * s.vol; }
    }
    let peak = 0; for (let k = 0; k < n; k++) peak = Math.max(peak, Math.abs(L[k]), Math.abs(R[k]));
    return { L, R, peak };
  }

  G.KPM_CHIP = { SR, CAPY, ONSET, VOWEL, MOODS, syllables, plan, speak, syllable, T, TYPE, DESIGN, PARTS, intro, typeEvents, hall, easeOut, easeInOut };
})(typeof window !== 'undefined' ? window : globalThis);
