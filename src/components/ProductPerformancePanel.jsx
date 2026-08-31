/* The Product Performance panel: picks a stretch of time, fetches the months it spans, prints
   one row per product.

   🔴 THIS IS WHY THE ROLLUP EXISTS. A day costs ONE document read, a week one or two, a month
   one, a year twelve. The same answer taken live off `transactions` reads every receipt in the
   range, and for a year that is thousands of documents every time the screen opens. Aldi is
   paying that bill: *"we should use older data to avoid high cost right"*.

   🔴 AND THE FETCH IS THE ONLY THING HERE THAT COSTS ANYTHING, so it is cached per range for as
   long as the panel is open. Flipping between Day and Week and back must not buy the same
   document three times.

   A failed read is REPORTED, never rendered as an empty period. "Nothing sold" and "the read did
   not come back" look identical on screen and mean opposite things — the shape this app has a
   whole vault page about. */
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { BarChart3, RefreshCcw } from 'lucide-react';
import { monthsInRange, sumRange, rangeDays, RANGES } from '../utils/salesRollup.js';
import { statsPath } from '../utils/salesRollupWrite.js';
import ProductPerformanceTable from '../ponder/stages/ProductPerformanceTable.jsx';

const LABEL = { day: 'Today', week: 'This week', month: 'This month', year: 'This year' };

export default function ProductPerformancePanel({ db, appId, userId, inventory = [] }) {
    const [range, setRange] = useState('month');
    const [docs, setDocs] = useState([]);
    const [state, setState] = useState('loading');   // loading | ok | failed
    const cache = useRef(new Map());

    /* `new Date()` is read once per range change rather than per render, so a panel left open
       overnight does not silently re-scope itself mid-session. */
    const { from, to } = useMemo(() => rangeDays(range, new Date()), [range]);
    const months = useMemo(() => monthsInRange(from, to), [from, to]);

    useEffect(() => {
        let alive = true;
        if (!db || !userId) return;
        (async () => {
            setState('loading');
            try {
                const got = await Promise.all(months.map(async (m) => {
                    if (cache.current.has(m)) return cache.current.get(m);
                    const snap = await getDoc(doc(db, statsPath(appId, userId, m)));
                    const val = snap.exists() ? { id: m, ...snap.data() } : null;
                    /* Only a month that came back is cached. Caching a miss would freeze an empty
                       month for the session, and this month fills up as the day goes on. */
                    if (val) cache.current.set(m, val);
                    return val;
                }));
                if (!alive) return;
                setDocs(got.filter(Boolean));
                setState('ok');
            } catch (err) {
                console.warn('Sales stats read failed:', err?.code || err?.message);
                if (alive) setState('failed');
            }
        })();
        return () => { alive = false; };
    }, [db, appId, userId, months.join(',')]);

    const named = useMemo(() => {
        const byId = new Map((inventory || []).map(p => [p.id, p.name]));
        const { rows, missing } = sumRange(docs, from, to);
        return { rows: rows.map(r => ({ ...r, name: byId.get(r.id) || r.id })), missing };
    }, [docs, from, to, inventory]);

    return (
        <section className="mb-8 rounded-2xl border border-line-2 bg-panel overflow-hidden shadow-[0_1px_1px_rgba(0,0,0,0.20),0_18px_40px_-28px_rgba(0,0,0,0.85)]">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 px-5 pt-5 pb-4">
                <div className="flex items-center gap-3 min-w-0">
                    <span className="h-10 w-10 rounded-xl bg-raised border border-line-2 flex items-center justify-center shrink-0">
                        <BarChart3 size={18} className="text-accent-ink" />
                    </span>
                    <div className="min-w-0">
                        <h3 className="font-display text-xl sm:text-2xl font-black text-ink uppercase tracking-[0.14em] leading-none">Product Performance</h3>
                        <div className="h-[3px] w-10 bg-orange rounded-full mt-2" />
                        <p className="font-mono text-[10px] text-ink-muted tracking-widest mt-2">
                            {from === to ? from : `${from} — ${to}`} · every region · in Bks
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2 shrink-0 flex-wrap">
                    {RANGES.map(r => (
                        <button key={r} type="button" onClick={() => setRange(r)}
                            data-ponder={`range:${r}`}
                            className={`px-3 py-1.5 rounded-lg border text-[10px] font-black uppercase tracking-widest transition-colors
                                        ${range === r ? 'border-orange text-ink bg-raised' : 'border-line-2 text-ink-muted hover:text-ink'}`}>
                            {LABEL[r]}
                        </button>
                    ))}
                </div>
            </div>

            {state === 'loading' && (
                <p className="px-5 py-10 text-[11px] text-ink-muted uppercase tracking-widest text-center animate-pulse">
                    Reading {months.length} month{months.length === 1 ? '' : 's'}…
                </p>
            )}

            {/* A failed read must never look like a quiet period. */}
            {state === 'failed' && (
                <div className="mx-5 mb-5 rounded-xl border border-danger-rail bg-danger-well px-4 py-4 flex items-center gap-3">
                    <RefreshCcw size={15} className="text-danger-text shrink-0" />
                    <p className="text-[11px] font-bold text-ink leading-relaxed">
                        The sales figures could not be read. Check the connection and open this panel
                        again — this is not an empty period.
                    </p>
                </div>
            )}

            {state === 'ok' && (
                <ProductPerformanceTable rows={named.rows} missing={named.missing} months={months.length} onRebuild />
            )}
        </section>
    );
}
