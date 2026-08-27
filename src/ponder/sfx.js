/* Book sounds.

   These are the app's OWN sounds, re-pointed — no new audio files. `useSound` already solves the
   three hard parts: it pools elements so a fast page-turn does not cut itself off, it refuses to
   play before the browser's unlock gesture, and **it is silent in Lite Mode**, which is exactly the
   behaviour the book needs there anyway.

   The mapping is deliberate rather than arbitrary:
     open  → commit   a weighty confirm; the closest thing here to a cover being lifted
     page  → sign     the signing sound, the most paper-like thing in the set
     pick  → tap      short and dry, the same sound every other selection in the app makes
     close → click    a small dry snap

   ⚠️ TO USE REAL BOOK SFX: drop `book-open.mp3`, `page-turn.mp3`, `book-close.mp3` into
   `public/sounds/`, add them to SOURCES in `src/hooks/useSound.js`, and change the four names
   below. Nothing else needs to move. Written down here because the wiring is the part that takes
   time and it is already done. */
import { playSound } from '../hooks/useSound.js';

export const bookOpen = () => playSound('commit');
export const bookPage = () => playSound('sign');
export const bookPick = () => playSound('tap');
export const bookClose = () => playSound('click');
