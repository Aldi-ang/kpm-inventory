import React, { useRef, useState } from 'react';
import { Wallet, Send, Package, Tag } from 'lucide-react';
import { formatRupiah } from '../utils/helpers';
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
  transfer: 'Check each receipt against the bank account.',
  goods:    'Count each product going back to the warehouse.',
  cukai:    'Split the stamps: handed over, and lost.'
};

const toNum = (v) => Number(String(v).replace(/[^0-9-]/g, '')) || 0;

/* ⚠️ A PHYSICAL COUNT HAS A CEILING AND MONEY DOES NOT. Aldi, 2026-08-17: *"i add more item and
   submit on the EOD it still allow us to sent the item data more than what the agent bring"*.
   He is right, and the cost is not cosmetic: `handleVerifyEOD` turns any stamp figure above the
   agent's actual debt into a NEGATIVE `global_credit` (App.jsx:1918-1920), which permanently
   reduces what they owe on later days. So an over-count on a physical card mints credit nobody
   earned.

   You cannot hand back more packs than the van was loaded with, and you cannot return more stamps
   than you owe — those are impossible, not merely unlikely, so they are refused at entry rather
   than recorded as a gap. Cash and transfer stay UNCAPPED on purpose: an agent genuinely can be
   holding more money than the app expected, and that over IS a real gap worth keeping.

   ⚠️ THIS DOES REVEAL THE EXPECTED FIGURE for a physical line, which the money cards deliberately
   hide. It is an acceptable trade only because the vehicle's own load is not a secret — the agent
   can read it on their Agent Inventory screen — while which sales made up today's cash is. */
const clampLine = (raw, max) => {
  const n = Math.max(0, toNum(raw));
  return typeof max === 'number' ? Math.min(n, max) : n;
};

/* `details` is a node per card — extra context the agent needs in order to count at all.
   `notes` is a function per card, called with the current line values, for anything that must
   react to what is being typed (the pita cukai fine is the only one today). */
/* ⚠️ A TRANSFER IS NOT COUNTED, IT IS CHECKED. Aldi, 2026-08-17, choosing this over typing a
   total: *"it is better when there is some list of the receipt that been printed today, if less
   give the agent option to write the real value"*.

   Cash, goods and stamps are things in a hand — you count them. A bank transfer is not: it either
   reached the account or it did not, so asking for a typed total makes the agent do arithmetic
   instead of checking, and throws away the only thing worth knowing. Typing `700.000` against
   `1.200.000` says half a million is missing. Ticking says **Warung Jaya's Rp 500.000 never
   landed** — a name, on the day it happened, which is what "traced down to the root" means.

   His own spec needed both cases: *"never arrived, AND arrived for less than recorded"*. So a row
   has three verdicts, not two. */
const VERDICTS = [
  { key: 'landed',  label: 'Landed',  tone: 'ok' },
  { key: 'less',    label: 'Less',    tone: 'warn' },
  { key: 'missing', label: 'Not yet', tone: 'bad' }
];

/* What a decided row is actually worth. `less` is the only one that reads a typed figure. */
const receiptActual = (r, t) =>
  !t ? 0
  : t.v === 'landed' ? Number(r.amount) || 0
  : t.v === 'less' ? Math.min(toNum(t.amt), Number(r.amount) || 0)
  : 0;

export default function EODCardDeck({
  expected = {},
  lines = {},
  receipts = {},
  maxTotal = {},
  details = {},
  notes = {},
  mouthRef,
  onConfirm,
  disabled = false
}) {
  const [step, setStep] = useState(0);
  const [entry, setEntry] = useState('');     // single-value cards
  const [rows, setRows] = useState({});       // per-line cards, keyed by line key
  const [ticks, setTicks] = useState({});     // receipt cards: key -> { v, amt }
  const [flown, setFlown] = useState({});     // card id -> the measured flight to the letter
  const activeRef = useRef(null);

  const active = CARD_IDS[step];
  const finished = step >= CARD_IDS.length;
  const activeLines = lines[active];
  const activeReceipts = receipts[active];

  const filled = activeLines ? activeLines.filter(l => rows[l.key] !== undefined && rows[l.key] !== '').length : 0;

  /* A receipt row is DECIDED, not filled — and "less" is only decided once a figure is typed,
     because "less by an unknown amount" is not a record anybody can act on. */
  const decided = activeReceipts
    ? activeReceipts.filter(r => {
        const t = ticks[r.key];
        return t && (t.v !== 'less' || (t.amt !== undefined && t.amt !== ''));
      }).length
    : 0;
  const receiptRecorded = activeReceipts ? activeReceipts.reduce((s, r) => s + (Number(r.amount) || 0), 0) : 0;
  const receiptLanded = activeReceipts ? activeReceipts.reduce((s, r) => s + receiptActual(r, ticks[r.key]), 0) : 0;
  const receiptShort = receiptRecorded - receiptLanded;

  /* Per-line caps stop one line going too high; this stops the LINES ADDING UP too high, which is
     the pita cukai case — 128 handed over plus 128 lost is 256 stamps against a debt of 128. Goods
     needs no such ceiling: each line is capped at its own product's load, so the sum cannot
     overshoot by construction. */
  const lineTotal = activeLines ? activeLines.reduce((s, l) => s + toNum(rows[l.key]), 0) : 0;
  const cap = maxTotal[active];
  const overTotal = typeof cap === 'number' && lineTotal > cap;

  const ready = activeReceipts
    ? (activeReceipts.length === 0 || decided === activeReceipts.length)
    : activeLines
      ? (activeLines.length === 0 || (filled === activeLines.length && !overTotal))
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
    /* ⚠️ THE RECEIPT ROW KEEPS ITS OWN TRANSACTION ID, not a synthetic one. `expected` is what the
       sale was recorded as, `amount` is what actually reached the account, and `verdict` says which
       of his two cases it was. A gap on this card therefore names a customer and a payment, which
       is the whole reason the record shape exists. */
    const src = activeReceipts
      ? activeReceipts.map(r => {
          const t = ticks[r.key] || {};
          return {
            txId: r.txId || `${active}:${r.key}`,
            label: r.customer || r.label || 'Unknown store',
            amount: receiptActual(r, t),
            expected: Number(r.amount) || 0,
            method: r.method,
            verdict: t.v || 'missing'
          };
        })
      : activeLines
        ? activeLines.map(l => ({
            txId: `${active}:${l.key}`,
            label: l.name,
            /* clamped AGAIN here, not just in the input. The input clamp is what the agent sees;
               this is what the record stores, and a record that trusts its own UI is not a record. */
            amount: clampLine(rows[l.key], l.max),
            expected: Number(l.expected) || 0
          }))
        : null;
    const counted = src ? src.reduce((s, r) => s + r.amount, 0) : toNum(entry);

    setFlown(prev => ({ ...prev, [active]: measure() }));
    setEntry('');
    setRows({});
    setTicks({});
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

              {receipts[id] ? (
                /* ── one receipt per row: landed / less / not yet ───────────── */
                <>
                  {receipts[id].length === 0 ? (
                    <p className="rounded-lg border border-dashed border-[var(--line-3)] bg-[var(--inset)] px-3 py-6 text-center text-[11px] uppercase tracking-[.18em] text-[var(--ink-dim)]">
                      No transfers recorded today
                    </p>
                  ) : (
                    <div className="max-h-[150px] overflow-y-auto rounded-lg border bg-[var(--inset)] border-[var(--line)] p-1.5">
                      {receipts[id].map(r => {
                        const t = ticks[r.key] || {};
                        return (
                          <div key={r.key} className="rounded-md px-2 py-1.5">
                            <div className="flex items-baseline justify-between gap-2">
                              <span className="text-[13px] font-bold text-[var(--ink)] truncate">{r.customer}</span>
                              <span className="shrink-0 font-mono tabular-nums text-[12px] text-[var(--ink-dim)]">
                                {formatRupiah(r.amount)}
                              </span>
                            </div>
                            <div className="mt-1 flex gap-1">
                              {VERDICTS.map(v => {
                                const on = t.v === v.key;
                                return (
                                  <button
                                    key={v.key}
                                    type="button"
                                    disabled={offset !== 0 || disabled}
                                    onClick={() => setTicks(p => ({ ...p, [r.key]: { v: v.key, amt: v.key === 'less' ? (p[r.key]?.amt ?? '') : '' } }))}
                                    /* colour marks what needs attention: a landed payment is the
                                       normal case and stays plain, the two problem verdicts light up */
                                    className={`flex-1 rounded-md border py-1.5 text-[11px] font-bold uppercase tracking-wider transition-colors ${
                                      !on ? 'border-[var(--line)] bg-[var(--raised)] text-[var(--ink-dim)]'
                                        : v.tone === 'ok' ? 'border-[var(--accent-edge)] bg-[var(--raised)] text-[var(--ink)]'
                                        : 'border-[var(--danger)] bg-[var(--danger)] text-[var(--gold-ink)]'
                                    }`}
                                  >
                                    {v.label}
                                  </button>
                                );
                              })}
                            </div>
                            {t.v === 'less' && (
                              <label className="mt-1 flex items-center gap-2">
                                <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--ink-dim)]">Actually got</span>
                                <input
                                  type="text"
                                  inputMode="numeric"
                                  autoFocus
                                  value={t.amt ?? ''}
                                  onChange={e => setTicks(p => ({ ...p, [r.key]: { v: 'less', amt: e.target.value } }))}
                                  placeholder="0"
                                  disabled={offset !== 0 || disabled}
                                  aria-label={`Amount actually received from ${r.customer}`}
                                  className="flex-1 rounded-lg border-2 px-2 py-1.5 text-right font-mono tabular-nums text-[14px] font-black bg-[var(--raised)] border-[var(--danger)] text-[var(--ink)] outline-none"
                                />
                              </label>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* ⚠️ THE SHORTFALL REPLACES THE PROGRESS ROW, it does not stack under it. Two
                      reasons, and the second is measured. Once every row is checked, "2 of 2
                      checked" has finished its job and the only line worth the space is the money.
                      And stacking them put the card at 350px inside a 344px box — the cards are
                      absolutely positioned, so a card taller than the box does not clip, it spills
                      over the confirm button and eats the taps. */}
                  {offset === 0 && receipts[id].length > 0 && (
                    receiptShort > 0 && decided === receipts[id].length ? (
                      <p className="mt-2 rounded-lg border border-[var(--danger)] bg-[var(--danger)] px-3 py-1.5 text-center text-[11px] font-bold uppercase tracking-[.14em] text-[var(--gold-ink)]">
                        {formatRupiah(receiptShort)} did not arrive
                      </p>
                    ) : (
                      <div className="mt-2 flex items-center justify-between gap-3">
                        <span className="text-[11px] font-bold uppercase tracking-[.16em] text-[var(--ink-dim)]">
                          {decided} of {receipts[id].length} checked
                        </span>
                        <span className="font-mono tabular-nums text-[12px] font-bold text-[var(--ink)]">
                          {formatRupiah(receiptLanded)} landed
                        </span>
                      </div>
                    )
                  )}
                </>
              ) : cardLines ? (
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
                        const atCap = typeof l.max === 'number' && val !== '' && toNum(val) >= l.max;
                        return (
                          <label
                            key={l.key}
                            className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-[var(--raised)]"
                          >
                            <span className="flex-1 min-w-0">
                              <span className="block text-[13px] font-bold text-[var(--ink)] truncate leading-tight">{l.name}</span>
                              {atCap ? (
                                <span className="block text-[11px] font-bold text-[var(--accent-ink)] leading-tight">
                                  That is everything this line carried.
                                </span>
                              ) : l.hint ? (
                                <span className="block text-[11px] text-[var(--ink-dim)] leading-tight">{l.hint}</span>
                              ) : null}
                            </span>
                            <input
                              type="text"
                              inputMode="numeric"
                              value={offset === 0 ? val : ''}
                              onChange={e => setRows(p => ({
                                ...p,
                                /* an empty box stays empty — clamping '' to 0 would turn "I have not
                                   counted this yet" into "there are none", the exact collapse the
                                   per-line card exists to prevent */
                                [l.key]: e.target.value === '' ? '' : String(clampLine(e.target.value, l.max))
                              }))}
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

                  {/* The count of counted lines, so a half-done card cannot look finished — and it
                      RETIRES once the card is done. "2 of 2 counted" beside a cash-fine plate is a
                      line that has finished its job still taking the room, and the room is not
                      free: the cards are absolutely positioned inside a fixed 344px box, so a card
                      that grows past it spills over the confirm button rather than clipping.
                      Measured at 354px with both showing; 300px with only the one that matters. */}
                  {cardLines.length > 0 && offset === 0 && filled < cardLines.length && (
                    <div className="mt-2 flex items-center justify-between gap-3">
                      <span className="text-[11px] font-bold uppercase tracking-[.16em] text-[var(--ink-dim)]">
                        {filled} of {cardLines.length} counted
                      </span>
                      <span className="h-1 flex-1 rounded-full bg-[var(--inset)] overflow-hidden">
                        <span
                          className="block h-full rounded-full bg-[var(--lamp-on)] transition-[width] duration-300 ease-out"
                          style={{ width: `${(filled / cardLines.length) * 100}%` }}
                        />
                      </span>
                    </div>
                  )}

                  {/* the lines each fit and still do not add up. Says the number, because unlike a
                      product's load this ceiling IS the thing being reconciled — the agent is told
                      what they owe on this card from the moment it opens. */}
                  {offset === 0 && overTotal && (
                    <p className="mt-2 rounded-lg border border-[var(--danger)] bg-[var(--danger-well)] px-3 py-1.5 text-center text-[11px] font-bold uppercase tracking-[.14em] text-[var(--danger-ink)]">
                      That is {lineTotal} against {cap} owed
                    </p>
                  )}

                  {/* ⚠️ THE NOTE AND THE OVER-COUNT MESSAGE ARE MUTUALLY EXCLUSIVE, for two reasons.
                      Quoting a Rp 1.920.000 fine for a count that cannot happen is a wrong number
                      stated confidently. And stacking both pushed the card past the deck's fixed
                      344px, so the confirm button was painted straight through the fine plate —
                      "collapsing", in his word for it. */}
                  {offset === 0 && !overTotal && notes[id] && <div className="mt-2">{notes[id](rows)}</div>}
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
            : overTotal
              ? 'Too many — check the count'
              : activeReceipts
                ? `Check all ${activeReceipts.length} transfers first`
                : activeLines
                  ? `Count all ${activeLines.length} lines first`
                  : 'Enter what you counted'}
        </button>
      )}
    </div>
  );
}
