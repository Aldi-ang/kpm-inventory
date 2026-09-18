import React from 'react';

/* 📱 THE ⋯ KEY (Customers round two, 2026-09-18, his board 2 = A; lifted out of CustomerManager
   on 2026-09-19 so the Journey Plan store card wears the same key - his "make sure that the ...
   button design ... could be use for button in another place so design it well"). On the phone a
   row or card hides its rarely-used buttons behind this 44 × 44 key; tapping it unfolds a strip
   under the row, tapping again (or anywhere else) folds it. Phone-only: the desk keeps the
   buttons inline. It stops the tap, because the row it sits on may open something. The glyph is
   in a span so index.css's `button:has(> svg:only-child)` never treats it as an icon button. */
const MoreKey = ({ id, label, open, onToggle, className = '' }) => (
    <button type="button" data-acts aria-label={`More actions for ${label}`} aria-expanded={open}
        onClick={(e) => { e.stopPropagation(); onToggle(id); }}
        className={`lg:hidden w-11 h-11 rounded-lg border bg-[var(--inset)] text-xl leading-none flex items-center justify-center transition-colors ${
            open ? 'border-[var(--accent-edge)] text-[var(--accent-ink)]' : 'border-[var(--line-2)] text-[var(--ink-dim)]'
        } ${className}`}>
        <span aria-hidden="true">⋯</span>
    </button>
);

export default MoreKey;
