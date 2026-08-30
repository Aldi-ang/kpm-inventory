/* The `.js` is not decoration: the self-checks import this module in plain node, and node will not
   resolve an extensionless path. Vite is happy either way, so the extension is free. */
import { convertToBks } from './helpers.js';

/* WHERE EVERY PACK ACTUALLY IS — sold, on a van, or still on a shelf.
   ────────────────────────────────────────────────────────────────────────────
   Aldi, 2026-08-26: *"we should add some graph to view the remaining product for each type, how
   many are out there on field and how many sold already i want this graph to be at one graph so
   that we can compare the value ... and each regional location for these data as well, so that i
   can see each regional warehouse supply, onfield and sold"*.

   THREE PLACES A PACK CAN BE, and the dashboard could previously see only the first:
     SHELF     master vault  = `users/{owner}/products`            (loaded as `inventory`)
               a branch      = `users/{owner}/branches/{loc}/inventory`
     ON FIELD  loaded on a vehicle = `motorists[].activeCanvas`
     SOLD      a SALE transaction inside the chosen period

   ⚠️ THE WAREHOUSE LIST COMES FROM THE ROSTER, not from a registry and not from restock history.
   That is StockOpnameView's rule (see its `branches.add(m.location)`) and Aldi confirmed it is the
   real one: *"as u can see our fleet and roster, there are only 3 teams, bandung, HQ, and
   muntilan"*. Firestore cannot list subcollections from a client, so there is no other source that
   is not a guess. **Headquarters is not a branch — Headquarters IS the master vault.**

   ⚠️ A SALE IS ATTRIBUTED TO A WAREHOUSE THROUGH ITS AGENT. A transaction records `agentId`, not a
   location, so the agent is looked up on the roster and their location decides which warehouse the
   sale belongs to. An agent who has since been deleted, or a sale made by the owner, lands on
   MASTER — stated rather than silently dropped, because a supply picture that loses sales is worse
   than one that admits where it put them.

   ⚠️ EVERYTHING HERE IS IN BKS. Bks is the atom every unit converts through; the screen turns it
   back into karton/bal/slop at the last moment. Mixing units before the end is how a figure ends
   up twenty times too big.                                                                      */

export const MASTER = 'MASTER';
const HQ_LOCATIONS = ['Headquarters', '', null, undefined];
/* exported because the Restock Vault's Tujuan list needs the SAME answer. It filtered on its
   own shorter list once and 'Headquarters' came back as a shippable cabang beside the real HQ
   entry — two destinations for one place, on a form that writes stock movements. */
export const NON_BRANCH = ['Headquarters', 'UNASSIGNED', 'UNASSIGNED AREA'];

/* MASTER first, then every branch on the roster, in a stable order */
export const warehouseList = (motorists = []) => {
    const branches = [...new Set(
        motorists.map(m => m && m.location).filter(loc => loc && !NON_BRANCH.includes(loc))
    )].sort();
    return [MASTER, ...branches];
};

const locationOf = (motorist) =>
    (motorist && motorist.location && !HQ_LOCATIONS.includes(motorist.location))
        ? motorist.location
        : MASTER;

/* One row per product: how much has been sold, how much is riding around, how much is left.
   `warehouse` is MASTER, a branch name, or null for the whole company. */
export const supplyByProduct = ({
    inventory = [], branchStock = {}, motorists = [], transactions = [],
    since = null, warehouse = null,
}) => {
    const wanted = (loc) => warehouse === null || loc === warehouse;

    const rows = new Map();
    const row = (p) => {
        if (!rows.has(p.id)) {
            rows.set(p.id, { id: p.id, name: p.name, product: p, sold: 0, field: 0, shelf: 0 });
        }
        return rows.get(p.id);
    };
    /* the master list is the only place a product's PACKING lives, so branch and van lines are
       always converted with the master record rather than with whatever the branch doc holds */
    const master = new Map(inventory.map(p => [p.id, p]));

    /* ── SHELF ── */
    if (wanted(MASTER)) {
        inventory.forEach(p => { row(p).shelf += Math.max(0, Number(p.stock) || 0); });
    }
    Object.entries(branchStock).forEach(([branch, items]) => {
        if (!wanted(branch)) return;
        (items || []).forEach(item => {
            const p = master.get(item.id);
            if (!p) return;                       // a branch doc for a deleted product
            row(p).shelf += Math.max(0, Number(item.stock) || 0);
        });
    });

    /* ── ON FIELD ── */
    motorists.forEach(m => {
        if (!wanted(locationOf(m))) return;
        (m?.activeCanvas || []).forEach(item => {
            const p = master.get(item.productId);
            if (!p) return;
            row(p).field += Math.max(0, convertToBks(Number(item.qty) || 0, item.unit, p));
        });
    });

    /* ── SOLD ── */
    const whereAgentSells = new Map(
        motorists.map(m => [m?.id, locationOf(m)]).filter(([id]) => id)
    );
    transactions.forEach(t => {
        if (t.type !== 'SALE') return;
        if (since) {
            const d = new Date(t.timestamp?.seconds ? t.timestamp.seconds * 1000 : t.date);
            if (isNaN(d) || d < since) return;
        }
        if (!wanted(whereAgentSells.get(t.agentId) || MASTER)) return;
        (t.items || []).forEach(item => {
            const p = master.get(item.productId);
            if (!p) return;
            row(p).sold += Math.max(0, convertToBks(Number(item.qty) || 0, item.unit, p));
        });
    });

    return [...rows.values()]
        .map(r => ({ ...r, total: r.sold + r.field + r.shelf }))
        .filter(r => r.total > 0)
        .sort((a, b) => b.total - a.total);
};

/* ═══════════ THE SPARE DAYS ON TOP OF A REORDER — one number, per cabang ═══════════
   Aldi, 2026-08-30, after the maths was explained to him: *"regarding the buffer i want option to
   change this buffer"*, and *"we should made this difference per branch"*.

   WHAT IT IS. `reorderAdvice` targets the shelf hitting exactly ZERO on the day the next delivery
   lands: cover = how long you wait for a truck + how long until you next order. Exact is fragile —
   one good selling week or one late truck and that cabang stops selling. These are the spare days
   added on top.

   ⚠️ THIS IS NOT "how fast the product moves". That is measured per product AND per cabang already,
   from that cabang's own delivery history, and needs no setting at all — the point had to be made
   to him because he asked for per-branch on those grounds. What varies per cabang is RISK: a long
   or unreliable road deserves a bigger cushion than one an hour away. So the override is per
   cabang, not per product: a number per product per cabang is a number nobody can keep true.

   ABSENCE MEANS THE DEFAULT, and the default means the company number, and THAT means 3. Read in
   that order so a cabang he has never touched is never treated as "zero spare" — the same trap
   `canSeeExpectedCount` documents, where a brand-new key missing from a saved matrix reads as a
   deliberate no. `0` typed on purpose still wins, because `??` only falls through on null.        */
export const DEFAULT_BUFFER_DAYS = 3;

export const bufferDays = (appSettings, branch) => {
    const per = appSettings?.restockBufferPerBranch;
    const own = per && typeof per === 'object' ? per[branch] : undefined;
    const fallback = appSettings?.restockBufferDays;
    const pick = own ?? fallback ?? DEFAULT_BUFFER_DAYS;
    const n = Number(pick);
    return Number.isFinite(n) && n >= 0 ? n : DEFAULT_BUFFER_DAYS;
};

/* DORMANT — what is sitting still. His words: *"the total dormant product that we have"*.
   Stock on a shelf that sold NOTHING in the window. Not "slow": nothing at all, which is the only
   version of the idea that needs no threshold nobody has set. */
export const dormant = (rows = []) =>
    rows.filter(r => r.sold === 0 && r.shelf > 0);
