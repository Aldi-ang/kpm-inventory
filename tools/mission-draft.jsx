/* LAB ONLY - two drafts of the demo's mission step card, for the board he picks from (2026-10-24).
   Nothing here ships: the picked look moves into src/components/DemoFrontDoor.jsx (demo build only).
     ?shell&places&mission=a   A - a floating card in the corner
     ?shell&places&mission=b   B - one line inside the DEMO bar
   Both show step 2 live and step 1 already done, so the done state (a report, not a hint) is in every frame. */
import React from 'react';
import { DemoBar } from '../src/components/DemoFrontDoor.jsx';

const STEPS = [
    { n: 1, todo: 'Receive production into the Master Vault', done: '120 packs received in the Master Vault', who: 'Owner' },
    { n: 2, todo: 'Ship it to a regional warehouse', who: 'Owner' },
    { n: 3, todo: "Drag packs into Dika's backpack", who: 'Regional Admin' },
];
const NOW = 2;

const CSS = `
html.kpm-demo-on.mx-b { --kpm-safe-top: calc(env(safe-area-inset-top, 0px) + 37px + 34px); }
.mx { font-family: var(--font-mono); color: var(--ink); }
.mx .tag { flex: none; font: 700 10px/1 var(--font-mono); letter-spacing: .22em; color: var(--ink-dim); }
.mx .tag b { color: var(--accent-ink); }
.mx .tick { color: var(--accent-ink); font-weight: 700; }
/* B - a second line of the DEMO bar, under its tape */
.mx-b-line { position: fixed; top: calc(env(safe-area-inset-top, 0px) + 37px); left: 0; right: 0; z-index: 94; height: 34px; display: flex; align-items: center; gap: 12px;
  padding: 0 12px; background: var(--inset); border-bottom: 1px solid var(--line-3); }
.mx-b-line .now { min-width: 0; flex: 1; font: 600 14px/1.2 var(--font-mono); letter-spacing: .04em; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.mx-b-line .pips { flex: none; display: flex; gap: 4px; }
.mx-b-line .pips i { width: 14px; height: 4px; border: 1px solid var(--line-3); }
.mx-b-line .pips i.done { border-color: var(--accent-edge); background: var(--accent-edge); }
.mx-b-line .pips i.on { border-color: var(--accent-edge); }
.mx-b-line ol { display: none; }
@media (min-width: 1024px) {
  .mx-b-line .now, .mx-b-line .pips { display: none; }
  .mx-b-line ol { display: flex; flex: 1; min-width: 0; gap: 0; margin: 0; padding: 0; list-style: none; }
  .mx-b-line li { display: flex; align-items: center; gap: 8px; padding: 0 16px; height: 34px; font: 600 14px/1 var(--font-mono); letter-spacing: .02em; color: var(--ink-dim);
    border-left: 1px solid var(--line-3); white-space: nowrap; }
  .mx-b-line li.on { color: var(--ink); box-shadow: inset 0 -2px 0 var(--accent-edge); }
  .mx-b-line li .n { font-weight: 700; }
  .mx-b-line li.on .n { color: var(--accent-ink); }
  .mx-b-line li em { font-style: normal; color: var(--ink-dim); font-weight: 500; }
}
/* A - a card in the bottom-left corner (the capybara owns bottom-right) */
.mx-a { position: fixed; left: 12px; bottom: calc(env(safe-area-inset-bottom, 0px) + 48px); z-index: 94; width: min(320px, calc(100vw - 120px));
  background: var(--panel); border: 1px solid var(--line-3); border-left: 3px solid var(--accent-edge); }
.mx-a .head { display: flex; align-items: center; justify-content: space-between; padding: 10px 12px 6px; }
.mx-a .row { display: flex; gap: 10px; padding: 8px 12px; border-top: 1px solid var(--line); font: 600 14px/1.3 var(--font-mono); letter-spacing: .02em; color: var(--ink-dim); }
.mx-a .row .n { flex: none; width: 16px; font-weight: 700; }
.mx-a .row.on { color: var(--ink); }
.mx-a .row.on .n { color: var(--accent-ink); }
.mx-a .row em { display: block; font: 500 12px/1.3 var(--font-body); font-style: normal; color: var(--ink-dim); margin-top: 2px; }
@media (max-width: 1023px) { .mx-a .row:not(.on) { display: none; } }
`;

const label = (s) => (s.n < NOW ? s.done : s.todo);

export default function MissionDraft({ look }) {
    React.useEffect(() => {
        document.documentElement.classList.toggle('mx-b', look === 'b');
    }, [look]);
    return (
        <>
            <style>{CSS}</style>
            <DemoBar user={{ email: 'demo.owner@example.com' }} />
            {look === 'b' ? (
                <div className="mx mx-b-line hide-on-print">
                    <span className="tag">MISSION <b>{NOW}/3</b></span>
                    <span className="now">{STEPS[NOW - 1].todo}</span>
                    <span className="pips" aria-hidden="true">{STEPS.map((s) => <i key={s.n} className={s.n < NOW ? 'done' : s.n === NOW ? 'on' : ''} />)}</span>
                    <ol>
                        {STEPS.map((s) => (
                            <li key={s.n} className={s.n === NOW ? 'on' : ''}>
                                {s.n < NOW ? <span className="tick">✓</span> : <span className="n">{s.n}</span>}
                                {label(s)}
                                {s.n > NOW && s.who !== STEPS[NOW - 1].who && <em>· as {s.who}</em>}
                            </li>
                        ))}
                    </ol>
                </div>
            ) : (
                <div className="mx mx-a hide-on-print">
                    <div className="head"><span className="tag">MISSION <b>{NOW}/3</b></span><span className="tag">FIRST DELIVERY</span></div>
                    {STEPS.map((s) => (
                        <div key={s.n} className={`row${s.n === NOW ? ' on' : ''}`}>
                            {s.n < NOW ? <span className="n tick">✓</span> : <span className="n">{s.n}</span>}
                            <span>{label(s)}{s.n > NOW && s.who !== STEPS[NOW - 1].who && <em>as {s.who} - press SWITCH</em>}</span>
                        </div>
                    ))}
                </div>
            )}
        </>
    );
}
