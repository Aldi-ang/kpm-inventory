/* ONE WRITER for the graphics mode. Device-local, so there is no Firestore write here — but every
   switch still needs a single function behind it: two copies of a write drift, and the one that
   drifts is always the one nobody tests. Moved here from SettingsView.jsx on 2026-10-15, when the
   top bar's status line became a second Lite switch (his pick C) — App cannot import from the
   lazily loaded Settings chunk, so the writer lives where both can reach it. */
export const writeLiteMode = (newVal, { setIsLiteMode, triggerCapy }) => {
    setIsLiteMode(newVal);
    triggerCapy(newVal
        ? "Lite mode on. Blur and animation off, battery saved. ⚡"
        : "Full graphics restored.");
};

/* THE STATUS LINE'S DECODE. Characters settle left to right; the DECODE_LAG characters ahead of
   the settled ones flicker through glyphs; the rest still show the old words. "Tech" to him means
   decoding text and scans, not particles (2026-09-29). Pure, so the self-check can run it:
   frame 0 is `from`, frame decodeFrames(from, to) is `to`. */
const GLYPHS = 'ABCDEFGHIKLMNOPRSTUVY0123456789/#_';
export const DECODE_LAG = 4;
export const decodeFrames = (from, to) => Math.max(from.length, to.length) + DECODE_LAG;
export const decodeFrame = (from, to, frame) => {
    const len = Math.max(from.length, to.length);
    let out = '';
    for (let i = 0; i < len; i++) {
        if (i < frame - DECODE_LAG) out += to[i] || '';
        else if (i < frame) out += to[i] === ' ' ? ' ' : GLYPHS[(i * 7 + frame) % GLYPHS.length];
        else out += from[i] || '';
    }
    return out;
};
