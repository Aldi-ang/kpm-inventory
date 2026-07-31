// Pure career-XP math. No Firebase import on purpose — this is the one module in the repo
// that's runnable and testable with plain `node`, since package.json has no test runner.
// Run: node src/config/career.js
//
// This file is also imported by App.jsx and runs in the browser — the self-check block at the
// bottom is guarded behind a Node-only check and dynamically imports 'url' (a Node built-in with
// no browser equivalent) so it never gets pulled into the browser bundle at all.

export const DEFAULT_XP = {
  rupiahPerXp:       100000,  // Rp 100.000 actually collected = 1 XP
  xpPerVerifiedDay:      25,  // you closed the day and the boss signed it
  xpPerCleanCukaiDay:    10,  // zero pita cukai debt after this EOD
  xpPerTenureDay:         5,  // one calendar day of service
  xpPerCleanCount:      100,  // a stock opname with zero variance
  xpPerStore:             1,  // per store served that day
  storeCapPerDay:        15
};

export const totals = (c = {}) => {
  const b = c.base || {}, l = c.live || {};
  const add = k => (b[k] || 0) + (l[k] || 0);
  return {
    collected:      add('collected'),
    itemsBks:       add('itemsBks'),
    titipCollected: add('titipCollected'),
    daysVerified:   add('daysVerified'),
    cleanCukaiDays: add('cleanCukaiDays'),
    storesServed:   add('storesServed'),
    cleanCounts:    l.cleanCounts   || 0,
    honestDamage:   l.honestDamage  || 0,
    penalties:      l.penalties     || 0,
    newOutlets:     l.newOutlets    || 0,
    streakBest:     c.streakBest    || 0,
    awardCount:     c.awardCount    || 0,
    tenureDays:     c.joinDate
      ? Math.max(0, Math.floor((Date.now() - Date.parse(c.joinDate)) / 86400000)) : 0
  };
};

/*
 * The ONE list of stats a badge may be built on. Every screen that offers a stat picker, renders a
 * stat name, or validates a badge config reads this — AgentProfileView's Achievement Config,
 * AchievementTester, and the EOD unlock writer in App.jsx.
 *
 * This map exists because those three files each invented their own list, and the config dropdown
 * ended up offering six keys that `totals()` does not return (`totalItemsSold`, `lifetimeOmset`,
 * `stores`, `daysInServiceNum`, `ecerItemsSold`, `lifetimeEXP`). A badge on a key `totals()` lacks
 * reads as 0 forever, so it could never unlock — and "Add New Badge" defaulted to one of them, so
 * every badge an owner created was born permanently locked.
 *
 * `tracked: false` means the key IS a real `totals()` key but NOTHING in the app increments it yet.
 * A badge on one of those is just as permanently locked, so they are deliberately kept out of the
 * pickable list while still being described here — tooling can then say *why* rather than silently
 * showing a dead input. Promote one to `tracked: true` in the same commit that starts writing it.
 *
 * `fmt` lives here too so picking a source auto-selects the right number formatting; a rupiah badge
 * showing a bare count was a second symptom of the same drift.
 */
export const STAT_LABELS = {
  collected:      { label: 'Cash Collected',       fmt: 'rp',    tracked: true  },
  itemsBks:       { label: 'Items Moved',          fmt: 'count', tracked: true  },
  titipCollected: { label: 'Debt Collected',       fmt: 'rp',    tracked: true  },
  daysVerified:   { label: 'Days Closed',          fmt: 'count', tracked: true  },
  cleanCukaiDays: { label: 'Clean Cukai Days',     fmt: 'count', tracked: true  },
  storesServed:   { label: 'Stores Served',        fmt: 'count', tracked: true  },
  tenureDays:     { label: 'Days Served',          fmt: 'days',  tracked: true  },
  streakBest:     { label: 'Best Streak',          fmt: 'days',  tracked: true  },
  awardCount:     { label: 'Awards Received',      fmt: 'count', tracked: true  },
  cleanCounts:    { label: 'Clean Stock Counts',   fmt: 'count', tracked: false },
  newOutlets:     { label: 'New Outlets (NOO)',    fmt: 'count', tracked: false },
  honestDamage:   { label: 'Honest Damage Calls',  fmt: 'count', tracked: false },
  penalties:      { label: 'Penalties',            fmt: 'count', tracked: false }
};

// What a stat picker should actually offer. Anything absent from here cannot unlock today.
export const BADGE_SOURCES = Object.entries(STAT_LABELS)
  .filter(([, v]) => v.tracked)
  .map(([key, v]) => ({ key, ...v }));

// Human label for any stat key, including untracked ones and unknown junk from an old config.
export const statLabel = (key) => STAT_LABELS[key]?.label || key;

export const careerXP = (c = {}, w = DEFAULT_XP) => {
  const t = totals(c);
  return Math.floor(t.collected / w.rupiahPerXp)      // MONEY (collected, not handed out)
       + t.daysVerified   * w.xpPerVerifiedDay        // SHOWING UP
       + t.cleanCukaiDays * w.xpPerCleanCukaiDay      // DISCIPLINE
       + t.cleanCounts    * w.xpPerCleanCount         // ACCURACY
       + t.tenureDays     * w.xpPerTenureDay          // TIME SERVED (a clock)
       + (c.bonusXP || 0);                            // APPRECIATION (signed by you)
};

export const computeDayXP = (report, prevCareer, cfg = DEFAULT_XP) => {
  if (report.reportType === 'BOUNTY') return { total: 0, breakdown: {} };  // a fine, not income

  const collected  = Number(report.cash || 0) + Number(report.transfer || 0);
  const cukaiClean = Number(report.cukaiRemaining || 0) <= 0;

  const b = {
    collected: Math.floor(collected / cfg.rupiahPerXp),
    closed:    cfg.xpPerVerifiedDay,
    cukai:     cukaiClean ? cfg.xpPerCleanCukaiDay : 0,
    route:     Math.min(cfg.storeCapPerDay, Number(report.storesServed || 0) * cfg.xpPerStore)
  };
  return { total: b.collected + b.closed + b.cukai + b.route, breakdown: b };
};

// Shared default badge list — both AgentProfileView.jsx (renders it, lets an owner customize it
// via settings/progression) and App.jsx's handleVerifyEOD (checks it inside the verify
// transaction) import the SAME list, instead of two copies that could silently drift apart.
export const DEFAULT_BADGES = [
  { id: '1', cat: 'masa', source: 'tenureDays', target: 365, title: 'Company Veteran', desc: 'Served {val} / {max} Days.', icon: 'Calendar', hex: '#3b82f6', fmt: 'days' },
  { id: '2', cat: 'jual', source: 'itemsBks', target: 10000, title: 'Logistics Titan', desc: 'Moved {val} / {max} items.', icon: 'PackageOpen', hex: '#10b981', fmt: 'count' },
  { id: '3', cat: 'wilayah', source: 'storesServed', target: 50, title: 'The Vanguard', desc: 'Secured {val} / {max} stores.', icon: 'Target', hex: '#8b5cf6', fmt: 'count' },
  { id: '4', cat: 'jual', source: 'titipCollected', target: 50000000, title: 'Debt Collector', desc: 'Collected {val} / {max}.', icon: 'Zap', hex: '#f97316', fmt: 'rp' },
  { id: '5', cat: 'andal', source: 'daysVerified', target: 100, title: 'Consistent Closer', desc: 'Closed {val} / {max} days.', icon: 'ShieldCheck', hex: '#22d3ee', fmt: 'count' }
];

// The whole badge engine: no unlock table, no extra reads/writes. A badge that's ever unlocked
// can never re-lock (totals() is monotonic — nothing subtracts), so there's nothing to persist
// beyond the career doc's own `unlocks` array.
export const isUnlocked = (badge, career, cfg = {}) =>
  (totals(career)[badge.source] || 0) >= (cfg.badges?.[badge.id]?.target ?? badge.target);

// Returns only the ids NOT already in career.unlocks — caller decides what to do with them
// (e.g. arrayUnion). Never returns an array meant to be spread into arrayUnion() unchecked:
// arrayUnion() with zero arguments throws, so callers must check .length before using it.
export const checkBadges = (badgeList, career, cfg = {}) => {
  const already = new Set(career?.unlocks || []);
  return (badgeList || []).filter(b => !already.has(b.id) && isUnlocked(b, career, cfg)).map(b => b.id);
};

// node src/config/career.js
// `typeof process !== 'undefined'` gates this whole block out of the browser bundle at runtime —
// `process` doesn't exist there, and this file is also imported by App.jsx. No 'url' import (a
// Node builtin with no browser equivalent): path-to-URL comparison is done by hand instead, since
// even a *reference* to 'url' inside this file's dependency graph is a risk not worth taking for
// a self-check block that only ever needs to run under plain `node`.
if (typeof process !== 'undefined' && process.argv && process.argv[1]) {
  const normalized = process.argv[1].replace(/\\/g, '/');
  const argUrl = normalized.startsWith('/') ? `file://${normalized}` : `file:///${normalized}`;
  if (decodeURIComponent(import.meta.url) === decodeURIComponent(argUrl)) {
    const A = console.assert;
    const cfg = DEFAULT_XP;
    A(computeDayXP({ reportType:'BOUNTY', cash: 5000000 }, {}, cfg).total === 0, 'bounty must score 0');
    A(computeDayXP({ reportType:'CASH_STOCK', cash: 0, transfer: 0, cukaiRemaining: 0,
                     storesServed: 0 }, {}, cfg).total === 35, 'quiet honest day = 25+10');
    A(computeDayXP({ reportType:'CASH_STOCK', cash: 4000000, cukaiRemaining: 0,
                     storesServed: 12 }, {}, cfg).total === 87, 'typical day = 40+25+10+12');
    A(computeDayXP({ reportType:'CASH_STOCK', cash: 0, storesServed: 99,
                     cukaiRemaining: 5 }, {}, cfg).breakdown.route === 15, 'route caps at 15');
    A(careerXP({ base:{collected:1000000}, live:{collected:1000000} }) === 20, 'base+live add up');
    A(careerXP({}) === 0, 'empty career is 0, not NaN');
    const badge = { id: 'b1', source: 'itemsBks', target: 100 };
    A(isUnlocked(badge, { live: { itemsBks: 150 } }) === true, 'badge unlocks past target');
    A(isUnlocked(badge, { live: { itemsBks: 50 } }) === false, 'badge stays locked under target');
    A(checkBadges([badge], { live: { itemsBks: 150 }, unlocks: [] }).length === 1, 'checkBadges finds a fresh unlock');
    A(checkBadges([badge], { live: { itemsBks: 150 }, unlocks: ['b1'] }).length === 0, 'checkBadges skips an already-unlocked badge');

    // --- the guard that would have caught the dead-badge-source bug ---
    // Every key a stat picker can offer MUST be a real key of totals(), or a badge built on it is
    // permanently locked. This is the check whose absence let six dead options ship.
    const realKeys = Object.keys(totals({}));
    Object.keys(STAT_LABELS).forEach(k =>
      A(realKeys.includes(k), `STAT_LABELS key "${k}" is not returned by totals() — a badge on it can never unlock`));
    A(BADGE_SOURCES.length > 0, 'BADGE_SOURCES must not be empty');
    BADGE_SOURCES.forEach(s =>
      A(realKeys.includes(s.key), `BADGE_SOURCES offers "${s.key}" which totals() does not return`));
    // Every shipped default badge must sit on a source that is both real and actually written.
    DEFAULT_BADGES.forEach(b =>
      A(BADGE_SOURCES.some(s => s.key === b.source), `DEFAULT_BADGES "${b.title}" uses untracked source "${b.source}"`));
    A(statLabel('storesServed') === 'Stores Served', 'statLabel humanises a known key');
    A(statLabel('nonsense_key') === 'nonsense_key', 'statLabel falls back to the raw key');

    console.log('career.js OK —', BADGE_SOURCES.length, 'usable badge sources,',
                Object.keys(STAT_LABELS).length - BADGE_SOURCES.length, 'known-but-untracked');
  }
}
