/* UserPromptSubmit hook — the 5-HOUR PLAN QUOTA. Not the context window.

   These are two different limits and confusing them cost a whole session:
     - context window  -> how full this conversation is. `/clear` empties it, free.
                          Measured by context-watch.mjs.
     - 5-hour plan quota -> a rolling cap on Aldi's subscription. `/clear` does NOTHING for it.
                          When it runs out he is locked out mid-work, screen stuck, and the next
                          session finds no note covering what was in flight. THIS file watches it.

   Where the number comes from: 9router (localhost:20128) already tracks it for its Quota Tracker
   page. The route is /api/usage/<connectionId> and the shape, observed live on 2026-08-08:

     { "plan": "Claude Code",
       "quotas": { "session (5h)": { "used": 56, "total": 100, "remaining": 44,
                                     "remainingPercentage": 44,
                                     "resetAt": "2026-08-08T05:40:00.066Z",
                                     "unlimited": false } } }

   Field names are copied from a real response, not guessed.

   NEVER UNDER-REPORT. A meter trusted while quietly wrong is exactly what let him hit 92% in
   silence. So every failure path here says WHY it cannot tell him, and shows no number at all,
   rather than implying things are fine.

   Test:  echo '{}' | node .claude/plan-quota.mjs
*/
import fs from 'node:fs';

/* The credential lives OUTSIDE the repo on purpose. A cookie committed into git is leaked
   permanently, and this repo is the thing most likely to be shared or pushed. */
const HOME = 'C:/Users/ASUS/.claude';
const COOKIE_FILE = `${HOME}/9router-cookie.txt`;
const ID_FILE = `${HOME}/9router-claude-id.txt`;
const BASE = 'http://localhost:20128';

const read = (p) => { try { return fs.readFileSync(p, 'utf8').trim(); } catch { return ''; } };

const cookie = read(COOKIE_FILE);
const connId = read(ID_FILE);

/* Silent when it was never set up. This hook runs on every message Aldi types; nagging about
   configuration he has not asked for would cost tokens forever. */
if (!cookie || !connId) process.exit(0);

const say = (s) => { console.log(s); process.exit(0); };

const ctl = new AbortController();
const timer = setTimeout(() => ctl.abort(), 2500);   // never block his prompt on a hung service

let res;
try {
  res = await fetch(`${BASE}/api/usage/${connId}`, {
    headers: { Cookie: cookie },
    signal: ctl.signal,
  });
} catch {
  clearTimeout(timer);
  /* 9router down or slow. Say so — silence here would read as "quota is fine". */
  say('[plan-quota] 9router is not responding, so the 5-hour plan quota is UNKNOWN right now. ' +
      'Do not reassure Aldi about usage; tell him the meter is blind and ask him to read it off ' +
      'the Quota Tracker if it matters.');
}
clearTimeout(timer);

if (res.status === 401 || res.status === 403) {
  say('[plan-quota] The 9router cookie has EXPIRED — its auth_token is a ~24h JWT. The 5-hour ' +
      'plan quota is UNKNOWN. Tell Aldi in one line: open the Quota Tracker, F12 > Application > ' +
      `Cookies > localhost:20128, copy the auth_token value, and it goes in ${COOKIE_FILE}. ` +
      'Do not paste the value into any file inside the repo.');
}
if (!res.ok) {
  say(`[plan-quota] 9router answered ${res.status} — plan quota UNKNOWN. Do not guess at it.`);
}

let data;
try { data = await res.json(); } catch {
  say('[plan-quota] 9router returned something that is not JSON — plan quota UNKNOWN.');
}

/* Keyed by a human label with a space in it. Match loosely so a rename upstream degrades to
   "unknown" rather than to a confidently wrong number. */
const quotas = data?.quotas ?? {};
const key = Object.keys(quotas).find(k => /session/i.test(k)) ?? Object.keys(quotas)[0];
const q = key ? quotas[key] : null;

if (!q || q.unlimited) process.exit(0);

const used = Number.isFinite(q.used) ? q.used
           : Number.isFinite(q.remainingPercentage) ? 100 - q.remainingPercentage
           : null;
if (used === null) {
  say('[plan-quota] 9router responded but had no usable usage figure — plan quota UNKNOWN.');
}

let resetIn = '';
if (q.resetAt) {
  const ms = Date.parse(q.resetAt) - Date.now();
  if (Number.isFinite(ms) && ms > 0) {
    const h = Math.floor(ms / 3600000), m = Math.round((ms % 3600000) / 60000);
    resetIn = h ? ` · resets in ${h}h ${m}m` : ` · resets in ${m}m`;
  }
}

const head = `[plan-quota] 5-hour plan quota: ${used}% used, ${100 - used}% left${resetIn}. ` +
             `(This is the PLAN limit — /clear does not help it.)`;

/* Thresholds. Aldi asked to be stopped at 95-98%; this fires earlier at each tier because a
   note begun at 97% may not finish writing, and a note that does not land is the failure he
   asked to prevent. */
if (used >= 95) {
  console.log(`${head}

🔴 STOP. His standing rule fires here. In THIS order, nothing else:
1. Write .claude/PROGRESS.md NOW — what landed, what is half-done, the exact next command.
   Commit it in the same turn if code changed.
2. Reply with ONLY this line, alone, nothing above it:

🔴🔴🔴 **PLAN QUOTA ${used}% — STOP, notes are saved** 🔴🔴🔴

3. Then at most two short lines: what is committed, what he does next.
Do NOT tell him to /clear — it does nothing for this limit. He simply has to wait for the reset.
Start NO new work.`);
} else if (used >= 85) {
  console.log(`${head}

🟠 Open the reply with this line, alone:

🟠 **Plan quota ${used}% used${resetIn}** — finishing up, notes going in now

Land only what can be finished and committed in this turn. Write PROGRESS.md before the turn
ends, not after. Start nothing new.`);
} else if (used >= 70) {
  console.log(`${head}

🟡 Mention this in one line near the top of the reply, then carry on:

🟡 **Plan quota ${used}% used${resetIn}**

Judge the size of THIS request against what is left. If it plausibly needs more, say so before
starting rather than stopping halfway.`);
}
/* Below 70% say nothing — it would cost tokens on every message for no decision. */
