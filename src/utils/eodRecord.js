/* THE EOD RECORD SHAPE — four cards, three signatures, and enough detail to trace a gap.

   Aldi, 2026-08-16: *"we need to make system where this leak of cash or input can be traced down
   to the root"*. That sentence is a data requirement, not a UI one, and it is why this file exists
   before any card is drawn.

   ⚠️ WHY TOTALS ALONE ARE NOT ENOUGH. Today an EOD report stores `cash`, `transfer`, `itemsBks` —
   sums. A sum cannot be traced: you cannot ask a number which sale it came from. So when Rp 50.000
   is missing there is nothing to walk backwards through, and the only honest answer to "where did
   it go" is "we don't know". Every card here keeps the RECORDS IT WAS BUILT FROM.

   The cost is near zero, which is the point: the loop in EODReconciliationView that computes
   `expectedCash` already has the transaction in hand — it uses `t.id` a few lines later for
   damaged tickets. Capturing the id alongside the amount is one property, not a new query.

   ⚠️ AND declared MUST BE STORED SEPARATELY FROM accepted. If only one number is kept, a regional
   admin changing a figure is invisible by construction — there is nothing to compare it against,
   so no amount of auditing downstream can ever recover it. Two numbers, or the feature does not
   work at all. */

/** The four cards, in the order the agent confirms them. Aldi's order, from his spec. */
export const CARD_IDS = ['cash', 'transfer', 'goods', 'cukai'];

/** Human labels, kept here so the UI and the audit trail can never disagree about a card's name. */
export const CARD_LABELS = {
  cash:     'Cash',
  transfer: 'Transfer',
  goods:    'Goods returned',
  cukai:    'Pita cukai'
};

/* Which cards are rupiah and which are physical objects. It lives here rather than in a component
   because the deck, the letter and the admin's review all format a card's figure, and a stack of
   128 stamps printed as "Rp 128" is the bug that follows from any two of them disagreeing. */
export const isMoneyCard = (id) => id === 'cash' || id === 'transfer';

/* HQ checks MONEY and SALES DATA only. Aldi, 2026-08-16: *"HQ just care about the money
   transferred and the sales data ... since HQ cant monitor the real supply number on the regional
   warehouse then the HQ will just trust the regional admin for that"*. So stock cards are
   deliberately NOT in HQ's reconciliation — that is a decision, not an omission. */
export const HQ_CARDS = ['cash', 'transfer'];

export const CARD_STATE = {
  OPEN:     'OPEN',      // the agent has not confirmed this card yet
  DECLARED: 'DECLARED',  // agent confirmed; waiting on the regional admin
  ACCEPTED: 'ACCEPTED',  // regional admin accepted it exactly as declared
  SHORT:    'SHORT',     // regional admin accepted it, with a recorded gap
  RETURNED: 'RETURNED'   // regional admin sent this card back to be recounted
};

/** The three signatures, in order. A day is not finished until all three are present. */
export const STEPS = ['agent', 'regional', 'hq'];

/** A card nobody has touched yet. */
export function emptyCard(id) {
  return {
    id,
    declared: null,      // what the agent says they have
    accepted: null,      // what the regional admin says arrived — NEVER the same field
    gap: null,           // stored, not derived — see below
    sources: [],         // the records this total was built from
    state: CARD_STATE.OPEN,
    by: null,            // who last changed this card
    at: null
  };
}

/** A fresh letter: four open cards and no signatures. */
export function emptyLetter() {
  const cards = {};
  for (const id of CARD_IDS) cards[id] = emptyCard(id);
  return { cards, signatures: { agent: null, regional: null, hq: null } };
}

/** Sum a card's sources. The declared total must always equal this — see the self-check. */
export function sourcesTotal(sources = []) {
  return sources.reduce((sum, s) => sum + (Number(s.amount) || 0), 0);
}

/* The agent confirms a card. `sources` is the list of underlying records — for cash and transfer
   that is one entry per transaction; for goods and cukai one per item. */
export function declareCard(card, sources, by, at) {
  const declared = sourcesTotal(sources);
  return { ...card, declared, sources, state: CARD_STATE.DECLARED, by, at };
}

/* The regional admin accepts a card, possibly for a different amount than declared.

   ⚠️ `gap` IS STORED RATHER THAN COMPUTED ON READ, and that is deliberate. This is an audit
   record: it must say what the gap was AT THE MOMENT OF APPROVAL. If a source transaction is
   corrected next week, a derived gap would silently change and the record of what the admin
   actually signed for would be lost — which is exactly the manipulation this is meant to catch. */
export function acceptCard(card, accepted, by, at) {
  const gap = Number(accepted) - Number(card.declared);
  return {
    ...card,
    accepted: Number(accepted),
    gap,
    state: gap === 0 ? CARD_STATE.ACCEPTED : CARD_STATE.SHORT,
    by,
    at
  };
}

/** The regional admin sends one card back. Nothing is accepted, nothing is credited. */
export function returnCard(card, by, at) {
  return { ...card, accepted: null, gap: null, state: CARD_STATE.RETURNED, by, at };
}

/** Every card confirmed by the agent — the letter can be sealed and sent. */
export function canSend(letter) {
  return CARD_IDS.every(id => letter.cards[id].state !== CARD_STATE.OPEN);
}

/* Every card decided by the regional admin — the "approve the letter" button appears.
   A RETURNED card blocks it: the letter cannot be approved while part of it is going back. */
export function canApproveLetter(letter) {
  return CARD_IDS.every(id => {
    const s = letter.cards[id].state;
    return s === CARD_STATE.ACCEPTED || s === CARD_STATE.SHORT;
  });
}

/** Total money gap across the cards HQ actually checks. This is the number HQ reconciles. */
export function moneyGap(letter) {
  return HQ_CARDS.reduce((sum, id) => sum + (Number(letter.cards[id].gap) || 0), 0);
}

/* TRACE TO THE ROOT. Given a card with a gap, hand back the records it was built from, largest
   first — the candidates for where the money went. This is the whole point of keeping sources:
   a gap on its own is a mystery, a gap plus its sources is a shortlist. */
export function traceCard(card) {
  return {
    id: card.id,
    declared: card.declared,
    accepted: card.accepted,
    gap: card.gap,
    candidates: [...(card.sources || [])].sort(
      (a, b) => Math.abs(Number(b.amount) || 0) - Math.abs(Number(a.amount) || 0)
    )
  };
}

/* Sign a step. Signatures are append-only and ordered: a regional signature without an agent
   signature, or an HQ signature without a regional one, is a broken chain and is refused —
   the three approvals only mean something as a sequence. */
export function sign(letter, step, by, at) {
  const i = STEPS.indexOf(step);
  if (i === -1) throw new Error(`unknown step: ${step}`);
  for (let j = 0; j < i; j++) {
    if (!letter.signatures[STEPS[j]]) {
      throw new Error(`cannot sign ${step} before ${STEPS[j]}`);
    }
  }
  return { ...letter, signatures: { ...letter.signatures, [step]: { by, at } } };
}

/** Where a letter has got to. Used for the admin's stack and HQ's list. */
export function letterStage(letter) {
  if (letter.signatures.hq) return 'CLOSED';
  if (letter.signatures.regional) return 'AWAITING_HQ';
  if (letter.signatures.agent) return 'AWAITING_REGIONAL';
  return 'COUNTING';
}
