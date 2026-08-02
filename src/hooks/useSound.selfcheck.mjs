/* Self-check for useSound. Run: node src/hooks/useSound.selfcheck.mjs
   Covers the four things the research draft got wrong: pooling vs cloneNode,
   the unlock double-play, unlocked-before-resolve, and a stale Lite Mode read. */
import assert from 'node:assert';
import { playSound, unlockSounds, __reset, __isUnlocked } from './useSound.js';

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

console.log('useSound self-check: 5/5 pass');
