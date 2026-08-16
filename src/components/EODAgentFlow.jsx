import React, { useState } from 'react';
import EODCardDeck from './EODCardDeck';
import EODLetter from './EODLetter';
import { CARD_IDS, CARD_LABELS, emptyLetter, emptyCard, declareCard, canSend } from '../utils/eodRecord';

/* THE AGENT'S WHOLE EVENING, IN ONE COMPONENT: count four cards → seal them into a letter → send
   it to the regional admin. Aldi's spec, 2026-08-16.

   ⚠️ WHY THIS EXISTS RATHER THAN WIRING THE TWO PIECES DIRECTLY INTO EODReconciliationView:
   that file is 916 lines and owns the money submit path. Composing here keeps the edit over there
   down to swapping one branch for one tag, which is the difference between a reviewable change and
   a risky one.

   ⚠️ THIS COMPONENT WRITES NOTHING. It hands the finished cards to `onSubmit` and lets the screen
   that already owns the Firestore write decide what to do. Keeping the counting UI ignorant of
   persistence is what lets it be rendered and driven in a harness without a database. */

export default function EODAgentFlow({ expected = {}, details = {}, sources = {}, onSubmit, submitting = false }) {
  const [letter, setLetter] = useState(() => emptyLetter());
  const [stage, setStage] = useState('counting');   // counting → sealing → sealed → sent

  /* One card confirmed. The source list is what makes the total traceable later — see
     src/utils/eodRecord.js on why a stored sum with no sources cannot be investigated. */
  const handleConfirm = (id, counted) => {
    setLetter(prev => {
      const next = {
        ...prev,
        cards: {
          ...prev.cards,
          [id]: {
            /* the REAL rows where the screen has them (cash and transfer come straight off
               today's transactions); a single summary row only where it genuinely has none. */
            ...declareCard(emptyCard(id), sources[id]?.length ? sources[id] : summaryRow(id, expected, counted), 'agent', Date.now()),
            declared: counted,
            expected: Number(expected[id] ?? 0)
          }
        }
      };
      /* the deck has handed over its last card — fold it away and bring the letter in */
      if (canSend(next)) {
        setTimeout(() => setStage('sealing'), 420);
        setTimeout(() => setStage('sealed'), 900);
      }
      return next;
    });
  };

  const cardsForLetter = CARD_IDS
    .filter(id => letter.cards[id].declared !== null)
    .map(id => ({ id, counted: letter.cards[id].declared }));

  const send = () => {
    setStage('sent');
    if (onSubmit) onSubmit(letter);
  };

  return (
    <div className="w-full">
      {/* the three acts, so the agent can always see that sealing is not finishing */}
      <ol className="flex gap-2 mb-4 list-none p-0 m-0">
        {[
          ['You count',        stage === 'counting'],
          ['You seal & send',  stage === 'sealing' || stage === 'sealed'],
          ['Region approves',  stage === 'sent']
        ].map(([label, live], i) => (
          <li
            key={label}
            className={`flex-1 rounded-lg border px-2.5 py-1.5 transition-colors duration-300 ${
              live ? 'border-[var(--accent-edge)] bg-[var(--inset)]' : 'border-[var(--line)] bg-[var(--raised)]'
            }`}
          >
            <span className={`block font-mono text-[9px] font-bold uppercase tracking-[.18em] ${
              live ? 'text-[var(--accent-ink)]' : 'text-[var(--ink-disabled)]'
            }`}>Step {i + 1}</span>
            <span className={`block text-[11px] font-bold leading-tight ${
              live ? 'text-[var(--ink)]' : 'text-[var(--ink-dim)]'
            }`}>{label}</span>
          </li>
        ))}
      </ol>

      {stage === 'counting' ? (
        <EODCardDeck expected={expected} details={details} onConfirm={handleConfirm} disabled={submitting} />
      ) : (
        <EODLetter
          cards={cardsForLetter}
          stage={stage === 'sealing' ? 'filling' : stage === 'sent' ? 'sent' : 'sealed'}
          onSend={send}
          disabled={submitting}
        />
      )}
    </div>
  );
}

/* The fallback when a card genuinely has no underlying rows to point at — goods and stamps are
   counted as physical objects, not as a list of transactions. Cash and transfer always arrive with
   real per-sale rows from the screen, so this is not the traceability shortcut it looks like:
   there is nothing finer to record for a stack of 128 stamps than "128 stamps". */
function summaryRow(id, expected, counted) {
  return [{ txId: `counted:${id}`, amount: counted, label: CARD_LABELS[id], expected: Number(expected[id] ?? 0) }];
}
