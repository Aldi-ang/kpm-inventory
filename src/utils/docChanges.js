/* WHY THIS EXISTS — the sales terminal froze on his phone right after registering an outlet.

   Firestore hands a snapshot back as the WHOLE collection, and `d.data()` deserializes each
   document afresh on every call. `snap.docs.map(d => ({id: d.id, ...d.data()}))` therefore
   re-materialises every document on every write, no matter how little changed.

   For most collections that is nothing. For `customers` it is not: every outlet carries its
   store photo as a base64 string in the document itself (`storeImage`, written by
   MerchantSalesView's NOO form and CustomerManager's editor, and read back as an <img> in
   CustomerManager and JourneyView — so it cannot simply be dropped). At ~100 outlets and a
   600px JPEG each, one new outlet meant deserializing several megabytes of string on the main
   thread, then handing React a brand-new array of 100 brand-new objects.

   `snap.docChanges()` names only what actually moved. Applying those keeps the objects already
   in state — same identities, so downstream memos and children see genuinely unchanged rows —
   and touches one document instead of a hundred.

   The splice order is Firestore's documented contract: process the changes in the order given,
   removing at `oldIndex` and inserting at `newIndex`. A modification that also reorders the
   document (renaming an outlet under `orderBy('name')`) arrives as a single `modified` change
   whose two indices differ, which is why it is a remove-then-insert rather than a write in
   place. Verified by `docChanges.selfcheck.mjs` against a full re-map of the same sequence. */
export const applyDocChanges = (prev, changes) => {
    const next = prev.slice();
    for (const c of changes) {
        if (c.type === 'removed') { next.splice(c.oldIndex, 1); continue; }
        const row = { id: c.doc.id, ...c.doc.data() };
        if (c.type === 'added') next.splice(c.newIndex, 0, row);
        else { next.splice(c.oldIndex, 1); next.splice(c.newIndex, 0, row); }
    }
    return next;
};
