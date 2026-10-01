/* IS THIS THE LATEST VERSION? His 2026-10-01 pick B: "sometimes i reload the page and login, waste a lot of time and
   energy just to login and realised late that the version is outdated". The offline helper (main.jsx registerSW,
   autoUpdate) already swaps in a new build and reloads by itself - but silently, and often after he has signed in.
   The sign-in card and the vault screen now ask it to check the moment they open and SAY the answer, so he waits for
   "Latest version" before typing anything. No server of our own: the helper is the one thing that knows. */

let reg = null;
const waiting = [];

/* main.jsx hands the registration over once the helper is registered */
export const setRegistration = (r) => { reg = r; waiting.splice(0).forEach((done) => done(r)); };

/* the registration, or null if none arrives (no helper on this address, or it failed to register) */
export const getRegistration = (ms = 8000) => reg ? Promise.resolve(reg)
  : new Promise((done) => { waiting.push(done); setTimeout(() => done(reg), ms); });

/* What the line says, from what the helper reports after asking for an update. Pure, so the selfcheck runs it.
   installing/waiting = a new build is downloading, and the helper reloads the page once it takes over. */
export const updateState = ({ supported, online, reg: r, failed }) =>
  !supported || (online && !failed && !r) ? 'unsupported'
  : !online || failed ? 'offline'
  : (r.installing || r.waiting) ? 'updating'
  : 'latest';

export const UPDATE_LABEL = {
  checking: 'Checking for update…',
  latest: 'Latest version',
  updating: 'New version found - updating…',
  failed: 'Update failed - close and reopen the app',
  offline: "Offline - can't check",
  unsupported: 'Version',
};
