/* THE MASTER VAULT GATE — the dot field, the wave, and the name that forms out of it.
   Ported from the signed-off preview (variation B) on 2026-08-10. Aldi closed the design
   with "okay i want u to make the wave little bit slower and we done bro"; the four numbers
   below are the ones he landed on with the sliders, so they are hard-coded, not guessed.

   WHAT IT DOES: the modal's background is a grid of dots. Before the unlock they are dark and
   only light up near the pointer, so the field reads as something being revealed rather than
   decoration. On unlock the card collapses and throws a ring outward; the dots brighten as the
   ring passes them, then fly into the shape of his agent name — the letterforms are sampled
   from the real font, not approximated. The same dots then re-form random glyphs and scatter.

   TWO TRAPS THAT EACH COST A SESSION IN THE PREVIEW, both fixed here and easy to reintroduce:

   1. ONE CLOCK. The visible ring is drawn on the canvas from the dots' own `front` value. It
      used to be a CSS keyframe, and a CSS animation cannot be kept in step with canvas maths
      by hand — it started at a different radius, ended at a different radius, and used a
      different easing curve. Three faults at once, and tuning any one of them hid the others.
      If the ring ever becomes a separate animation again, that bug comes back.

   2. A PHONE HAS NO HOVER. The reveal listens to `pointerdown` as well as `pointermove`, so
      press-and-drag works. Without that the gate is a black rectangle on his phone and he
      cannot find the password field at all.

   Lite Mode and prefers-reduced-motion never reach this component — App.jsx renders the plain
   ACCESS GRANTED block instead. That is deliberate: this is a canvas animation running a rAF
   loop, which is exactly what Lite Mode exists to switch off. */

import { useEffect, useRef } from 'react';
import { playSound } from '../hooks/useSound';

/* ── HIS LOCKED NUMBERS. Do not tune these without him. ────────────────────── */
const GAP = 26;             // background spacing
const DEN = 7;              // letter density — how finely the glyph is sampled
const TSIZE = 0.10;         // name size
const T_WAVE_DUR = 3.00;    // his pick. public/sounds/vault-b.mp3 is cut to THIS number —
                            // change the wave and the sound must be regenerated to match.

const T_WAVE = 0.10;        // seconds of stillness before the ring leaves the card
const T_GATHER_DUR = 1.70;
const REACH = 150;          // how far the pointer light carries, in px

/* Everything downstream DERIVES from the wave rather than being hard-coded, so the rhythm
   survives if he ever moves that one number. */
const T_GATHER = T_WAVE + T_WAVE_DUR * 0.9;      // letters start as the ring finishes crossing
const FORMED = (T_GATHER + T_GATHER_DUR) * 1000; // 4500ms — the sound's "tok" lands here
const OUT = FORMED + 2200;                       // 6700ms — the sound's ticks land here
const STEP = 95;                                 // per-letter delay as the name leaves

/* How long App.jsx must hold the modal open. Exported so the hold and the animation cannot
   drift apart — an audit check asserts both unlock paths use this and never a literal. */
export const GATE_UNLOCK_MS = OUT + 1800;        // 8500ms
export const GATE_FAST_MS = 1000;                // the plain ACCESS GRANTED block's own length

export function gateIsRich(doc = globalThis.document) {
  if (doc?.documentElement?.classList?.contains('lite-mode')) return false;
  return !globalThis.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
}
export function gateHoldMs(doc = globalThis.document) {
  return gateIsRich(doc) ? GATE_UNLOCK_MS : GATE_FAST_MS;
}

const POOL = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
const MONO = 'ui-monospace,"Cascadia Mono","Consolas","Courier New",monospace';
const easeOut = t => 1 - Math.pow(1 - t, 3);
const easeInOut = t => (t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const rndWord = n => Array.from({ length: n }, () => POOL[Math.random() * POOL.length | 0]).join('');

export default function VaultGate({ playing, agentName }) {
  const cvRef = useRef(null);
  const hostRef = useRef(null);
  const helloRef = useRef(null);
  const lineRef = useRef(null);

  /* One mutable bag rather than state: every value here changes 60 times a second and none of
     it should ever cause a React render. */
  const S = useRef({
    w: 0, h: 0, dots: [], slotDots: [], unlockAt: null,
    p: { x: -9999, y: -9999, on: false }, raf: 0, timers: [],
  }).current;

  /* ── the canvas: built once, never torn down between renders ─────────────── */
  useEffect(() => {
    const cv = cvRef.current, host = hostRef.current;
    if (!cv || !host) return;
    const ctx = cv.getContext('2d');
    /* A refused 2d context is rare but real on locked-down or GPU-starved Androids, and his
       fleet is field phones. Without this the whole login screen throws instead of just
       missing its background. */
    if (!ctx) return;

    const build = () => {
      S.dots = [];
      const cols = Math.max(2, Math.floor((S.w - GAP) / GAP) + 1);
      const rows = Math.max(2, Math.floor((S.h - GAP) / GAP) + 1);
      for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++)
        S.dots.push({ gx: GAP + c * GAP, gy: GAP + r * GAP, tx: 0, ty: 0, fly: 0, slot: -1, out: 0 });
    };
    const size = () => {
      const dpr = Math.min(devicePixelRatio || 1, 2), r = cv.getBoundingClientRect();
      if (!r.width || !r.height) return;
      S.w = r.width; S.h = r.height;
      cv.width = r.width * dpr; cv.height = r.height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      build();
    };
    size();
    const ro = new ResizeObserver(size); ro.observe(cv);

    /* pointerdown as well as pointermove — a phone has no hover, and without the press path
       the field is invisible on his actual device. */
    const track = e => {
      const r = cv.getBoundingClientRect();
      S.p.x = e.clientX - r.left; S.p.y = e.clientY - r.top; S.p.on = true;
    };
    const off = () => { S.p.on = false; };
    /* On a touch screen the light must go out when the finger lifts; on a mouse it must not,
       or the field goes dark the moment he clicks the password box. */
    const lift = () => { if (matchMedia('(hover: none)').matches) off(); };
    host.addEventListener('pointermove', track);
    host.addEventListener('pointerdown', track);
    host.addEventListener('pointerleave', off);
    host.addEventListener('pointerup', lift);

    const frame = now => {
      const { w, h } = S;
      ctx.clearRect(0, 0, w, h);
      const u = S.unlockAt === null ? -1 : (now - S.unlockAt) / 1000;
      const gather = u < 0 ? 0 : Math.min(1, easeInOut(Math.max(0, (u - T_GATHER) / T_GATHER_DUR)));
      const cx = w / 2, cy = h / 2, maxD = Math.hypot(w, h) / 2;

      /* THE WAVE — the card's own exit, not a separate effect. The field only exists where the
         ring has already passed. A global 0-to-1 fade was the first attempt and he was right to
         call it instant: a fade has no direction, and direction is what makes it read. */
      const wp = u < T_WAVE ? -1 : easeOut(Math.min(1, (u - T_WAVE) / T_WAVE_DUR));
      const front = wp < 0 ? -1 : wp * maxD * 1.25;

      for (let i = 0; i < S.dots.length; i++) {
        const d = S.dots[i];
        let px = d.gx, py = d.gy, r = 2.4, a = 0;

        if (u >= 0) {
          const dist = Math.hypot(d.gx - cx, d.gy - cy);
          const passed = front > dist ? 1 : 0;                                   // calm, behind the ring
          const crest = front < 0 ? 0 : Math.max(0, 1 - Math.abs(dist - front) / 72);  // bright, at it
          a = passed * 0.30 + crest * 0.55;
          r = 2.4 + crest * 1.4;
        }
        if (S.p.on && u < 0) {
          const dx = d.gx - S.p.x, dy = d.gy - S.p.y, dd = Math.hypot(dx, dy);
          if (dd < REACH) { const k = 1 - dd / REACH; a = k * k * 0.85; r = 2.4 + k * 1.1; }
        }
        if (gather > 0 && d.fly) {
          px = d.gx + (d.tx - d.gx) * gather;
          py = d.gy + (d.ty - d.gy) * gather;
          r = 2.4 + gather * 1.1;
          const peak = d.fly === 2 ? 0.42 * Math.sin(Math.PI * gather) : 0.92 * gather;
          a = peak * (1 - d.out) + a * (1 - gather);     // d.out is per CHARACTER, set as it leaves
        }

        if (a <= 0.012) continue;
        ctx.beginPath(); ctx.arc(px, py, r, 0, 6.283);
        ctx.fillStyle = 'rgba(231,112,15,' + Math.min(1, a).toFixed(3) + ')';
        ctx.fill();
      }

      /* The visible edge of the SAME wave the dots are riding — same origin, same radius, same
         easing, because it is the same number. Never make this a CSS animation again. */
      if (front > 0 && wp < 1 && gather < 1) {
        ctx.beginPath(); ctx.arc(cx, cy, front, 0, 6.283);
        ctx.strokeStyle = 'rgba(231,112,15,' + (0.55 * (1 - wp) * (1 - gather)).toFixed(3) + ')';
        ctx.lineWidth = 1; ctx.stroke();
      }
      S.raf = requestAnimationFrame(frame);
    };
    S.raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(S.raf);
      ro.disconnect();
      host.removeEventListener('pointermove', track);
      host.removeEventListener('pointerdown', track);
      host.removeEventListener('pointerleave', off);
      host.removeEventListener('pointerup', lift);
      S.timers.forEach(clearTimeout); S.timers = [];
    };
  }, [S]);

  /* ── the unlock sequence ─────────────────────────────────────────────────── */
  useEffect(() => {
    if (!playing) return;
    const T = (fn, ms) => { S.timers.push(setTimeout(fn, ms)); };

    /* Draw the name to an offscreen canvas and read its opaque pixels back, ONE BUCKET PER
       CHARACTER. Bucketing by each glyph's measured x-range is what lets a single letter
       scramble and leave on its own, which is how the name exits. */
    const sampleWord = str => {
      const c = document.createElement('canvas');
      c.width = Math.max(2, Math.round(S.w)); c.height = Math.max(2, Math.round(S.h));
      const g = c.getContext('2d', { willReadFrequently: true });
      let fs = Math.round(Math.min(S.w, S.h) * TSIZE * 2.2);
      const face = () => '700 ' + fs + 'px ' + MONO;
      g.font = face();
      while (g.measureText(str).width > S.w * 0.84 && fs > 10) { fs -= 2; g.font = face(); }
      const total = g.measureText(str).width;
      let x = c.width / 2 - total / 2;
      const bounds = [];
      for (const ch of str) { const cw = g.measureText(ch).width; bounds.push([x, x + cw]); x += cw; }
      g.fillStyle = '#fff'; g.textAlign = 'left'; g.textBaseline = 'middle';
      g.fillText(str, c.width / 2 - total / 2, c.height * 0.5);
      const px = g.getImageData(0, 0, c.width, c.height).data;
      const slots = bounds.map(() => []);
      for (let y = 0; y < c.height; y += DEN) for (let x2 = 0; x2 < c.width; x2 += DEN) {
        if (px[(y * c.width + x2) * 4 + 3] > 128) {
          for (let i = 0; i < bounds.length; i++)
            if (x2 >= bounds[i][0] && x2 < bounds[i][1]) { slots[i].push({ x: x2, y }); break; }
        }
      }
      /* Thin EVENLY, never truncate. Scanning runs top to bottom, so cutting the tail deletes
         the bottom of every letter — the bug he caught in the preview. */
      const budget = Math.floor(S.dots.length * 0.82);
      const count = slots.reduce((s, a) => s + a.length, 0);
      if (count > budget && count > 0) {
        const k = count / budget;
        return slots.map(a => { const o = []; for (let i = 0; i < a.length; i += k) o.push(a[Math.floor(i)]); return o; });
      }
      return slots;
    };

    /* Every dot the word does not need still flies into it and dissolves on arrival — his rule
       that nothing may be left lying on the field. */
    const assign = slots => {
      const order = S.dots.map((_, i) => i);
      for (let i = order.length - 1; i > 0; i--) {
        const j = ((Math.sin(i * 12.9898) * 43758.5453) % 1 + 1) % 1 * (i + 1) | 0;
        const tmp = order[i]; order[i] = order[j]; order[j] = tmp;
      }
      S.dots.forEach(d => { d.fly = 0; d.slot = -1; d.out = 0; });
      S.slotDots = slots.map(() => []);
      const flat = [];
      slots.forEach((pts, si) => pts.forEach(p => flat.push({ p, si })));
      let k = 0;
      for (; k < flat.length && k < order.length; k++) {
        const d = S.dots[order[k]];
        d.tx = flat[k].p.x; d.ty = flat[k].p.y; d.fly = 1; d.slot = flat[k].si;
        S.slotDots[flat[k].si].push(d);
      }
      for (; k < order.length; k++) {
        const d = S.dots[order[k]];
        if (!flat.length) { d.fly = 0; continue; }
        const p = flat[(k * 7919) % flat.length].p;
        d.tx = p.x; d.ty = p.y; d.fly = 2;              // a spare: joins the word, then dissolves
      }
    };
    const reglyph = (si, pts) => {
      const ds = S.slotDots[si] || [];
      if (!ds.length || !pts || !pts.length) return;
      ds.forEach((d, i) => { const p = pts[i % pts.length]; d.tx = p.x; d.ty = p.y; });
    };

    const resolveIn = (el, text, startAt, step, hold) => {
      if (!el) return;
      const chars = [...text.toUpperCase()]; el.innerHTML = '';
      const spans = chars.map(c => {
        const s = document.createElement('span');
        /* Every character gets a fixed cell. TWO reasons, and the first is a bug Aldi caught:
           these spans are flex items, and a lone space collapses to zero width, so "Welcome back"
           rendered as "WELCOMEBACK". The second is why the preview had it — the scramble swaps
           each letter through random glyphs, and without a fixed cell every neighbour shifts
           sideways on each frame as glyph widths change. */
        s.style.display = 'inline-block';
        s.style.minWidth = '0.62em';
        s.style.textAlign = 'center';
        s.textContent = c === ' ' ? ' ' : c;
        if (c !== ' ') s.style.visibility = 'hidden';
        el.appendChild(s); return s;
      });
      el._spans = spans;
      chars.forEach((c, i) => {
        if (c === ' ') return;
        T(() => {
          spans[i].style.visibility = ''; spans[i].style.color = '#fff3dc';
          const roll = setInterval(() => { spans[i].textContent = POOL[Math.random() * POOL.length | 0]; }, 46);
          T(() => { clearInterval(roll); spans[i].textContent = c; spans[i].style.color = ''; }, hold);
        }, startAt + i * step);
      });
    };
    const resolveOut = (el, startAt, step) => {
      ((el && el._spans) || []).forEach((s, i) => {
        if (s.textContent === ' ') return;
        T(() => {
          s.style.color = '#fff3dc';
          const roll = setInterval(() => { s.textContent = POOL[Math.random() * POOL.length | 0]; }, 46);
          T(() => { clearInterval(roll); s.style.opacity = '0'; }, 210);
        }, startAt + i * step);
      });
    };

    const name = (agentName || 'AGENT').trim().toUpperCase().slice(0, 14) || 'AGENT';
    S.unlockAt = performance.now();
    assign(sampleWord(name));
    /* Pre-sample the scramble glyphs NOW, while nothing is moving. Sampling mid-animation is
       what would stutter on a weak phone, and his phone is the weak one. */
    const RANDSETS = [0, 1, 2].map(() => sampleWord(rndWord(name.length)));
    playSound('vaultb');

    /* His wording, 2026-08-10: the second line names the whole app, not the vault screen —
       "master vault sentence should be KPM APP instead so kpm app access unlocked". */
    resolveIn(helloRef.current, 'Welcome back', FORMED - 1400, 70, 440);
    resolveIn(lineRef.current, 'KPM App access unlocked', FORMED + 300, 40, 360);

    /* The name leaves EXACTLY like the two text lines: letter by letter, each scrambling through
       three glyphs before it goes, so the three read as one idea rather than three effects. */
    for (let i = 0; i < name.length; i++) {
      if (name[i] === ' ') continue;
      T(() => reglyph(i, RANDSETS[0][i]), OUT + i * STEP);
      T(() => reglyph(i, RANDSETS[1][i]), OUT + i * STEP + 70);
      T(() => reglyph(i, RANDSETS[2][i]), OUT + i * STEP + 140);
      T(() => { (S.slotDots[i] || []).forEach(d => { d.out = 1; }); }, OUT + i * STEP + 215);
    }
    resolveOut(helloRef.current, OUT, 34);
    resolveOut(lineRef.current, OUT + 120, 22);

    return () => { S.timers.forEach(clearTimeout); S.timers = []; S.unlockAt = null; };
  }, [playing, agentName, S]);

  return (
    <div ref={hostRef} className="absolute inset-0 overflow-hidden" style={{ touchAction: 'none' }}>
      <canvas ref={cvRef} className="absolute inset-0 w-full h-full" />

      {/* Only the two small lines are DOM text. The name itself is made of dots. */}
      <div
        className={`absolute inset-0 z-[4] flex-col items-center justify-start px-6 text-center pointer-events-none ${playing ? 'flex' : 'hidden'}`}
      >
        <div className="mt-[14%]">
          <div ref={helloRef} className="flex flex-wrap justify-center text-[15px] uppercase tracking-[0.44em] text-[#f7e9c8]/80" />
          <div ref={lineRef} className="flex flex-wrap justify-center text-[13px] uppercase tracking-[0.32em] text-[#f7e9c8]/60 mt-3" />
        </div>
      </div>

      {/* The card is NOT a child of this component — App.jsx owns those 180 lines and five
          modes, and moving them in here to get a collapse animation would be a large diff for
          two CSS properties. App applies the collapse itself. */}
    </div>
  );
}
