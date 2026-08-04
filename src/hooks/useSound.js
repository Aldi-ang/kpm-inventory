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
  /* Merchant "voice". Four pitches of the same short blip, played in sequence while
     his line is on screen — the Animal Crossing / Dave the Diver trick. It is not a
     language, so it never sounds wrong in English or Indonesian, needs no voice actor
     and no TTS service, and costs 4,6 KB against 100 KB+ for recorded lines. */
  /* Aldi's own SFX, from RE UI/SFX. click is trimmed to 150ms - the source was 3,4s of
     mostly silence, which made every press sound late. */
  click:  '/sounds/click.mp3',
  sign:   '/sounds/sign.mp3',
  mumble1: '/sounds/mumble1.mp3',
  mumble2: '/sounds/mumble2.mp3',
  mumble3: '/sounds/mumble3.mp3',
  mumble4: '/sounds/mumble4.mp3',
};

const MUMBLES = ['mumble1', 'mumble2', 'mumble3', 'mumble4'];
const CHARS_PER_BLIP = 3;
const MAX_BLIPS = 8;        // Undertale mumbles the whole line; this is a work tool

/* Per-sound level. Everything used to sit at a flat 0,5, which made the steppers - the
   control pressed more than any other in the app, often outdoors next to a road - the
   quietest thing in it. The stepper and the error tone go to full; the mumbles stay lower
   because eight of them fire in a row and at full they stop being a voice and become noise. */
const VOLUMES = {
  click: 1.0, error: 1.0, tap: 0.9, commit: 0.9, sign: 0.9,
  mumble1: 0.7, mumble2: 0.7, mumble3: 0.7, mumble4: 0.7,
};
const DEFAULT_VOLUME = 0.85;

const POOL_SIZE = 3;

/* name -> { els: HTMLAudioElement[], next: number } */
const pools = new Map();
let unlocked = false;

function makePool(name, AudioImpl) {
  const els = [];
  for (let i = 0; i < POOL_SIZE; i++) {
    const el = new AudioImpl(SOURCES[name]);
    el.preload = 'auto';
    el.volume = VOLUMES[name] ?? DEFAULT_VOLUME;
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

/* Speak a line as mumbling. Returns the number of blips scheduled, so a caller (or a
   test) can check it without waiting. Silent under Lite Mode and before unlock, because
   playSound refuses there — no separate check needed. */
export function speakMumble(text, { AudioImpl, doc, timer = setTimeout } = {}) {
  const len = (text || '').replace(/\s+/g, '').length;
  if (!len) return 0;
  const count = Math.min(MAX_BLIPS, Math.max(1, Math.round(len / CHARS_PER_BLIP)));
  if (liteModeOn(doc) || !unlocked) return 0;
  for (let i = 0; i < count; i++) {
    const name = MUMBLES[(i * 3 + len) % MUMBLES.length];   // varies per line, no RNG
    timer(() => playSound(name, { AudioImpl, doc }), i * 105);
  }
  return count;
}

/* test seam - not for app code */
export function __reset() {
  pools.clear();
  unlocked = false;
}
export function __isUnlocked() { return unlocked; }
