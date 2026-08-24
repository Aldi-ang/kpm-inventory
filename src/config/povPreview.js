/* ============================================================================
   TIER POV PREVIEW — wear another tier's screen without logging out.

   Aldi, 2026-08-23: *"i want one extra admin tier 1 features where i can change
   the account tier in an instant to see their POV ui instead of login and logout
   each time waste a time"*, and *"make this option hidden on the sidebar because
   not all employee can open setting right on recent system"*.

   THE ONE THING THIS FILE EXISTS TO GUARANTEE: a preview can only ever take
   authority away, never hand it out. Every rule below is arithmetic on plain
   values so a check can hold it to its word — see logicFixes.selfcheck.mjs.

   ⚠️ HONEST LIMIT, and it is printed in the banner rather than hidden here:
   this changes what the SCREEN shows, never what the SERVER allows. Firestore
   still sees his real tier-1 account, so a preview can never prove that the
   rules would refuse a tier 5.
   ============================================================================ */

import { CORPORATE_TIERS, DYNAMIC_TIERS } from './permissions.js';

/* ONE EMAIL, and it is checked on the EMAIL, not on the tier — his words:
   *"for my adikaryasukses99@gmail.com only because it is my tier 1 account,
   other account cant do this"*. A future second tier-1 account does not
   inherit this, which is the point. App.jsx's masterVIPs list reads this same
   constant so the two can never drift apart. */
export const POV_OWNER_EMAIL = 'adikaryasukses99@gmail.com';

export const canUsePovSwitch = (email) =>
    typeof email === 'string' && email.toLowerCase().trim() === POV_OWNER_EMAIL;

/* THE FAKE STAFF. One per tier, created in his own vault the first time he wears
   that tier, never before. His reason, and it is the right one:
   *"this way the system wont be confused to write which name on the receipt and
   all of that right"* — a test sale signed by a fake operative cannot be mistaken
   for a real agent's sale on a nota, in the audit log, or on a leaderboard.

   TIER 1 IS ABSENT ON PURPOSE. Tier 1 is what he already is; "preview yourself"
   is the OFF switch, not an option. `previewIdentity` refuses it a second time.

   `isTest: true` on every document these write — cheap, changes nothing today,
   and means that if he ever wants them gone it is one query and not a memory
   exercise. */
export const TEST_ACCOUNTS = [
    { tier: CORPORATE_TIERS.TIER_2, id: 'TEST_TIER_2', fallback: 'OWNER' },
    { tier: CORPORATE_TIERS.TIER_3, id: 'TEST_TIER_3', fallback: 'AREA ADMIN' },
    { tier: CORPORATE_TIERS.TIER_4, id: 'TEST_TIER_4', fallback: 'FLEET CAPTAIN' },
    { tier: CORPORATE_TIERS.TIER_5, id: 'TEST_TIER_5', fallback: 'FIELD OPERATIVE' },
    { tier: CORPORATE_TIERS.TIER_6, id: 'TEST_TIER_6', fallback: 'ROOKIE' }
];

export const testAccountFor = (tier) => TEST_ACCOUNTS.find(a => a.tier === tier) || null;

/* 🔴 ONE NAME FUNCTION, AND EVERYTHING READS IT. Found on the first live run, 2026-08-23: the
   banner said HQ SALES MANAGER while the toast and the created agent said [TEST] REGIONAL ADMIN.
   One tier, two names on the screen at the same time — and the agent's name is the one that
   prints on a nota, so the receipt disagreed with the label above it.

   The cause was two sources: bundled English names here, and HIS renamed tiers in Settings. His
   renames win, because they are what the rest of the app says. `fallback` is only for a tier he
   has never renamed, and it is written in the code's own vocabulary so nobody mistakes it for a
   label he chose. */
export const tierLabel = (account) => {
    const dyn = DYNAMIC_TIERS.find(t => t.id === account.tier);
    /* 'T5: OPERATIVE' -> 'OPERATIVE'. The number is already on the plate beside it. */
    return dyn?.label ? dyn.label.replace(/^T\d+:\s*/, '').trim() : account.fallback;
};

export const testAccountName = (account) => `[TEST] ${tierLabel(account)}`;

/* The document written into `artifacts/{appId}/users/{uid}/motorists/{id}` the
   first time a tier is worn. Deliberately NOT accompanied by an
   `employee_directory` entry: that is the record that lets a human sign in, and
   a fake agent must never be a way into the company. */
export const testAccountDoc = (account, defaults = {}) => ({
    id: account.id,
    name: testAccountName(account),
    userRole: account.tier,
    role: account.tier,
    isTest: true,
    status: 'Active',
    activeCanvas: [],
    phone: '-',
    vehicle: 'TEST',
    email: '',
    location: defaults.location || 'Headquarters',
    province: defaults.province || 'Central Java',
    allowedPayments: defaults.allowedPayments || ['Cash', 'QRIS', 'Transfer', 'Titip'],
    allowedTiers: defaults.allowedTiers || ['Retail', 'Grosir', 'Ecer']
});

/* THE WHOLE PREVIEW, as one function over plain values.

   `real` is what the sign-in decided. `pov` is null when he is himself. What comes
   back is what the SCREEN should believe. Three rules, and none of them is
   negotiable:

     1. NOT PREVIEWING -> every real value passes through untouched. The switch
        must cost nothing when it is off.
     2. PREVIEWING -> isAdmin and isSystemOwner are FORCED FALSE. The vault key and
        the architect's screens are the two things a costume must never carry, and
        forcing them here means no caller can forget to.
     3. AN UNKNOWN OR TIER-1 POV IS NO POV. A stale value cannot strand him in a
        costume he cannot see, and "preview tier 1" cannot become a way to hand
        tier 1 to a screen that had not already earned it.

   NOTHING HERE TOUCHES localStorage AND NOTHING SHOULD. His rule: a reload puts
   him back in his own chair. That is guaranteed by the preview living in ordinary
   React state and nowhere else — a check asserts this file never learns to save. */
export const previewIdentity = (pov, real) => {
    const account = pov && testAccountFor(pov.tier);
    if (!account) return { ...real, previewing: null };
    return {
        ...real,
        /* THE UID NEVER CHANGES. It is his real sign-in, it is what every Firestore
           read and write is evaluated against, and pretending otherwise is exactly
           the lie this feature must not tell. Only the NAME on the paperwork moves,
           so a test sale is signed [TEST] SALES CANVAS and can never be mistaken for
           a real agent's — which is the half of this he asked for by name. */
        user: real.user ? { ...real.user, displayName: testAccountName(account), agentId: account.id, userRole: account.tier } : real.user,
        userRole: account.tier,
        agentProfileId: account.id,
        isAdmin: false,
        isSystemOwner: false,
        previewing: account
    };
};
