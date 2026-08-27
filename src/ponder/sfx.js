/* THE TUTORIAL'S SOUNDS.

   Two rounds of this were wrong, and both are worth writing down so a third does not happen.

   ROUND 1 re-pointed the app's own SFX — `commit` for the cover, `tap` for a pick. Aldi:
   *"u re crazy using sales SFX for the book, use paper or book SFX la bro"*. Those sounds already
   MEAN something here; an ear taught that a page turn is a transaction is an ear taught wrong.

   ROUND 2 synthesised paper from filtered noise. It needed no files and it was silent in Lite
   Mode, and it still lost: *"SFX sound really bad as well"*. **Synthesis was the clever answer to
   the wrong question.** He has a folder of real SFX; the right move was to ask which file, not to
   build a substitute for one.

   ROUND 3, here: his own file, through `useSound`, which already solves pooling, the browser's
   unlock gesture, and silence in Lite Mode.

   ROUND 4 completes it: he recorded the other three and dropped them in the same folder, so every
   sound in the book is now a real one he chose.

   ⚠️ THEY WERE TRIMMED ON THE WAY IN, and that mattered more than it sounds. The clips ran 4,7s,
   6,5s and 5,9s — whole video captures, mostly silence. A 4,7-second page turn stacks on itself
   the second anyone clicks twice, and the sound would start well over a second after the click
   that caused it, which reads as an unresponsive app rather than as a slow sound. `silencedetect`
   located the real burst in each (the page turn is 0,4s of sound after 1,7s of nothing) and each
   file is cut to it with a 70ms fade. The originals are untouched in RE UI/SFX.

   ⚠️ `book-close.mp3` held FOUR bursts, roughly a second apart — takes, or a sound repeated. Only
   the first is used. If the intended sound was all four together, widen the trim; the note in
   `useSound.js` records the timings. */
import { playSound } from '../hooks/useSound.js';

/* Pressing a tutorial. His words: *"this is the SFX when ponder tutorial is pressed"*. */
export const bookPick = () => playSound('ponderOpen');

export const bookOpen = () => playSound('bookOpenS');
export const bookPage = () => playSound('bookPage');
export const bookClose = () => playSound('bookCloseS');
