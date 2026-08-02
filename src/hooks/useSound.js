/* App-wide UI sound. Built as its own micro-phase so the MerchantSalesView redesign
   only has to call it.

   Why plain <audio> and not Web Audio: five UI blips do not need sub-10ms latency,
   and this is far less code. Web Audio would also be free in bundle size - that is
   not the reason.

   Why a fixed pool instead of cloneNode() per tap: on a weak Android a clone can
   re-fetch or re-decode, and it churns GC on exactly the rapid tap sequence the
   two-speed quantity design creates. Three pre-decoded elements per sound, round
   robin, rewound to 0, covers overlapping taps with no allocation. */

const SOURCES = {
  tap:    '/sounds/tap.mp3',
  commit: '/sounds/commit.mp3',
  error:  '/sounds/error.mp3',
};

const POOL_SIZE = 3;

/* name -> { els: HTMLAudioElement[], next: number } */
const pools = new Map();
let unlocked = false;

function makePool(name, AudioImpl) {
  const els = [];
  for (let i = 0; i < POOL_SIZE; i++) {
    const el = new AudioImpl(SOURCES[name]);
    el.preload = 'auto';
    el.volume = 0.5;
    els.push(el);
  }
  return { els, next: 0 };
}

export function initSounds(AudioImpl = globalThis.Audio) {
  if (!AudioImpl) return;
  for (const name of Object.keys(SOURCES)) {
    if (!pools.has(name)) pools.set(name, makePool(name, AudioImpl));
  }
}

/* Lite Mode is the performance switch: no sound under it. Read the class at play
   time rather than capturing a value - a captured one goes stale the moment the
   toggle is flipped, which is the whole bug this avoids. */
function liteModeOn(doc = globalThis.document) {
  return !!doc?.documentElement?.classList?.contains('lite-mode');
}

export function playSound(name, { AudioImpl, doc } = {}) {
  if (!SOURCES[name]) return false;
  if (liteModeOn(doc)) return false;
  if (!unlocked) return false;

  initSounds(AudioImpl);
  const pool = pools.get(name);
  if (!pool) return false;

  const el = pool.els[pool.next];
  pool.next = (pool.next + 1) % pool.els.length;
  el.currentTime = 0;
  const p = el.play();
  if (p && typeof p.catch === 'function') p.catch(() => {});
  return true;
}

/* Browsers block audio until a real user gesture. Unlock by playing ONE element
   silently and only marking unlocked once play() actually resolves - marking it
   before resolution is what makes the first real sound get swallowed. */
export function unlockSounds({ AudioImpl, doc } = {}) {
  if (unlocked) return Promise.resolve(true);
  initSounds(AudioImpl);
  const pool = pools.get('tap');
  if (!pool) return Promise.resolve(false);

  const el = pool.els[0];
  const wasVolume = el.volume;
  el.volume = 0;
  const p = el.play();
  const done = p && typeof p.then === 'function' ? p : Promise.resolve();
  return done
    .then(() => { unlocked = true; })
    .catch(() => { unlocked = false; })
    .then(() => {
      el.pause();
      el.currentTime = 0;
      el.volume = wasVolume;
      return unlocked;
    });
}

/* test seam - not for app code */
export function __reset() {
  pools.clear();
  unlocked = false;
}
export function __isUnlocked() { return unlocked; }
