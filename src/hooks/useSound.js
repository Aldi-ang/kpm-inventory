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
  /* Aldi's own SFX, from RE UI/SFX. click is trimmed to 150ms - the source was 3,4s of
     mostly silence, which made every press sound late. */
  click:  '/sounds/click.mp3',
  /* A sale is saved and the receipt shows. HIS cha-ching (2026-11-10, *"for receipt use this SFX instead"*, then "c2"):
     youtube EuLJv2qONRY cut to its 1.6 s with the bell ring faded, levelled to his message sound's loudness. Replaced
     sign.mp3 - 4.1 s played 2.2x past full scale, his *"too loud and long"*. Board: A-Brain Raw/2026-11-10-sound-board. */
  saleDone: '/sounds/sale-chaching.mp3',
  /* The Master Vault gate - HIS intro, made in the sound studio (2026-10-11): slow chord, reverse bell, warm bloom,
     breath, a soft key per letter, a 2.4 s hall. Baked by tools/sfx-bake.mjs from src/config/capyVoice.js on
     VaultGate's own clock (T_WAVE 0.1, T_WAVE_DUR 3, FORMED 4.5, OUT 6.7) - move those and re-bake. */
  vaultIntro: '/sounds/vault-intro.mp3',
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
  /* The phone's field terminal. Aldi's own recording again, and named for the PANEL rather than
     the book — the terminal is slate and amber where the book is paper, and a reader who finds
     `bookPage` here would wire the wrong thing. Cut from a 4,95s screen capture at 1,455s: two
     hits, a press at -13dB and its release 115ms later at -30dB, with digital silence either side,
     so both are system audio and the release is part of the sound. Levelled to -3dB, where
     bookPage already sits. Seven synthesised takes were built first and he rejected all of them:
     *"all bad nvm, use this for the section button click on the side"*. */
  padKey: '/sounds/pad-key.mp3',
  /* The van-loading chests. Kenney "RPG Audio" recordings (CC0, chest-LICENSE.txt beside them), each cut,
     pitched and given its room from the settings Aldi saved in the prototype's sound studio — rendered by
     tools/sfx-bake.mjs, so change a sound there, not here. Their own files: a chest never borrows a
     sale's sound. chestLoad is MUAT VAN, the metal latch he kept (*"just use the metal latch for now"*). */
  chestEnderOpen:  '/sounds/chest-ender-open.mp3',
  chestEnderClose: '/sounds/chest-ender-close.mp3',
  chestVanOpen:    '/sounds/chest-van-open.mp3',
  chestVanClose:   '/sounds/chest-van-close.mp3',
  chestPick:       '/sounds/chest-pick.mp3',
  chestLand:       '/sounds/chest-land.mp3',
  chestPage:       '/sounds/chest-page.mp3',
  chestRefuse:     '/sounds/chest-refuse.mp3',
  chestLoad:       '/sounds/chest-load.mp3',
  /* The message strip (Toast.jsx). Kenney "Interface Sounds" (CC0, msg-LICENSE.txt beside them), cut, pitched,
     bass-cut and given the studio's room from what Aldi saved in the message sound studio — rendered by
     tools/sfx-bake.mjs, so change a sound there, not here. Their own files: until 2026-10-11 a message borrowed
     `commit`, the SALE, so "saved" sounded like money moving. */
  msgIn:   '/sounds/msg-in.mp3',
  msgFail: '/sounds/msg-fail.mp3',
};

/* THE CAPYBARA'S VOICE (2026-11-10). His pick: Jett, a free Google AI Studio voice, at "J4" - played 1.26x faster,
   which lifts it 4 semitones and shrinks the throat (*"make it sound as like it sound like a small animal but in sims
   style"*). His *"add variation on the voice because there are several emotion"*: two takes per mood, each cut at its
   pauses into whole gibberish phrases of 1 to 3 seconds (never a lone grunt - his October *"minimum 3 words"*),
   levelled to his message sound. How many phrases each mood has is below; the files are capy-<mood>-<n>.mp3. They
   replace the 61 baked syllables of 2026-10-11 - his *"annoying AF"*. Masters + cut script: A-Brain
   Raw/2026-11-10-sound-board/round4 (cut5.mjs voice). */
export const CAPY_PHRASES = { happy: 6, curious: 6, approving: 7, excited: 6 };
const capyPhrase = (mood, i) => 'capy-' + mood + '-' + (i + 1);
for (const [mood, n] of Object.entries(CAPY_PHRASES)) for (let i = 0; i < n; i++) SOURCES[capyPhrase(mood, i)] = '/sounds/' + capyPhrase(mood, i) + '.mp3';

/* Per-sound level. Everything used to sit at a flat 0,5, which made the steppers - the
   control pressed more than any other in the app, often outdoors next to a road - the
   quietest thing in it. The stepper and the error tone go to full. */
const VOLUMES = {
  click: 1.0, error: 1.0, tap: 0.9, commit: 0.9, saleDone: 1.0,
  vaultIntro: 1.0,
  ponderOpen: 0.95,
  bookPage: 0.85, bookOpenS: 0.9, bookCloseS: 0.9,
  /* The rail key is the most-pressed control on the terminal — seventeen of them, tapped in a row
     while reading — so it sits just under the tutorial's own open sound rather than at full. */
  padKey: 0.9,
  /* The chest files hold his studio loudness already; at 1.0 the element plays exactly that. */
  chestEnderOpen: 1.0, chestEnderClose: 1.0, chestVanOpen: 1.0, chestVanClose: 1.0,
  chestPick: 1.0, chestLand: 1.0, chestPage: 1.0, chestRefuse: 1.0, chestLoad: 1.0,
  msgIn: 1.0, msgFail: 1.0,
};
/* the phrase files are levelled already (to his message sound); at 1.0 the element plays exactly that */
for (const name of Object.keys(SOURCES)) if (name.startsWith('capy-')) VOLUMES[name] = 1.0;
const DEFAULT_VOLUME = 0.85;

/* ---- LOUDER THAN THE FILE ----
   An <audio> element's volume is a fraction: 1.0 IS the file, and there is no 1.5. The
   steppers were already pinned at 1.0 and Aldi still wants them louder, so the only way up
   is a real gain stage — route the element through Web Audio and multiply.

   Numbers are multipliers of the file, not fractions of it. The stepper gets the most
   because it is pressed more than anything else in the app, usually outdoors beside a road.

   If Web Audio is missing or refuses, nothing breaks — the element keeps playing at its own
   volume, which is exactly today's behaviour. */
const BOOST = {
  click: 3.2, error: 2.4, tap: 2.2, commit: 2.4,
  /* No boost: the file already sits at his message sound's loudness - the 2.4 here is what made the old one crackle. */
  saleDone: 1.0,
  /* No boost. The others are blips fighting a roadside; the intro is a mixed cue made at the level he set. */
  vaultIntro: 1.0,
  /* No boost either: each chest file already holds the loudness he set in the studio. */
  chestEnderOpen: 1.0, chestEnderClose: 1.0, chestVanOpen: 1.0, chestVanClose: 1.0,
  chestPick: 1.0, chestLand: 1.0, chestPage: 1.0, chestRefuse: 1.0, chestLoad: 1.0,
  /* Same for the message strip: the files hold the loudness he set in the message studio. */
  msgIn: 1.0, msgFail: 1.0,
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
    /* A rate here is a PITCH (the chest's landing pop rises box by box into the van, falls back out).
       An element keeps its pitch when sped up unless this is off; at rate 1 it changes nothing. */
    el.preservesPitch = false;
    el.webkitPreservesPitch = false;
    els.push(el);
  }
  return { els, next: 0 };
}

export function initSounds(AudioImpl = globalThis.Audio) {
  if (!AudioImpl) return;
  for (const name of Object.keys(SOURCES)) {
    /* the capybara's 25 phrase files load when first spoken - all at the first tap would be 75 elements on a weak phone */
    if (name.startsWith('capy-')) continue;
    if (!pools.has(name)) pools.set(name, makePool(name, AudioImpl));
  }
}

/* Lite Mode is the performance switch: no sound under it. Read the class at play
   time rather than capturing a value - a captured one goes stale the moment the
   toggle is flipped, which is the whole bug this avoids. */
function liteModeOn(doc = globalThis.document) {
  return !!doc?.documentElement?.classList?.contains('lite-mode');
}

export function playSound(name, { AudioImpl, doc, rate = 1, gain = 1 } = {}) {
  if (!SOURCES[name]) return false;
  if (liteModeOn(doc)) return false;
  if (!unlocked) return false;

  initSounds(AudioImpl);
  let pool = pools.get(name);
  if (!pool && (AudioImpl || globalThis.Audio)) { pool = makePool(name, AudioImpl || globalThis.Audio); pools.set(name, pool); }
  if (!pool) return false;

  const el = pool.els[pool.next];
  pool.next = (pool.next + 1) % pool.els.length;
  el.currentTime = 0;
  /* Set on EVERY play: the elements are pooled, so one left at 1.21 would play the next plain call high. */
  el.playbackRate = rate;
  /* and a loudness: the capybara's plan stresses one word and softens the rest. A routed element's own volume is the
     pre-gain level (1), so it scales from there; any other element from its VOLUMES level. */
  el.volume = Math.min(1, (routed.has(el) ? 1 : (VOLUMES[name] ?? DEFAULT_VOLUME)) * gain);
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

/* WHEN THE CAPYBARA TALKS OUT LOUD - his 2026-11-10 *"yes go with your suggestion but also sound when he give us the
   motivation on random sometimes ... without being annoying and too repetitive"*. His bubble still shows every time;
   then, same day: *"if no voice then no capybara"* - so an appearance comes WITH the voice:
   - sale        always (the line comes after the cha-ching has finished)
   - news        "Saved" and the like. Quiet for 5 s after he spoke - exactly while he is still on screen from the last
                 one (a new line keeps him up and swaps his words), so every NEW appearance talks. News always shows:
                 it is a report (Lite Mode, sound off by design, shows it silently).
   - motivation  his own pop-up tips, at most once every 15 min and never within a minute of other talk - and the tip
                 only comes up when it is spoken (CapybaraMascot). The tips go round in order, so none repeats early.
   - cart        never: the chatter while items went in the cart is gone (MerchantSalesView). */
const CAPY_QUIET = { news: 5e3, motivation: 60e3 };
const MOTIVATION_EVERY = 15 * 60e3;
const capyGate = { spoke: -Infinity, motivated: -Infinity };
export function capyMaySpeak(kind, now = Date.now(), g = capyGate) {
  if (!['sale', 'news', 'motivation'].includes(kind)) return false;
  if (kind !== 'sale' && now - g.spoke < CAPY_QUIET[kind]) return false;
  if (kind === 'motivation' && now - g.motivated < MOTIVATION_EVERY) return false;
  if (kind === 'motivation') g.motivated = now;
  g.spoke = now;
  return true;
}

/* Speak a line in the capybara's voice: ONE whole phrase, picked at random - never the one he said last, so the same
   sound cannot come twice in a row (his 2026-10-11 *"annoying if its keep repeating the same sound"*). The mood: a line
   ending in "?" is asked (curious); otherwise the caller's mood ('happy' | 'approving' | 'excited'), happy when none is
   given. One file, no timers - nothing can bunch up in a background tab. Returns 1 when he spoke and 0 when he did not
   (his "if no voice then no capybara" keeps a tip off screen on a 0). Silent under Lite Mode and before unlock,
   because playSound refuses there, and on a hidden page: nobody can see him. */
let lastPhrase = '';
export function speakMumble(text, { AudioImpl, doc, mood, pick = Math.random } = {}) {
  if (!(text || '').replace(/\s+/g, '').length) return 0;
  if ((doc || globalThis.document)?.visibilityState === 'hidden') return 0;
  const m = /\?\s*$/.test(text) ? 'curious' : (CAPY_PHRASES[mood] ? mood : 'happy');
  const n = CAPY_PHRASES[m];
  let i = Math.floor(pick() * n) % n;
  if (capyPhrase(m, i) === lastPhrase) i = (i + 1) % n;
  if (!playSound(capyPhrase(m, i), { AudioImpl, doc })) return 0;
  lastPhrase = capyPhrase(m, i);
  return 1;
}

/* test seam - not for app code */
export function __reset() {
  pools.clear();
  unlocked = false;
  lastPhrase = '';
}
export function __isUnlocked() { return unlocked; }
