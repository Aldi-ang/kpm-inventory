/* WHERE THE RANK LADDER AND THE BADGE LIST LIVE: the company's own folder,
   users/{bossUid}/settings/progression — and nowhere else. 2026-09-22, Aldi's "b is also Yes make
   sure that there is no intersection when second company coming in".

   Phase 4 (2026-08) moved the reads to the company folder but kept the old shared docs
   (artifacts/{appId}/settings/achievements and /rpg_ranks — ONE doc for every company in the
   Firestore project) as a fallback, and the rules let any company's owner write them. This is now
   the only reader of that shared path: when the VAULT OWNER starts the app and the company folder
   is missing badges or ranks, it copies what the shared docs still hold into the company folder
   once and tells the caller (`moved`), so the app can report it. An employee never reads the
   shared path. Once the rules draft (firestore.rules CHANGE 8) is deployed the shared read is
   denied; the move then gives up quietly and the defaults apply — so the owner opens the app once
   BEFORE deploying and sees the message.

   Reads and writes are passed in so the self-check can run the whole decision without Firestore. */
const list = (v) => (Array.isArray(v) && v.length ? v : null);

export const settleProgression = async ({ readDoc, writeDoc, isOwner, ownPath, sharedDir }) => {
    const own = await readDoc(ownPath);
    const have = own.exists() ? own.data() : {};
    const badges = list(have.badges);
    const ranks = list(have.ranks);
    if ((badges && ranks) || !isOwner) return { badges, ranks, moved: false };

    const moved = {};
    try {
        if (!badges) { const old = await readDoc(`${sharedDir}/achievements`); const b = old.exists() && list(old.data().badges); if (b) moved.badges = b; }
        if (!ranks) { const old = await readDoc(`${sharedDir}/rpg_ranks`); const r = old.exists() && list(old.data().ranks); if (r) moved.ranks = r; }
    } catch {
        return { badges, ranks, moved: false };   /* the shared path is denied once the rule is live */
    }
    if (!Object.keys(moved).length) return { badges, ranks, moved: false };

    await writeDoc(ownPath, moved);
    return { badges: moved.badges || badges, ranks: moved.ranks || ranks, moved: true };
};
