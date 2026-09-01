import React from 'react';
import Lamp from './Lamp.jsx';

/* The regional warehouse desk's nav strip, in its own file for one reason: the Ponder scene that
   teaches this desk mounts THIS component, exactly as `ShipmentPlanStage` mounts the real
   `ShipmentPlanTable`. A tutorial drawn from a copy of the markup teaches the copy, and drifts the
   first time the real thing changes.

   🔴 `data-ponder` IS AN API, NOT DECORATION. A tutorial beat names one of these keys in its
   `focus` and the overlay lights every element wearing it. Rename or drop one and the beat
   silently points at nothing — the integration audit asserts the pair.

   Shaped after the Master Vault desk's own nav (`RestockVaultView`), because the two desks render
   on the same page one above the other and a second visual language there reads as a second
   product. */
export default function WarehouseDeskNav({ title, sub, tabs, active, onPick }) {
    return (
        <div data-ponder="desk:nav" className="flex items-stretch bg-panel border-b border-line-2 flex-wrap shrink-0">
            <div data-ponder="desk:where" className="flex items-center gap-2.5 px-4 py-2.5 border-r border-line-2 flex-1 min-w-[210px]">
                <Lamp tone="on" />
                <div className="min-w-0">
                    <div className="font-display font-bold uppercase tracking-[0.15em] text-[13px] text-ink truncate">{title}</div>
                    <div className="font-mono text-[10px] text-ink-muted truncate">{sub}</div>
                </div>
            </div>
            <div className="flex flex-wrap">
                {tabs.map(t => (
                    <button
                        key={t.id}
                        type="button"
                        data-ponder={`tab:${t.id}`}
                        onClick={() => onPick(t.id)}
                        aria-selected={active === t.id}
                        className={`text-[11px] font-display font-bold uppercase tracking-[0.16em] px-4 py-3 border-l border-line-2 border-b-2 transition-colors ${
                            active === t.id ? 'text-ink border-b-orange bg-raised' : 'text-ink-muted border-b-transparent hover:text-ink'
                        }`}
                    >
                        {t.label}<span className="ml-1.5 font-mono text-[10px] text-ink-muted">{t.count}</span>
                    </button>
                ))}
            </div>
        </div>
    );
}
