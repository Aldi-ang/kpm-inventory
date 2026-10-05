/* THE DAY REPLAY on Journey Plan (his 2026-10-04 ask, drawn and picked on the Day Replay page - A-Brain
   Raw/2026-10-04-day-replay/day-replay.html v2, "that is really cool bro"): a pressed salesman's day played back on the
   real map. He walks from where his day started to each shop in order; every shop plays its own moment - the chest opens,
   what the shop hands him goes up into his hands, its sign (look C, the app's own) acts out what happened - with a
   timeline to drag, the Day Log beside it (PC) or one card + a chip strip (phone), and a card for any shop pressed. The
   data is the Day Log (src/utils/dayLog.js); nothing here writes.

   ONE FUNCTION OF TIME. The clock lives in a ref and reaches the map and the timeline straight through the DOM every frame
   (the useScenePlayer rule: a per-frame value never goes through React state - on his phone that re-rendered the subtree
   60 times a second and read as flicker). React re-renders only when a shop's state, his pose or the current stop
   changes. Every moving part of a scene - the chest's CSS moment (.kx-c5.burst in expedition.css) and the props - is
   PAUSED and handed currentTime = the scene's own time, so dragging backwards is a plain read. Lite = cuts between the
   still end pictures; nothing animates. */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Marker, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import { chestHtml, sellerHtml, personSvg, safeHex, px } from '../utils/mapSprites.js';
import { SCENE, hm } from '../utils/dayLog.js';
import { useTick } from '../hooks/useDayReplay.js';
import { formatRupiah, getLocalDayKey } from '../utils/helpers.js';
import SaleReceipt from './SaleReceipt.jsx';

const NAME = { start: 'Day starts', sold: 'Sale', order: 'Repeat Order', full: 'Stock Full (No Order)', issue: 'Competitor Issue', request: 'New Request', closed: 'Store Closed', routine: 'Routine Check', swap: 'Exchange (retur)' };
const TONE = { sold: '#E4B04A', order: '#E4B04A', routine: 'var(--ink)', full: '#C98A4A', request: '#C98A4A', swap: '#C98A4A', issue: 'var(--led-crit)', closed: 'var(--led-crit)', start: 'var(--ink-dim)' };
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
/* a status as a small still picture (rows, chips, notches): the map's cached sign, the coin for a sale */
const signPic = (k) => (k === 'start' ? '<i class="kx-rp-dot"></i>' : k === 'sold' ? '<i class="kpm-coin lg still"></i>' : `<i class="kx-sgn kx-sgn-${k}"></i>`);
const Pic = ({ k }) => <span className="kx-rp-pic" dangerouslySetInnerHTML={{ __html: signPic(k) }} />;
const result = (e) => (e.kind === 'sold' ? `Sale · ${formatRupiah(e.tx?.total || 0)}` : e.kind === 'start' ? (e.guessed ? 'No position sent - starts at his first shop' : 'His first position of the day') : NAME[e.kind]);
const by = (e, name) => (e.kind === 'start' ? `${name}, ${e.time}` : e.source === 'terminal' ? `Recorded by the terminal at ${e.time} · ${name}` : `Visit Report by ${name} at ${e.time} (when he pressed Report)`);

/* ---- what the shop hands him, ported from the page's scenes (one pixel per letter) ---- */
const CR = { O: 'fill="#24160A"', b: 'fill="#C98A4A"', B: 'fill="#8A5A2C"', y: 'fill="#E4B04A"', K: 'fill="#120A04"', g: 'fill="#9A958E"', G: 'fill="#5E5A55"', R: 'fill="#B3261E"', w: 'fill="#F2EEE4"', r: 'fill="#C8342A"' };
const ART = {
    crate: ['OOOOOOOO', 'ObbbbbbO', 'OBBBBBBO', 'ObbbbbbO', 'OBBBBBBO', 'ObbbbbbO', 'OOOOOOOO'],
    hazard: ['OOOOOOOO', 'ObbbbbbO', 'OyKyKyKO', 'OKyKyKyO', 'ObbbbbbO', 'OBBBBBBO', 'OOOOOOOO'],   /* Quarantine's tape band */
    rival: ['OOOOOOOO', 'OggggggO', 'ORRRRRRO', 'OGGGGGGO', 'OggggggO', 'OGGGGGGO', 'OOOOOOOO'],
    pack: ['OOOO', 'OrrO', 'OwwO', 'OwwO', 'OwwO', 'OOOO'],
    bang: ['RR', 'RR', 'RR', 'RR', '..', 'RR'],
    bubble: ['.OOOOOOOOO.', 'OwwwwwwwwwO', 'OwKwwKwwKwO', 'OwwwwwwwwwO', '.OOOwOOOOO.', '...Ow......', '...O.......'],
    note: ['OOOOOOO', 'OwwwwwO', 'OwKKKwO', 'OwwwwwO', 'OwKKwwO', 'OOOOOOO'],
};
const svgOf = (name, scale = 2) => { const r = ART[name]; return `<svg class="px" viewBox="0 0 ${r[0].length} ${r.length}" width="${r[0].length * scale}" height="${r.length * scale}">${px(r, CR)}</svg>`; };
const PROP_ART = { sold: ['<i class="kpm-coin"></i>'], order: [svgOf('crate')], full: [svgOf('pack', 1.75), svgOf('pack', 1.75), svgOf('pack', 1.75)],
    swap: [svgOf('hazard', 2.25)], issue: [svgOf('rival'), svgOf('bang', 2.5)], request: [svgOf('bubble'), svgOf('note', 2.5)] };
const o = (ms) => ms / SCENE;
const E_OUT = 'cubic-bezier(.23,1,.32,1)';
/* the page's keyframes, unchanged: each prop is SCENE long and positioned from the chest's top-left corner */
const PROP_FRAMES = {
    sold: [[{ opacity: 0, transform: 'translate(5px,12px) scale(.7)', offset: 0 }, { opacity: 0, transform: 'translate(5px,12px) scale(.7)', offset: o(560) },
        { opacity: 1, transform: 'translate(2px,-6px) scale(1)', offset: o(720), easing: 'ease-in-out' }, { opacity: 1, transform: 'translate(-12px,-22px)', offset: o(900), easing: 'ease-in' },
        { opacity: 1, transform: 'translate(-26px,-25px)', offset: o(1040) }, { opacity: 0, transform: 'translate(-26px,-25px)', offset: o(1060) }, { opacity: 0, transform: 'translate(-26px,-25px)', offset: 1 }]],
    order: [[{ opacity: 0, transform: 'translate(6px,-44px)', offset: 0 }, { opacity: 0, transform: 'translate(6px,-44px)', offset: o(540) },
        { opacity: 1, transform: 'translate(6px,-38px)', offset: o(600), easing: 'cubic-bezier(.55,0,1,.45)' }, { opacity: 1, transform: 'translate(6px,4px)', offset: o(900), easing: 'ease-out' },
        { opacity: 1, transform: 'translate(6px,0px)', offset: o(980), easing: 'ease-in' }, { opacity: 1, transform: 'translate(6px,4px)', offset: o(1060) },
        { opacity: 0, transform: 'translate(6px,12px)', offset: o(1260) }, { opacity: 0, transform: 'translate(6px,12px)', offset: 1 }]],
    full: [0, 1, 2].map((j) => { const x = 3 + j * 8; return [{ opacity: 0, transform: `translate(${x}px,10px)`, offset: 0 }, { opacity: 0, transform: `translate(${x}px,10px)`, offset: o(560 + j * 50) },
        { opacity: 1, transform: `translate(${x}px,-4px)`, offset: o(760 + j * 50), easing: E_OUT }, { opacity: 1, transform: `translate(${x}px,-4px)`, offset: o(1180) },
        { opacity: 0, transform: `translate(${x}px,8px)`, offset: o(1380) }, { opacity: 0, transform: `translate(${x}px,8px)`, offset: 1 }]; }),
    swap: [[{ opacity: 0, transform: 'translate(5px,10px)', offset: 0 }, { opacity: 0, transform: 'translate(5px,10px)', offset: o(560) },
        { opacity: 1, transform: 'translate(5px,-8px)', offset: o(780), easing: E_OUT }, { opacity: 1, transform: 'translate(-27px,-25px)', offset: o(1040), easing: 'ease-in-out' },
        { opacity: 0, transform: 'translate(-27px,-25px)', offset: o(1060) }, { opacity: 0, transform: 'translate(-27px,-25px)', offset: 1 }]],
    issue: [[{ opacity: 0, transform: 'translate(6px,10px)', offset: 0 }, { opacity: 0, transform: 'translate(6px,10px)', offset: o(560) },
        { opacity: 1, transform: 'translate(6px,-6px)', offset: o(780), easing: E_OUT }, { opacity: 1, transform: 'translate(6px,-6px)', offset: o(1450) },
        { opacity: 0, transform: 'translate(6px,8px)', offset: o(1650) }, { opacity: 0, transform: 'translate(6px,8px)', offset: 1 }],
    [{ opacity: 0, transform: 'translate(12px,-30px) scale(.9)', offset: 0 }, { opacity: 0, transform: 'translate(12px,-30px) scale(.9)', offset: o(820) },
        { opacity: 1, transform: 'translate(12px,-34px) scale(1)', offset: o(960), easing: E_OUT }, { opacity: 1, transform: 'translate(12px,-34px)', offset: o(1450) },
        { opacity: 0, transform: 'translate(12px,-34px)', offset: o(1600) }, { opacity: 0, transform: 'translate(12px,-34px)', offset: 1 }]],
    request: [[{ opacity: 0, transform: 'translate(-6px,-28px) scale(.92)', offset: 0 }, { opacity: 0, transform: 'translate(-6px,-28px) scale(.92)', offset: o(560) },
        { opacity: 1, transform: 'translate(-6px,-30px) scale(1)', offset: o(720), easing: E_OUT }, { opacity: 1, transform: 'translate(-6px,-30px)', offset: o(1000) },
        { opacity: 0, transform: 'translate(-6px,-30px) scale(.92)', offset: o(1100) }, { opacity: 0, transform: 'translate(-6px,-30px) scale(.92)', offset: 1 }],
    [{ opacity: 0, transform: 'translate(-2px,-26px)', offset: 0 }, { opacity: 0, transform: 'translate(-2px,-26px)', offset: o(1060) },
        { opacity: 1, transform: 'translate(-2px,-26px)', offset: o(1120) }, { opacity: 1, transform: 'translate(-25px,-23px)', offset: o(1240), easing: 'ease-in-out' },
        { opacity: 0, transform: 'translate(-25px,-23px)', offset: o(1260) }, { opacity: 0, transform: 'translate(-25px,-23px)', offset: 1 }]],
};
/* what he holds up after the shop hands it over (the app's own hands-up seller, the coin swapped for the thing) */
const HELD = { coin: '<i class="kpm-coin"></i>', crate: svgOf('hazard', 2.25), note: svgOf('note', 2.5) };

/* ---- on the map: the road, a chest per shop, him ---- */
const iconCache = new Map();
const cachedIcon = (key, make) => { if (!iconCache.has(key)) iconCache.set(key, make()); return iconCache.get(key); };
const ease = (u) => (1 - Math.cos(Math.PI * u)) / 2;

export function DayReplayLayer({ rp, ini, shirt, hair, cam, picked, onPick }) {
    const map = useMap();
    const { stops, tl, lite, cur } = rp;
    const c = safeHex(shirt, '#E8E4DE');
    /* ONE chest per shop - a sale and a report at the same shop are two stops on the timeline, but one chest on the map;
       it wears the stop number of his first visit there */
    const shops = useMemo(() => {
        const by = new Map();
        stops.forEach((s, k) => { if (k && !by.has(s.key)) by.set(s.key, { key: s.key, name: s.name, lat: s.lat, lng: s.lng, ks: [], n: by.size + 1 }); if (k) by.get(s.key).ks.push(k); });
        return [...by.values()];
    }, [stops]);
    const [zoom, setZoom] = useState(() => map.getZoom());
    useEffect(() => { const f = () => setZoom(map.getZoom()); map.on('zoomend', f); return () => { map.off('zoomend', f); }; }, [map]);
    /* he stands 2 px clear of the chest's left edge, feet on its line (the app's selling scene): 31 px left, 3 px down */
    const feet = useMemo(() => stops.map((s) => map.layerPointToLatLng(map.latLngToLayerPoint([s.lat, s.lng]).add([-31, 3]))), [stops, zoom, map]); // eslint-disable-line react-hooks/exhaustive-deps -- 31 px is a different distance at every zoom

    const phaseOf = (t, sh) => {
        let k = null;
        sh.ks.forEach((kk) => { if (t >= tl.sceneSeg(kk).t0) k = kk; });
        if (k == null) return 'b';
        return !lite && t < tl.sceneSeg(k).t1 ? `s${k}` : `a${k}`;
    };
    const poseOf = (t) => {
        const s = tl.segAt(t), local = s.kind === 'scene' ? t - s.t0 : 0;
        const kind = s.kind === 'scene' ? stops[s.k].kind : s.kind === 'end' ? stops[s.k].kind : null;
        let held = '';
        if (s.kind === 'scene' && (lite || local >= 1050) && kind === 'sold') held = 'coin';
        if (s.kind === 'scene' && (lite || local >= 1050) && kind === 'swap') held = 'crate';
        if (s.kind === 'scene' && (lite || local >= 1250) && kind === 'request') held = 'note';
        if (s.kind === 'end' && kind === 'sold') held = 'coin';
        const walking = s.kind === 'walk' && rp.playing && !lite;
        const busy = (s.kind === 'scene' && (lite || local > 250)) || s.kind === 'end' || (s.kind === 'walk' && s.k > 1 && (t - s.t0) / (s.t1 - s.t0) < 0.3);
        const n = stops.filter((st, k) => k && t >= tl.sceneSeg(k).t0 + (lite ? 0 : 1300)).length;
        return `${held}|${walking ? 1 : 0}|${busy ? 1 : 0}|${n}`;
    };
    const [phases, setPhases] = useState(''), [pose, setPose] = useState('|0|0|0');
    const manRef = useRef(null), trail = useRef(null), trailU = useRef(null), marks = useRef({}), camSnap = useRef(true), drawn = useRef('');
    useEffect(() => { camSnap.current = true; }, [cam, tl]);

    /* the camera: Whole day frames every stop once; Follow him eases the map after him every frame (the page's 0.14) */
    useEffect(() => {
        if (!tl || cam !== 'whole') return;
        map.fitBounds(L.latLngBounds(stops.map((s) => [s.lat, s.lng])), { padding: [56, 56], maxZoom: 17, animate: !lite });
    }, [cam, tl, map]); // eslint-disable-line react-hooks/exhaustive-deps
    useEffect(() => { if (tl && cam === 'follow' && map.getZoom() < 16) map.setZoom(16, { animate: false }); }, [cam, tl, map]);

    const draw = (t, s, local, p, flip, done, ph) => {
        manRef.current?.setLatLng(p);
        const el = manRef.current?.getElement();
        if (el) {
            const kind = s.kind === 'scene' ? stops[s.k].kind : null;
            let dx = 0, dy = 0;
            if (!lite && kind === 'closed' && ((local > 450 && local < 560) || (local > 680 && local < 790))) dx = 2;   /* he knocks */
            if (!lite && kind === 'full' && local > 820 && local < 1180) dx = Math.floor((local - 820) / 70) % 2 ? -1 : 1;   /* shakes his head */
            if (!lite && kind === 'routine' && local > 600 && local < 1100) dy = 1;   /* looks inside */
            const who = el.querySelector('.who');
            if (who) { who.style.translate = `${dx}px ${dy}px`; who.style.scale = flip ? '-1 1' : ''; }
        }
        /* the trail: solid where he has already walked */
        const walked = feet.slice(0, done).concat(s.kind === 'walk' ? [p] : []);
        trail.current?.setLatLngs(walked); trailU.current?.setLatLngs(walked);

        /* the scenes: each shop mid-moment gets its own time; the props are made on the scene's first frame */
        shops.forEach((sh, i) => {
            const m = /^s(\d+)$/.exec(ph.split(',')[i] || ''), mk = marks.current[sh.key];
            if (!m || !mk) return;
            const k = +m[1], box = mk.getElement(), scene = box?.querySelector('.kx-c5.burst');
            if (!scene) return;   // React has not drawn the scene's picture yet - next frame
            /* a divIcon REUSES its element and swaps the inside, so the cache is keyed on the scene's own chest, never the box */
            if (box.__rpFor !== scene) {
                (PROP_FRAMES[stops[k].kind] || []).forEach((fr, j) => { const pe = box.querySelector(`.kx-rp-prop.p${j + 1}`); if (pe) pe.animate(fr, { duration: SCENE, fill: 'both' }); });
                box.__rp = box.getAnimations({ subtree: true });
                box.__rp.forEach((a) => a.pause());
                box.__rpFor = scene;
            }
            const lt = Math.min(SCENE - 1, t - tl.sceneSeg(k).t0);
            box.__rp.forEach((a) => { a.currentTime = lt; });
        });
    };
    useTick(rp, (t) => {
        if (!tl) return;
        const ph = shops.map((sh) => phaseOf(t, sh)).join(',');
        if (ph !== phases) setPhases(ph);
        const po = poseOf(t);
        if (po !== pose) setPose(po);

        /* him: between the two stops of this walk, eased; at a stop, on his spot */
        const s = tl.segAt(t), local = s.kind === 'scene' ? t - s.t0 : 0;
        let p = feet[s.kind === 'start' ? 0 : s.k], flip = false, done = s.kind === 'start' ? 1 : s.k + 1;
        if (s.kind === 'walk') {
            const a = feet[s.k - 1], b = feet[s.k], e = lite ? 0 : ease(Math.min(1, (t - s.t0) / (s.t1 - s.t0)));
            p = L.latLng(a.lat + (b.lat - a.lat) * e, a.lng + (b.lng - a.lng) * e); flip = b.lng < a.lng; done = s.k;
        }
        /* paused = the same picture every frame: redraw him, the trail and the scenes only when the clock, a shop's picture
           or the zoom moved (a trail redraw is an SVG repaint - 60 a second for nothing on his phone); the camera still eases */
        const key = `${t}|${phases}|${pose}|${zoom}|${tl.total}`;
        if (key !== drawn.current) { drawn.current = key; draw(t, s, local, p, flip, done, ph); }
        if (cam === 'follow') {
            const pt = map.latLngToContainerPoint(p), sz = map.getSize();
            const dx = pt.x + 22 - sz.x / 2, dy = pt.y - 24 - sz.y / 2;
            if (camSnap.current || lite) { if (Math.abs(dx) + Math.abs(dy) > 1) map.panBy([dx, dy], { animate: false }); camSnap.current = false; }
            else if (Math.abs(dx) + Math.abs(dy) > 1.5) map.panBy([dx * 0.14, dy * 0.14], { animate: false });
        }
    });

    if (!tl) return null;
    const ph = phases.split(','), [held, walking, busy, n] = pose.split('|');
    const curKey = cur > 0 ? stops[cur]?.key : null;
    const manIcon = cachedIcon(`man|${c}|${hair}|${ini}|${pose}|${stops.length}`, () => L.divIcon({
        className: 'kx-mk kx-rp-man', iconSize: [30, 42], iconAnchor: [15, 42],
        html: `<div class="kx-sm ${held ? 'sell' : walking === '1' ? 'walk' : 'idle'}${busy === '1' ? ' busy' : ''}" style="--c:${c}"><i class="kx-shadow"></i>`
            + `<div class="who"><div class="body">${held ? sellerHtml(hair, c).replace('<i class="kpm-coin"></i>', HELD[held]) : personSvg(hair, c)}</div></div>`
            + `<span class="tag"><i style="background:var(--c)"></i>${esc(ini)} · ${n}/${stops.length - 1}</span></div>`,
    }));
    const startIcon = cachedIcon(`start|${stops[0].time}|${stops[0].guessed ? 1 : 0}`, () => L.divIcon({
        className: 'kx-mk kx-rp-start', iconSize: [12, 12], iconAnchor: [6, 6],
        html: `<i class="kx-rp-dot"></i><span>${stops[0].guessed ? 'Start' : `Start · ${stops[0].time}`}</span>`,
    }));
    return (
        <>
            <Polyline positions={feet} pathOptions={{ color: '#E8E4DE', opacity: 0.5, weight: 2.5, dashArray: '1 7', lineCap: 'round', interactive: false }} />
            <Polyline ref={trailU} positions={feet.slice(0, 1)} pathOptions={{ color: '#0A0908', opacity: 0.55, weight: 7, lineCap: 'round', lineJoin: 'round', interactive: false }} />
            <Polyline ref={trail} positions={feet.slice(0, 1)} pathOptions={{ color: '#E8E4DE', opacity: 1, weight: 3, lineCap: 'round', lineJoin: 'round', interactive: false }} />
            <Marker position={[stops[0].lat, stops[0].lng]} icon={startIcon} interactive={false} />
            {shops.map((sh, i) => {
                const st = ph[i] || 'b', k = st === 'b' ? null : +st.slice(1), kind = k ? stops[k].kind : null;
                const pick = picked != null && sh.ks.includes(picked), here = sh.key === curKey;
                const key = `shop|${sh.key}|${st}|${pick ? 1 : 0}|${here ? 1 : 0}|${c}|${ini}`;
                const icon = cachedIcon(key, () => L.divIcon({
                    className: `kx-mk kx-rp-mk${pick ? ' picked' : ''}${here && kind ? ' held' : ''}`, iconSize: [28, 34], iconAnchor: [14, 31],
                    html: chestHtml(kind, c, st[0] === 's' ? 'burst' : '', `${ini} · ${sh.n}`, false, false, sh.name)
                        + (st[0] === 's' ? (PROP_ART[kind] || []).map((h, j) => `<span class="kx-rp-prop p${j + 1}">${h}</span>`).join('') : ''),
                }));
                /* pressing a shop opens what happened there: the visit playing or played, else his first one */
                const tap = () => onPick(k ?? sh.ks[0]);
                return <Marker key={sh.key} ref={(r) => { if (r) marks.current[sh.key] = r; }} position={[sh.lat, sh.lng]} icon={icon} zIndexOffset={here ? 1000 : 0}
                    keyboard eventHandlers={{ click: tap, keypress: (e) => { if (e.originalEvent?.key === 'Enter') tap(); } }} title={`${sh.name}`} />;
            })}
            <Marker ref={manRef} position={feet[0]} icon={manIcon} interactive={false} zIndexOffset={30000} />
        </>
    );
}

/* ---- off the map: the player, the Day Log, the card of a pressed shop ---- */
export function DayReplayPanel({ rp, man, day, onDay, onClose, cam, onCam, picked, onPick, wide, appSettings }) {
    const { log, logs, stops, tl, cur, playing, toggle, speed, setSpeed, jumpTo, seek, setPlaying } = rp;
    const fill = useRef(null), head = useRef(null), clock = useRef(null), bar = useRef(null), panel = useRef(null), strip = useRef(null);
    const [rcpt, setRcpt] = useState(null);
    useEffect(() => { if (panel.current) panel.current.__rp = rp; });   // the lab's frozen frames reach the clock through the panel, never a global
    const pct =(c) => (tl ? ((c - tl.day0) / (tl.day1 - tl.day0)) * 100 : 0);
    useTick(rp, (t) => {
        if (!tl) return;
        const c = tl.clockAt(t), p = pct(c);
        if (fill.current) fill.current.style.width = `${p}%`;
        if (head.current) head.current.style.left = `${p}%`;
        if (clock.current) clock.current.textContent = hm(c);
        if (bar.current) { bar.current.setAttribute('aria-valuenow', p.toFixed(0)); bar.current.setAttribute('aria-valuetext', hm(c)); }
    });
    /* the current stop's row / chip scrolls into view inside its own list - never the page, never the player off the top */
    useEffect(() => {
        const row = panel.current?.querySelector(`[data-k="${cur}"].kx-rp-row`), player = panel.current?.querySelector('.kx-rp-player');
        if (row && player) panel.current.scrollTo({ top: row.parentElement.offsetTop - player.offsetHeight - 8, behavior: rp.lite ? 'auto' : 'smooth' });
        const chip = strip.current?.querySelector(`[data-k="${cur}"]`);
        if (chip) strip.current.scrollTo({ left: chip.offsetLeft - 60, behavior: rp.lite ? 'auto' : 'smooth' });
    }, [cur, wide, rp.lite]);
    /* PC: a shop's card opens just under the sticking player (else it opens behind it when the list has moved on), and
       anything scrolled into view - a row reached with Tab - stops under the player too */
    useEffect(() => {
        const player = panel.current?.querySelector('.kx-rp-player');
        if (!player || !wide) return;
        panel.current.style.setProperty('--rp-top', `${player.offsetHeight}px`);
        const card = picked != null && panel.current.querySelector('.kx-rp-card:not(.now)');
        if (card) panel.current.scrollTo({ top: card.offsetTop - player.offsetHeight - 8, behavior: rp.lite ? 'auto' : 'smooth' });
    }, [picked, tl, wide, rp.lite]);

    const scrub = useRef(null);
    const toClock = (e) => { const r = bar.current.getBoundingClientRect(); return tl.day0 + Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)) * (tl.day1 - tl.day0); };
    const down = (e) => { if (!tl || e.target.closest('.kx-rp-notch')) return; scrub.current = playing; bar.current.setPointerCapture(e.pointerId); seek(tl.tAtClock(toClock(e)), false); };
    const move = (e) => { if (scrub.current != null) seek(tl.tAtClock(toClock(e)), false); };
    const up = () => { if (scrub.current == null) return; if (scrub.current) setPlaying(true); scrub.current = null; };

    const events = log?.events || [], kOf = (e) => stops.indexOf(e);
    const sales = events.filter((e) => e.kind === 'sold'), money = sales.reduce((s, e) => s + (Number(e.tx?.total) || 0), 0);
    const noOrder = events.filter((e) => ['full', 'issue', 'request', 'routine', 'closed'].includes(e.kind)).length;
    const pickedEv = picked != null ? stops[picked] : null, now = stops[cur];
    const openRcpt = (e) => { setPlaying(false); setRcpt(e.tx); };
    /* stops minutes apart would stack their marks: each mark takes the lowest lane where the last mark is at least ~a mark's
       width away (8 % of the bar - the panel is ~350 px on both the PC and the phone), so every mark stays pressable */
    const lanes = useMemo(() => { const last = []; return (tl?.T || []).map((c) => { const p = ((c - tl.day0) / (tl.day1 - tl.day0)) * 100; let l = last.findIndex((q) => p - q >= 8); if (l < 0) l = last.length; last[l] = p; return l; }); }, [tl]);
    const hours = tl ?Array.from({ length: Math.floor((tl.day1 - tl.day0) / 60) + 1 }, (_, i) => Math.ceil(tl.day0 / 60) * 60 + i * 60).filter((h) => h <= tl.day1) : [];

    return (
        <aside ref={panel} className="kx-panel kx-page kx-rp" aria-label="Day Replay">
            <div className="kx-ph"><b>Day Replay</b><button type="button" className="kx-rp-x" onClick={onClose}>Back to team</button></div>
            <div className="kx-rp-who">
                <div className="min-w-0"><span className="kx-nm">{man?.name}</span>
                    <small>{events.length} {events.length === 1 ? 'thing' : 'things'} recorded{log?.skipped ? ` · ${log.skipped} report${log.skipped > 1 ? 's' : ''} could not be read` : ''}</small></div>
                <input type="date" value={day} max={getLocalDayKey()} onChange={(e) => e.target.value && onDay(e.target.value)} aria-label="Day" />
            </div>
            {logs === null ? <p className="kx-empty">Reading his day…</p> : !events.length ? (
                <p className="kx-empty">No sales and no visit reports from {man?.name} on {day}.</p>
            ) : (
                <>
                    <div className="kx-rp-stats">
                        <div><b>{formatRupiah(money)}</b><small>{sales.length} {sales.length === 1 ? 'sale' : 'sales'}</small></div>
                        <div><b>{noOrder}</b><small>visits, no sale</small></div>
                        <div><b>{events[0].time}-{events[events.length - 1].time}</b><small>first to last</small></div>
                    </div>
                    {!tl ? <p className="kx-empty">None of these shops has a map pin, so there is nothing to walk - the list is below.</p> : (
                        <section className="kx-rp-player" aria-label="Replay">
                            <div ref={bar} className="kx-rp-tl" style={{ height: 44 + 28 * Math.max(0, ...lanes) }} role="slider" tabIndex={0} aria-label="Time of day" aria-valuemin={0} aria-valuemax={100}
                                onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}>
                                <div className="track"><i ref={fill} className="fill" /></div>
                                {stops.map((s, k) => (
                                    <button key={k} type="button" className={`kx-rp-notch${k <= cur ? ' done' : ''}${k === cur ? ' now' : ''}`} style={{ left: `${pct(tl.T[k])}%`, '--lane': lanes[k] }}
                                        aria-label={`${s.time} ${s.name}`} onClick={() => jumpTo(k)}><Pic k={s.kind} /></button>
                                ))}
                                <i ref={head} className="head" />
                            </div>
                            <div className="kx-rp-hours">{hours.map((h) => <span key={h} style={{ left: `${pct(h)}%` }}>{hm(h)}</span>)}</div>
                            <div className="kx-rp-ctl">
                                <button type="button" aria-label="Restart" onClick={() => { seek(0, true); setPlaying(true); }}><svg viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 9a5 5 0 1 0 1.5-3.6" /><path d="M4 3v3.4h3.4" /></svg></button>
                                <button type="button" aria-label="Previous stop" onClick={() => { const s = tl.segAt(rp.t.current); jumpTo(s.kind === 'scene' && rp.t.current - s.t0 > 600 ? cur : Math.max(0, cur - 1)); }}><svg viewBox="0 0 18 18" fill="currentColor"><path d="M4 3h2v12H4zM15 3v12L7 9z" /></svg></button>
                                <button type="button" className="play" aria-label={playing ? 'Pause' : 'Play'} onClick={toggle}><svg viewBox="0 0 18 18" fill="currentColor">{playing ? <path d="M4 3h4v12H4zM10 3h4v12h-4z" /> : <path d="M5 3v12l10-6z" />}</svg></button>
                                <button type="button" aria-label="Next stop" onClick={() => jumpTo(Math.min(stops.length - 1, cur + 1))}><svg viewBox="0 0 18 18" fill="currentColor"><path d="M12 3h2v12h-2zM3 3v12l8-6z" /></svg></button>
                                <div className="kx-rp-speed" role="group" aria-label="Speed">{[1, 2, 4].map((v) => <button key={v} type="button" aria-pressed={speed === v} onClick={() => setSpeed(v)}>{v}x</button>)}</div>
                                <b ref={clock} className="kx-rp-clock">{stops[0]?.time}</b>
                            </div>
                            <div className="kx-roadsw" role="group" aria-label="Camera">
                                <button type="button" aria-pressed={cam === 'whole'} onClick={() => onCam('whole')}>Whole day</button>
                                <button type="button" aria-pressed={cam === 'follow'} onClick={() => onCam('follow')}>Follow him</button>
                            </div>
                            <p className="kx-rp-note">The walk between stops is drawn, not tracked.</p>
                        </section>
                    )}
                    {pickedEv && (
                        <section className="kx-rp-card" aria-live="polite">
                            <div className="top"><Pic k={pickedEv.kind} /><div className="min-w-0"><b>{pickedEv.name}</b><small>{pickedEv.time} · {NAME[pickedEv.kind]}</small></div>
                                <button type="button" className="kx-rp-x" aria-label="Close" onClick={() => onPick(null)}>×</button></div>
                            <p className="st" style={{ '--tone': TONE[pickedEv.kind] }}><i />{result(pickedEv)}</p>
                            {pickedEv.note && <p className="nt">"{pickedEv.note}"</p>}
                            <p className="by">{by(pickedEv, man?.name)}</p>
                            <div className="acts">
                                {pickedEv.kind === 'sold' && pickedEv.tx && <button type="button" className="gold" onClick={() => openRcpt(pickedEv)}>Review receipt</button>}
                                <button type="button" onClick={() => { onPick(null); jumpTo(picked, true); setPlaying(true); }}>Play from here</button>
                            </div>
                        </section>
                    )}
                    {wide ? (
                        <ol className="kx-rp-rows">
                            {events.map((e, i) => {
                                const k = kOf(e);
                                return (
                                    <li key={i}>
                                        <button type="button" data-k={k} className={`kx-rp-row${k === cur ? ' now' : ''}${k > cur ? ' future' : ''}${k < 0 ? ' nopin' : ''}`} disabled={k < 0} onClick={() => jumpTo(k)}>
                                            <span className="t">{e.time}</span><Pic k={e.kind} />
                                            <span className="s"><b>{e.name}</b><span>{result(e)}{k < 0 ? ' · no map pin' : ''}</span>{e.note && <em>{e.note}</em>}</span>
                                        </button>
                                        {e.kind === 'sold' && e.tx && <button type="button" className="kx-rp-rc" onClick={() => openRcpt(e)}>Receipt</button>}
                                    </li>
                                );
                            })}
                        </ol>
                    ) : (
                        <>
                            {now && !pickedEv && (
                                <section className="kx-rp-card now">
                                    <div className="top"><Pic k={now.kind} /><div className="min-w-0"><b>{now.name}</b><small>{now.time} · {NAME[now.kind]}</small></div></div>
                                    <p className="st" style={{ '--tone': TONE[now.kind] }}><i />{result(now)}</p>
                                    {now.note && <p className="nt">"{now.note}"</p>}
                                    {now.kind === 'sold' && now.tx && <div className="acts"><button type="button" className="gold" onClick={() => openRcpt(now)}>Review receipt</button></div>}
                                </section>
                            )}
                            <div ref={strip} className="kx-rp-chips">
                                {stops.map((s, k) => <button key={k} type="button" data-k={k} className={`${k === cur ? 'now' : ''}${k > cur ? ' future' : ''}`} onClick={() => jumpTo(k)}><Pic k={s.kind} />{s.time}</button>)}
                            </div>
                        </>
                    )}
                </>
            )}
            {/* the nota's own backdrop is z-500, under Journey's map keys (z-9999) and Leaflet's controls (1000): it opens in a
                layer of its own at the end of the page, so nothing on the map draws over it */}
            {rcpt && createPortal(<div className="kx-rp-rcpt"><SaleReceipt tx={rcpt} appSettings={appSettings} onClose={() => setRcpt(null)} /></div>, document.body)}
        </aside>
    );
}
