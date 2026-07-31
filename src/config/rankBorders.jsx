import React from 'react';

/*
 * 🎖️ RANK BORDER REGISTRY — Steam / Mobile Legends style animated avatar frames.
 *
 * Every border here obeys four rules, because this app runs on cheap Android phones and has a
 * Lite Mode that exists precisely because heavy effects made it unusable:
 *
 *  1. ONLY `transform` and `opacity` animate. Never filter, box-shadow, background-position,
 *     width/height — those repaint or relayout every frame. Static box-shadows are fine.
 *  2. Every border must still look finished with the animation DELETED. Lite Mode forces
 *     animation-duration to 0.001s but does NOT force animation-fill-mode, so the element falls
 *     back to its BASE inline style, not to the last keyframe. That is why each design keeps a
 *     never-animated base ring and only animates a decorative layer on top.
 *  3. Colour derives entirely from the rank's `hex`. Alpha is appended 8-digit style (`${hex}80`),
 *     which requires hex to be 6-digit `#rrggbb` — `normalizeHex` below enforces that, since a
 *     3-digit value would silently produce an invalid colour and blank the whole layer.
 *  4. Stay circular, stay behind the avatar (z-0), stay inside the -inset-1.5 box.
 */

// `${hex}80` is only valid CSS if hex is exactly #rrggbb. A 3-digit shorthand would yield a
// 5-digit colour, which drops the declaration and renders NOTHING — a silently missing border.
export const normalizeHex = (hex) => {
    const h = typeof hex === 'string' ? hex.trim() : '';
    if (/^#[0-9a-f]{6}$/i.test(h)) return h;
    if (/^#[0-9a-f]{3}$/i.test(h)) return '#' + h.slice(1).split('').map(c => c + c).join('');
    return '#64748b';
};

const RING = 'absolute -inset-1.5 z-0 pointer-events-none rounded-full';
const maskAt = (px) => `[mask:radial-gradient(farthest-side,transparent_calc(100%-${px}px),#000_0)] [-webkit-mask:radial-gradient(farthest-side,transparent_calc(100%-${px}px),#000_0)]`;

export const BORDER_KEYFRAMES = `
@keyframes rankRingSpin { to { transform: rotate(360deg); } }
@keyframes rankRingSpinRev { to { transform: rotate(-360deg); } }
@keyframes rankAuraPulse {
    0%   { transform: scale(1);    opacity: 0.55; }
    55%  { transform: scale(1.14); opacity: 0; }
    56%  { transform: scale(1);    opacity: 0; }
    100% { transform: scale(1);    opacity: 0.55; }
}
`;

/* ── 0. CLASSIC — the original single conic sweep, kept so nothing changes for existing ranks ── */
const ClassicSweep = ({ i, hex }) => (
    <div
        className={`${RING} ${maskAt(3)}`}
        style={{
            background: `conic-gradient(from 0deg, ${hex}00, ${hex}, ${hex}00 60%)`,
            animation: `rankRingSpin ${Math.max(3, 8 - i)}s linear infinite`,
            boxShadow: `0 0 ${10 + i * 4}px ${hex}80`,
            willChange: 'transform'
        }}
    />
);

/* ── 1. SENTINEL SWEEP — solid ring + one bright arc sliding around it ── */
const SentinelSweep = ({ i, hex }) => (
    <>
        <div className={RING} style={{ border: `2px solid ${hex}99`, boxShadow: `0 0 ${8 + i * 3}px ${hex}55` }} />
        <div
            className={`${RING} ${maskAt(3)}`}
            style={{
                background: `conic-gradient(from 0deg, ${hex}00 0deg, ${hex} 40deg, ${hex}00 95deg, ${hex}00 360deg)`,
                animation: `rankRingSpin ${Math.max(4, 9 - i)}s linear infinite`,
                willChange: 'transform'
            }}
        />
    </>
);

/* ── 2. AURA PULSE — solid ring with a thinner ring blooming outward and dissolving ── */
const AuraPulse = ({ i, hex }) => (
    <>
        <div className={RING} style={{ border: `2px solid ${hex}`, boxShadow: `0 0 ${8 + i * 3}px ${hex}66` }} />
        <div
            className={RING}
            style={{
                border: `1px solid ${hex}`,
                opacity: 0.55,
                animation: `rankAuraPulse ${Math.max(3, 6 - i * 0.4)}s ease-out infinite`,
                willChange: 'transform, opacity'
            }}
        />
    </>
);

/* ── 3. SENTINEL BEACON — calm ring, one node orbiting it with a comet tail ── */
const SentinelBeacon = ({ i, hex }) => (
    <>
        <div
            className={`${RING} ${maskAt(2)}`}
            style={{ background: `${hex}59`, boxShadow: `0 0 ${6 + i * 3}px ${hex}4d` }}
        />
        <div
            className={RING}
            style={{ animation: `rankRingSpin ${Math.max(4, 11 - i)}s linear infinite`, willChange: 'transform' }}
        >
            <div
                className={`absolute inset-0 rounded-full ${maskAt(2)}`}
                style={{ background: `conic-gradient(from 0deg, ${hex}00 0deg, ${hex}00 285deg, ${hex}cc 360deg)` }}
            />
            {/* margins not transforms — a transform here would promote a second layer for a 6px dot */}
            <div
                className="absolute left-1/2 rounded-full"
                style={{ top: '1px', width: '6px', height: '6px', marginLeft: '-3px', marginTop: '-3px', background: hex, boxShadow: `0 0 6px 1px ${hex}b3` }}
            />
        </div>
    </>
);

/* ── 4. EMBLEM STUDS — calm ring with four gem studs at the cardinal points ── */
const EmblemStuds = ({ i, hex }) => {
    // four studs as static gradients on ONE layer: 2 nodes instead of 9, no per-stud shadow paint
    const stud = (at) => `radial-gradient(circle 3.5px at ${at}, ${hex} 0 2px, ${hex}80 2px 2.8px, ${hex}00 3.5px)`;
    return (
        <>
            <div
                className={`${RING} ${maskAt(3)}`}
                style={{ background: `${hex}59`, boxShadow: `0 0 ${12 + i * 4}px ${hex}4d` }}
            />
            <div
                className={RING}
                style={{
                    background: [stud('50% 1.5px'), stud('calc(100% - 1.5px) 50%'), stud('50% calc(100% - 1.5px)'), stud('1.5px 50%')].join(', '),
                    animation: `rankRingSpin ${Math.max(10, 24 - i * 2)}s linear infinite`,
                    willChange: 'transform'
                }}
            />
        </>
    );
};

/* ── 5. TIER SEGMENTS — a broken rank-progress ring, denser at higher ranks ── */
const TierSegments = ({ i, hex }) => {
    const segs = 8 + i * 2;
    const arc = 360 / segs;
    const on = arc * 0.55;
    // 1.5deg feather on each edge — hard conic stops stair-step badly on cheap Android GPUs,
    // and here the aliasing would land on the design's primary element.
    const segments = `repeating-conic-gradient(from 0deg, ${hex}00 0deg, ${hex} 1.5deg, ${hex} ${on.toFixed(2)}deg, ${hex}00 ${(on + 1.5).toFixed(2)}deg, ${hex}00 ${arc.toFixed(2)}deg)`;
    return (
        <>
            <div className={`${RING} ${maskAt(4)}`} style={{ background: `${hex}26`, boxShadow: `0 0 ${10 + i * 4}px ${hex}55` }} />
            <div
                className={`${RING} ${maskAt(4)}`}
                style={{ background: segments, animation: `rankRingSpin ${Math.max(6, 16 - i * 2)}s linear infinite`, willChange: 'transform' }}
            />
            {/* inset-[2px] keeps it clear of the avatar, which starts at inset-[4px] */}
            <div className="absolute inset-[2px] z-0 pointer-events-none rounded-full" style={{ border: `1px solid ${hex}59` }} />
        </>
    );
};

/* ── 6. GYRO ARRAY — soft sweep over a counter-rotating tick ring. Two animated layers: the
      most expensive border here. Cut this one first if Lite Mode targets get tighter. ── */
const GyroArray = ({ i, hex }) => {
    const speed = Math.max(4, 10 - i);
    return (
        <>
            <div
                className={`${RING} ${maskAt(3)}`}
                style={{
                    background: `conic-gradient(from 0deg, ${hex}00 0deg, ${hex} 90deg, ${hex}00 200deg, ${hex}00 360deg)`,
                    animation: `rankRingSpin ${speed}s linear infinite`,
                    boxShadow: `0 0 ${8 + i * 3}px ${hex}66`,
                    willChange: 'transform'
                }}
            />
            <div
                className={`absolute inset-0 z-0 pointer-events-none rounded-full ${maskAt(1.5)}`}
                style={{
                    background: `repeating-conic-gradient(from 0deg, ${hex}cc 0deg, ${hex}cc 5deg, ${hex}00 6deg, ${hex}00 22.5deg)`,
                    animation: `rankRingSpinRev ${(speed * 1.6).toFixed(2)}s linear infinite`,
                    willChange: 'transform'
                }}
            />
        </>
    );
};

/*
 * `cost` = how much battery/GPU the border burns, in ONE language and on a scale that means
 * something to whoever is picking a look. It used to mix English and Indonesian across four
 * inconsistent words ("cheap" / "termurah" / "murah" / "sedang"), which read as a price tag rather
 * than a performance hint. Two buckets is all this needs — the gallery shows it as "Beban: …".
 */
export const BORDER_LOAD = { light: 'Ringan', medium: 'Sedang' };

export const RANK_BORDERS = [
    { id: 'classic',  name: 'Classic Sweep',  cost: 'light',  desc: 'Satu sapuan cahaya berputar. Border asli aplikasi ini.',          Component: ClassicSweep },
    { id: 'sentinel', name: 'Sentinel Sweep', cost: 'light',  desc: 'Cincin padat + satu busur terang meluncur mengelilinginya.',      Component: SentinelSweep },
    { id: 'aura',     name: 'Aura Pulse',     cost: 'light',  desc: 'Cincin padat dengan lingkaran tipis mekar keluar lalu memudar.',  Component: AuraPulse },
    { id: 'beacon',   name: 'Sentinel Beacon',cost: 'light',  desc: 'Cincin tenang dengan satu titik terang mengorbit + ekor komet.',  Component: SentinelBeacon },
    { id: 'emblem',   name: 'Emblem Studs',   cost: 'light',  desc: 'Empat permata di titik mata angin, berputar pelan. Gaya MLBB.',   Component: EmblemStuds },
    { id: 'segments', name: 'Tier Segments',  cost: 'light',  desc: 'Cincin rank terpotong-potong; makin tinggi rank makin rapat.',    Component: TierSegments },
    { id: 'gyro',     name: 'Gyro Array',     cost: 'medium', desc: 'Sapuan lebar di atas cincin tick berlawanan arah. Paling berat.', Component: GyroArray },
];

/**
 * Renders the border for a rank. `styleId` comes from the rank's own config, so each tier can
 * wear a different frame; unknown/missing ids fall back to the original look rather than
 * rendering nothing.
 */
export const RankBorder = ({ styleId, index, hex }) => {
    const entry = RANK_BORDERS.find(b => b.id === styleId) || RANK_BORDERS[0];
    const Cmp = entry.Component;
    return <Cmp i={Number(index) || 0} hex={normalizeHex(hex)} />;
};

export default RankBorder;
