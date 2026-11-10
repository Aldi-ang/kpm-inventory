/* Self-check for useSound. Run: node src/hooks/useSound.selfcheck.mjs
   Covers the four things the research draft got wrong: pooling vs cloneNode,
   the unlock double-play, unlocked-before-resolve, and a stale Lite Mode read. */
import assert from 'node:assert';
import { playSound, unlockSounds, speakMumble, __reset, __isUnlocked } from './useSound.js';

let built = 0;
const played = [];

class StubAudio {
  constructor(src) { this.src = src; this.id = ++built; this.currentTime = 0; this.volume = 1; }
  play() { played.push(this.id); return Promise.resolve(); }
  pause() {}
}

const makeDoc = (lite) => ({
  documentElement: { classList: { contains: (c) => lite && c === 'lite-mode' } },
});
const ctx = (lite) => ({ AudioImpl: StubAudio, doc: makeDoc(lite) });

/* 1. locked by default - nothing plays before a user gesture */
__reset(); built = 0; played.length = 0;
assert.equal(playSound('tap', ctx(false)), false, 'must not play while locked');

/* 2. unlock plays exactly ONE element, and only flips the flag after play() resolves */
assert.equal(__isUnlocked(), false);
await unlockSounds(ctx(false));
assert.equal(__isUnlocked(), true, 'unlock must set the flag once play resolves');
assert.equal(played.length, 1, `unlock must play once, played ${played.length} times`);

/* 3. round robin across a fixed pool, never a new element */
played.length = 0;
const builtAfterInit = built;
for (let i = 0; i < 4; i++) assert.equal(playSound('tap', ctx(false)), true);
assert.equal(built, builtAfterInit, 'no element may be allocated per tap');
assert.equal(new Set(played.slice(0, 3)).size, 3, 'three taps must hit three elements');
assert.equal(played[3], played[0], 'fourth tap must wrap to the first element');

/* 4. Lite Mode is read at play time, so flipping it takes effect immediately */
assert.equal(playSound('tap', ctx(true)), false, 'Lite Mode must silence playback');
assert.equal(playSound('tap', ctx(false)), true, 'and un-silence when toggled back');

/* 5. unknown sound is a no-op, not a crash */
assert.equal(playSound('nope', ctx(false)), false);

/* 6. the capybara speaks ONE whole phrase a line (his Jett voice, 2026-11-11): however long the line, never the same
      phrase twice in a row, silent when empty, in Lite Mode or on a hidden page */
{
  played.length = 0;
  assert.equal(speakMumble('Sync Complete! 24 items secured in Master Vault.', ctx(false)), 1, 'a line is one phrase');
  assert.equal(speakMumble('x'.repeat(300), ctx(false)), 1, 'a 300-letter line is still one phrase');
  assert.equal(played.length, 2, `one file a line (played ${played.length})`);
  /* each phrase has its own pool of elements, so two different elements = two different phrases */
  played.length = 0;
  for (let k = 0; k < 4; k++) speakMumble('Saved.', { ...ctx(false), pick: () => 0 });
  assert.ok(played.every((id, k) => k === 0 || Math.floor((id - 1) / 3) !== Math.floor((played[k - 1] - 1) / 3)), 'the same phrase never comes twice in a row, even when the dice repeat');
  assert.equal(speakMumble('', ctx(false)), 0, 'empty line is silent');
  assert.equal(speakMumble('anything', ctx(true)), 0, 'Lite Mode is silent');
  /* his "1 or 2 words" (2026-10-14): a background tab holds timers to a once-a-second wake-up, which bunched the old
     syllables into 2 sounds. A line is one file now - and a hidden page still says nothing: nobody can see him. */
  played.length = 0;
  assert.equal(speakMumble('Good pick.', { AudioImpl: StubAudio, doc: { ...makeDoc(false), visibilityState: 'hidden' } }), 0, 'a hidden page says nothing');
  assert.equal(played.length, 0, 'and plays nothing');
}

/* 7. a rate is a PITCH: the chest's landing pop rises box by box into the van and falls box by box
      back out. An <audio> element keeps its pitch when sped up unless preservesPitch is off, and a
      pooled element keeps the last rate unless every play sets it - so a plain play comes back to 1. */
{
  const els = [];
  class RateAudio extends StubAudio {
    constructor(src) { super(src); this.playbackRate = 1; this.preservesPitch = true; els.push(this); }
  }
  const rctx = (rate) => ({ AudioImpl: RateAudio, doc: makeDoc(false), ...(rate ? { rate } : {}) });
  __reset();
  await unlockSounds(rctx());
  const land = () => els.filter(e => e.src === '/sounds/chest-land.mp3');
  assert.equal(playSound('chestLand', rctx(1.14)), true, 'the chest landing sound must be registered');
  const hit = land().find(e => e.playbackRate === 1.14);
  assert.ok(hit, 'the rate must reach the element');
  assert.equal(hit.preservesPitch, false, 'the rate must move the pitch, not only the speed');
  for (let i = 0; i < 3; i++) playSound('chestLand', rctx());
  assert.ok(land().length === 3 && land().every(e => e.playbackRate === 1), 'a play with no rate must play at 1 on every pooled element');
}

console.log('useSound self-check: 7/7 pass');
