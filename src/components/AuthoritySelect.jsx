import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Check } from 'lucide-react';

/* ── THE AUTHORITY PICKER ──────────────────────────────────────────────────────────────────────
 *
 * His ask, 2026-08-15: *"redesign and animate the dropdown for this"* — the two authority
 * dropdowns in the permission matrix.
 *
 * ⚠️ WHY THIS IS A COMPONENT AND NOT CSS. A native `<select>` cannot be styled or animated past
 * its CLOSED box: the open list is drawn by the operating system, outside the page entirely. No
 * amount of CSS reaches it. Matching the control system therefore means drawing the list
 * ourselves, and once you draw it yourself you owe every behaviour the native one gave away for
 * free — which is what the rest of this file is.
 *
 * ⚠️ IT LIVES ON THE SCREEN THAT DECIDES WHO MAY EDIT WHAT. A picker that a keyboard cannot reach,
 * or that tells a screen reader the wrong choice, is a security bug on this panel and a cosmetic
 * one anywhere else. So: focus never leaves the trigger, `aria-activedescendant` names the row the
 * arrow keys are on, `aria-selected` names the row that is actually SAVED, and the two cannot
 * disagree because both are computed from the same `value` prop. Group 37 holds that line.
 *
 * ⚠️ THE LIST IS PORTALLED TO <body> AND POSITIONED `fixed`, AND THAT IS LOAD-BEARING. The desktop
 * matrix sits inside `overflow-x: auto`. An absolutely-positioned popup inside that box would be
 * CLIPPED at the box's edge and would scroll away from its own trigger. Portalling escapes the
 * clip; `fixed` + a measured rect keeps it pinned. The price is that it must close on any scroll
 * or resize, because a fixed box cannot follow a trigger that moved — see the effect below.
 */

// the trigger and its list must reference each other by id, and there can be dozens of pickers on
// one screen. A module counter is enough and does not depend on the React version.
let pickSeq = 0;

const LIST_MIN_W = 210;   // the trigger ellipsises inside a rank column; the LIST is where the
                          // full wording is read, so it is never narrower than this
const ROW_H = 40;
const LIST_MAX_H = 300;
const TYPE_AHEAD_MS = 600;

export default function AuthoritySelect({ value, options, onChange, label }) {
    const [open, setOpen] = useState(false);
    const [active, setActive] = useState(0);
    const [box, setBox] = useState(null);
    const btnRef = useRef(null);
    const listRef = useRef(null);
    const typed = useRef({ str: '', at: 0 });
    const idRef = useRef(null);
    if (idRef.current === null) idRef.current = `kpm-pick-${++pickSeq}`;
    const id = idRef.current;

    // ⚠️ THE SELECTED ROW IS DERIVED FROM `value`, NEVER STORED. A local copy is how a picker ends
    // up showing one permission while the matrix holds another.
    const selected = Math.max(0, options.findIndex(o => o.value === value));
    const current = options[selected] || { short: '—', label: '—' };

    const place = () => {
        const el = btnRef.current;
        if (!el) return;
        const r = el.getBoundingClientRect();
        const want = Math.min(options.length * ROW_H + 2, LIST_MAX_H);
        const below = window.innerHeight - r.bottom - 8;
        // flip up only if below genuinely cannot hold it AND above is roomier — a list that flips
        // for a few pixels feels broken, because the same control opens two different ways
        const up = below < want && r.top - 8 > below;
        const width = Math.min(Math.max(r.width, LIST_MIN_W), window.innerWidth - 16);
        const left = Math.max(8, Math.min(r.left, window.innerWidth - width - 8));
        setBox(up
            ? { left, width, bottom: window.innerHeight - r.top + 4, up: true }
            : { left, width, top: r.bottom + 4, up: false });
    };

    const openList = () => { place(); setActive(selected); setOpen(true); };
    const close = (refocus) => { setOpen(false); if (refocus) btnRef.current?.focus(); };
    const commit = (i) => {
        const o = options[i];
        if (o && o.value !== value) onChange(o.value);
        close(true);
    };

    useEffect(() => {
        if (!open) return;
        /* ⚠️ THE `e.target` GUARD IS NOT OPTIONAL. This listener is in the CAPTURE phase so it also
           sees the matrix's own horizontal scroller — and scrolling the LIST itself (which the
           keyboard does, below) would otherwise close the list on its first arrow press. */
        const shut = (e) => { if (e && listRef.current?.contains(e.target)) return; close(false); };
        const onDown = (e) => {
            if (btnRef.current?.contains(e.target) || listRef.current?.contains(e.target)) return;
            close(false);
        };
        window.addEventListener('scroll', shut, true);
        window.addEventListener('resize', shut);
        document.addEventListener('pointerdown', onDown, true);
        return () => {
            window.removeEventListener('scroll', shut, true);
            window.removeEventListener('resize', shut);
            document.removeEventListener('pointerdown', onDown, true);
        };
    }, [open]);

    // keeps the arrow-key cursor on screen in a list taller than its box
    useEffect(() => {
        if (open) listRef.current?.children[active]?.scrollIntoView({ block: 'nearest' });
    }, [open, active]);

    // jumps to the first option starting with what was typed, exactly as a native select does —
    // repeating one letter cycles, a longer run re-searches from where it is
    const typeAhead = (ch) => {
        const now = Date.now();
        const t = typed.current;
        t.str = (now - t.at < TYPE_AHEAD_MS ? t.str : '') + ch.toLowerCase();
        t.at = now;
        const from = open ? active : selected;
        const start = t.str.length > 1 ? from : from + 1;
        for (let s = 0; s < options.length; s++) {
            const i = (start + s) % options.length;
            if (options[i].label.toLowerCase().startsWith(t.str)) {
                if (open) setActive(i);
                else if (options[i].value !== value) onChange(options[i].value);
                return;
            }
        }
    };

    const onKeyDown = (e) => {
        const k = e.key;
        const isSpace = k === ' ' || k === 'Spacebar';
        if (!open) {
            if (k === 'ArrowDown' || k === 'ArrowUp' || k === 'Enter' || isSpace) {
                e.preventDefault(); openList(); return;
            }
        } else {
            if (k === 'Escape')  { e.preventDefault(); close(true); return; }
            if (k === 'Enter' || isSpace) { e.preventDefault(); commit(active); return; }
            if (k === 'Tab')     { close(false); return; }   // let focus move on; do not commit
            if (k === 'ArrowDown') { e.preventDefault(); setActive(i => Math.min(options.length - 1, i + 1)); return; }
            if (k === 'ArrowUp')   { e.preventDefault(); setActive(i => Math.max(0, i - 1)); return; }
            if (k === 'Home')      { e.preventDefault(); setActive(0); return; }
            if (k === 'End')       { e.preventDefault(); setActive(options.length - 1); return; }
        }
        if (k.length === 1 && !e.metaKey && !e.ctrlKey && !e.altKey) typeAhead(k);
    };

    return (
        <>
            {/* role="combobox" with the focus STAYING here is the select-only pattern: one focus
                stop, arrows move a cursor that `aria-activedescendant` announces. Moving real focus
                into the list instead is what makes custom pickers trap a keyboard. */}
            <button
                ref={btnRef} type="button" id={id} className="kpm-inline kpm-pick"
                role="combobox" aria-haspopup="listbox" aria-expanded={open}
                aria-controls={open ? `${id}-list` : undefined}
                aria-activedescendant={open ? `${id}-opt-${active}` : undefined}
                aria-label={`${label}: ${current.label}`}
                onClick={() => (open ? close(true) : openList())}
                onKeyDown={onKeyDown}
            >
                <span className="lbl">{current.short || current.label}</span>
                <ChevronDown size={12} className="chev" aria-hidden="true" />
            </button>

            {open && box && createPortal(
                <ul
                    ref={listRef} id={`${id}-list`} role="listbox" aria-label={label}
                    className={`kpm-picklist${box.up ? ' up' : ''}`}
                    style={{ left: box.left, width: box.width, top: box.top, bottom: box.bottom }}
                >
                    {options.map((o, i) => (
                        /* the tick is the state WITHOUT colour — the amber fill says the same thing
                           to an eye that has it, and neither is load-bearing alone */
                        <li
                            key={o.value} id={`${id}-opt-${i}`} role="option"
                            aria-selected={o.value === value}
                            className={i === active ? 'at' : undefined}
                            onPointerDown={(e) => e.preventDefault()}
                            onPointerEnter={() => setActive(i)}
                            onClick={() => commit(i)}
                        >
                            <Check size={12} aria-hidden="true" />
                            <span>{o.label}</span>
                        </li>
                    ))}
                </ul>,
                document.body
            )}
        </>
    );
}
