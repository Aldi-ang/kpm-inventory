/* The nota scan (helpers.scanPixels) on a SYNTHETIC nota: grey paper with a shadow running
   left to right, a lamp's hot spot, and two lines of ink. What CamScanner's "magic colour" has
   to do: paper → white everywhere, shadow and hot spot included; ink → dark; and the shadow
   edge must not be mistaken for ink. Aldi, 2026-09-15: "scan the nota and make it clear instead
   of just normal photo". Run: node src/config/notaScan.selfcheck.mjs */
import { scanPixels, deskewAngle } from '../utils/helpers.js';

let pass = 0, fail = 0;
const ok = (name, cond, why = '') => { cond ? pass++ : fail++; console.log(`  ${cond ? 'ok  ' : 'FAIL'} ${name}${cond || !why ? '' : ' — ' + why}`); };

const W = 160, H = 80;
const data = new Uint8ClampedArray(W * H * 4);
const isInk = (x, y) => x >= 10 && x < 140 && ((y >= 20 && y < 24) || (y >= 50 && y < 54));
const isHot = (x, y) => (x - 130) ** 2 + (y - 12) ** 2 < 8 ** 2;
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const paper = 120 + Math.round((x / (W - 1)) * 90);          // shadow: 120 on the left, 210 on the right
    let v = isHot(x, y) ? 245 : paper;
    if (isInk(x, y)) v = paper - 70;                               // pen: 70 below the paper around it
    const i = (y * W + x) * 4;
    data[i] = v; data[i + 1] = v; data[i + 2] = v; data[i + 3] = 255;
}
scanPixels(data, W, H);

let paperWhite = 0, paperTotal = 0, inkSum = 0, inkN = 0, hotWhite = 0, hotN = 0, worstPaper = 255;
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const v = data[(y * W + x) * 4];
    if (isInk(x, y)) { inkSum += v; inkN++; }
    else if (isHot(x, y)) { hotN++; if (v === 255) hotWhite++; }
    else { paperTotal++; if (v === 255) paperWhite++; worstPaper = Math.min(worstPaper, v); }
}
console.log('\nNOTA SCAN — paper white, ink dark, shadow ignored');
ok('every paper pixel is white, shadow and all', paperWhite === paperTotal, `${paperWhite}/${paperTotal}, darkest paper ${worstPaper}`);
ok('the lamp hot spot is plain white, not a grey blob', hotWhite === hotN, `${hotWhite}/${hotN}`);
ok('the ink is dark (mean under 60 of 255)', inkN > 0 && inkSum / inkN < 60, `mean ${(inkSum / inkN).toFixed(1)}`);
ok('the output is grey — every channel equal, alpha solid', (() => { for (let i = 0; i < data.length; i += 4) if (data[i] !== data[i + 1] || data[i] !== data[i + 2] || data[i + 3] !== 255) return false; return true; })());
{ /* a page with no ink at all must come out blank white, not speckled */
    const blank = new Uint8ClampedArray(W * H * 4);
    for (let i = 0; i < blank.length; i += 4) { const v = 100 + ((i / 4) % W); blank[i] = blank[i + 1] = blank[i + 2] = v; blank[i + 3] = 255; }
    scanPixels(blank, W, H);
    let white = 0; for (let i = 0; i < blank.length; i += 4) if (blank[i] === 255) white++;
    ok('a blank shaded page scans to a blank white page', white === W * H, `${white}/${W * H}`); }

/* THE TILT FINDER on a scanned page: eight lines of "text" (rows of ink 3 px tall, 30 px apart)
   rotated by a known angle, canvas-style (x' = x·cos − y·sin, y' = x·sin + y·cos). deskewAngle
   must hand back that angle, so scanNotaToBase64 can rotate by its negative and level the page.
   Aldi, 2026-09-15: "make the photo upright so that its easier to read". */
console.log('\nNOTA SCAN — the tilt is found and has the right sign');
const page = (deg) => {
    const PW = 480, PH = 360, d = new Uint8ClampedArray(PW * PH * 4).fill(255);
    const rad = deg * Math.PI / 180, c = Math.cos(rad), s = Math.sin(rad);
    for (let line = 0; line < 8; line++) for (let y0 = 0; y0 < 3; y0++) for (let x0 = 0; x0 < 300; x0++) {
        const x = x0 - 150, y = (line * 30 - 105) + y0;           // centred, then rotated
        const px = Math.round(x * c - y * s + PW / 2), py = Math.round(x * s + y * c + PH / 2);
        if (px < 0 || py < 0 || px >= PW || py >= PH) continue;
        const i = (py * PW + px) * 4; d[i] = d[i + 1] = d[i + 2] = 0;
    }
    return { d, PW, PH };
};
for (const deg of [0, 4, -7, 11.5]) {
    const { d, PW, PH } = page(deg);
    const found = deskewAngle(d, PW, PH);
    ok(`a page tilted ${deg}° is read as ${deg}° (found ${found}°)`, Math.abs(found - deg) <= 0.5);
}
{ const { d, PW, PH } = page(0);
  for (let i = 0; i < d.length; i += 4) d[i] = d[i + 1] = d[i + 2] = 255;   // wipe the ink
  ok('a page with no ink is left alone (0°)', deskewAngle(d, PW, PH) === 0); }

console.log(`\n${'='.repeat(58)}\n${pass} passed, ${fail} failed, ${pass + fail} checks`);
process.exit(fail ? 1 : 0);
