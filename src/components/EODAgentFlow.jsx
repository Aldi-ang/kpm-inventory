import React, { useRef, useState } from 'react';
import EODCardDeck from './EODCardDeck';
import EODLetter from './EODLetter';
import { CARD_IDS, CARD_LABELS, emptyLetter, emptyCard, declareCard, canSend } from '../utils/eodRecord';

/* THE AGENT'S WHOLE EVENING, IN ONE COMPONENT: count four cards → each one flies into the letter
   that has been on screen the whole time → the letter seals and is launched to the regional admin.

   ⚠️ WHY THIS EXISTS RATHER THAN WIRING THE TWO PIECES DIRECTLY INTO EODReconciliationView:
   that file is 900+ lines and owns the money submit path. Composing here keeps the edit over there
   down to swapping one branch for one tag, which is the difference between a reviewable change and
   a risky one.

   ⚠️ THIS COMPONENT WRITES NOTHING. It hands the finished cards to `onSubmit` and lets the screen
   that already owns the Firestore write decide what to do. Keeping the counting UI ignorant of
   persistence is what lets it be rendered and driven in a harness without a database.

   ⚠️ THE LETTER IS MOUNTED FOR THE WHOLE FLOW, above the deck. Aldi, 2026-08-17: *"what i want is
   each card animations going inside 1 same letter"*. `mouthRef` is created here and handed to
   both — the letter attaches it, the deck aims at it. That one ref is the entire mechanism. */

export default function EODAgentFlow({
  expected = {},
  lines = {},
  receipts = {},
  maxTotal = {},
  details = {},
  notes = {},
  sources = {},
  onSubmit,
  submitting = false
}) {
  const [letter, setLetter] = useState(() => emptyLetter());
  const [stage, setStage] = useState('open');   // open → sealed → launching → sent
  const mouthRef = useRef(null);

  /* One card confirmed. The source list is what makes the total traceable later — see
     src/utils/eodRecord.js on why a stored sum with no sources cannot be investigated.

     Three places a card's rows can come from, in order of how specific they are:
       1. `rows` — the agent counted line by line (goods, pita cukai). One row per product.
       2. `sources[id]` — the screen already had the real records (cash and transfer come straight
          off today's transactions, one row per sale, with the customer's name on it).
       3. a single summary row, only where a card genuinely has nothing finer behind it.

     ⚠️ `declared` IS OVERWRITTEN AFTER declareCard ON PURPOSE for cash and transfer. Their sources
     are what the APP expected; `declared` is what the AGENT counted. Those two being different is
     the entire point of the screen, so declared must not be recomputed from the source rows. */
  const handleConfirm = (id, counted, _expected, rows) => {
    setLetter(prev => {
      const src = rows?.length
        ? rows
        : (sources[id]?.length ? sources[id] : summaryRow(id, expected, counted));
      const next = {
        ...prev,
        cards: {
          ...prev.cards,
          [id]: {
            ...declareCard(emptyCard(id), src, 'agent', Date.now()),
            declared: counted,
            expected: Number(expected[id] ?? 0)
          }
        }
      };
      /* the last card is in flight — let it land (760ms) before the flap swings shut */
      if (canSend(next)) setTimeout(() => setStage('sealed'), 820);
      return next;
    });
  };

  /* What the letter prints on each line. `undefined` means that line is still blank. */
  const counted = {};
  for (const id of CARD_IDS) {
    const d = letter.cards[id].declared;
    if (d !== null) counted[id] = d;
  }

  const send = () => {
    setStage('launching');
    setTimeout(() => setStage('sent'), 220);
    if (onSubmit) onSubmit(letter);
  };

  return (
    <div className="w-full">
      {/* the three acts, so the agent can always see that sealing is not finishing */}
      <ol className="flex gap-2 mb-4 list-none p-0 m-0">
        {[
          ['You count',       stage === 'open'],
          ['You seal & send', stage === 'sealed' || stage === 'launching'],
          ['Region approves', stage === 'sent']
        ].map(([label, live], i) => (
          <li
            key={label}
            className={`flex-1 rounded-lg border px-2.5 py-1.5 transition-colors duration-300 ${
              live ? 'border-[var(--accent-edge)] bg-[var(--inset)]' : 'border-[var(--line)] bg-[var(--raised)]'
            }`}
          >
            <span className={`block font-mono text-[10px] font-bold uppercase tracking-[.16em] ${
              live ? 'text-[var(--accent-ink)]' : 'text-[var(--ink-disabled)]'
            }`}>Step {i + 1}</span>
            <span className={`block text-[11px] font-bold leading-tight ${
              live ? 'text-[var(--ink)]' : 'text-[var(--ink-dim)]'
            }`}>{label}</span>
          </li>
        ))}
      </ol>

      <EODLetter counted={counted} stage={stage} mouthRef={mouthRef} onSend={send} disabled={submitting} />

      {/* ⚠️ GATED ON `stage`, NOT ON THE CARD COUNT — and the difference is the whole fourth flight.
          `canSend(letter)` becomes true on the SAME render that launches card 4. Driving it in a
          harness, 45% into that card's 760ms flight: the wrapper already read `overflow: hidden`,
          `max-height: 151.87px` and `opacity: 0.1998`, while the card sat 130px ABOVE the wrapper's
          top edge. `overflow` is not an animatable property, so it lands in frame 1. Cards 1-3 flew
          into the letter; the fourth — the one that completes it — was clipped and faded out on the
          spot. `stage` only leaves 'open' on the 820ms timer below, which is 60ms after the flight
          lands, so the collapse now starts when the deck is genuinely empty.
          ⚠️ THE COMMENT THAT USED TO BE HERE CLAIMED THIS ALREADY WORKED: "it only clips once every
          card is in — and the collapse starts at 820ms". The 820ms timer sets `stage`; it never
          touched this wrapper. A comment asserting a guarantee the code does not provide is worse
          than no comment, because it stops the next reader from checking. */}
      <div
        className="transition-all duration-500 ease-out"
        style={{
          maxHeight: stage === 'open' ? 760 : 0,
          opacity: stage === 'open' ? 1 : 0,
          overflow: stage === 'open' ? 'visible' : 'hidden'
        }}
      >
        <EODCardDeck
          expected={expected}
          lines={lines}
          receipts={receipts}
          maxTotal={maxTotal}
          details={details}
          notes={notes}
          mouthRef={mouthRef}
          onConfirm={handleConfirm}
          disabled={submitting}
        />
      </div>
    </div>
  );
}

/* The fallback when a card genuinely has no underlying rows to point at. Cash and transfer always
   arrive with real per-sale rows from the screen, and goods and pita cukai are now counted line by
   line, so this only fires for a card the screen was given nothing for. */
function summaryRow(id, expected, counted) {
  return [{ txId: `counted:${id}`, amount: counted, label: CARD_LABELS[id], expected: Number(expected[id] ?? 0) }];
}
