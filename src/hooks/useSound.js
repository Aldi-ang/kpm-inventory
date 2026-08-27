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
  /* The Master Vault gate. Cut to the 3.0s wave Aldi signed off: the "tok" lands at 4.50s
     where his name finishes forming, the ticks at 6.70s as the letters leave. It only fits
     that wave — move VaultGate's T_WAVE_DUR and this file has to be regenerated. */
  vaultb: '/sounds/vault-b.mp3',
  /* The tutorial. Aldi's own file, from RE UI/SFX — *"this is the SFX when ponder tutorial is
     pressed"*. It is deliberately NOT one of the sounds above: `click` and `commit` already mean
     a transaction in this app, and re-pointing them at a tutorial teaches the ear the wrong thing.
     He said so himself: *"u re crazy using sales SFX for the book"*. */
  ponderOpen: '/sounds/ponder-open.mp3',
  /* The book. Also Aldi's own files, and TRIMMED on the way in: the clips he saved ran 4,7s, 6,5s
     and 5,9s because they are whole video captures, and a 4,7-second page turn stacks on itself
     the moment anyone clicks twice. `silencedetect` found the real burst inside each one — the
     page turn is 0,4s of sound sitting after 1,7s of nothing — and each file is cut to it with a
     70ms fade so the cut does not click. Originals are untouched in RE UI/SFX. */
  bookPage:  '/sounds/book-page.mp3',
  bookOpenS: '/sounds/book-open.mp3',
  bookCloseS: '/sounds/book-close.mp3',
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
  vaultb: 0.9,
  ponderOpen: 0.95,
  bookPage: 0.85, bookOpenS: 0.9, bookCloseS: 0.9,
};
const DEFAULT_VOLUME = 0.85;

/* ---- LOUDER THAN THE FILE ----
   An <audio> element's volume is a fraction: 1.0 IS the file, and there is no 1.5. The
   steppers were already pinned at 1.0 and Aldi still wants them louder, so the only way up
   is a real gain stage — route the element through Web Audio and multiply.

   Numbers are multipliers of the file, not fractions of it. The stepper gets the most
   because it is pressed more than anything else in the app, usually outdoors beside a road.
   The mumbles stay modest: eight fire in a row, and loud enough they stop being a voice.

   If Web Audio is missing or refuses, nothing breaks — the element keeps playing at its own
   volume, which is exactly today's behaviour. */
const BOOST = {
  click: 3.2, error: 2.4, tap: 2.2, commit: 2.4, sign: 2.4,
  mumble1: 1.5, mumble2: 1.5, mumble3: 1.5, mumble4: 1.5,
  /* No boost. The others are blips fighting a roadside; this one is a mixed cue that was
     mastered at the level it wants, and multiplying it just clips the tok. */
  vaultb: 1.0,
};
const DEFAULT_BOOST = 1.8;

let audioCtx = null;
const routed = new WeakSet();   // createMediaElementSource may only be called ONCE per element

function boostElement(el, name) {
  if (!audioCtx || routed.has(el)) return;
  try {
    const src = audioCtx.createMediaElementSource(el);
    const gain = audioCtx.createGain();
    gain.gain.value = BOOST[name] ?? DEFAULT_BOOST;
    src.connect(gain);
    gain.connect(audioCtx.destination);
    routed.add(el);
    /* Once it is in the graph the element's own volume becomes the PRE-gain level, so it
       goes to full and the multiplier above does the shaping. Leaving it at 0.5 here would
       simply halve everything before the boost and undo the point. */
    el.volume = 1;
  } catch (err) {
    /* Already routed, or no output device. Element volume still applies. */
  }
}

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

/* THE GAIN STAGE IS BUILT ONLY ONCE THE CONTEXT IS PROVABLY RUNNING — this is the iPhone bug.

   `createMediaElementSource` moves an element's output INTO the Web Audio graph permanently:
   once routed, the element no longer reaches the speakers on its own, it reaches them through
   `audioCtx.destination`. If the context is not running, that destination goes nowhere and the
   element is now silent forever — the WeakSet means it can never be un-routed.

   The old code called `audioCtx.resume()` without awaiting it and routed every element on the
   next line. `resume()` is asynchronous and iOS is strict about when it may complete, so on his
   phone the routing happened while the context was still `suspended`. Desktop resumed fast
   enough to hide it. That is why every sound worked on his PC and nothing played on his iPhone.

   The comment above promises "if Web Audio is missing or refuses, nothing breaks". It only
   keeps that promise if we refuse to route BEFORE knowing the context runs. */
function buildGainStage() {
  let ctx;
  try {
    const Ctx = globalThis.AudioContext || globalThis.webkitAudioContext;
    if (!Ctx) return Promise.resolve(false);
    if (!audioCtx) audioCtx = new Ctx();
    ctx = audioCtx;
  } catch (err) { audioCtx = null; return Promise.resolve(false); }

  const resumed = ctx.state === 'suspended' && typeof ctx.resume === 'function'
    ? Promise.resolve(ctx.resume()).catch(() => {})
    : Promise.resolve();

  return resumed.then(() => {
    /* The only condition under which routing is safe. Anything else and the elements keep
       playing at their own volume, unboosted but audible — which is the correct trade. */
    if (ctx.state !== 'running') { audioCtx = null; return false; }
    for (const [name, p] of pools) p.els.forEach(el => boostElement(el, name));
    return true;
  }).catch(() => { audioCtx = null; return false; });
}

/* Browsers block audio until a real user gesture. Unlock by playing ONE element
   silently and only marking unlocked once play() actually resolves - marking it
   before resolution is what makes the first real sound get swallowed.

   Returns false when the gesture did not actually unlock anything. main.jsx keeps listening
   on that answer instead of throwing its listeners away — see the comment there. */
export function unlockSounds({ AudioImpl, doc } = {}) {
  if (unlocked) return Promise.resolve(true);
  initSounds(AudioImpl);
  const pool = pools.get('tap');
  if (!pool) return Promise.resolve(false);

  /* play() must be reached synchronously inside the gesture, so nothing awaits before here. */
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
      /* Boost only after real playback proved the gesture counted. */
      return unlocked ? buildGainStage() : false;
    })
    .then(() => unlocked);
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
