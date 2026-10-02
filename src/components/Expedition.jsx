/* The expedition on the Map System (his pick, 2026-10-02 19:00): the PC shows the whole squad as a list
   (look A, The Walking Dead: Survivors), the phone shows ONE salesman as a travel card (look B, Last
   Day on Earth). One map layer for both. Prototype: A-Brain Raw/2026-10-02-expedition/expedition.html.
   Data: src/utils/expedition.js. Motion is the march line's flow and the target's ping only - Lite
   Mode completes both instantly (index.css), so nothing moves there. */
import React, { useEffect, useMemo, useRef } from 'react';
import { Marker, Polyline, CircleMarker, useMap } from 'react-leaflet';
import L from 'leaflet';
import { agoLabel } from '../utils/expedition';
import '../styles/expedition.css';

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
const count = (a) => `${a.done.length}${a.of != null ? `/${a.of}` : ''}`;
const kmLabel = (m) => (m == null ? '-' : `${(m / 1000).toFixed(1).replace('.', ',')} km`);
const said = (a) => ({
    go: `En route → ${a.next?.name}`, at: `At shop · ${a.done[a.done.length - 1]?.name}`,
    home: 'Round done', idle: 'No shop left to suggest', off: 'Not out today',
})[a.state];
const lamp = (a) => ({ go: 'go', at: 'at' })[a.state] || '';
const ll = (p) => [p.lat, p.lng];

/* ---- the map layer: chips at the last-seen point, today's trail, the march line to the next shop ---- */
/* `bare` (the expedition switched off): the chips only, no lines and no camera - the map is his again */
export function ExpeditionLayer({ team, sel, focus, wide, bare }) {
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
        const who = teamRef.current.filter((a) => (wide && !focus ? a.out : a.id === sel));
        const pts = who.flatMap((a) => [a.at, ...a.done, ...a.ahead]).filter((p) => p?.lat).map(ll);
        // room for the control card on top and Set Home / the zoom keys at the bottom, so no stop hides under them
        if (pts.length) map.fitBounds(pts, { paddingTopLeft: [48, 96], paddingBottomRight: [48, 80], maxZoom: 16 });
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
            const kept = [...box.querySelectorAll('.kx-chip b, .kx-loc i')].map((e) => e.getBoundingClientRect());
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

    /* two salesmen on one spot (everyone opens the app at the branch) stand side by side, not stacked */
    const spot = (a) => `${a.at.lat.toFixed(4)}_${a.at.lng.toFixed(4)}`;
    const groups = {};
    team.forEach((a) => { (groups[spot(a)] ||= []).push(a.id); });

    return team.map((a) => {
        const mine = bare || wide || a.id === sel, faint = mine ? 1 : 0.35, pins = !bare && !wide && a.id === sel;
        const g = groups[spot(a)], shift = (g.indexOf(a.id) - (g.length - 1) / 2) * 30;
        const chip = L.divIcon({
            className: 'kx-mk',
            html: `<div class="kx-chip${a.id === sel && !bare ? ' sel' : ''}${a.out ? '' : ' off'}${mine ? '' : ' dim'}"><b>${a.photo ? `<img src="${esc(a.photo)}" alt="">` : esc(a.ini)}</b>${wide || bare ? `<span>${esc(a.ini)} · ${count(a)}</span>` : ''}<i></i></div>`,
            iconSize: [36, 48], iconAnchor: [18 - shift, 48],
        });
        const trail = [...a.done.filter((d) => d.lat), a.at].map(ll);
        const goal = a.next?.lat ? a.next : null;
        const lines = a.out && !bare;
        return (
            <React.Fragment key={a.id}>
                {lines && a.ahead.length > 1 && goal && (
                    <Polyline positions={a.ahead.filter((p) => p.lat).map(ll)} renderer={svg} interactive={false}
                        pathOptions={{ color: '#E8E4DE', opacity: 0.35 * faint, weight: 2.5, dashArray: '1 7', lineCap: 'round' }} />
                )}
                {lines && trail.length > 1 && (
                    <Polyline positions={trail} renderer={svg} interactive={false}
                        pathOptions={pins ? { color: '#E4B04A', weight: 4, dashArray: '1 9', lineCap: 'round' } : { color: '#E8E4DE', opacity: faint, weight: 3, lineCap: 'round', lineJoin: 'round' }} />
                )}
                {lines && goal && (
                    /* className as a prop: react-leaflet applies pathOptions with setStyle, which never sets a class */
                    <Polyline positions={[ll(a.at), ll(goal)]} renderer={svg} interactive={false} className="kx-march"
                        pathOptions={{ color: '#E4B04A', opacity: faint, weight: pins ? 4 : 3, dashArray: pins ? '2 8' : '9 7', lineCap: 'round' }} />
                )}
                {lines && wide && [...a.done, ...a.ahead].filter((p) => p.lat).map((p, k) => (
                    <CircleMarker key={p.key} center={ll(p)} radius={6} renderer={svg} interactive={false}
                        pathOptions={k < a.done.length ? { color: '#D08A2E', fillColor: '#E4B04A', fillOpacity: 1, weight: 2 } : { color: '#A39B90', fillColor: '#2a2826', fillOpacity: 1, weight: 2 }} />
                ))}
                {lines && wide && goal && (
                    <Marker position={ll(goal)} interactive={false} zIndexOffset={18000}
                        icon={L.divIcon({ className: 'kx-mk', html: '<div class="kx-target"></div>', iconSize: [30, 30], iconAnchor: [15, 15] })} />
                )}
                {pins && [...a.done, ...a.ahead].map((p, k) => p.lat && (
                    <Marker key={p.key} position={ll(p)} interactive={false} zIndexOffset={k === a.done.length ? 19500 : 19000}
                        icon={L.divIcon({
                            className: 'kx-mk', iconSize: [22, 22], iconAnchor: [11, 11],
                            html: `<div class="kx-loc${k < a.done.length ? ' hit' : k === a.done.length ? ' next' : ''}"><i>${k + 1}</i>${k < a.done.length ? '' : `<span>${esc(p.name)}</span>`}</div>`,
                        })} />
                ))}
                <Marker position={ll(a.at)} icon={chip} interactive={false} zIndexOffset={a.id === sel ? 21000 : 20000} />
            </React.Fragment>
        );
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

export function ExpeditionPanel({ team, sel, onPick, wide, scoped }) {
    const out = team.filter((a) => a.out);
    const done = out.reduce((s, a) => s + a.done.length, 0), of = out.reduce((s, a) => s + (a.of ?? a.done.length), 0);
    const a = team.find((t) => t.id === sel) || team[0];

    return (
        <aside className="kx-panel" aria-label="Expedition">
            <div className="kx-ph"><b>Expedition</b><span>{out.length} out · <em>{done}/{of}</em> shops</span></div>
            {!team.length ? (
                <p className="kx-empty">No salesman{scoped ? ' in your region' : ''} has sent a position yet. His phone sends one with every sale and every time he opens the app.</p>
            ) : wide ? (
                <>
                    <div className="kx-rows">
                        {team.map((t) => (
                            <button type="button" key={t.id} className={`kx-row${t.id === sel ? ' sel' : ''}${t.out ? '' : ' off'}`} aria-pressed={t.id === sel} onClick={() => onPick(t.id)}>
                                <Av a={t} />
                                <span className="kx-mid">
                                    <span className="kx-nm">{t.name}</span>
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
                        <div className="kx-who"><Av a={a} size="md" /><div><div className="kx-nm">{a.name}</div><small>Last seen {agoLabel(a.mins)}</small></div></div>
                        <div className="kx-dest">
                            <small>{({ go: 'Heading to', at: 'Selling at', home: 'Round done', idle: 'No next shop', off: 'Not out today' })[a.state]}</small>
                            <div>{({ go: a.next?.name, at: a.done[a.done.length - 1]?.name, home: `${a.done.length} shops today`, idle: '-', off: `Seen ${agoLabel(a.mins)}` })[a.state]}</div>
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
