/* THE QUARANTINE SWITCH — Aldi's Satisfactory hatch and the blast doors, prototype v21 ("Fleet & Roster: the quarantine
   switch, draft" on https://claude.ai/artifact/QA46EfZgkJPd6PH7f2FSjD), approved 2026-09-29 18:40: "i love the button
   now, everything else is great nothing to complain really u can continue the work". ONE shared piece (his 19:25 ask),
   so the regional warehouse and Stock Opname can put the same switch on their own grey box later.

   QuarantineHatch - a ribbed hatch; behind its two steel doors a bolted platform rides an elevator shaft, carrying a
   glossy dome in a chrome bezel and a label plate. The dome shows where the NEXT press goes: yellow + the radiation sign
   while the healthy stock is on show, dark ender + a living eye while the Quarantine is. `press(toQ)` = the dome goes
   down, the platform rides down the shaft, the doors shut (thud), the dome changes behind them, the doors open, the
   platform rides back up with a small stop-bump.
   BlastDoors - two doors over the box; `run(toQ, swap)` shuts them (tape going into the Quarantine, steel coming back),
   calls swap() while they are shut, then opens them.
   Only transform and opacity move, all WAAPI. Lite Mode / reduced motion swap at once (runSwitch), and every wait on an
   animation is raced with a timer, so a stalled clock can never leave the box shut on the old view. */
import React, { useState, useEffect, useRef, useImperativeHandle } from 'react';
import { HAZARD_SIGN } from '../utils/vanBay';

const SIGN = <svg viewBox="0 0 15 15" shapeRendering="crispEdges" aria-hidden="true">{HAZARD_SIGN.map(([x, y]) => <rect key={x + '-' + y} x={x} y={y} width="1.02" height="1.02" />)}</svg>;
const IN = 'cubic-bezier(.55, 0, .85, .35)', OUT = 'cubic-bezier(.23, 1, .32, 1)';
const wait = (ms) => new Promise(r => setTimeout(r, ms));
const done = (a, ms) => Promise.race([a.finished.catch(() => {}), wait(ms + 150)]);
const still = () => document.documentElement.classList.contains('lite-mode') ||
  !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

/* a band under the title in BOTH views - the tape in the Quarantine, the ender chest's own material in the healthy
   stock - so a switch never changes the box's height */
export function QuarantineBand({ q }) {
  return <i className={`kpm-qband${q ? ' tape' : ''}`} aria-hidden="true" />;
}

export function QuarantineHatch({ ref, view, onPress }) {
  const [hold, setHold] = useState(null);   // the dome while a press runs; otherwise it follows the view
  const skin = hold || (view === 'q' ? 'ok' : 'q');
  const el = useRef(null), eye = useRef(null);
  useImperativeHandle(ref, () => ({
    async press(toQ) {
      const b = el.current;
      if (!b) return;
      const $ = (s) => b.querySelector(s), all = [];
      const A = (n, kf, o) => { const a = n.animate(kf, o); all.push(a); return a; };
      setHold(toQ ? 'q' : 'ok');
      const push = A($('.dome'), [{ transform: 'scale(.97)' }, { transform: 'scale(.92)' }], { duration: 80, easing: OUT, fill: 'forwards' });
      const dark = A($('.dk'), [{ opacity: .1 }, { opacity: .32 }], { duration: 80, easing: OUT, fill: 'forwards' });
      await wait(130);
      const sink = A($('.lift'), [{ transform: 'translateY(0)' }, { transform: 'translateY(104%)' }], { duration: 280, easing: IN, fill: 'forwards' });
      await wait(150);
      A($('.d1'), [{ transform: 'translateX(-102%)' }, { transform: 'translateX(0)' }], { duration: 230, easing: IN, fill: 'forwards' });
      await done(A($('.d2'), [{ transform: 'translateX(102%)' }, { transform: 'translateX(0)' }], { duration: 230, easing: IN, fill: 'forwards' }), 230);
      A($('.hs'), [{ transform: 'translateY(0)' }, { transform: 'translateY(2px)' }, { transform: 'translateY(0)' }], { duration: 120 });
      setHold(toQ ? 'ok' : 'q'); push.cancel(); dark.cancel();   // behind the shut doors: the other dome, up
      await wait(160);
      A($('.d1'), [{ transform: 'translateX(0)' }, { transform: 'translateX(-102%)' }], { duration: 300, easing: OUT, fill: 'forwards' });
      const o2 = A($('.d2'), [{ transform: 'translateX(0)' }, { transform: 'translateX(102%)' }], { duration: 300, easing: OUT, fill: 'forwards' });
      await wait(150);
      const rise = A($('.lift'), [{ transform: 'translateY(104%)', easing: 'cubic-bezier(.3, .7, .4, 1)' },
        { transform: 'translateY(-4%)', offset: .78, easing: 'cubic-bezier(.4, 0, .6, 1)' }, { transform: 'translateY(0)' }], { duration: 560, fill: 'forwards' });
      sink.cancel();
      await Promise.all([done(o2, 150), done(rise, 560)]);
      all.forEach(a => a.cancel());
      setHold(null);
    },
  }));
  /* the eye is alive (his 18:35 "when the ender eyes is moving and blink at random"): every 0.9-3.5 s it glances somewhere
     new or, about one time in three, blinks; Lite Mode keeps it still and open */
  useEffect(() => {
    if (skin !== 'ok') return;
    let t;
    const tick = () => {
      const e = eye.current;
      if (e && !still()) {
        if (Math.random() < .35) { e.classList.add('blink'); setTimeout(() => e.classList.remove('blink'), 140); }
        else e.firstChild.style.transform = `translate(${((Math.random() * 2 - 1) * 4.5).toFixed(1)}px, ${((Math.random() * 2 - 1) * 2.5).toFixed(1)}px)`;
      }
      t = setTimeout(tick, 900 + Math.random() * 2600);
    };
    t = setTimeout(tick, 900 + Math.random() * 2600);
    return () => clearTimeout(t);
  }, [skin]);
  const label = view === 'q' ? 'Show the healthy stock' : 'Show the quarantine';
  return (
    <button ref={el} type="button" className="kpm-hatch" data-skin={skin} aria-label={label} title={label} onClick={onPress}>
      <span className="hs">
        <span className="rc">
          <span className="lift">
            <span className="plat" />
            <span className="bez">
              <span className="dome">
                {skin === 'q' ? <i className="ico">{SIGN}</i> : <i className="ico eye" ref={eye}><i className="pupil" /><i className="lid" /></i>}
                <i className="dk" />
              </span>
            </span>
            <span className="lbl">{skin === 'q' ? 'QUARANTINE' : 'HEALTHY'}</span>
          </span>
          <i className="dr d1" /><i className="dr d2" />
        </span>
      </span>
    </button>
  );
}

export function BlastDoors({ ref }) {
  const el = useRef(null);
  useImperativeHandle(ref, () => ({
    async run(toQ, swap) {
      const d = el.current;
      if (!d) { swap(); return; }
      const [L, R] = d.children, all = [];
      const A = (n, kf, o) => { const a = n.animate(kf, o); all.push(a); return a; };
      d.dataset.kind = toQ ? 'tape' : 'steel';
      A(L, [{ transform: 'translateX(-101%)' }, { transform: 'translateX(0)' }], { duration: 240, easing: IN, fill: 'forwards' });
      await done(A(R, [{ transform: 'translateX(101%)' }, { transform: 'translateX(0)' }], { duration: 240, easing: IN, fill: 'forwards' }), 240);
      swap();
      A(d.parentElement, [{ transform: 'translateY(0)' }, { transform: 'translateY(2px)' }, { transform: 'translateY(-1px)' }, { transform: 'translateY(0)' }], { duration: 160 });
      await wait(190);
      A(L, [{ transform: 'translateX(0)' }, { transform: 'translateX(-101%)' }], { duration: 340, easing: OUT, fill: 'forwards' });
      await done(A(R, [{ transform: 'translateX(0)' }, { transform: 'translateX(101%)' }], { duration: 340, easing: OUT, fill: 'forwards' }), 340);
      all.forEach(a => a.cancel());
    },
  }));
  return <div ref={el} className="kpm-doors" aria-hidden="true"><i className="dl" /><i className="dr" /></div>;
}

/* one press: the hatch runs, and 130 ms later the doors close over the box; the box changes while they are shut */
export async function runSwitch(hatch, doors, toQ, swap) {
  if (still()) { swap(); return; }
  await Promise.all([hatch?.press(toQ), wait(130).then(() => (doors ? doors.run(toQ, swap) : swap()))]);
}
