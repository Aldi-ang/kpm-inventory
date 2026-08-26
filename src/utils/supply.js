import { convertToBks } from './helpers';

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
const NON_BRANCH = ['Headquarters', 'UNASSIGNED', 'UNASSIGNED AREA'];

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

/* DORMANT — what is sitting still. His words: *"the total dormant product that we have"*.
   Stock on a shelf that sold NOTHING in the window. Not "slow": nothing at all, which is the only
   version of the idea that needs no threshold nobody has set. */
export const dormant = (rows = []) =>
    rows.filter(r => r.sold === 0 && r.shelf > 0);
