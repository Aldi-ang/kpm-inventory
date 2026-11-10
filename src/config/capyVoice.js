/* Aldi's sound-studio save that the vault intro is built from, read by the baker (tools/sfx-bake.mjs renders
   public/sounds/vault-intro.mp3 from it). Source: the studio https://claude.ai/artifact/AmgCRrR8s8MfPaAxfPQtNr,
   sfx/settings doc version 7, saved 2026-10-11 13:13 WIB (copy kept in A-Brain Tools/sound-studio/saves/). He changes
   the intro: he saves in the studio, these numbers are replaced from the new save, `node tools/sfx-bake.mjs` runs again.

   The studio's "Volume, all" (0.25 in that save) is a listening level he set for the whole page - it scaled the message
   sounds the same way, so it is left out here and every sound keeps the balance he heard. His call on the messages,
   2026-10-11: *"just leave the message like that for now"*.

   THE CAPYBARA'S VOICE LEFT THIS FILE 2026-11-11. The studio voice that lived here (61 baked syllables, a speech plan
   from tools/chip.js) was his *"annoying AF"* of 2026-11-10; he picked a spoken voice instead - Jett, cut into phrases
   by mood. It is in src/hooks/useSound.js (CAPY_PHRASES). The file keeps its name: the baker and the checks import it. */

/* the vault intro - his own mix: *"dont make the intro 8 bit bruh, we need elegant for that"* */
export const INTRO_MIX = {
  echo: .35,
  type:   { src: 'soft:key', vol: .5, pitch: 1, wobble: .5, chatter: 0, leave: true },
  wave:   { d: 'bloom', vol: .5, pitch: 0 },
  gather: { d: 'riser', vol: .25, pitch: -12 },
  formed: { d: 'bloomchord', vol: 1, pitch: -12 },
  leave:  { d: 'breath', vol: 1, pitch: -12 },
};
