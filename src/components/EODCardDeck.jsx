import React, { useState } from 'react';
import { Wallet, Send, Package, Tag, Check } from 'lucide-react';
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

   ⚠️ MOTION IS CSS TRANSITIONS ON PERSISTENT NODES, never a JS animation. Two reasons, both his:
   Lite Mode can only switch off CSS (`html.lite-mode *`), so a JS spring would run straight
   through the setting that exists for cheap phones; and a card that is destroyed and recreated has
   no "before" value to animate from — the reason an earlier prototype's motion was invisible.
   React keeps these nodes alive across renders because they are keyed, so `transform` transitions
   have something to move from. */

const ICONS = { cash: Wallet, transfer: Send, goods: Package, cukai: Tag };

/* Money cards are counted in rupiah; goods and stamps are counted in units. Formatting the two
   the same way is how a stack of 128 stamps ends up reading as Rp 128. */
const isMoney = (id) => id === 'cash' || id === 'transfer';

const HINTS = {
  cash:     'Count every note and coin in the envelope.',
  transfer: 'Confirm the payments that actually landed in the account.',
  goods:    'Count what is going back to the warehouse.',
  cukai:    'Count the stamps you are handing over.'
};

/* `details` is a node per card — the goods card must LIST what is in the vehicle, or the agent is
   being asked to count something the screen refuses to show them. Aldi's spec says the cards
   "show the information for each"; that information is the point, not decoration. Capped and
   scrollable so a long canvas cannot push the deck's height around mid-swap. */
export default function EODCardDeck({ expected = {}, details = {}, onConfirm, disabled = false }) {
  const [step, setStep] = useState(0);
  const [entry, setEntry] = useState('');
  const [done, setDone] = useState([]);

  const active = CARD_IDS[step];
  const finished = step >= CARD_IDS.length;

  const commit = () => {
    if (disabled || finished || entry === '') return;
    const counted = Number(String(entry).replace(/[^0-9-]/g, '')) || 0;
    const exp = Number(expected[active] ?? 0);
    setDone(prev => [...prev, { id: active, counted, expected: exp, gap: counted - exp }]);
    setEntry('');
    setStep(s => s + 1);
    if (onConfirm) onConfirm(active, counted, exp);
  };

  return (
    <div className="w-full">
      {/* ── the deck ───────────────────────────────────────────────────── */}
      <div className="relative h-[350px] mb-4" style={{ perspective: '1200px' }}>
        {CARD_IDS.map((id, i) => {
          const Icon = ICONS[id];
          const offset = i - step;               // 0 = on top, >0 = still behind, <0 = gone
          const label = CARD_LABELS[id];

          /* ⚠️ EVERY CARD IS ALWAYS RENDERED — position is what changes, never existence.
             Unmounting the confirmed card would delete the thing that is supposed to be seen
             sliding away, which is the whole animation. */
          const style = {
            transform:
              offset < 0
                ? 'translateX(-118%) rotate(-7deg) scale(.94)'
                : `translateY(${Math.min(offset, 3) * 11}px) scale(${1 - Math.min(offset, 3) * 0.035})`,
            opacity: offset < 0 ? 0 : offset > 3 ? 0 : 1,
            zIndex: CARD_IDS.length - Math.abs(offset),
            pointerEvents: offset === 0 ? 'auto' : 'none'
          };

          return (
            <div
              key={id}
              aria-hidden={offset !== 0}
              className="absolute inset-x-0 top-0 rounded-2xl border p-5 bg-[var(--raised)] border-[var(--line-3)] shadow-lg transition-all duration-500 ease-out"
              style={style}
            >
              <div className="flex items-center gap-3 mb-4">
                <span className="p-2.5 rounded-xl bg-[var(--inset)] text-[var(--accent-ink)]">
                  <Icon size={20} />
                </span>
                <div className="min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-[.2em] text-[var(--ink-dim)]">
                    Card {i + 1} of {CARD_IDS.length}
                  </p>
                  <h4 className="text-lg font-black text-[var(--ink)] leading-tight truncate">{label}</h4>
                </div>
              </div>

              <p className="text-sm text-[var(--ink-dim)] mb-3">{HINTS[id]}</p>

              {details[id] && (
                <div className="mb-3 max-h-[96px] overflow-y-auto rounded-lg border bg-[var(--inset)] border-[var(--line)] p-2">
                  {details[id]}
                </div>
              )}

              <label className="block">
                <span className="text-[10px] font-bold uppercase tracking-[.18em] text-[var(--ink-dim)] block mb-1.5">
                  {isMoney(id) ? 'Amount you counted' : 'How many you counted'}
                </span>
                <input
                  type="text"
                  inputMode="numeric"
                  value={offset === 0 ? entry : ''}
                  onChange={e => setEntry(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') commit(); }}
                  placeholder={isMoney(id) ? '0' : '0'}
                  disabled={offset !== 0 || disabled}
                  className="w-full p-3 rounded-xl border-2 bg-[var(--raised)] border-[var(--line)] focus:border-[var(--accent-edge)] outline-none text-2xl font-black font-mono tabular-nums text-[var(--ink)]"
                />
              </label>
            </div>
          );
        })}

        {/* the deck is empty — every card counted and sealed into the letter */}
        {finished && (
          <div className="absolute inset-x-0 top-0 rounded-2xl border border-dashed p-6 text-center border-[var(--line-3)] bg-[var(--inset)]">
            <p className="text-[10px] font-bold uppercase tracking-[.2em] text-[var(--accent-ink)] mb-1">
              All four counted
            </p>
            <p className="text-sm text-[var(--ink-dim)]">Ready to seal into the letter.</p>
          </div>
        )}
      </div>

      {!finished && (
        <button
          type="button"
          onClick={commit}
          disabled={disabled || entry === ''}
          className="w-full py-3.5 rounded-xl font-black bg-[var(--gold)] text-[var(--gold-ink)] border border-[var(--accent-edge)] shadow-md transition-transform active:scale-[.98] disabled:opacity-40"
        >
          Confirm {CARD_LABELS[active]}
        </button>
      )}

      {/* ── what has been counted so far ───────────────────────────────── */}
      {done.length > 0 && (
        <ul className="mt-4 flex flex-col gap-1.5">
          {done.map(d => (
            <li
              key={d.id}
              className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2 bg-[var(--raised)] border-[var(--line)]"
            >
              <span className="flex items-center gap-2 text-sm font-bold text-[var(--ink)]">
                <Check size={14} className="text-[var(--accent-ink)]" />
                {CARD_LABELS[d.id]}
              </span>
              <span className="font-mono tabular-nums text-sm text-[var(--ink-dim)]">
                {isMoney(d.id) ? formatRupiah(d.counted) : d.counted}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
