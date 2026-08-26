import React, { useEffect, useRef, useState } from 'react';
import { compactRp } from '../utils/helpers';

/* THE PACE CHART — cumulative money against the straight line to target.
   ────────────────────────────────────────────────────────────────────────────
   ONE component, used twice: by the live panel for the whole business, and by the regional panel
   for whichever wilayah is selected. It was inline in the live panel first, and it is extracted
   here the moment a second caller appeared rather than after — two copies of chart geometry drift
   exactly the way two copies of the period window would have, and the drift is invisible: both
   charts keep drawing, they just stop meaning the same thing.

   WHY CUMULATIVE AND NOT BARS. The dashed line is where you would be if you were exactly on
   target, so "under the line" reads the same whether the line covers thirteen hours or twelve
   months. Bars would have to be re-read every time the period changed, and a bar cannot show
   whether you are ahead — only how big one bucket was.

   ⚠️ THE LINE STOPS SHORT OF THE RIGHT EDGE ON PURPOSE. It covers `done` of `buckets`, so the gap
   at the end is how much of the period is left to run. That gap is information, not a bug.

   ⚠️ NOTHING IS PRINTED ON IT. His rule: *"do not put too much number in there but hover to show
   the extra number"*. Scrubbing writes into ONE reserved line below, so reading a value never
   moves the layout.

   ⚠️ `drawKey` REPLAYS THE DRAW. The line animates by remounting, not by transitioning — React
   keeps the same <path> when only its `d` changes, and a CSS animation does not restart on an
   element that never left the DOM. Passing the selected region as `drawKey` is what makes the
   second swap animate as well as the first. Without it the effect works once and then silently
   never again, which is the kind of bug nobody reports because nothing looks broken.           */

const VB = { w: 336, h: 92, top: 8, bot: 86 };

export default function PaceChart({
    series = [], target = 0, done = 1, buckets = 1, tickOf = (i) => String(i),
    drawKey = '', ariaLabel = 'Grafik', arrived = true,
}) {
    const [scrub, setScrub] = useState(null);
    const ref = useRef(null);

    /* a readout from the old series must not survive the swap — "Tanggal 14 · Rp 92 jt" left
       hanging over a different region is worse than showing nothing, because it looks like data */
    useEffect(() => { setScrub(null); }, [drawKey]);

    const n = series.length;
    const covered = buckets > 0 ? done / buckets : 1;
    const span = VB.w * covered;
    const X = (i) => (n < 2 ? 0 : (i * span) / (n - 1));
    const Y = (v) => VB.bot - Math.min(1, v / (target || 1)) * (VB.bot - VB.top);
    const points = series.map((v, i) => `${X(i)},${Y(v)}`).join(' L');

    const onScrub = (e) => {
        const el = ref.current;
        if (!el || n < 2) return;
        const r = el.getBoundingClientRect();
        if (!r.width) return;
        const frac = Math.max(0, Math.min(1, ((e.clientX - r.left) / r.width) / (covered || 1)));
        setScrub(Math.round(frac * (n - 1)));
    };
    const onKey = (e) => {
        if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
        e.preventDefault();
        const cur = scrub === null ? n - 1 : scrub;
        setScrub(Math.max(0, Math.min(n - 1, cur + (e.key === 'ArrowRight' ? 1 : -1))));
    };

    let key = '', val = null, gap = 0;
    if (scrub !== null && n > 1) {
        val = series[scrub];
        gap = val - (scrub / (n - 1)) * covered * target;
        key = scrub === 0 ? 'Mulai' : tickOf(scrub - 1);
    }

    return (
        <>
            <div
                className={`kpm-spark${scrub !== null ? ' on' : ''}`}
                ref={ref}
                tabIndex={0}
                role="img"
                aria-label={ariaLabel}
                onPointerMove={onScrub}
                onPointerDown={onScrub}
                onPointerLeave={(e) => { if (e.pointerType !== 'touch') setScrub(null); }}
                onKeyDown={onKey}
            >
                <svg viewBox={`0 0 ${VB.w} ${VB.h}`} width="100%" height="92"
                     preserveAspectRatio="none" aria-hidden="true">
                    <line x1="0" y1={VB.bot} x2={VB.w} y2={VB.bot}
                          stroke="var(--line-3)" strokeWidth="1" vectorEffect="non-scaling-stroke" />
                    <line x1="0" y1={VB.bot} x2={VB.w} y2={VB.top}
                          stroke="var(--line-3)" strokeWidth="1" strokeDasharray="4 4"
                          vectorEffect="non-scaling-stroke"
                          style={{ opacity: arrived ? 1 : 0, transition: 'opacity 300ms cubic-bezier(.2,.8,.3,1)' }} />
                    {n > 1 && (
                        <>
                            <path key={`a-${drawKey}`} className="kpm-pace-fill"
                                  d={`M0,${VB.bot} L${points} L${X(n - 1)},${VB.bot} Z`}
                                  fill="var(--lamp-on)" fillOpacity=".13" />
                            <path key={`l-${drawKey}`} className="kpm-pace-line"
                                  d={`M${points}`} fill="none" stroke="var(--lamp-on)" strokeWidth="2"
                                  strokeLinejoin="round" strokeLinecap="round"
                                  vectorEffect="non-scaling-stroke" />
                        </>
                    )}
                </svg>
                {scrub !== null && n > 1 && (
                    <>
                        <div className="kpm-cross" style={{ opacity: 1, left: `${(X(scrub) / VB.w) * 100}%` }} />
                        <div className="kpm-scrub" style={{
                            opacity: 1,
                            left: `${(X(scrub) / VB.w) * 100}%`,
                            top:  `${(Y(series[scrub]) / VB.h) * 100}%`,
                        }} />
                    </>
                )}
            </div>

            <div className={`kpm-ro${scrub !== null ? ' on' : ''}`}>
                <span className="k">{key}</span>
                <span className="v">
                    {val !== null && (
                        <>
                            {compactRp(val)}{' · '}
                            <span className={gap < 0 ? 'neg' : ''}>
                                {gap < 0 ? '' : '+'}{compactRp(gap)} vs pace
                            </span>
                        </>
                    )}
                </span>
            </div>
        </>
    );
}
