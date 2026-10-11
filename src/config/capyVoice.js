/* Aldi's sound-studio save that the app's capybara voice and vault intro are built from - ONE place, read by the baker
   (tools/sfx-bake.mjs renders the files from it) and by the app (src/utils/voicePlan.js speaks with it), so the two can
   never disagree. Source: the studio https://claude.ai/artifact/AmgCRrR8s8MfPaAxfPQtNr, sfx/settings doc version 7,
   saved 2026-10-11 13:13 WIB (copy kept in A-Brain Tools/sound-studio/saves/). He changes a sound: he saves in the
   studio, these numbers are replaced from the new save, `node tools/sfx-bake.mjs` runs again.

   The studio's "Volume, all" (0.25 in that save) is a listening level he set for the whole page - it scaled the message
   sounds the same way, so it is left out here and every sound keeps the balance he heard. His call on the messages,
   2026-10-11: *"just leave the message like that for now"*. */

/* Agent (firm) - his words: *"tegas and serious but expressive ... elegant manly and focus"*. The same voice since
   2026-10-11 17:35 with HAPPY melodies and at least 3 sounds a line - his *"sometimes the capybara said one words only
   its kinda scary tbh we need more happy emotion and minimum of 3 words when saying stuff"* (moods 'happy' + minSyl
   are in tools/chip.js plan). The syllable files did not change, so nothing was re-baked. */
export const CAPY_VOICE = {
  shape: 'voice', moods: 'happy', f: 112, formant: 1, intonation: 1.1, jitter: .35, scoop: 1.2, bend: 2.4, speed: 1,
  cons: .9, vib: .1, breath: .18, maxSyl: 12, minSyl: 3, variety: 1, tempo: .7, drop: .6, emph: .7, fry: .35, vol: .4, echo: .12,
};

/* the vault intro - his own mix: *"dont make the intro 8 bit bruh, we need elegant for that"* */
export const INTRO_MIX = {
  echo: .35,
  type:   { src: 'soft:key', vol: .5, pitch: 1, wobble: .5, chatter: 0, leave: true },
  wave:   { d: 'bloom', vol: .5, pitch: 0 },
  gather: { d: 'riser', vol: .25, pitch: -12 },
  formed: { d: 'bloomchord', vol: 1, pitch: -12 },
  leave:  { d: 'breath', vol: 1, pitch: -12 },
};

/* the syllable files the voice needs: 3 consonant classes x 5 vowels x short / mid / long, a rising long one for a
   question's last word, and the "hm." the agent sometimes starts with. Names: capy-<onset>-<vowel>-<len>[-r] */
export const CAPY_ONSETS = ['soft', 'hard', 'hiss'];
export const CAPY_VOWELS = ['a', 'e', 'i', 'o', 'u'];
export function capyFile(on, v, len, rise) { return 'capy-' + on + '-' + v + '-' + len + (rise ? '-r' : ''); }
export function capyFiles() {
  const out = [];
  for (const on of CAPY_ONSETS) for (const v of CAPY_VOWELS) {
    for (const len of ['s', 'm', 'l']) out.push({ on, v, len, rise: false });
    out.push({ on, v, len: 'l', rise: true });
  }
  out.push({ on: 'soft', v: 'm', len: 'm', rise: false });
  return out;
}
