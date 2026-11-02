import React from 'react';
import { HAZARD_SIGN } from '../utils/vanBay';

/* The quarantine crate's sign, worn by a damaged pack turned promo (Stock Opname "Convert to Sample"). His 2026-11-02 "make
   sure that the converted product have the same 3D design of that type but of course with biohazard symbol somewhere on
   the cards or product icon". The caller places it (absolute, in a relative box) and sizes it. */
export default function HazardMark({ className = '' }) {
    return (
        <span role="img" aria-label="Damaged pack" title="Damaged pack, from quarantine"
            className={`pointer-events-none absolute grid place-items-center rounded-[22%] bg-[#f2c200] border border-[#141414] ${className}`}>
            <svg viewBox="0 0 15 15" shapeRendering="crispEdges" className="w-[74%] h-[74%]" aria-hidden="true">
                {HAZARD_SIGN.map(([x, y]) => <rect key={x + '-' + y} x={x} y={y} width="1.02" height="1.02" fill="#141414" />)}
            </svg>
        </span>
    );
}
