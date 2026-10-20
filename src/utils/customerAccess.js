/* CUSTOMER ACCESS BY FOLDER (P2).

   Aldi, 2026-10-20: *"as tier 1 i want option so that alex be able to see the customer inside which folder"* and
   *"i think i want the ticked to be as low as the kecamatan ... if i choose the kabupaten then all kecamatan inside
   it will also be included in default ... but we can ticked them off as well"*. A-Brain
   Brainstorm/2026-10-20_customer-access-by-folder.md has all five answers.

   ONE doc, users/<owner>/settings/customer_access:
     { on, teams: { MUNTILAN: { areas: { 'JAWA TENGAH|MAGELANG': ['MUNTILAN', ...] }, adminEdit, teamEdit } } }
   A team is a Fleet & Roster branch (`location`, in capitals). The grant is a list of Kecamatan under their
   Provinsi|Kabupaten, because Kecamatan names repeat across Kabupaten.

   firestore.rules CHANGE 17 is the guard; this file only mirrors it so the app asks for what the rules allow.
   Rules are not filters: a query that COULD return one shop outside the team's folders fails whole. So a limited
   phone never asks for "all customers" - it asks one Kabupaten at a time with `city in [...]`, at most 30 names
   per query (Firestore's `in` limit). */
import { normalizeRegion } from '../config/permissions.js';

export const ACCESS_DOC_ID = 'customer_access';
export const IN_LIMIT = 30;

/* Tier 1/2: the owner's and the old admin tag ('ADMIN'), the other T1 tag, and a T2 - the only ones the rules let write the ticks */
export const isTopTier = (userRole) => ['ADMIN', 'DEVELOPER', 'COMPANY_OWNER'].includes(userRole);
/* never limited by folder: Tier 1/2, and Tier 3 - his 2026-10-20 "tier 3 should be able to see evrything on default
   actually same like tier 1 and 2" */
export const seesEveryShop = (userRole) => isTopTier(userRole) || userRole === 'AREA_ADMIN';
/* the branch admin: the "regional admin" switch is his, T5/T6 follow the "team" switch (T3 is never limited now) */
export const isTeamAdminRole = (userRole) => userRole === 'AREA_ADMIN' || userRole === 'FLEET_CAPTAIN';
/* the rules key a team the same way: trimmed, capitals, '' -> UNASSIGNED */
export const teamOf = (location) => normalizeRegion(location);

const UNKNOWN = /unknown|unmapped|uncategorized/i;
/* a shop sits in a folder only when all three levels are written exactly in capitals and none is unknown - the
   rules compare the text as it is, so "Jawa Tengah" is not in the "JAWA TENGAH" folder until Data Scrub runs */
export const filedArea = (c) => {
    const p = c?.province, k = c?.region, s = c?.city;
    const ok = [p, k, s].every(v => typeof v === 'string' && v && v === v.trim().toUpperCase() && !UNKNOWN.test(v));
    return ok ? { province: p, region: k, city: s } : null;
};
export const kabKey = (province, region) => `${province}|${region}`;

/* { tree: { PROV: { KAB: { KEC: shops } } }, unfiled: shops no team can be given } */
export const folderTree = (customers) => {
    const tree = {};
    let unfiled = 0;
    for (const c of customers || []) {
        const a = filedArea(c);
        if (!a) { unfiled++; continue; }
        const kab = ((tree[a.province] ||= {})[a.region] ||= {});
        kab[a.city] = (kab[a.city] || 0) + 1;
    }
    return { tree, unfiled };
};

/* a team's grant -> the queries a limited phone runs: one per Kabupaten, Kecamatan in chunks of 30 */
export const grantQueries = (grant) => {
    const out = [];
    for (const [key, kecs] of Object.entries(grant?.areas || {})) {
        const cut = key.indexOf('|');
        if (cut < 1) continue;
        const list = [...new Set(kecs || [])].filter(Boolean).sort();
        for (let i = 0; i < list.length; i += IN_LIMIT) {
            out.push({ province: key.slice(0, cut), region: key.slice(cut + 1), cities: list.slice(i, i + IN_LIMIT) });
        }
    }
    return out;
};

export const inFolders = (grant, shop) => {
    const a = filedArea(shop);
    return !!a && (grant?.areas?.[kabKey(a.province, a.region)] || []).includes(a.city);
};

/* null = this person is not limited (folders off, or T1/T2) and every old rule stands.
   Otherwise: their team, its grant, whether they are its admin, and the one edit switch that applies to them. */
export const accessFor = (access, userRole, location) => {
    if (!access?.on || seesEveryShop(userRole)) return null;
    const team = teamOf(location);
    const grant = access.teams?.[team] || {};
    const admin = isTeamAdminRole(userRole);
    return { team, grant, admin, canEdit: grant[admin ? 'adminEdit' : 'teamEdit'] === true };
};

/* the team admin also sees his team's temporary folder (new shops waiting for him, P3) */
export const inHold = (scope, shop) => !!scope?.admin && shop?.holdTeam === scope.team;
export const canSeeShop = (scope, shop) => !scope || inFolders(scope.grant, shop) || inHold(scope, shop);
export const canEditShop = (scope, shop) => !scope || (scope.canEdit && canSeeShop(scope, shop));

/* tick state of a Kabupaten or Provinsi for the tree: 'all' | 'some' | 'none' */
export const tickState = (picked, total) => picked === 0 ? 'none' : picked >= total ? 'all' : 'some';
