/* THE DAY REPLAY's data and clock (the map layer and the panel in src/components/DayReplay.jsx share it): the pressed man's
   day read from the Day Log (src/utils/dayLog.js) and played as ONE function of time. The clock lives in a ref and reaches
   the screen through `subs` every frame - a per-frame value never goes through React state (the useScenePlayer rule: on
   his phone that re-rendered the subtree 60 times a second and read as flicker). React state moves only when the stop
   under the clock, Play or the speed changes. */
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { dayLog, replayTimeline } from '../utils/dayLog.js';
import { notify } from '../components/Toast.jsx';

export function useDayReplay({ man, day, db, appId, uid, transactions, customers, lite }) {
    /* the day's Visit Reports: one read of that day's activity-log folder. `got` remembers which man + day it is for, so a
       new pick reads as "still reading" without a reset inside the effect */
    const want = man?.id && day ? `${man.id}|${day}` : null;
    const [got, setGot] = useState({ key: null, logs: null });
    useEffect(() => {
        if (!want) return undefined;
        let live = true;
        getDocs(query(collection(db, `artifacts/${appId}/users/${uid}/audit_vault/${day}/logs`), where('action', 'in', ['VISIT_REPORT', 'VISIT_UNDO'])))
            .then((s) => { if (live) setGot({ key: want, logs: s.docs.map((d) => ({ id: d.id, ...d.data() })) }); })
            .catch((e) => { if (!live) return; setGot({ key: want, logs: [] }); notify(`Could not read the visit reports for ${day} (${e.message}) - only his sales play.`); });
        return () => { live = false; };
    }, [want, day, db, appId, uid]);
    const logs = got.key === want ? got.logs : null;   // null = still reading

    const log = useMemo(() => (man && logs ? dayLog({ man, day, transactions, logs, customers }) : null), [man, day, transactions, logs, customers]);
    /* the map's stops: where the day started + every event with a pin. No first position that day = he starts at his first shop */
    const stops = useMemo(() => {
        const pinned = (log?.events || []).filter((e) => e.lat);
        if (!pinned.length) return [];
        const s = log.start || { at: pinned[0].at, time: pinned[0].time, lat: pinned[0].lat, lng: pinned[0].lng, guessed: true };
        return [{ ...s, kind: 'start', name: 'Day starts' }, ...pinned];
    }, [log]);
    const tl = useMemo(() => (stops.length > 1 ? replayTimeline(stops) : null), [stops]);

    const t = useRef(0), subs = useRef(new Set()), prev = useRef(null);
    const [playing, setPlaying] = useState(true), [speed, setSpeed] = useState(1), [cur, setCur] = useState(0);
    /* a new day opens playing from its start (React's "adjust state when an input changes", during render) */
    const [seenTl, setSeenTl] = useState(tl);
    if (seenTl !== tl) { setSeenTl(tl); setPlaying(true); setCur(0); }
    useEffect(() => { t.current = 0; prev.current = null; }, [tl]);

    const emit = useCallback(() => { subs.current.forEach((f) => f(t.current)); if (tl) setCur(tl.curAt(t.current)); }, [tl]);
    useEffect(() => {
        if (!tl) return undefined;
        let raf = 0;
        const frame = (now) => {
            if (playing) {
                if (prev.current != null) t.current = Math.min(tl.total, t.current + (now - prev.current) * speed);
                prev.current = now;
                if (t.current >= tl.total) setPlaying(false);
            }
            emit();
            raf = requestAnimationFrame(frame);
        };
        raf = requestAnimationFrame(frame);
        return () => { cancelAnimationFrame(raf); prev.current = null; };
    }, [tl, playing, speed, emit]);

    const seek = useCallback((nt, keep) => {
        if (!tl) return;
        t.current = Math.max(0, Math.min(tl.total - 1, nt)); prev.current = null;
        if (!keep) setPlaying(false);
        emit();
    }, [tl, emit]);
    const jumpTo = (k, keep = playing) => tl && seek(k <= 0 ? 0 : tl.sceneSeg(k).t0, keep);
    /* Play on a finished day starts it over: a dead Play key is a control that does not report */
    const toggle = () => { if (!playing && tl && t.current >= tl.total - 1) t.current = 0; prev.current = null; setPlaying(!playing); };
    return { log, logs, stops, tl, t, subs, playing, setPlaying, toggle, speed, setSpeed, cur, seek, jumpTo, lite };
}

/* a per-frame subscriber: `fn` gets the clock every frame, always the latest render's fn */
export const useTick = (rp, fn) => {
    const f = useRef(fn);
    useLayoutEffect(() => { f.current = fn; });
    useEffect(() => { const s = rp.subs.current, g = (t) => f.current(t); s.add(g); return () => { s.delete(g); }; }, [rp.subs]);
};
