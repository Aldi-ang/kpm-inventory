/* THE DAY LOG: one salesman's day, in order, from what the app already keeps (A-Brain
   Brainstorm/2026-10-04_journey-day-replay.md, his "this chain of events is replay able", 2026-10-04).

   - A SALE or an EXCHANGE = his own transactions that day (an exchange = a RETUR record), with their time.
   - Every other visit = the Visit Report he sent from Journey Plan, kept in that day's activity log
     (audit_vault/{day}/logs, action VISIT_REPORT). Since 2026-10-05 the entry carries storeId / tag / agentId as
     fields; an older one is only the sentence "Visited {shop} - {tag}: {note}", cut on the KNOWN tags (a shop called
     "Toko A - B" has its own " - "), and is his when the email that wrote it is his. A report undone afterwards
     (VISIT_UNDO, "Undid visit for {shop}") is dropped - the undo takes back the latest one for that shop.
   - Where the day starts = his first position that day (motorists/{id}.pathHistory holds today's points only, so a
     past day starts at its first stop).

   Two things the replay must never claim: the report time is when he pressed Report, not when he arrived; and the walk
   between two stops is drawn, never tracked (a phone sends a position only on a sale or an app open). */
import { storeKey, getLocalDayKey } from './helpers.js';
import { txDate } from './period.js';
import { isSale } from './salesRollup.js';
import { signFor } from './mapSprites.js';

/* the Visit Report's tags: the form's default + QUICK_TAGS in src/JourneyView.jsx (a check keeps the two lists equal) */
export const VISIT_TAGS = ['Routine Check', 'Repeat Order 📦', 'Stock Full (No Order) 🛑', 'Competitor Issue ⚠️', 'New Request 📝', 'Store Closed 🔒'];

const minutes = (d) => d.getHours() * 60 + d.getMinutes() + d.getSeconds() / 60;
export const hm = (c) => `${String(Math.floor(c / 60)).padStart(2, '0')}:${String(Math.floor(c % 60)).padStart(2, '0')}`;
const isRetur = (t) => t.type === 'RETUR' || t.paymentType === 'Retur/BS';

/* "Visited Toko A - B - Stock Full (No Order) 🛑: masih 6 slop" -> { shop, tag, note }; null when no known tag is in it */
export const readReport = (sentence, tag) => {
    const s = String(sentence || '');
    if (!s.startsWith('Visited ')) return null;
    for (const t of tag ? [tag] : VISIT_TAGS) {
        const i = s.indexOf(` - ${t}: `);
        if (i > 0) return { shop: s.slice(8, i), tag: t, note: s.slice(i + t.length + 5) };
    }
    return null;
};

/* man = his motorists record ({ id, name, email, pathHistory }); logs = that day's activity-log entries */
export function dayLog({ man, day, transactions = [], logs = [], customers = [] }) {
    const byId = new Map(customers.map((c) => [c.id, c])), byKey = new Map(customers.map((c) => [storeKey(c.name), c]));
    const pinOf = (c) => (c && Number(c.latitude) && Number(c.longitude) ? { lat: Number(c.latitude), lng: Number(c.longitude) } : {});
    const email = String(man?.email || '').trim().toLowerCase();
    const his = (e) => (e.agentId ? e.agentId === man?.id : !!email && String(e.user || '').trim().toLowerCase() === email);
    const out = [];
    let skipped = 0;

    transactions.forEach((t) => {
        if (t?.agentId !== man?.id || !t.customerName) return;
        const at = txDate(t);
        if (Number.isNaN(at.getTime()) || getLocalDayKey(at) !== day) return;
        const kind = isRetur(t) ? 'swap' : isSale(t) ? 'sold' : null;
        if (!kind) return;
        const c = byKey.get(storeKey(t.customerName));
        out.push({ at, kind, name: c?.name || t.customerName, key: storeKey(t.customerName), ...pinOf(c), note: String(t.notes || t.note || ''), tx: t, source: 'terminal' });
    });

    /* reports and undos in time order: an undo drops the latest report for that shop before it, by the same person */
    const entries = logs.filter((e) => e && (e.action === 'VISIT_REPORT' || e.action === 'VISIT_UNDO') && his(e))
        .map((e) => ({ e, at: txDate(e) })).filter((x) => !Number.isNaN(x.at.getTime())).sort((a, b) => a.at - b.at);
    const reports = [];
    entries.forEach(({ e, at }) => {
        if (e.action === 'VISIT_UNDO') {
            const k = storeKey(e.storeId && byId.get(e.storeId) ? byId.get(e.storeId).name : String(e.details || '').replace(/^Undid visit for /, ''));
            const last = reports.filter((r) => r.key === k && !r.undone).pop();
            if (last) last.undone = true;
            return;
        }
        const r = readReport(e.details, e.tag);
        if (!r) { skipped++; return; }
        const c = (e.storeId && byId.get(e.storeId)) || byKey.get(storeKey(r.shop));
        reports.push({ at, kind: signFor(r.tag), tag: r.tag, name: c?.name || r.shop, key: storeKey(c?.name || r.shop), ...pinOf(c), note: r.note, source: 'report' });
    });
    reports.forEach((r) => { if (!r.undone) { delete r.undone; out.push(r); } });

    out.sort((a, b) => a.at - b.at);
    out.forEach((ev) => { ev.time = hm(minutes(ev.at)); });

    const first = (man?.pathHistory || []).map((p) => ({ ...p, at: new Date(p?.timestamp) }))
        .filter((p) => Number(p.lat) && Number(p.lng) && !Number.isNaN(p.at.getTime()) && getLocalDayKey(p.at) === day).sort((a, b) => a.at - b.at)[0];
    /* a first position AFTER his first stop is not where the day started - the app was opened mid-round */
    const start = first && (!out[0] || first.at <= out[0].at) ? { at: first.at, time: hm(minutes(first.at)), lat: Number(first.lat), lng: Number(first.lng) } : null;
    return { start, events: out, skipped };
}

/* THE REPLAY IS ONE FUNCTION OF TIME t (the page's design, ported - Day Replay v2): walking time follows the real gap
   between two stops (55 ms per minute at 1x, held to 0.9-2.4 s), each stop's scene holds the clock SCENE ms, so any t -
   forwards or backwards - is a pure read. `stops` = the start + every event that has a map pin, in time order. */
export const SCENE = 2000, START_HOLD = 700, END_HOLD = 1200, MS_PER_MIN = 55;
export function replayTimeline(stops) {
    const T = stops.map((s) => minutes(s.at));
    const segs = [{ kind: 'start', k: 0, t0: 0, t1: START_HOLD }];
    let acc = START_HOLD;
    for (let k = 1; k < stops.length; k++) {
        const walk = Math.max(900, Math.min(2400, (T[k] - T[k - 1]) * MS_PER_MIN));
        segs.push({ kind: 'walk', k, t0: acc, t1: acc + walk }); acc += walk;
        segs.push({ kind: 'scene', k, t0: acc, t1: acc + SCENE }); acc += SCENE;
    }
    segs.push({ kind: 'end', k: stops.length - 1, t0: acc, t1: acc + END_HOLD });
    const total = acc + END_HOLD;
    const segAt = (t) => segs.find((s) => t < s.t1) || segs[segs.length - 1];
    const sceneSeg = (k) => segs.find((s) => s.kind === 'scene' && s.k === k);
    const clockAt = (t) => { const s = segAt(t); return s.kind === 'walk' ? T[s.k - 1] + (T[s.k] - T[s.k - 1]) * Math.min(1, (t - s.t0) / (s.t1 - s.t0)) : T[s.kind === 'start' ? 0 : s.k]; };
    const tAtClock = (c) => {
        if (c <= T[0]) return 0;
        for (let k = 1; k < T.length; k++) {
            const w = segs.find((s) => s.kind === 'walk' && s.k === k);
            if (c < T[k] - 1) return w.t0 + Math.max(0, (c - T[k - 1]) / Math.max(1e-9, T[k] - T[k - 1])) * (w.t1 - w.t0);
            if (c <= T[k] + 1) return sceneSeg(k).t0;
        }
        return segs[segs.length - 1].t0;
    };
    /* the stop under the clock: walking = still the last one reached */
    const curAt = (t) => { const s = segAt(t); return s.kind === 'walk' ? s.k - 1 : s.kind === 'start' ? 0 : s.k; };
    const day0 = Math.floor((T[0] - 15) / 30) * 30, day1 = Math.ceil((T[T.length - 1] + 15) / 30) * 30;
    return { T, segs, total, segAt, sceneSeg, clockAt, tAtClock, curAt, day0, day1 };
}
