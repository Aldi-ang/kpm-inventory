/* PRODUCT PERFORMANCE — how much of each product sold, over a chosen stretch of time.

   Aldi, 2026-08-30: *"the total performance per day per week/ month or year for products right,
   like how many product is actually sold per timeframe specific for each of the product? well
   basically the performance for each product in overall through all region"*.

   ALL REGIONS TOGETHER, and that is the point rather than a limitation. Sebaran Stok already
   answers "where is it" one warehouse at a time; this answers "what sells", which is a question
   about the product and not about the branch. Splitting it by region here would make it a second
   Sebaran Stok with a date picker.

   🔴 THE BAR IS SHARE OF THE PERIOD, NOT PROGRESS TOWARD ANYTHING. There is no target on this
   screen and there must not be one implied. A product taking half the bar sold half the packs
   that moved, which is a fact; "half of what it should have" is a claim nobody has made.

   🔴 AND AN INCOMPLETE ANSWER SAYS SO. The figures come from a monthly rollup that only exists
   for months it has been written for, so a range reaching back past the day it shipped is short
   and knows it. Printing the short total silently is the failure this app keeps paying for; the
   banner names how many months are missing and points at the rebuild.

   Presentational ONLY — no Firestore, no maths. It lives in ponder/stages because the tutorial
   renders this exact component against a fixed demo world, and because the audit scans this
   folder for the `data-ponder` keys a scene focuses. */
import React from 'react';
import { TrendingUp, AlertTriangle } from 'lucide-react';

const n = (v) => Number(v || 0).toLocaleString('id-ID');
const rp = (v) => 'Rp ' + Number(v || 0).toLocaleString('id-ID');

export default function ProductPerformanceTable({ rows = [], missing = 0, months = 0, onRebuild }) {
    const total = rows.reduce((s, r) => s + (Number(r.qty) || 0), 0);
    const revenue = rows.reduce((s, r) => s + (Number(r.revenue) || 0), 0);

    return (
        <div>
            {missing > 0 && (
                <div data-ponder="gap" className="mx-5 mb-4 rounded-xl border border-danger-rail bg-danger-well px-4 py-3 flex items-start gap-3">
                    <AlertTriangle size={15} className="text-danger-text shrink-0 mt-0.5" />
                    <p className="text-[11px] font-bold text-ink leading-relaxed">
                        {missing} of {months} months in this range have no record yet, so the figures
                        below are incomplete.
                        {onRebuild && <> Rebuild them from the transactions in <span className="font-black">Settings</span>.</>}
                    </p>
                </div>
            )}

            {rows.length === 0 ? (
                <p data-ponder="empty" className="px-5 py-10 text-[11px] text-ink-muted uppercase tracking-widest text-center">
                    Nothing sold in this period.
                </p>
            ) : (
                <div className="overflow-x-auto">
                    <div className="min-w-[640px]">
                        <div data-ponder="col:head" className="grid grid-cols-[minmax(0,1fr)_120px_150px_88px] gap-x-4 px-5 pb-2.5 border-b border-line-2 text-[10px] font-bold text-ink-muted uppercase tracking-widest">
                            <span data-ponder="col:product">Product</span>
                            <span data-ponder="col:qty" className="text-right">Sold (Bks)</span>
                            <span data-ponder="col:revenue" className="text-right">Revenue</span>
                            <span data-ponder="col:share" className="text-right">Share</span>
                        </div>

                        {rows.map((r) => {
                            const share = total > 0 ? (r.qty / total) * 100 : 0;
                            return (
                                <div key={r.id} data-ponder={`row:${r.id}`} className="grid grid-cols-[minmax(0,1fr)_120px_150px_88px] gap-x-4 px-5 py-3 border-b border-line-2 last:border-b-0 items-center">
                                    <div className="min-w-0">
                                        <span className="block text-ink font-bold text-[13px] truncate">{r.name || r.id}</span>
                                        {/* The bar is share of what moved in this period. It carries no
                                            target, because nobody has set one. */}
                                        <div data-ponder="bar" className="h-1.5 mt-2 rounded-full bg-inset max-w-[300px] overflow-hidden">
                                            <div className="h-full bg-orange transition-[width] duration-500 ease-out" style={{ width: `${share}%` }} />
                                        </div>
                                    </div>
                                    <span data-ponder="col:qty" className="text-right font-mono font-black text-gold tabular-nums">{n(r.qty)}</span>
                                    <span data-ponder="col:revenue" className="text-right font-mono font-bold text-ink tabular-nums text-[13px]">{rp(r.revenue)}</span>
                                    <span data-ponder="col:share" className="text-right font-mono text-ink-muted tabular-nums text-[12px]">
                                        {share.toFixed(1).replace('.', ',')}%
                                    </span>
                                </div>
                            );
                        })}

                        <div data-ponder="row:total" className="grid grid-cols-[minmax(0,1fr)_120px_150px_88px] gap-x-4 px-5 py-3.5 border-t-2 border-line-3 bg-raised/40 items-center">
                            <span className="text-[10px] font-bold text-ink-muted uppercase tracking-widest flex items-center gap-2">
                                <TrendingUp size={13} className="text-accent-ink" /> Every product
                            </span>
                            <span className="text-right font-mono font-black text-gold tabular-nums">{n(total)}</span>
                            <span className="text-right font-mono font-black text-ink tabular-nums">{rp(revenue)}</span>
                            <span className="text-right text-ink-muted">100%</span>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
