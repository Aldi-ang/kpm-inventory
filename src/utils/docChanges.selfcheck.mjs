/* Proves the incremental customer listener produces EXACTLY what the old full re-map produced.

   The old code was `snap.docs.map(d => ({id: d.id, ...d.data()}))` — always right, always
   expensive. The new code applies `snap.docChanges()` instead. If those two ever disagree the
   customer list silently drifts: a duplicate outlet, a missing one, or one stuck at a stale
   name. Nothing in the UI would announce that, which is exactly the class of bug this repo
   treats as the worst kind. So every scenario below asserts the incremental result equals the
   full re-map of the same truth list.

   Run: node src/utils/docChanges.selfcheck.mjs */
import assert from 'node:assert';
import { applyDocChanges } from './docChanges.js';

let pass = 0;
const ok = (label, fn) => { fn(); pass++; console.log(`  ok   ${label}`); };

/* A fake Firestore doc. data() returns a fresh object each call, like the real one. */
const mkDoc = (id, name, extra = {}) => ({ id, data: () => ({ name, ...extra }) });
const fullRemap = docs => docs.map(d => ({ id: d.id, ...d.data() }));

/* Builds the change list Firestore would emit going from `before` to `after`, for the simple
   cases this check exercises. Indices follow Firestore's contract: oldIndex is the position in
   the previous ordering, newIndex the position in the new one. */
const added = (doc, newIndex) => ({ type: 'added', doc, newIndex, oldIndex: -1 });
const modified = (doc, oldIndex, newIndex) => ({ type: 'modified', doc, oldIndex, newIndex });
const removed = (doc, oldIndex) => ({ type: 'removed', doc, oldIndex, newIndex: -1 });

console.log('\ndoc-changes self-check');

/* 1. The very first snapshot: every document arrives as `added`, in order. */
ok('first snapshot builds the whole list', () => {
    const docs = [mkDoc('a', 'ALFA'), mkDoc('b', 'BRAVO'), mkDoc('c', 'CHARLIE')];
    const got = applyDocChanges([], docs.map((d, i) => added(d, i)));
    assert.deepStrictEqual(got, fullRemap(docs));
});

const base = [mkDoc('a', 'ALFA'), mkDoc('b', 'BRAVO'), mkDoc('c', 'CHARLIE')];
const baseState = fullRemap(base);

/* 2. Registering a new outlet — the exact case that froze his phone. One document in, 99
      untouched. The untouched rows must keep their identity, or every memo recomputes anyway
      and the fix buys nothing. */
ok('a new outlet inserts in sort position and leaves the others untouched', () => {
    const noo = mkDoc('n', 'BETA');            // sorts between ALFA and BRAVO
    const got = applyDocChanges(baseState, [added(noo, 1)]);
    assert.deepStrictEqual(got, fullRemap([base[0], noo, base[1], base[2]]));
    assert.strictEqual(got[0], baseState[0], 'ALFA was rebuilt when nothing about it changed');
    assert.strictEqual(got[3], baseState[2], 'CHARLIE was rebuilt when nothing about it changed');
});

/* 3. An edit that does not move the row — the IOU write's shape. */
ok('an in-place edit replaces only that row', () => {
    const edited = mkDoc('b', 'BRAVO', { pendingIOUs: [{ id: 'x' }] });
    const got = applyDocChanges(baseState, [modified(edited, 1, 1)]);
    assert.deepStrictEqual(got, fullRemap([base[0], edited, base[2]]));
    assert.strictEqual(got[0], baseState[0]);
});

/* 4. An edit that DOES move the row — renaming an outlet under orderBy('name'). This is the
      case a naive "write it back at the same index" implementation gets wrong. */
ok('a rename that reorders lands at the new index', () => {
    const renamed = mkDoc('a', 'ZULU');         // ALFA -> ZULU, front to back
    const got = applyDocChanges(baseState, [modified(renamed, 0, 2)]);
    assert.deepStrictEqual(got, fullRemap([base[1], base[2], renamed]));
});

/* 5. A deletion. */
ok('a removal drops exactly one row', () => {
    const got = applyDocChanges(baseState, [removed(base[1], 1)]);
    assert.deepStrictEqual(got, fullRemap([base[0], base[2]]));
});

/* 6. Several changes in ONE snapshot, applied in order — a bulk import or a folder delete.
      Indices are relative to the state at the moment each change is applied, which is why the
      order matters and why this is asserted rather than assumed. */
ok('a multi-change snapshot applies in order', () => {
    const noo = mkDoc('n', 'DELTA');
    const got = applyDocChanges(baseState, [removed(base[0], 0), added(noo, 2)]);
    assert.deepStrictEqual(got, fullRemap([base[1], base[2], noo]));
});

/* 7. An empty change list must be a no-op, not a wipe. Firestore delivers one of these
      whenever a snapshot fires with nothing new. */
ok('an empty snapshot changes nothing', () => {
    const got = applyDocChanges(baseState, []);
    assert.deepStrictEqual(got, baseState);
});

/* 8. The input array is never mutated — React state must not be edited in place. */
ok('the previous state is never mutated', () => {
    const before = fullRemap(base);
    applyDocChanges(before, [removed(base[0], 0), added(mkDoc('n', 'ECHO'), 2)]);
    assert.deepStrictEqual(before, fullRemap(base), 'applyDocChanges mutated the array it was given');
});

console.log(`\ndoc-changes self-check: ${pass}/8 pass`);
if (pass !== 8) process.exit(1);
