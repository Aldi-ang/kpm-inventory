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

   🔴 TWO SOUNDS ARE STILL MISSING, AND THEY ARE SILENT ON PURPOSE. He named two YouTube clips —
   one for moving between sections, one holding the open and close pair — and audio cannot be
   pulled from there here. **A wrong sound is worse than no sound**, which is the whole lesson of
   round 1, so `bookPage`, `bookOpen` and `bookClose` do nothing until the files exist.

   TO TURN THEM ON — this is the entire job, and it is four lines:
     1. save the clips into `public/sounds/` as `book-page.mp3`, `book-open.mp3`, `book-close.mp3`
     2. add each to `SOURCES` in `src/hooks/useSound.js` (a volume in `VOLUMES` is optional)
     3. swap the three `return false` lines below for `playSound('bookPage')` and so on
   Nothing else moves: every call site already fires at the right moment. */
import { playSound } from '../hooks/useSound.js';

/* Pressing a tutorial. His file, his words: *"this is the SFX when ponder tutorial is pressed"*. */
export const bookPick = () => playSound('ponderOpen');

/* WAITING ON A FILE — see the header. Silent rather than borrowed. */
export const bookOpen = () => false;
export const bookPage = () => false;
export const bookClose = () => false;
