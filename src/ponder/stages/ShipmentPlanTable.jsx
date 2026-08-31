/* SHIPMENT PLAN — one row per PRODUCT, one column per branch.

   🔴 EVERY LABEL ON THIS PANEL IS PLAIN ENGLISH, and that is his standing rule rather than a
   preference of mine. Aldi, 2026-08-27: *"dont make vague terms"* and *"use english terms if its
   shorter and direct"*; again on 2026-08-30, after this shipped with Indonesian headers: *"can u
   use better english words from now on and change that, its so fague"*. `Kurang` was the word that
   broke it - it means "less", which never says less THAN WHAT. `Short by` names the gap.
   The neighbouring Sebaran Stok table has been English since 2026-08-27; a panel directly beneath
   it in another language was the drift, not the fix.
   ⚠️ THE BRANCH-SIDE screens stay Indonesian on purpose - different reader, settled
   separately. This rule is for the HQ desk.

   Aldi, 2026-08-30: *"i think we should made one more panel for product shipping quantity
   recommendation"*, and the scenario that makes it worth building, in his own words:
   *"normally factory does sent more than enough goods to the regional warehouse but if there is not
   enough/ minimal goods are being sent then this features actually come in handy, especially with
   company that have limited production capabilities"*.

   🔴 WHY THIS IS NOT A SECOND COPY OF SEBARAN STOK, which is the objection it had to survive.
   Sebaran Stok is warehouse-first and answers *"does BANDUNG need a delivery?"*. This is
   product-first and answers the question that only appears when stock is SHORT: *"I have 900 Cello
   Chocolate in the vault and my three cabang need 1.400 between them — who gets what?"* You cannot
   read that off a warehouse-first table without holding three rows in your head at once, and the
   one moment you need it is the moment you are under pressure.

   🔴 THE SHORTFALL COLUMN IS THE WHOLE POINT. Everything else here is already knowable. `short`
   is what the master vault CANNOT cover, and it is the only number on either screen that says
   "somebody is going to go without". It is the reason the panel exists.

   🔴 `data-ponder` IS AN API, NOT DECORATION. A tutorial beat names one of these keys in its
   `focus` and the overlay lights every element wearing it. Rename or drop one and the tutorial
   keeps playing while pointing at nothing — a failure that still looks like it works. Audit group
   56 fails if a scene names a key this file no longer emits.

   Presentational ONLY — no Firestore, no maths, no useMemo. `BranchWarehouseManager` transposes
   its already-computed `logistics` into these rows; nothing here re-derives a minimum, because
   three surfaces printing three different floors is exactly the failure this feature was built to
   avoid. */
import React from 'react';
import { Package, AlertTriangle } from 'lucide-react';

const n = (v) => Number(v || 0).toLocaleString('id-ID');

export default function ShipmentPlanTable({ rows = [], branches = [] }) {
    if (branches.length === 0) {
        return (
            <p className="px-5 py-8 text-[11px] text-ink-muted uppercase tracking-widest text-center">
                No branches on the roster yet — nowhere to plan a shipment to.
            </p>
        );
    }
    /* A product nobody needs is noise on a screen about splitting scarcity. `needed === null` means
       no cabang could be measured at all, which is different from "measured, needs nothing" — the
       same distinction the Minimal kirim column keeps, and it is kept here by dropping only the
       rows where the answer is a real zero. */
    const live = rows.filter(r => r.needed === null || r.needed > 0);

    if (live.length === 0) {
        return (
            <p className="px-5 py-8 text-[11px] text-ink-muted uppercase tracking-widest text-center">
                No branch needs a shipment right now.
            </p>
        );
    }

    /* One grid template for header, rows and total, built from the branch count so the columns
       cannot drift apart the way three hand-written templates would. */
    const cols = `minmax(0,1.4fr) 108px ${branches.map(() => '104px').join(' ')} 108px 112px`;

    const Cell = ({ children, className = '', k }) => (
        <span data-ponder={k} className={`text-right font-mono tabular-nums ${className}`}>{children}</span>
    );

    return (
        <div className="overflow-x-auto">
            {/* 🔴 620, NOT 520, AND THE 100px IS THE PRODUCT NAME'S. The fixed columns take
                108 + 104·branches + 108 + 112, and five 16px gaps take 80 more, so at the old
                minimum the product column — the one column that says WHICH product a row is
                about — was left with about 112px and truncated "Cello Chocolate" to "Cell…" on a
                phone. Aldi, 2026-08-31: *"just make sure that it looks good on phones"*. It now
                gets about 212px, which clears the longest real name. Desktop is unaffected: the
                container is wider than this minimum there, so `1.4fr` already had the slack. */}
            <div style={{ minWidth: `${620 + branches.length * 104}px` }}>

                <div className="grid gap-x-4 items-end px-5 pb-2.5 border-b border-line-2 text-[10px] font-bold text-ink-muted uppercase tracking-widest"
                     style={{ gridTemplateColumns: cols }}>
                    <span data-ponder="col:product">Product</span>
                    <span data-ponder="col:hq" className="text-right">Master vault has</span>
                    {branches.map(b => <span key={b} data-ponder="col:branch" className="text-right truncate" title={b}>{b}</span>)}
                    <span data-ponder="col:needed" className="text-right">All branches need</span>
                    <span data-ponder="col:short" className="text-right">Short by</span>
                </div>

                {live.map(r => {
                    const short = r.short > 0;
                    return (
                        <div key={r.id} data-ponder={`row:${r.id}`}
                             className={`grid gap-x-4 items-center px-5 py-3 border-b border-line-2 last:border-b-0 ${short ? 'bg-danger-well' : ''}`}
                             style={{ gridTemplateColumns: cols }}>
                            <div className="min-w-0 flex items-center gap-2">
                                {short
                                    ? <AlertTriangle size={13} className="text-danger-text shrink-0"/>
                                    : <Package size={13} className="text-ink-muted shrink-0"/>}
                                <span className="font-bold text-ink text-[13px] truncate">{r.name}</span>
                            </div>
                            <Cell k="col:hq" className={`font-black ${r.hq > 0 ? 'text-gold' : 'text-ink-muted'}`}>{n(r.hq)}</Cell>
                            {branches.map(b => {
                                const v = r.byBranch[b];
                                return (
                                    <Cell key={b} k="col:branch" className="text-[13px]">
                                        {v == null
                                            ? <span className="text-ink-muted" title="Not enough history — this product needs two recorded deliveries to that branch first">—</span>
                                            : <span className={v > 0 ? 'text-orange' : 'text-ink-muted'}>{n(v)}</span>}
                                    </Cell>
                                );
                            })}
                            <Cell k="col:needed" className="font-black text-ink">
                                {r.needed == null ? <span className="text-ink-muted">—</span> : n(r.needed)}
                            </Cell>
                            {/* The only cell that is ever a warning. It is the master vault's stock
                                measured against what the cabang need, so it says what no other
                                screen says: this cannot all be sent. */}
                            <Cell k="col:short" className="font-black">
                                {r.short == null
                                    ? <span className="text-ink-muted">—</span>
                                    : short
                                        ? <span className="text-danger-text">−{n(r.short)}</span>
                                        : <span className="text-ink-muted">covered</span>}
                            </Cell>
                        </div>
                    );
                })}

                <div data-ponder="row:total" className="grid gap-x-4 items-center px-5 py-3.5 border-t-2 border-line-3 bg-raised/40"
                     style={{ gridTemplateColumns: cols }}>
                    <span className="text-[10px] font-bold text-ink-muted uppercase tracking-widest">Every product</span>
                    <Cell className="font-black text-gold">{n(live.reduce((s, r) => s + r.hq, 0))}</Cell>
                    {branches.map(b => (
                        <Cell key={b} className="font-black text-orange">
                            {n(live.reduce((s, r) => s + (r.byBranch[b] || 0), 0))}
                        </Cell>
                    ))}
                    <Cell className="font-black text-ink">{n(live.reduce((s, r) => s + (r.needed || 0), 0))}</Cell>
                    <Cell className="font-black text-danger-text">
                        {live.some(r => r.short > 0) ? `−${n(live.reduce((s, r) => s + (r.short || 0), 0))}` : <span className="text-ink-muted">covered</span>}
                    </Cell>
                </div>
            </div>
        </div>
    );
}
