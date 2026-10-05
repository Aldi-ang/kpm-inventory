/* The expedition on the Map System (his pick, 2026-10-02 19:00): the PC shows the whole squad as a list
   (look A, The Walking Dead: Survivors), the phone shows ONE salesman as a travel card (look B, Last
   Day on Earth). One map layer for both. Prototype: A-Brain Raw/2026-10-02-expedition/expedition.html.
   Data: src/utils/expedition.js. Motion is the march line's flow and the target's ping only - Lite
   Mode completes both instantly (index.css), so nothing moves there. */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Marker, Polyline, CircleMarker, useMap } from 'react-leaflet';
import L from 'leaflet';
import { agoLabel } from '../utils/expedition';
import { personSvg, sellerHtml, QUEST, safeHex, HAIR } from '../utils/mapSprites';
import '../styles/expedition.css';

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
const count = (a) => `${a.done.length}${a.of != null ? `/${a.of}` : ''}`;
const kmLabel = (m) => (m == null ? '-' : `${(m / 1000).toFixed(1).replace('.', ',')} km`);
const said = (a) => ({
    go: `En route → ${a.next?.name}`, at: `At shop · ${a.done[a.done.length - 1]?.name}`,
    home: 'Round done', idle: 'No shop left to suggest', off: 'Not out today', closed: 'Day closed',
})[a.state];
const lamp = (a) => ({ go: 'go', at: 'at' })[a.state] || '';
const ll = (p) => [p.lat, p.lng];
/* one icon per look: react-leaflet calls setIcon whenever the icon OBJECT changes, and a fresh divIcon every render
   rebuilt each salesman (and restarted his walk) on every keystroke of the page around the map */
const iconCache = new Map();
const cachedIcon = (o) => {
    const k = `${o.html}|${o.iconAnchor}`;
    if (!iconCache.has(k)) iconCache.set(k, L.divIcon(o));   // ponytail: never trimmed - a day adds a few dozen looks at most
    return iconCache.get(k);
};

/* ---- the map layer: chips at the last-seen point, today's trail, the march line to the next shop ---- */
/* `bare`: the chips only, no lines and no camera (Map System, the store-analysis map).
   `stops={false}`: no shop pins or dots of its own - Journey Plan already draws every shop of the round.
   Journey Plan's salesmen themselves are ExpeditionPeople, rendered inside its bubbles. */
/* the road's arrows: one cached picture per 5 degrees; the angle is the screen angle (east = 0, y down), longitude
   shortened by the latitude's cosine the way the map stretches it */
const arrowAt = (a, b) => {
    const deg = Math.round(Math.atan2(-(b.lat - a.lat), (b.lng - a.lng) * Math.cos(a.lat * Math.PI / 180)) * 180 / Math.PI / 5) * 5;
    return cachedIcon({ className: 'kx-mk', iconSize: [16, 16], iconAnchor: [8, 8],
        html: `<svg class="kx-arrow" viewBox="-8 -8 16 16" style="transform:rotate(${deg}deg)"><path d="M-4 -5 L3 0 L-4 5" fill="none" stroke="#0A0908" stroke-width="5" stroke-linecap="square"/><path d="M-4 -5 L3 0 L-4 5" fill="none" stroke="#E8E4DE" stroke-width="2.5" stroke-linecap="square"/></svg>` });
};

/* `road`: the pressed salesman's road (JourneyView), from where he stands through his shops in stop order - a cream
   line with arrows, under the chests (his look B, 2026-10-04) */
export function ExpeditionLayer({ team, sel, focus, wide, bare, stops = true, road }) {
    const map = useMap();
    const svg = useMemo(() => L.svg({ padding: 0.5 }), []);   // the march line's flow needs SVG; the map itself draws on canvas

    /* the camera: the phone frames ONE salesman's day, the PC the whole team until a row is tapped */
    const teamRef = useRef(team);
    teamRef.current = team;
    const shot = `${wide && !focus ? 'team' : sel}|${team.length > 0}|${wide}`;
    const fit = useRef(null);
    fit.current = () => {
        if (bare) return;
        map.invalidateSize();
        const who = teamRef.current.filter((a) => (wide && !focus ? a.live : a.id === sel));
        const pts = who.flatMap((a) => [a.live ? a.at : null, ...a.done, ...a.ahead]).filter((p) => p?.lat).map(ll);
        // room for the controls on top and the keys at the bottom, so no stop hides under them - except on Journey
        // Plan's 160 px phone strip, where that room would be the whole map
        const tall = map.getSize().y > 300;
        // the team frame needs two points: one man alone (the owner's phone pings before anyone is out) would dive to zoom 16 on him
        if (pts.length > (wide && !focus ? 1 : 0)) map.fitBounds(pts, { paddingTopLeft: [48, tall ? 96 : 52], paddingBottomRight: [48, tall ? 80 : 16], maxZoom: 16 });
    };
    useEffect(() => fit.current(), [shot, bare, map]);
    /* the map's box changes size after mount (the shell settles, the panel comes or goes, the phone turns);
       Leaflet only watches the window, so without this it keeps the first size and leaves grey tiles */
    useEffect(() => {
        const ro = new ResizeObserver(() => fit.current());
        ro.observe(map.getContainer());
        return () => ro.disconnect();
    }, [map]);

    /* shop names never sit on each other or under a pin: walk them in route order (the next shop first) and
       hide any that would land on a pin, a chip or a name already kept. Zooming in brings them back. */
    useEffect(() => {
        const box = map.getContainer();
        const declutter = () => {
            const kept = [...box.querySelectorAll('.kx-chip b, .kx-sm .body, .kx-loc i')].map((e) => e.getBoundingClientRect());
            const next = box.querySelector('.kx-loc.next span');   // the next shop's name always stays (its pin sits on top)
            box.querySelectorAll('.kx-loc span').forEach((el) => {
                el.style.visibility = '';
                const r = el.getBoundingClientRect();
                if (el !== next && kept.some((k) => r.left < k.right && r.right > k.left && r.top < k.bottom && r.bottom > k.top)) el.style.visibility = 'hidden';
                else kept.push(r);
            });
        };
        declutter();
        map.on('zoomend', declutter);
        return () => map.off('zoomend', declutter);
    });

    /* two salesmen on one spot (everyone opens the app at the branch) stand side by side, not stacked - counting only
       the ones drawn, so a hidden one leaves no gap */
    const spot = (a) => `${a.at.lat.toFixed(4)}_${a.at.lng.toFixed(4)}`;
    const groups = {};
    team.filter((a) => a.live).forEach((a) => { (groups[spot(a)] ||= []).push(a.id); });

    const roadLine = road?.length > 1 && (
        <React.Fragment key="kx-road">
            <Polyline positions={road.map(ll)} renderer={svg} interactive={false} pathOptions={{ color: '#0A0908', opacity: 0.5, weight: 7, lineCap: 'round', lineJoin: 'round' }} />
            <Polyline positions={road.map(ll)} renderer={svg} interactive={false} className="kx-road" pathOptions={{ color: '#E8E4DE', weight: 3, lineCap: 'round', lineJoin: 'round' }} />
            {road.slice(1).map((p, i) => (
                <Marker key={i} position={[(road[i].lat + p.lat) / 2, (road[i].lng + p.lng) / 2]} icon={arrowAt(road[i], p)} interactive={false} zIndexOffset={-500} />
            ))}
        </React.Fragment>
    );

    return [...team.map((a) => {
        // a pressed man: the others' lines fade with them
        const mine = bare || (wide && !focus) || a.id === sel, faint = mine ? 1 : 0.35, one = !bare && !wide && a.id === sel, pins = one && stops;
        const g = groups[spot(a)] || [a.id], shift = (g.indexOf(a.id) - (g.length - 1) / 2) * 30;
        /* Map System keeps the gold chip */
        const chip = bare && cachedIcon({
            className: 'kx-mk',
            html: `<div class="kx-chip${a.out ? '' : ' off'}"><b>${a.photo ? `<img src="${esc(a.photo)}" alt="">` : esc(a.ini)}</b><span>${esc(a.ini)} · ${count(a)}</span><i></i></div>`,
            iconSize: [36, 48], iconAnchor: [18 - shift, 48],
        });
        const trail = [...a.done.filter((d) => d.lat), ...(a.live ? [a.at] : [])].map(ll);
        const goal = a.next?.lat ? a.next : null;
        const lines = a.live && !bare;   // a closed day leaves the map with him: no trail, no march line
        return (
            <React.Fragment key={a.id}>
                {lines && a.ahead.length > 1 && goal && (
                    <Polyline positions={a.ahead.filter((p) => p.lat).map(ll)} renderer={svg} interactive={false}
                        pathOptions={{ color: '#E8E4DE', opacity: 0.35 * faint, weight: 2.5, dashArray: '1 7', lineCap: 'round' }} />
                )}
                {lines && trail.length > 1 && (
                    <Polyline positions={trail} renderer={svg} interactive={false}
                        pathOptions={one ? { color: '#E4B04A', weight: 4, dashArray: '1 9', lineCap: 'round' } : { color: '#E8E4DE', opacity: faint, weight: 3, lineCap: 'round', lineJoin: 'round' }} />
                )}
                {lines && goal && a.live && (
                    /* className as a prop: react-leaflet applies pathOptions with setStyle, which never sets a class */
                    <Polyline positions={[ll(a.at), ll(goal)]} renderer={svg} interactive={false} className="kx-march"
                        pathOptions={{ color: '#E4B04A', opacity: faint, weight: one ? 4 : 3, dashArray: one ? '2 8' : '9 7', lineCap: 'round' }} />
                )}
                {lines && wide && stops && [...a.done, ...a.ahead].filter((p) => p.lat).map((p, k) => (
                    <CircleMarker key={p.key} center={ll(p)} radius={6} renderer={svg} interactive={false}
                        pathOptions={k < a.done.length ? { color: '#D08A2E', fillColor: '#E4B04A', fillOpacity: 1, weight: 2 } : { color: '#A39B90', fillColor: '#2a2826', fillOpacity: 1, weight: 2 }} />
                ))}
                {lines && wide && goal && (
                    <Marker position={ll(goal)} interactive={false} zIndexOffset={18000} opacity={faint}
                        icon={L.divIcon({ className: 'kx-mk', html: '<div class="kx-target"></div>', iconSize: [30, 30], iconAnchor: [15, 15] })} />
                )}
                {pins && [...a.done, ...a.ahead].map((p, k) => p.lat && (
                    <Marker key={p.key} position={ll(p)} interactive={false} zIndexOffset={k === a.done.length ? 19500 : 19000}
                        icon={L.divIcon({
                            className: 'kx-mk', iconSize: [22, 22], iconAnchor: [11, 11],
                            html: `<div class="kx-loc${k < a.done.length ? ' hit' : k === a.done.length ? ' next' : ''}"><i>${k + 1}</i>${k < a.done.length ? '' : `<span>${esc(p.name)}</span>`}</div>`,
                        })} />
                ))}
                {chip && a.live && <Marker position={ll(a.at)} icon={chip} interactive={false} zIndexOffset={a.id === sel ? 21000 : 20000} />}
            </React.Fragment>
        );
    }), roadLine];
}

/* ---- Journey Plan's salesmen: a pixel person in his squad colour (his pick 2026-10-03, "full pixel"), rendered INSIDE
   the shop cluster group so Leaflet's own clustering puts each man in exactly one bubble at every zoom, walking ones
   too; the bubble draws them as a crowd from `kxFig` (JourneyView createJourneyClusterIcon). Zoomed in, each stands
   fixed at his spot (his "supposed to be fix", 2026-10-03 20:00), just LEFT of it so his shop's chest stays clear.
   Seen at a shop (state `at`) = the selling scene: he stands beside that shop's chest holding the coin up. ---- */
export function ExpeditionPeople({ team, sel, wide, colorOf, focusName }) {
    const shopOf = (a) => (a.state === 'at' && a.done[a.done.length - 1]?.lat ? a.done[a.done.length - 1] : null);
    /* THE SELLING MOMENT plays only for a man newly seen at a shop while the map is open - the chest's own rule (his
       "it refreshed"): first load and later renders draw the held coin. Refs, not state: StrictMode runs the memo twice. */
    const seen = useRef(null), playing = useRef({});
    const [, setTick] = useState(0);
    useMemo(() => {
        const prev = seen.current, now = Date.now();
        seen.current = Object.fromEntries(team.map((a) => [a.id, shopOf(a)?.key || null]));
        if (!prev) return;
        for (const id in playing.current) if (playing.current[id] < now) delete playing.current[id];
        team.forEach((a) => {
            if (!(a.id in prev)) return;
            const k = seen.current[a.id];
            if (k && prev[a.id] !== k) playing.current[a.id] = now + 1500;
        });
    }, [team]);
    useEffect(() => {   // back to the still picture once the moment has played, or a zoom would replay it
        if (!Object.values(playing.current).some((t) => t > Date.now())) return;
        const t = setTimeout(() => setTick((x) => x + 1), 1600);
        return () => clearTimeout(t);
    }, [team]);

    const where = (a) => shopOf(a) || a.at;
    const spot = (a) => `${where(a).lat.toFixed(4)}_${where(a).lng.toFixed(4)}`;
    const live = team.filter((a) => a.live), groups = {}, byId = Object.fromEntries(live.map((a) => [a.id, a]));
    live.forEach((a) => { (groups[spot(a)] ||= []).push(a.id); });   // two on one spot stand side by side, not stacked
    /* at a selling man's shop the whole group stands in ONE row left of the chest, sellers nearest it */
    Object.values(groups).forEach((g) => g.sort((x, y) => !!shopOf(byId[y]) - !!shopOf(byId[x])));

    return live.map((a) => {
        const shop = shopOf(a), g = groups[spot(a)], i = g.indexOf(a.id), shift = (i - (g.length - 1) / 2) * 30, row = !!shopOf(byId[g[0]]);
        const shirt = colorOf ? colorOf(a.name) : '#E8E4DE', hair = HAIR[String(a.id).length % HAIR.length];
        const mine = focusName ? a.name === focusName : wide || a.id === sel, play = playing.current[a.id] > Date.now();   // a pressed man: everyone else fades
        const icon = cachedIcon({
            className: 'kx-mk',
            html: `<div class="kx-sm ${shop ? `sell${play ? ' play' : ''}` : a.state === 'go' ? 'walk' : 'idle'}${a.id === sel ? ' sel' : ''}${mine ? '' : ' dim'}" style="--c:${safeHex(shirt, '#E8E4DE')}"><i class="kx-shadow"></i>`
                + `<div class="who"><div class="body">${shop ? sellerHtml(hair, shirt) : personSvg(hair, shirt)}</div></div>`
                + `<span class="tag"><i style="background:var(--c)"></i>${esc(a.ini)} · ${count(a)}</span>${QUEST}</div>`,
            /* at a shop his feet line up with the chest's (anchor 14, 31) and he stands 2 px clear of its left edge */
            iconSize: [30, 42], iconAnchor: row ? [46 + i * 32, 39] : [45 - shift, 42],
            kxFig: [hair, shirt],
        });
        return <Marker key={a.id} position={ll(where(a))} icon={icon} interactive={false} zIndexOffset={a.id === sel ? 21000 : 20000} />;
    });
}

/* ---- the panel ---- */
const Av = ({ a, size }) => (
    <span className={`kx-av${size ? ` ${size}` : ''}`}>{a.photo ? <img src={a.photo} alt="" /> : a.ini}</span>
);
const Cells = ({ a }) => (
    <div className="kx-cells" style={{ gridTemplateColumns: `repeat(${a.of}, 1fr)` }}>
        {Array.from({ length: a.of }, (_, k) => <i key={k} className={k < a.done.length ? 'on' : k === a.done.length ? 'now' : ''} />)}
    </div>
);
const Pips = ({ a }) => (
    <div className="kx-pips">
        {Array.from({ length: a.of }, (_, k) => (
            <React.Fragment key={k}>
                {k > 0 && <u className={k < a.done.length ? 'on' : k === a.done.length ? 'go' : ''} />}
                <i className={k < a.done.length ? 'on' : k === a.done.length ? 'nx' : ''} />
            </React.Fragment>
        ))}
    </div>
);

/* `page`: the panel sits in Journey Plan's scrolling page (under the phone strip, beside the 500 px map on the PC)
   instead of filling a full-height map screen */
/* Today / All shops for the pressed salesman's road (his "shop assigned today, but also add option on all shop assigned") */
const RoadSwitch = ({ all, onAll }) => (
    <div className="kx-roadsw" role="group" aria-label="Road">
        <button type="button" aria-pressed={!all} onClick={() => onAll(false)}>Today</button>
        <button type="button" aria-pressed={all} onClick={() => onAll(true)}>All shops</button>
    </div>
);

/* `onReplay`: the pressed man's Day Replay (src/components/DayReplay.jsx) - his day played back on this map */
export function ExpeditionPanel({ team, sel, onPick, wide, scoped, page, focused, roadAll, onRoadAll, onReplay }) {
    const out = team.filter((a) => a.out);
    const done = out.reduce((s, a) => s + a.done.length, 0), of = out.reduce((s, a) => s + (a.of ?? a.done.length), 0);
    const a = team.find((t) => t.id === sel) || team[0];

    return (
        <aside className={`kx-panel${page ? ' kx-page' : ''}`} aria-label="Expedition">
            <div className="kx-ph"><b>Expedition</b><span>{out.length} out · <em>{done}/{of}</em> shops</span></div>
            {focused && <RoadSwitch all={roadAll} onAll={onRoadAll} />}
            {focused && onReplay && <button type="button" className="kx-rp-go" onClick={onReplay}><svg viewBox="0 0 12 12"><path d="M3 1.5v9l7.5-4.5z" /></svg>Replay his day</button>}
            {!team.length ? (
                <p className="kx-empty">No salesman{scoped ? ' in your region' : ''} has sent a position yet. His phone sends one with every sale and every time he opens the app.</p>
            ) : wide ? (
                <>
                    <div className="kx-rows">
                        {team.map((t) => (
                            <button type="button" key={t.id} className={`kx-row${t.id === sel ? ' sel' : ''}${t.out ? '' : ' off'}`} aria-pressed={t.id === sel} onClick={() => onPick(t.id)}>
                                <Av a={t} />
                                <span className="kx-mid">
                                    <span className="kx-nm">{t.name}{t.title && <em className="kx-title">{t.title}</em>}</span>
                                    <span className={`kx-led ${lamp(t)}`}><i /><span>{said(t)}</span></span>
                                    {t.of > 0 && <Cells a={t} />}
                                </span>
                                <span className="kx-rt"><b>{count(t)}</b><small>{kmLabel(t.metresToNext)}</small><small>{agoLabel(t.mins)}</small></span>
                            </button>
                        ))}
                    </div>
                    <div className="kx-legend">
                        <div><svg width="34" height="10"><line x1="2" y1="5" x2="32" y2="5" stroke="#E8E4DE" strokeWidth="3" strokeLinecap="round" /></svg><span><b>Today's trail</b>: his sales so far, in order.</span></div>
                        <div><svg width="34" height="10"><line x1="2" y1="5" x2="32" y2="5" stroke="#E4B04A" strokeWidth="3" strokeDasharray="7 5" /></svg><span><b>Heading to</b>: the next shop on his round.</span></div>
                        <div><svg width="34" height="10"><line x1="2" y1="5" x2="32" y2="5" stroke="rgba(232,228,222,.5)" strokeWidth="2.5" strokeDasharray="1 6" strokeLinecap="round" /></svg><span><b>Still to visit</b> today.</span></div>
                        <div><svg width="34" height="10"><circle cx="17" cy="5" r="4" fill="#E4B04A" /></svg><span><b>Last seen</b> = his last sale or the last time he opened the app. A phone sends no position while it is locked.</span></div>
                    </div>
                </>
            ) : (
                <>
                    <div className="kx-pick">
                        {team.map((t) => (
                            <button type="button" key={t.id} aria-pressed={t.id === sel} onClick={() => onPick(t.id)}><i />{t.ini} {count(t)}</button>
                        ))}
                    </div>
                    <div className="kx-travel">
                        <div className="kx-who"><Av a={a} size="md" /><div><div className="kx-nm">{a.name}{a.title && <em className="kx-title">{a.title}</em>}</div><small>Last seen {agoLabel(a.mins)}</small></div></div>
                        <div className="kx-dest">
                            <small>{({ go: 'Heading to', at: 'Selling at', home: 'Round done', idle: 'No next shop', off: 'Not out today', closed: 'Day closed' })[a.state]}</small>
                            <div>{({ go: a.next?.name, at: a.done[a.done.length - 1]?.name, home: `${a.done.length} shops today`, idle: '-', off: `Seen ${agoLabel(a.mins)}`, closed: `${a.done.length} shops today` })[a.state]}</div>
                        </div>
                        {a.of > 0 && (a.of <= 12 ? <Pips a={a} /> : <Cells a={a} />)}
                        <div className="kx-meta3">
                            <div><b>{count(a)}</b><small>shops</small></div>
                            <div><b>{kmLabel(a.metresToNext)}</b><small>to go</small></div>
                            <div><b>{a.metresToNext == null ? '-' : `±${Math.max(1, Math.round(a.metresToNext / 1000 / 25 * 60))} min`}</b><small>by motor</small></div>
                        </div>
                    </div>
                </>
            )}
        </aside>
    );
}

/* ---- the Expedition on the FULLSCREEN map, smaller (his "i want the expedition to be visible but smaller on fullscreen
   as well", 2026-10-04; "fulscreen looks good" to round 7): his two settled looks shrunk - the PC keeps the squad list as
   short rows under the map keys, the phone keeps the pick chips plus ONE line of the picked man's card. The WHOLE team
   is listed, men not out today dimmed (his "i still cant see the team list when fullscreen", 10:20 - listing only the men
   on the map left it empty on a day nobody was out). A tap is the same pick as the full panel. ---- */
/* `onReplay` + `replaying` (his 2026-10-05 "playable and swapble in the fullscreen"): the same Replay key as the full panel;
   while his day plays, a press on another man swaps the replay to HIS day (JourneyView decides), the key stops it, and
   `children` is where the pressed shop's card sits (PC) */
export function ExpeditionMini({ team, sel, onPick, wide, colorOf, focused, roadAll, onRoadAll, onReplay, replaying, children }) {
    const out = team.filter((a) => a.live).length;
    const a = team.find((t) => t.id === sel) || team[0];
    const sq = (t) => ({ '--c': safeHex(colorOf ? colorOf(t.name) : '#E8E4DE', '#E8E4DE') });
    if (wide) return (
        <aside className="kx-mini" aria-label="Expedition">
            <header><b>Expedition</b><small>{out} out · {team.length - out} not</small></header>
            <div className="kx-mrows">
                {team.map((t) => (
                    <button type="button" key={t.id} className={`kx-mrow${t.live ? '' : ' off'}${t.id === sel && focused ? ' sel' : ''}`} style={sq(t)} aria-pressed={t.id === sel && focused} onClick={() => onPick(t.id)}>
                        <i /><span>{t.name}</span><u className={lamp(t)} /><em>{count(t)}</em>
                    </button>
                ))}
            </div>
            {focused && !replaying && <RoadSwitch all={roadAll} onAll={onRoadAll} />}
            {focused && onReplay && <button type="button" className="kx-rp-go" aria-pressed={!!replaying} onClick={onReplay}>{replaying ? <svg viewBox="0 0 12 12"><path d="M2 2h8v8H2z" /></svg> : <svg viewBox="0 0 12 12"><path d="M3 1.5v9l7.5-4.5z" /></svg>}{replaying ? 'Stop replay' : 'Replay his day'}</button>}
            {children}
        </aside>
    );
    return (
        <div className="kx-mbar">
            <div className="kx-mchips">
                {team.map((t) => (
                    <button type="button" key={t.id} className={`${t.id === sel ? 'sel' : ''}${t.live ? '' : ' off'}`} style={sq(t)} aria-pressed={t.id === sel} onClick={() => onPick(t.id)}><i />{t.ini} {count(t)}</button>
                ))}
            </div>
            {a && (
                <div className="kx-mline">
                    <span>{a.name}</span><small>{({ go: 'heading to', at: 'selling at', home: 'round done', idle: 'no next shop', off: 'not out today', closed: 'day closed' })[a.state]}</small>
                    <span>{({ go: a.next?.name, at: a.done[a.done.length - 1]?.name })[a.state] || ''}</span><em>{count(a)}</em>
                </div>
            )}
            {focused && !replaying && <RoadSwitch all={roadAll} onAll={onRoadAll} />}
            {focused && onReplay && <button type="button" className="kx-rp-go" aria-pressed={!!replaying} onClick={onReplay}>{replaying ? <svg viewBox="0 0 12 12"><path d="M2 2h8v8H2z" /></svg> : <svg viewBox="0 0 12 12"><path d="M3 1.5v9l7.5-4.5z" /></svg>}{replaying ? 'Stop replay' : 'Replay his day'}</button>}
        </div>
    );
}
