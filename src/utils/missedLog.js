/* THE MISSED LIST - the bell's second part. His design, 2026-10-02: *"the top panel notification to be
   timed for few second then fade and also for capybara, but then i want the notification bells to have 2
   segment ... the other one is for temporary notification that can be cleared, this is just to record all
   the missed notification to make sure that the user miss nothing"*, and *"phone and pc show the same
   thing"*.

   So every top-panel strip (Toast.jsx notify) and every capybara line (App.jsx triggerCapy, the mascot's
   radio) lands here before it fades, and the list lives on the PERSON's account: one doc each, so the
   phone and the PC read the same rows (missedDocPath). Plain .js with no React and no Firebase, so
   logicFixes.selfcheck.mjs can run the merge on real numbers; App.jsx hands in the read and the write.

   Nothing here may throw into the strip that called it: a failed save is a console warning, never a
   lost message on screen. */

export const MISSED_CAP = 100;
export const MISSED_DAYS = 7;
const DAY_MS = 86400000;

/* Same person-key as the vault doc (vaultDoc.js): an employee's `user.uid` is the BOSS's (the hijacked
   user), so the roster profile names the person. No roster profile = null: the list stays on this
   screen only, never written into somebody else's doc. */
export const missedDocPath = (appId, { bossUid, uid, agentProfileId } = {}) =>
  !bossUid ? (uid ? `artifacts/${appId}/users/${uid}/missed_log/${uid}` : null)
  : agentProfileId ? `artifacts/${appId}/users/${bossUid}/missed_log/${agentProfileId}` : null;

/* Older than 7 days goes, then the newest 100 stay. */
export const pruneMissed = (items, now) =>
  items.filter((i) => now - i.ts < MISSED_DAYS * DAY_MS).slice(0, MISSED_CAP);

/* One more line said. The same words again are ONE row: count + 1, the newest time, back on top - the
   low-stock alarm repeats, and four copies of it would bury everything else. */
export function addMissed(items, text, now, bad) {
  const t = String(text ?? '').trim();
  if (!t) return items;
  const old = items.find((i) => i.text === t);
  const row = { text: t, ts: now, count: old ? (old.count || 1) + 1 : 1, bad: !!bad };
  return pruneMissed([row, ...items.filter((i) => i !== old)], now);
}

/* Two lists into one (the account's + what this screen heard before sign-in): same words add their
   counts and keep the newest time, then newest first. */
export function mergeMissed(a, b, now) {
  const byText = new Map(a.map((i) => [i.text, i]));
  for (const r of b) {
    const o = byText.get(r.text);
    byText.set(r.text, o ? { ...o, count: (o.count || 1) + (r.count || 1), ts: Math.max(o.ts, r.ts), bad: !!(o.bad || r.bad) } : r);
  }
  return pruneMissed([...byText.values()].sort((x, y) => y.ts - x.ts), now);
}

/* The gold number on the bell: rows that arrived after he last looked at the list. */
export const unseenCount = (items, seenAt) => items.filter((i) => i.ts > (seenAt || 0)).length;

const EMPTY = { items: [], seenAt: 0 };
let state = EMPTY;
const subs = new Set();
let sink = null;

function publish(next, save) {
  state = next;
  subs.forEach((fn) => { try { fn(state); } catch (e) { console.warn('[Missed] a listener threw', e); } });
  if (save && sink) sink(state);
}

export const getMissed = () => state;
export function subscribeMissed(fn) { subs.add(fn); return () => subs.delete(fn); }

export function recordMissed(text, bad) {
  try { publish({ ...state, items: addMissed(state.items, text, Date.now(), bad) }, true); }
  catch (e) { console.warn('[Missed] not recorded', e); }
}
export const markMissedSeen = () => publish({ ...state, seenAt: Date.now() }, true);
export const clearMissed = () => publish({ items: [], seenAt: Date.now() }, true);

/* App.jsx calls this once it knows whose list it is. listen(cb) streams the doc's data (undefined when
   there is none yet) and returns its unsubscribe; save(data) writes the whole doc.
   - The first read MERGES what was said before sign-in into the account's list, so nothing said on the
     way in is lost.
   - Writes wait 1 s, so a loop that reports forty times is one write, not forty. While a write is
     waiting, a read from the server is ignored: this screen's copy is newer.
   ponytail: last writer wins between two devices writing in the same second; per-row merging (or a
   transaction) if that ever loses a line he needed.
   The returned function unbinds and empties the list, so the next person to sign in on this screen
   never sees the last one's rows. */
export function bindMissed({ listen, save }) {
  let timer = null, first = true;
  sink = () => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      timer = null;
      try { Promise.resolve(save({ items: state.items, seenAt: state.seenAt })).catch((e) => console.warn('[Missed] not saved', e)); }
      catch (e) { console.warn('[Missed] not saved', e); }
    }, 1000);
  };
  const stop = listen((data) => {
    const remote = { items: Array.isArray(data?.items) ? data.items : [], seenAt: data?.seenAt || 0 };
    if (first) {
      first = false;
      if (!state.items.length) return publish(remote, false);
      return publish({ items: mergeMissed(remote.items, state.items, Date.now()), seenAt: Math.max(remote.seenAt, state.seenAt) }, true);
    }
    if (!timer) publish(remote, false);
  });
  return () => {
    clearTimeout(timer); sink = null;
    try { stop?.(); } catch { /* already gone */ }
    publish(EMPTY, false);
  };
}
