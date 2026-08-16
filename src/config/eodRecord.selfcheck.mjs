/* Self-check for the EOD record shape.
   Run: node src/config/eodRecord.selfcheck.mjs

   This file exists because the record shape is the one part of the EOD redesign that CANNOT be
   retrofitted. Ship totals-only and "trace the leak to the root" becomes a data migration rather
   than a feature. Everything asserted here is a property Aldi asked for in words:

     "we need to make system where this leak of cash or input can be traced down to the root"
     "HQ just care about the money transferred and the sales data"
     "3 times approval each day making sure that there is no leak in the work process" */
import assert from 'node:assert';
import {
  CARD_IDS, CARD_STATE, HQ_CARDS, STEPS,
  emptyLetter, emptyCard, sourcesTotal,
  declareCard, acceptCard, returnCard,
  canSend, canApproveLetter, moneyGap, traceCard, sign, letterStage
} from '../utils/eodRecord.js';

const T = (id, amount, extra = {}) => ({ txId: id, amount, ...extra });
const AT = 1755300000;

/* 1. THE CORE INVARIANT: a declared total is always the sum of its sources.
      A total that does not match its own sources is untraceable by definition. */
const sales = [
  T('tx-1', 1200000, { customerName: 'Warung Bu Sari', method: 'Cash' }),
  T('tx-2',  850000, { customerName: 'Toko Bayu',      method: 'Cash' }),
  T('tx-3', 2800000, { customerName: 'Pak Budi',       method: 'Cash' })
];
let cash = declareCard(emptyCard('cash'), sales, 'bagas', AT);
assert.equal(cash.declared, 4850000);
assert.equal(cash.declared, sourcesTotal(cash.sources), 'declared must equal the sum of sources');
assert.equal(cash.sources.length, 3, 'the source records survive onto the card');
assert.equal(cash.state, CARD_STATE.DECLARED);

/* 2. declared AND accepted ARE TWO FIELDS. Storing one makes a changed figure invisible —
      there is nothing left to compare against, so no later audit can recover it. */
const accepted = acceptCard(cash, 4800000, 'regional-kudus', AT + 3600);
assert.equal(accepted.declared, 4850000, 'accepting must never overwrite what the agent declared');
assert.equal(accepted.accepted, 4800000);
assert.notEqual(accepted.declared, accepted.accepted);

/* 3. the gap is STORED, not derived on read. This is an audit record: it must say what the gap
      was at the moment of approval, even if a source figure is corrected next week.

   ⚠️ THE OBVIOUS VERSION OF THIS TEST DOES NOT WORK, and it shipped wrong once. Checking
   `{...accepted}.gap` proves nothing: the spread operator EVALUATES a getter and copies the
   resulting value, so a derived gap looks stored. Verified by breaking the module on purpose —
   swapping the stored field for `get gap(){ return this.accepted - this.declared }` still passed.
   The only test that separates them mutates the SAME object and re-reads. */
assert.equal(accepted.gap, -50000);
assert.ok(Object.getOwnPropertyDescriptor(accepted, 'gap').value !== undefined,
  'gap must be a data property, not an accessor');
accepted.declared = 4900000;                       // a later correction to the figure it came from
assert.equal(accepted.gap, -50000,
  'a gap computed on read would have moved to -100000 here; a signed gap must not move');
accepted.declared = 4850000;                       // put it back for the checks below

/* 4. an exact match is ACCEPTED; anything else is SHORT. Two different states, because Aldi
      chose to celebrate one of them in gold and mark the other in red. */
assert.equal(acceptCard(cash, 4850000, 'r', AT).state, CARD_STATE.ACCEPTED);
assert.equal(acceptCard(cash, 4850000, 'r', AT).gap, 0);
assert.equal(acceptCard(cash, 4900000, 'r', AT).state, CARD_STATE.SHORT, 'over is a gap too');
assert.equal(acceptCard(cash, 4900000, 'r', AT).gap, 50000);

/* 5. a returned card carries no acceptance and no gap — nothing was agreed, so nothing is recorded */
const sentBack = returnCard(accepted, 'regional-kudus', AT + 7200);
assert.equal(sentBack.state, CARD_STATE.RETURNED);
assert.equal(sentBack.accepted, null);
assert.equal(sentBack.gap, null);
assert.equal(sentBack.declared, 4850000, 'sending back does not erase what was declared');

/* 6. THE LETTER GATES. Cannot send until every card is confirmed; cannot approve while any card
      is still open or has been sent back. */
let letter = emptyLetter();
assert.equal(CARD_IDS.length, 4);
assert.equal(canSend(letter), false, 'a fresh letter has four open cards');
for (const id of CARD_IDS) letter.cards[id] = declareCard(emptyCard(id), [T(id, 100)], 'bagas', AT);
assert.equal(canSend(letter), true);
assert.equal(canApproveLetter(letter), false, 'declared is not accepted');
for (const id of CARD_IDS) letter.cards[id] = acceptCard(letter.cards[id], 100, 'reg', AT);
assert.equal(canApproveLetter(letter), true);
letter.cards.cukai = returnCard(letter.cards.cukai, 'reg', AT);
assert.equal(canApproveLetter(letter), false, 'one card going back blocks the whole letter');

/* 7. HQ CHECKS MONEY ONLY. His words: HQ cannot see the regional warehouse's real stock, so it
      trusts the regional admin for that. A goods gap must NOT enter HQ's reconciliation. */
assert.deepEqual(HQ_CARDS, ['cash', 'transfer']);
let L = emptyLetter();
L.cards.cash     = acceptCard(declareCard(emptyCard('cash'),     [T('a', 1000)], 'b', AT), 900,  'r', AT);
L.cards.transfer = acceptCard(declareCard(emptyCard('transfer'), [T('b', 2000)], 'b', AT), 1980, 'r', AT);
L.cards.goods    = acceptCard(declareCard(emptyCard('goods'),    [T('c', 5000)], 'b', AT), 4000, 'r', AT);
assert.equal(moneyGap(L), -120, 'money gap counts cash and transfer only');
assert.equal(L.cards.goods.gap, -1000, 'the goods gap is still recorded — it is just not HQ\'s check');

/* 8. TRACE TO THE ROOT: a gap plus its sources is a shortlist, biggest suspect first. */
const trace = traceCard(accepted);
assert.equal(trace.gap, -50000);
assert.equal(trace.candidates.length, 3);
assert.equal(trace.candidates[0].txId, 'tx-3', 'largest source first');
assert.equal(trace.candidates[0].customerName, 'Pak Budi', 'the trail reaches a real customer');
assert.equal(traceCard(emptyCard('cash')).candidates.length, 0, 'an untouched card traces to nothing');

/* 9. THE THREE SIGNATURES ARE A SEQUENCE, not a set. Aldi: "3 times approval each day making sure
      that there is no leak in the work process". A regional signature with no agent signature, or
      an HQ signature with no regional one, is a broken chain and must be refused. */
assert.deepEqual(STEPS, ['agent', 'regional', 'hq']);
let S = emptyLetter();
assert.equal(letterStage(S), 'COUNTING');
assert.throws(() => sign(S, 'regional', 'r', AT), /cannot sign regional before agent/);
assert.throws(() => sign(S, 'hq', 'h', AT), /cannot sign hq before agent/);
S = sign(S, 'agent', 'bagas', AT);
assert.equal(letterStage(S), 'AWAITING_REGIONAL');
assert.throws(() => sign(S, 'hq', 'h', AT), /cannot sign hq before regional/);
S = sign(S, 'regional', 'area-kudus', AT + 100);
assert.equal(letterStage(S), 'AWAITING_HQ', 'the day is NOT done when the region signs');
S = sign(S, 'hq', 'owner', AT + 200);
assert.equal(letterStage(S), 'CLOSED');
assert.equal(S.signatures.agent.by, 'bagas', 'every signature keeps who and when');
assert.equal(S.signatures.regional.at, AT + 100);
assert.throws(() => sign(S, 'nonsense', 'x', AT), /unknown step/);

/* 10. an empty source list is 0, not NaN — an agent with no sales still submits a letter */
assert.equal(sourcesTotal([]), 0);
assert.equal(sourcesTotal(undefined), 0);
assert.equal(declareCard(emptyCard('cash'), [], 'b', AT).declared, 0);
assert.equal(acceptCard(declareCard(emptyCard('cash'), [], 'b', AT), 0, 'r', AT).state, CARD_STATE.ACCEPTED);

console.log('eod-record self-check: 10/10 pass');
