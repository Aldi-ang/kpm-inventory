/* 🔴 DISPOSABLE. This is slice 1's stand-in world, and it is deleted in slice 2.

   Slice 2 extracts the real table into `StockByWarehouseTable({ rows, ... })` and renders THAT
   here with a fixed demo dataset, so the tutorial and the screen it teaches can never drift.
   Until then this schematic exists to prove one thing only: that a scene's `focus` key resolves
   against a real `data-ponder` attribute and lights the right cells.

   The numbers are chosen to carry the last beat: Master Vault looks comfortable at warehouse
   level while one product inside it is nearly out — the exact trap the drawer exists to expose. */
import React from 'react';

const COLS = [
  { key: 'col:shelf',    label: 'In stock' },
  { key: 'col:transit',  label: 'Shipping' },
  { key: 'col:field',    label: 'Agent inventory' },
  { key: 'col:permonth', label: 'Avg / month' },
  { key: 'col:daysleft', label: 'Est. days left' },
];

const ROWS = [
  { key: 'row:master',  name: 'Master Vault', cells: ['1.240', '—', '180', '≈ 240', '36'] },
  { key: 'row:bandung', name: 'Bandung',      cells: ['0', '400', '0', '≈ 0', '—'] },
  { key: 'row:solo',    name: 'Solo',         cells: ['96', '0', '40', '≈ 210', '4'], hot: 4 },
];

const GRID = 'grid grid-cols-[minmax(110px,1fr)_repeat(5,minmax(84px,1fr))] gap-x-3 items-center';

export default function PlaceholderStage() {
  return (
    <div className="overflow-x-auto">
      <div className="min-w-[620px] px-5 py-5">

        <div className={`${GRID} pb-2.5 border-b border-line-2 text-[10px] font-bold text-ink-muted uppercase tracking-widest`}>
          <span>Warehouse</span>
          {COLS.map(c => <span key={c.key} data-ponder={c.key} className="text-right">{c.label}</span>)}
        </div>

        {ROWS.map(r => (
          <div key={r.key} data-ponder={r.key} className={`${GRID} py-3 border-b border-line last:border-0`}>
            <span className="font-display text-sm font-black text-ink uppercase tracking-wider truncate">{r.name}</span>
            {r.cells.map((v, i) => (
              <span key={COLS[i].key} data-ponder={COLS[i].key}
                    className={`text-right font-mono text-sm tabular-nums ${r.hot === i ? 'text-danger-ink font-bold' : 'text-ink'}`}>
                {v}
              </span>
            ))}
          </div>
        ))}

      </div>
    </div>
  );
}
