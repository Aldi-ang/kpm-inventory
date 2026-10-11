/* The capybara's speech plan - which syllable file, at what pitch, how loud, when - taken from the SOUND STUDIO's own
   synth file (tools/chip.js, a byte copy of the published studio's chip.js) rather than re-written here, so the app and
   the studio cannot drift apart. Only its plan is used: no audio is made in the app, it plays the baked syllable files.
   His voice settings live in src/config/capyVoice.js. */
import '../../tools/chip.js';
import { CAPY_VOICE } from '../config/capyVoice.js';

/* seed: a different one every call is his ask - *"it is annoying if its keep repeating the same sound"* - so the same
   line comes out with another mood, length and pace each time */
export function voicePlan(text, seed) {
  return globalThis.KPM_CHIP.plan(text || '', CAPY_VOICE, { seed });
}
