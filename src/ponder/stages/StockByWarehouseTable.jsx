/* The Stock by Warehouse table, with the maths taken out of it.

   Presentational ONLY — no Firestore, no useMemo, no supply maths. It renders whatever rows it is
   handed. `BranchWarehouseManager` hands it the real `logistics`; the Ponder stage hands it
   `DEMO_WAREHOUSES`. Same component in both places, so a tutorial cannot drift from the screen it
   is teaching. That is the whole reason this file exists, and it is why the extraction had to
   happen before the first real scene.

   🔴 `data-ponder` IS AN API, NOT DECORATION. A scene step names one of these keys in its `focus`
   and the overlay lights every element wearing it. Rename or drop one and the tutorial keeps
   playing while pointing at nothing — a failure that still looks like it works. Audit group 56
   fails if a scene names a key this file no longer emits. */
import React from 'react';
import { MapPin, ChevronDown } from 'lucide-react';
import { MASTER } from '../../utils/supply.js';

/* One more track added 2026-08-30 for `Minimal kirim`. The Ponder tutorial renders this same
   component against a fixed demo world that carries no `minimum`, which is why every cell below
   falls back to an em-dash rather than assuming the field exists — a tutorial that crashes on a
   new column would be a worse bug than the column is a feature. */
const COLS = 'grid grid-cols-[minmax(0,1fr)_100px_104px_124px_96px_108px_104px_112px] gap-x-4 items-center';

const n = (v) => Number(v || 0).toLocaleString('id-ID');

export default function StockByWarehouseTable({ rows = [], openGudang, onToggle, totals = {} }) {
  return (
    <div className="overflow-x-auto">
      <div className="min-w-[1010px]">

        <div className={`${COLS} px-5 pb-2.5 border-b border-line-2 text-[10px] font-bold text-ink-muted uppercase tracking-widest`}>
          {/* Renamed 2026-08-27 on his instruction: *"dont make vague terms"*, and
              *"use english terms if its shorter and direct"*.
                Di jalan       → Shipping        (his: "shipping in progress")
                Di tangan agen → Agent inventory (his words exactly)
                Sisa hari      → Est. days left  — "Est." is load-bearing. It is a
                  projection off one week of sales, and a bare "Days left" reads
                  as a fact the system measured. */}
          <span data-ponder="col:warehouse">Warehouse</span>
          <span data-ponder="col:shelf" className="text-right">In stock</span>
          <span data-ponder="col:transit" className="text-right">Shipping</span>
          <span data-ponder="col:field" className="text-right">Agent inventory</span>
          <span data-ponder="col:sold" className="text-right">Sold (7d)</span>
          <span data-ponder="col:permonth" className="text-right">Avg / month</span>
          <span data-ponder="col:daysleft" className="text-right">Est. days left</span>
          {/* HIS WORD, and it is a floor not advice: when production is short this is the line
              under which a cabang stops selling. `Saran` would invite sending less. */}
          <span data-ponder="col:minimum" className="text-right">Minimal kirim</span>
        </div>

        {rows.map(r => {
          const here = r.shelf + (r.transit || 0) + r.field;
          const pct = (v) => here > 0 ? `${(v / here) * 100}%` : '0%';
          /* under a week of cover is the point HQ has to act, because a
             delivery does not arrive the same day it is decided */
          const open = openGudang === r.name;
          return (
            /* The key is built INLINE rather than through a `rowKey` variable, and that is not a
               style choice — the audit reads this file as text. A prefix hidden behind a variable
               cannot be tied to the `row:` keys the scenes ask for, so the check that stops scenes
               rotting would have had to be loosened to accept it. Loosening a guard to fit the
               code is how the guard stops catching anything. */
            <div key={r.name} data-ponder={`row:${r.name === MASTER ? 'master' : r.name.toLowerCase()}`} className="border-b border-line-2 last:border-b-0">

              <div className={`${COLS} px-5 transition-colors duration-200 ${open ? 'bg-raised py-3 pb-4' : 'py-3 hover:bg-raised/50'}`}>
                <div className="min-w-0" data-ponder="col:warehouse">
                  <button
                    onClick={() => onToggle(open ? null : r.name)}
                    aria-expanded={open}
                    className="flex items-center gap-2 group text-left w-full"
                  >
                    <MapPin size={13} className={`shrink-0 ${r.name === MASTER ? 'text-gold' : 'text-orange'}`}/>
                    <span className="font-black uppercase tracking-wider text-ink text-[13px] truncate group-hover:text-accent-ink transition-colors">
                      {r.name === MASTER ? 'Master Vault' : r.name}
                    </span>
                    <ChevronDown size={13} className={`text-ink-muted shrink-0 transition-transform duration-300 ${open ? 'rotate-180' : ''}`}/>
                  </button>
                  <div data-ponder="bar" className="flex h-1.5 mt-2 rounded-full overflow-hidden bg-inset max-w-[280px]" title="in stock · shipping · agent inventory">
                    <div className="bg-gold transition-[width] duration-500 ease-out" style={{ width: pct(r.shelf) }}/>
                    <div className="bg-orange transition-[width] duration-500 ease-out" style={{ width: pct(r.transit || 0) }}/>
                    <div className="bg-line-3 transition-[width] duration-500 ease-out" style={{ width: pct(r.field) }}/>
                  </div>
                </div>
                <span data-ponder="col:shelf" className="text-right font-mono font-black text-gold tabular-nums">{n(r.shelf)}</span>
                <span data-ponder="col:transit" className="text-right font-mono font-bold tabular-nums">{r.transit === null ? <span className="text-ink-muted">—</span> : <span className="text-orange">{n(r.transit)}</span>}</span>
                <span data-ponder="col:field" className="text-right font-mono font-bold text-ink tabular-nums">{n(r.field)}</span>
                <span data-ponder="col:sold" className="text-right font-mono font-bold text-ink tabular-nums">{n(r.sold)}</span>
                <span data-ponder="col:permonth" className="text-right font-mono font-bold text-ink-muted tabular-nums">{r.perMonth > 0 ? `≈${n(r.perMonth)}` : '—'}</span>
                {/* NOT a dash. `—` already means "no sales, so no rate" on the
                    item rows, and reusing it here would say the warehouse has
                    no rate when the truth is that the question has no
                    warehouse-level answer. It names where the number lives. */}
                <span data-ponder="col:daysleft" className="text-right font-mono text-[11px] text-ink-muted" title="Each product runs out at its own speed — open this warehouse to see them">
                  {open ? 'below ↓' : 'per item'}
                </span>
                <span data-ponder="col:minimum" className="text-right font-mono font-black tabular-nums" title="The least this warehouse can be sent without running dry before the next delivery">
                  {r.minimum == null
                    ? <span className="text-ink-muted" title="No measurable history here yet — two deliveries of a product are needed before it can be worked out">—</span>
                    : <span className={r.minimum > 0 ? 'text-orange' : 'text-ink-muted'}>{n(r.minimum)}</span>}
                </span>
              </div>

              {/* 0fr → 1fr is the whole animation. `height: auto` cannot be
                  transitioned; a grid track can, and it measures itself. */}
              <div
                className="grid transition-[grid-template-rows] duration-300 ease-out"
                style={{ gridTemplateRows: open ? '1fr' : '0fr' }}
              >
                <div className="overflow-hidden">
                  {/* SPACE, not another rule, is what separates a warehouse
                      from its products. His note: *"there should be personal
                      space between the location line and the product lines
                      ... psychology of the expensive wears store shelf"*.
                      A hairline here stacked the two levels into one wall of
                      rows; the border is gone and the padding does the work.
                      The tone change (bg-inset) already says "nested" — a
                      line on top of that was saying it twice. */}
                  <div data-ponder={`drawer:${r.name === MASTER ? 'master' : r.name.toLowerCase()}`} className="bg-inset py-5">
                    {r.detail.length === 0 ? (
                      <p className="px-5 py-2 text-[11px] text-ink-muted uppercase tracking-widest text-center">
                        No stock recorded at {r.name === MASTER ? 'Master Vault' : r.name}
                      </p>
                    ) : r.detail.map((p, i) => (
                      <div key={p.id} data-ponder={`item:${p.id}`} className={`${COLS} px-5 py-3.5 ${i > 0 ? 'border-t border-line-2/30' : ''}`}>
                        <div className="min-w-0 pl-6">
                          <span className="text-ink font-bold text-[13px] block leading-tight truncate">{p.name}</span>
                          {(p.days !== null || p.unexplained > 0) && (
                            <span className="text-[10px] text-ink-muted uppercase tracking-widest">
                              {p.days !== null && <>oldest here <b className="text-ink">{p.days} days</b>{p.drops > 1 && ` · ${p.drops} deliveries`}</>}
                              {p.unexplained > 0 && <span className="text-danger-text">{p.days !== null ? ' · ' : ''}{n(p.unexplained)} unknown origin</span>}
                            </span>
                          )}
                        </div>
                        <span data-ponder="col:shelf" className="text-right font-mono text-gold tabular-nums text-[13px]">{n(p.shelf)}</span>
                        <span data-ponder="col:transit" className="text-right font-mono tabular-nums text-[13px]">{r.transit === null ? <span className="text-ink-muted">—</span> : <span className="text-orange">{n(p.transit)}</span>}</span>
                        <span data-ponder="col:field" className="text-right font-mono text-ink tabular-nums text-[13px]">{n(p.field)}</span>
                        <span data-ponder="col:sold" className="text-right font-mono text-ink tabular-nums text-[13px]">{n(p.sold)}</span>
                        <span data-ponder="col:permonth" className="text-right font-mono text-ink-muted tabular-nums text-[13px]">{p.perMonth > 0 ? `≈${n(p.perMonth)}` : '—'}</span>
                        <span data-ponder="col:daysleft" className="text-right font-mono font-bold tabular-nums text-[13px]">
                          {p.daysLeft === null
                            ? <span className="text-ink-muted" title="Nothing sold in the last 7 days — no rate to divide by">—</span>
                            : <span className={p.daysLeft < 7 ? 'text-danger-text' : 'text-ink'}>{n(p.daysLeft)}</span>}
                        </span>
                        <span data-ponder="col:minimum" className="text-right font-mono font-bold tabular-nums text-[13px]">
                          {p.minimum == null
                            ? <span className="text-ink-muted">—</span>
                            : <span className={p.minimum > 0 ? 'text-orange' : 'text-ink-muted'}>{n(p.minimum)}</span>}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        <div data-ponder="row:total" className={`${COLS} px-5 py-3.5 border-t-2 border-line-3 bg-raised/40`}>
          <span className="text-[10px] font-bold text-ink-muted uppercase tracking-widest">Company total</span>
          <span data-ponder="col:shelf" className="text-right font-mono font-black text-gold tabular-nums">{n(totals.shelf)}</span>
          <span data-ponder="col:transit" className="text-right font-mono font-black text-orange tabular-nums">{n(totals.transit)}</span>
          <span data-ponder="col:field" className="text-right font-mono font-black text-ink tabular-nums">{n(totals.field)}</span>
          <span data-ponder="col:sold" className="text-right font-mono font-black text-ink tabular-nums">{n(totals.sold)}</span>
          <span data-ponder="col:permonth" className="text-right font-mono font-black text-ink-muted tabular-nums">≈{n(totals.perMonth)}</span>
          {/* no company-wide "days left": stock in the wrong warehouse does not
              cover a shortage in another one, so averaging them would invent a
              number that is comfortable and false. */}
          <span data-ponder="col:daysleft" className="text-right text-ink-muted">—</span>
          {/* This one DOES total, and the contrast with the dash beside it is the point: packs add
              up across warehouses, rates do not. It is what a short production run has to cover. */}
          <span data-ponder="col:minimum" className="text-right font-mono font-black text-orange tabular-nums">{totals.minimum == null ? '—' : n(totals.minimum)}</span>
        </div>
      </div>
    </div>
  );
}
