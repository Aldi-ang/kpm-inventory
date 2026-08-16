import React, { useRef, useState } from 'react';
import { Wallet, Send, Package, Tag } from 'lucide-react';
import { CARD_IDS, CARD_LABELS } from '../utils/eodRecord';

/* THE FOUR CARDS THE AGENT COUNTS, AS A DECK.

   Aldi's spec, 2026-08-16: *"i want an swapping kind of animation for each card after the agent
   confirm it, for example, cash card confirm - swap to transfer card , confirm - swap to goods
   return card, confirm-swap to pita cukai card"*.

   ⚠️ THE AGENT TYPES WHAT THEY COUNTED. The old screen showed the calculated figure and asked the
   agent to press submit — which is why nothing on it could ever be right or wrong, and why there
   was nothing to score. Here the expected number is deliberately NOT shown until the count is
   entered: reading it first turns counting into copying.

   ⚠️ ONE INPUT PER PRODUCT LINE, NOT ONE INPUT PER CARD. Aldi, 2026-08-17, after seeing the first
   build: *"what if there are a lot of item types at once missing item on onetype wont make a good
   record to the data"*. He is right and it was a flaw, not a polish item: a shortfall of one Cello
   Green is invisible inside a single goods total, so a one-number card throws away — at the point
   of entry — the exact property the whole record shape exists for. A card given `lines` counts
   every line separately and each line becomes its own source row.
   ⚠️ A BLANK IS NOT A ZERO. Confirm stays disabled until every line carries a number, because
   "there are none left" and "I did not count this" must not collapse into the same record.

   ⚠️ MOTION IS CSS TRANSITIONS ON PERSISTENT NODES, never a JS animation. Two reasons, both his:
   Lite Mode can only switch off CSS (`html.lite-mode *`), so a JS spring would run straight
   through the setting that exists for cheap phones; and a card that is destroyed and recreated has
   no "before" value to animate from — the reason an earlier prototype's motion was invisible.
   React keeps these nodes alive across renders because they are keyed, so `transform` transitions
   have something to move from.

   ⚠️ THE CONFIRMED CARD FLIES INTO THE LETTER, it does not slide off the side. Aldi, 2026-08-17:
   *"what i want is each card animations going inside 1 same letter"*. `mouthRef` is the letter's
   mouth, which is on screen the whole time; the offset is MEASURED at confirm time rather than
   hard-coded, so the flight still lands when the phone is a different width. */

const ICONS = { cash: Wallet, transfer: Send, goods: Package, cukai: Tag };

const HINTS = {
  cash:     'Count every note and coin in the envelope.',
  transfer: 'Confirm the payments that actually landed in the account.',
  goods:    'Count each product going back to the warehouse.',
  cukai:    'Split the stamps: handed over, and lost.'
};

const toNum = (v) => Number(String(v).replace(/[^0-9-]/g, '')) || 0;

/* `details` is a node per card — extra context the agent needs in order to count at all.
   `notes` is a function per card, called with the current line values, for anything that must
   react to what is being typed (the pita cukai fine is the only one today). */
export default function EODCardDeck({
  expected = {},
  lines = {},
  details = {},
  notes = {},
  mouthRef,
  onConfirm,
  disabled = false
}) {
  const [step, setStep] = useState(0);
  const [entry, setEntry] = useState('');     // single-value cards
  const [rows, setRows] = useState({});       // per-line cards, keyed by line key
  const [flown, setFlown] = useState({});     // card id -> the measured flight to the letter
  const activeRef = useRef(null);

  const active = CARD_IDS[step];
  const finished = step >= CARD_IDS.length;
  const activeLines = lines[active];

  const filled = activeLines ? activeLines.filter(l => rows[l.key] !== undefined && rows[l.key] !== '').length : 0;
  const ready = activeLines
    ? (activeLines.length === 0 || filled === activeLines.length)   // an empty vehicle is countable
    : entry !== '';

  /* Measure the trip from the card that is about to leave to the letter it is going into.
     Taken BEFORE the state change, while the card is still at rest — the numbers are meaningless
     once it has started moving. `getBoundingClientRect` already accounts for the letter's own
     scale, so this stays right while the letter is small. */
  const measure = () => {
    const card = activeRef.current;
    const mouth = mouthRef?.current;
    if (!card || !mouth) return null;
    const c = card.getBoundingClientRect();
    const m = mouth.getBoundingClientRect();
    return {
      x: (m.left + m.width / 2) - (c.left + c.width / 2),
      y: (m.top + m.height / 2) - (c.top + c.height / 2)
    };
  };

  const commit = () => {
    if (disabled || finished || !ready) return;

    /* Per-line cards hand back the real rows. This is the traceability: a gap on the goods card
       leads back to "Cello Green", not to "goods". */
    const src = activeLines
      ? activeLines.map(l => ({
          txId: `${active}:${l.key}`,
          label: l.name,
          amount: toNum(rows[l.key]),
          expected: Number(l.expected) || 0
        }))
      : null;
    const counted = src ? src.reduce((s, r) => s + r.amount, 0) : toNum(entry);

    setFlown(prev => ({ ...prev, [active]: measure() }));
    setEntry('');
    setRows({});
    setStep(s => s + 1);
    if (onConfirm) onConfirm(active, counted, Number(expected[active] ?? 0), src);
  };

  return (
    <div className="w-full">
      {/* ⚠️ NO `overflow-hidden` ANYWHERE ON THIS PATH. The confirmed card leaves the deck upwards,
          into the letter; a clipping ancestor deletes the only animation on the screen. */}
      <div className="relative h-[344px]" style={{ perspective: '1200px' }}>
        {CARD_IDS.map((id, i) => {
          const Icon = ICONS[id];
          const offset = i - step;               // 0 = on top, >0 = still behind, <0 = gone
          const gone = offset < 0;
          const flight = flown[id];
          const cardLines = lines[id];

          /* ⚠️ EVERY CARD IS ALWAYS RENDERED — position is what changes, never existence.
             Unmounting the confirmed card would delete the thing that is supposed to be seen
             flying into the letter, which is the whole animation. */
          const style = {
            transform: gone
              ? (flight
                  ? `translate(${flight.x}px, ${flight.y}px) rotate(-15deg) scale(.12)`
                  : 'translateY(-90px) rotate(-15deg) scale(.4)')
              : `translateY(${Math.min(offset, 3) * 11}px) scale(${1 - Math.min(offset, 3) * 0.035})`,
            opacity: gone ? 0 : offset > 3 ? 0 : 1,
            zIndex: gone ? 40 : CARD_IDS.length - offset,
            pointerEvents: offset === 0 ? 'auto' : 'none',
            transitionProperty: 'transform, opacity',
            transitionDuration: gone ? '760ms' : '500ms',
            transitionTimingFunction: gone ? 'cubic-bezier(.5,0,.25,1)' : 'ease-out'
          };

          return (
            <div
              key={id}
              ref={offset === 0 ? activeRef : null}
              aria-hidden={offset !== 0}
              className="absolute inset-x-0 top-0 rounded-2xl border p-5 bg-[var(--raised)] border-[var(--line-3)] shadow-lg"
              style={style}
            >
              <div className="flex items-center gap-3 mb-3">
                <span className="p-2.5 rounded-xl bg-[var(--inset)] text-[var(--accent-ink)]">
                  <Icon size={20} />
                </span>
                <div className="min-w-0">
                  <p className="text-[11px] font-bold uppercase tracking-[.2em] text-[var(--ink-dim)]">
                    Card {i + 1} of {CARD_IDS.length}
                  </p>
                  <h4 className="text-lg font-black text-[var(--ink)] leading-tight truncate">{CARD_LABELS[id]}</h4>
                </div>
              </div>

              <p className="text-[13px] text-[var(--ink-dim)] mb-3">{HINTS[id]}</p>

              {cardLines ? (
                /* ── one input per line ─────────────────────────────────────── */
                <>
                  {cardLines.length === 0 ? (
                    <p className="rounded-lg border border-dashed border-[var(--line-3)] bg-[var(--inset)] px-3 py-6 text-center text-[11px] uppercase tracking-[.18em] text-[var(--ink-dim)]">
                      Nothing to count
                    </p>
                  ) : (
                    <div className="max-h-[152px] overflow-y-auto rounded-lg border bg-[var(--inset)] border-[var(--line)] p-1.5">
                      {cardLines.map((l, n) => {
                        const val = rows[l.key] ?? '';
                        return (
                          <label
                            key={l.key}
                            className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-[var(--raised)]"
                          >
                            <span className="flex-1 min-w-0">
                              <span className="block text-[13px] font-bold text-[var(--ink)] truncate leading-tight">{l.name}</span>
                              {l.hint && (
                                <span className="block text-[11px] text-[var(--ink-dim)] leading-tight">{l.hint}</span>
                              )}
                            </span>
                            <input
                              type="text"
                              inputMode="numeric"
                              value={offset === 0 ? val : ''}
                              onChange={e => setRows(p => ({ ...p, [l.key]: e.target.value }))}
                              onKeyDown={e => {
                                if (e.key !== 'Enter') return;
                                const next = e.currentTarget.closest('label')?.nextElementSibling?.querySelector('input');
                                if (next) next.focus(); else commit();
                              }}
                              placeholder="–"
                              disabled={offset !== 0 || disabled}
                              aria-label={`${l.name}, counted`}
                              className={`w-[74px] shrink-0 rounded-lg border-2 px-2 py-1.5 text-right text-[15px] font-black font-mono tabular-nums bg-[var(--raised)] text-[var(--ink)] outline-none focus:border-[var(--accent-edge)] ${
                                val === '' ? 'border-[var(--line)]' : 'border-[var(--accent-edge)]'
                              }`}
                            />
                            <span className="w-8 shrink-0 text-[11px] font-bold uppercase tracking-wider text-[var(--ink-dim)]">
                              {l.unit || ''}
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  )}

                  {/* the count of counted lines, so a half-done card cannot look finished */}
                  {cardLines.length > 0 && offset === 0 && (
                    <div className="mt-2 flex items-center justify-between gap-3">
                      <span className="text-[11px] font-bold uppercase tracking-[.16em] text-[var(--ink-dim)]">
                        {filled} of {cardLines.length} counted
                      </span>
                      <span className="h-1 flex-1 rounded-full bg-[var(--inset)] overflow-hidden">
                        <span
                          className="block h-full rounded-full bg-[var(--gold)] transition-[width] duration-300 ease-out"
                          style={{ width: `${(filled / cardLines.length) * 100}%` }}
                        />
                      </span>
                    </div>
                  )}

                  {offset === 0 && notes[id] && <div className="mt-2">{notes[id](rows)}</div>}
                </>
              ) : (
                /* ── one number for the whole card ──────────────────────────── */
                <>
                  {details[id] && (
                    <div className="mb-3 max-h-[96px] overflow-y-auto rounded-lg border bg-[var(--inset)] border-[var(--line)] p-2">
                      {details[id]}
                    </div>
                  )}
                  <label className="block">
                    <span className="text-[11px] font-bold uppercase tracking-[.16em] text-[var(--ink-dim)] block mb-1.5">
                      Amount you counted
                    </span>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={offset === 0 ? entry : ''}
                      onChange={e => setEntry(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') commit(); }}
                      placeholder="0"
                      disabled={offset !== 0 || disabled}
                      className="w-full p-3 rounded-xl border-2 bg-[var(--raised)] border-[var(--line)] focus:border-[var(--accent-edge)] outline-none text-2xl font-black font-mono tabular-nums text-[var(--ink)]"
                    />
                  </label>
                </>
              )}
            </div>
          );
        })}
      </div>

      {!finished && (
        <button
          type="button"
          onClick={commit}
          disabled={disabled || !ready}
          className="w-full py-3.5 rounded-xl font-black bg-[var(--gold)] text-[var(--gold-ink)] border border-[var(--accent-edge)] shadow-md transition-transform active:scale-[.98] disabled:opacity-40"
        >
          {ready
            ? `Put ${CARD_LABELS[active]} in the letter`
            : activeLines
              ? `Count all ${activeLines.length} lines first`
              : `Enter what you counted`}
        </button>
      )}
    </div>
  );
}
