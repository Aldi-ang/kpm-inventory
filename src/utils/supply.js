/* The `.js` is not decoration: the self-checks import this module in plain node, and node will not
   resolve an extensionless path. Vite is happy either way, so the extension is free. */
import { convertToBks } from './helpers.js';
import { normalizeRegion } from '../config/permissions.js';
import { weekStart } from './period.js';

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

/* The ONE name for the main warehouse, on screen and on paper. His call, 2026-08-31: *"gudang
   pusat is okay but add (master vault) because the components name is master vault"*. It was
   spelled three different ways — 'MASTER' here, 'Gudang Pusat (HQ)' in the Restock Vault, and a
   third hardcoded copy in the Goods Received stage — so the same place read as three places.

   Safe to change because this value is a COMPUTED bucket label, never a stored one: warehouseList
   builds it fresh each render and isMasterVaultPlace below maps whatever Firestore actually holds
   ('Headquarters', or empty) onto it. Rename the label, and no saved document moves. */
export const MASTER = 'Gudang Pusat (Master Vault)';

/* THE ONE TEST FOR "IS THIS THE MAIN WAREHOUSE". His 2026-11-03 video: the Fleet & Roster edit list is in capitals, so
   moving his van to headquarters stored the capitals, every exact-match test said "a branch", and the van read an empty
   warehouse of its own. A place is compared to the headquarters name here, case-blind, and nowhere else. A blank place
   has always meant the main warehouse.
   His 2026-11-03 "we need some system where we can decide where is the master vault": Settings names one place
   (settings/general masterVaultPlace; useDatabaseSync hands it here on every render). The word Headquarters keeps counting
   as well, so a card still saying it never lands on an empty warehouse. */
let masterPlace = '';
export const setMasterVaultPlace = (place) => { masterPlace = String(place || '').trim() ? normalizeRegion(place) : ''; };
const isHqWord = (loc) => normalizeRegion(loc) === 'HEADQUARTERS';
export const isMasterVaultPlace = (loc) => !String(loc || '').trim() || isHqWord(loc) || (!!masterPlace && normalizeRegion(loc) === masterPlace);
/* the spelling a record is saved with and a report groups by; every other place keeps what it holds */
export const canonicalPlace = (loc) => (isHqWord(loc) ? 'Headquarters' : loc);
/* exported because the Restock Vault's Tujuan list needs the SAME answer. It filtered on its
   own shorter list once and 'Headquarters' came back as a shippable cabang beside the real HQ
   entry — two destinations for one place, on a form that writes stock movements. */
export const NON_BRANCH = ['Headquarters', 'UNASSIGNED', 'UNASSIGNED AREA'];
export const isNonBranch = (loc) => isMasterVaultPlace(loc) || NON_BRANCH.some(n => normalizeRegion(n) === normalizeRegion(loc));

/* WHICH WAREHOUSE A VAN LOADS FROM AND RETURNS TO: the place on the card, for every rank. His 2026-11-04: "how we restock
   should be according to the location of that cards not according to tiers, if im tier 1 and im locating myself in the
   region A then i will examine and only can take goods from region A". It was typed out in five places (Fleet's bay,
   load, empty, clear; the EOD return) and they had drifted. */
export const vanUsesBranch = (agent) => !!agent && !isNonBranch(agent.location);

/* THE WEEKLY STOCK COUNT. His 2026-11-04: "there is only 1 submission needed each regional warehouse ... lets take the stock
   opname submission each week as a group homework and the the team leader is the one who submit it". The mark sits on the
   leader's roster card because firestore.rules closes pending_audits to a T4 and the roster is what every T4 can read. It
   names its warehouse, so moving the leader does not move the count. */
const opnameWarehouse = (loc) => (isMasterVaultPlace(loc) ? 'MASTER' : normalizeRegion(loc));
export const opnameMark = ({ location, by, auditId, now = new Date() }) =>
    ({ warehouse: opnameWarehouse(location), by, auditId, at: now.toISOString() });
/* By the time of the count, not a week label: moving the Stock Opname day must not undo a count already in. */
export const opnameThisWeek = (motorists = [], location, now = new Date(), day) => {
    const from = weekStart(now, day).toISOString(), warehouse = opnameWarehouse(location);
    const marks = motorists.map(m => m?.lastOpname).filter(o => o && o.at >= from && o.warehouse === warehouse);
    return { done: marks.find(o => !o.rejected) || null, sentBack: marks.find(o => o.rejected) || null };
};

/* GOOD AND DAMAGED ARE TWO COUNTS, even for one product (his 2026-11-04: "make sure damaged and healthy goods have different count
   number"). After confirmation both numbers become what was counted (his 2026-11-05: "yes become the real number that is counted"),
   as in SAP and Oracle. The one exception cannot be confirmed at all: good over and damaged short is damaged packs typed as good, and
   turning a damaged pack good is a decision made in Quarantine (Repair), never a side effect of a count. */
export const countedDiffs = (item) => ({
    good: Number(item?.goodCount || 0) - Number(item?.expectedStock || 0),
    damaged: Number(item?.damagedCount || 0) - Number(item?.expectedDamagedStock || 0)
});
export const damagedAsGood = (item) => { const { good, damaged } = countedDiffs(item); return good >= 1 && damaged <= -1; };
export const damagedCountNote = (item) => {
    if (countedDiffs(item).damaged > -1) return null;
    return damagedAsGood(item) ? 'Damaged packs look counted as good. This cannot be approved: reject it, so it is counted again.'
                               : 'Fewer damaged packs found than in Quarantine. Accepting lowers Quarantine to what was counted.';
};
/* An empty box is NOT COUNTED, never zero, wherever the book holds something (SAP's "zero count trap"). A typed 0 is a count. Where the
   book is 0 too, empty means none, so a product with no damage needs no extra typing. */
/* THE WORKLIST. His 2026-11-05: "accept and reject each of the item instead of all at once". A product's row comes from its NEWEST count at
   that warehouse. Each decision is one key on the count's own document (decisions.<productId>), so nothing rewrites items[].
   A newer count voids an older undecided count of the same product: both differences were measured against a book the first one never
   changed, so applying both would take the same shortage twice (SUPERSEDED in opnameDecisionPlan).
   ponytail: two approvers on one product in the same second can both pass the fresh read in decideProducts; a transaction if that ever happens. */
export const opnamePlaceOf = (a) => (a?.auditType === 'MASTER_VAULT' || a?.branchLocation === 'HQ' || a?.branchLocation === 'MASTER_VAULT' ? 'MASTER' : a?.branchLocation);
const sameCount = (d) => Math.abs(d.good) < 1 && Math.abs(d.damaged) < 1;   // under one whole pack is loose sticks, the count screen's own tolerance
export const opnameLoss = (item, price = 0) => {
    const d = countedDiffs(item);
    if (sameCount(d)) return { missing: 0, damaged: 0, missingRp: 0, damagedRp: 0, rp: 0 };
    const missing = Math.max(0, -(d.good + d.damaged)), damaged = Math.max(0, d.damaged);
    return { missing, damaged, missingRp: missing * price, damagedRp: damaged * price, rp: (missing + damaged) * price };
};
const rowStatus = (audit, decision) => (decision?.status === 'ACCEPTED' ? 'ok' : decision?.status === 'REJECTED' ? 'no' : decision ? null
    : audit.status === 'APPROVED' ? 'ok' : audit.status === 'REJECTED' ? 'no' : 'wait');   // no decision on a count closed the old way: the whole count was the decision
export const opnameBoard = (audits, place, { from = 0, shelf = [], priceOf = () => 0, nowSeconds = Infinity } = {}) => {
    const stamp = (a) => a?.timestamp?.seconds ?? nowSeconds;   // a count just sent has no server time yet: it is the newest
    const mine = (audits || []).filter(a => opnamePlaceOf(a) === place && Array.isArray(a.items) && (a.status === 'PENDING_HQ_APPROVAL' || stamp(a) >= from)).sort((x, y) => stamp(y) - stamp(x));
    const seen = new Map();
    mine.forEach(audit => audit.items.forEach(item => {
        const decision = audit.decisions?.[item.productId] || null;
        const row = seen.get(item.productId);
        if (row) { if (!decision && audit.status === 'PENDING_HQ_APPROVAL') row.older.push(audit); return; }
        const status = rowStatus(audit, decision);
        if (!status) return;
        const diff = countedDiffs(item);
        seen.set(item.productId, { id: item.productId, name: item.name || item.productId, item, audit, status, diff, same: sameCount(diff), loss: opnameLoss(item, priceOf(item.productId)), reason: decision?.reason || (status === 'no' ? audit.rejectReason || '' : ''), recount: !!audit.recountOf, older: [] });
    }));
    const counted = [...seen.values()];
    const rank = { wait: 0, no: 1, ok: 2 };
    counted.sort((a, b) => rank[a.status] - rank[b.status] || b.loss.rp - a.loss.rp);
    const uncounted = mine.length ? shelf.filter(p => p?.id && !seen.has(p.id) && (Number(p.stock || 0) > 0 || Number(p.damagedStock || 0) > 0)).map(p => ({ id: p.id, name: p.name || p.id, status: 'none', loss: opnameLoss({}, 0), older: [] })) : [];
    return { submitted: mine.length > 0, rows: [...counted, ...uncounted], newest: mine[0] || null };
};
export const opnameSums = (rows) => (rows || []).reduce((s, r) => {
    s.total++;
    if (r.status !== 'none') s.counted++; else s.none++;
    if (r.status === 'ok') { s.ok++; s.decided++; }
    if (r.status === 'no') { s.no++; s.decided++; }
    if (r.status === 'wait') s.waiting++;
    if (r.status === 'wait' || r.status === 'ok') { s.missing += r.loss.missing; s.damaged += r.loss.damaged; s.missingRp += r.loss.missingRp; s.damagedRp += r.loss.damagedRp; s.rp += r.loss.rp; }   // a rejected product is being recounted: not a loss yet
    return s;
}, { total: 0, counted: 0, none: 0, decided: 0, ok: 0, no: 0, waiting: 0, missing: 0, damaged: 0, missingRp: 0, damagedRp: 0, rp: 0 });
/* The count's status once every product in it has a decision; null while any still waits. */
export const auditCloseStatus = (audit, decisions = {}) => {
    const all = (audit?.items || []).map(i => decisions[i.productId]?.status);
    if (!all.length || all.some(s => !s)) return null;
    const yes = all.includes('ACCEPTED'), no = all.includes('REJECTED');
    return yes && no ? 'PARTLY_APPROVED' : no ? 'REJECTED' : yes ? 'APPROVED' : 'SUPERSEDED';
};
/* What one press changes, as plain data, so the money can be checked in node. Accepting applies only that product's two differences; a
   product that matches writes no stock; a count with no snapshot keeps the old overwrite and cannot be undone. */
export const opnameDecisionPlan = (rows, status, reason, by) => {
    const stock = [], byAudit = new Map();
    const mark = (audit, productId, decision) => { if (!byAudit.has(audit.id)) byAudit.set(audit.id, { audit, set: {} }); byAudit.get(audit.id).set[productId] = decision; };
    rows.forEach(row => {
        mark(row.audit, row.id, { status, by, ...(reason ? { reason } : {}) });
        row.older.forEach(a => mark(a, row.id, { status: 'SUPERSEDED', by }));
        if (status !== 'ACCEPTED') return;
        const hasSnapshot = row.item.expectedStock !== undefined && row.item.expectedDamagedStock !== undefined;
        if (!hasSnapshot) stock.push({ audit: row.audit, productId: row.id, overwrite: Number(row.item.goodCount || 0) });
        else if (row.diff.good || row.diff.damaged) stock.push({ audit: row.audit, productId: row.id, good: row.diff.good, damaged: row.diff.damaged });
    });
    const audits = [...byAudit.values()].map(({ audit, set }) => ({ audit, set, close: auditCloseStatus(audit, { ...(audit.decisions || {}), ...set }) }));
    return { stock, audits, canUndo: !stock.some(s => s.overwrite !== undefined) };
};
export const countBoxEmpty = (entry) => (entry?.good === '' && Number(entry?.expStock || 0) > 0) || (entry?.damaged === '' && Number(entry?.expDamaged || 0) > 0);
/* What a count approved before that rule took from Quarantine, and how much of it went into good stock. Nothing can be told from
   a record with no snapshot. */
export const quarantineLost = (item) => {
    if (item?.expectedDamagedStock === undefined) return { back: 0, goodOut: 0 };
    const { good, damaged } = countedDiffs(item);
    const back = Math.max(0, -damaged);
    return { back, goodOut: Math.min(back, Math.max(0, good)) };
};

/* WHAT A REGIONAL SHELF STILL HOLDS, for the Master Vault setting: '' when empty. A promo row counts pieces, never Bks. */
export const shelfHolding = (rows = []) => {
    const count = (r) => Math.max(0, Number(r?.stock) || 0) + Math.max(0, Number(r?.damagedStock) || 0);
    const bks = rows.filter(r => r?.kind !== 'promo').reduce((n, r) => n + count(r), 0);
    const pcs = rows.filter(r => r?.kind === 'promo').reduce((n, r) => n + count(r), 0);
    return [bks && `${bks} Bks`, pcs && `${pcs} pcs`].filter(Boolean).join(' + ');
};

/* WHAT A VAN CARRIES, one line per item: cigarettes and promo goods, in the unit each was loaded in */
export const vanGoodsLines = (agent) => [...(agent?.activeCanvas || []), ...(agent?.promoCanvas || [])]
    .filter(l => Number(l?.qty) > 0)
    .map(l => `${l.name}: ${l.qty} ${l.unit}`);

/* MOVING A CARD WITH GOODS ON IT ASKS FIRST. His 2026-11-04: "moving agent card with goods in their inventory ... the app
   must show confirmation for whoever trying to edit and change that card location, just a simple confirm and notification
   about the goods detail will do". The goods stay in the van the whole way; only where it loads from next changes. null =
   nothing to ask: no goods, or the same place in another spelling. */
const placeWord = (loc) => (String(loc || '').trim() ? normalizeRegion(loc) : 'HEADQUARTERS');
export const moveWithGoodsMessage = (agent, toPlace) => {
    const lines = vanGoodsLines(agent);
    if (!lines.length || placeWord(agent.location) === placeWord(toPlace)) return null;
    const to = placeWord(toPlace);
    return `Move ${agent.name} from ${placeWord(agent.location)} to ${to}?\n\nThese goods stay in their van and go with them:\n${lines.map(l => `• ${l}`).join('\n')}\n\nNo warehouse stock changes. From now on this van loads from and returns to ${isNonBranch(toPlace) ? 'the Master Vault' : `${to}'s warehouse`}.`;
};

/* MASTER first, then every branch on the roster, in a stable order */
export const warehouseList = (motorists = []) => {
    const branches = [...new Set(
        motorists.map(m => m && m.location).filter(loc => loc && !isNonBranch(loc))
    )].sort();
    return [MASTER, ...branches];
};

const locationOf = (motorist) =>
    (motorist && !isMasterVaultPlace(motorist.location))
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
